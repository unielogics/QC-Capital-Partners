#!/usr/bin/env bash
# Wire the capital.qualifiedcommercial.com Amplify app after it has been
# connected to the GitHub repo in the Amplify console (connecting GitHub needs
# a token the CLI cannot be given here, so that one step is manual).
#
#   scripts/amplify-wire.sh wire    [APP_ID]   set env vars, branch, domain; start a build
#   scripts/amplify-wire.sh build   [APP_ID]   start a release build of main
#   scripts/amplify-wire.sh status  [APP_ID]   latest build job + domain status
#
# APP_ID is optional: without it the app is found by its GitHub repository.
# Secret values (the Clerk pair) are copied app-to-app through a 0600 temp file
# and are never printed. Needs the AWS profile that manages Amplify.

set -u
export AWS_PROFILE="${AWS_PROFILE:-unie-codex-deploy}"
export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-us-east-1}"

REPO_URL="${REPO_URL:-https://github.com/unielogics/QC-Capital-Partners}"
SOURCE_APP="${SOURCE_APP:-d2ooufj1616tzy}"          # QC-Audit: live Clerk pair + API host
DOMAIN="qualifiedcommercial.com"
PREFIX="capital"
BRANCH="main"
FUNDING_APP_URL="${FUNDING_APP_URL:-https://app.qualifiedcommercial.com}"
FALLBACK_ROLE="arn:aws:iam::156041400244:role/service-role/AmplifySSRLoggingRole-2c4b0cda-ea92-4dee-a7c9-f6468e0ab102"

mode="${1:-}"
app_id="${2:-}"

die() { echo "error: $*" >&2; exit 1; }
need() { command -v "$1" >/dev/null 2>&1 || die "$1 is required"; }
need aws; need jq

find_app() {
  aws amplify list-apps --query "apps[?repository=='${REPO_URL}'].appId" --output text | awk '{print $1}'
}

resolve_app() {
  if [ -z "$app_id" ]; then
    app_id="$(find_app)"
    [ -n "$app_id" ] && [ "$app_id" != "None" ] || die "no Amplify app is connected to ${REPO_URL} yet; connect it in the Amplify console first"
  fi
  echo "app: $app_id"
}

wire() {
  resolve_app
  local platform repo role
  platform="$(aws amplify get-app --app-id "$app_id" --query 'app.platform' --output text)"
  repo="$(aws amplify get-app --app-id "$app_id" --query 'app.repository' --output text)"
  role="$(aws amplify get-app --app-id "$app_id" --query 'app.iamServiceRoleArn' --output text)"
  [ "$platform" = "WEB_COMPUTE" ] || die "app platform is $platform, expected WEB_COMPUTE (Next.js SSR)"
  [ "$repo" = "$REPO_URL" ] || echo "warning: app repository is $repo, expected $REPO_URL"

  # 1. Environment variables: Clerk live pair + API host copied from the audit
  #    app, portal-specific values set here. update-app replaces the whole map.
  local tmp pk sk
  umask 077
  tmp="$(mktemp)"
  trap 'rm -f "$tmp"' EXIT
  pk="$(aws amplify get-app --app-id "$SOURCE_APP" --query 'app.environmentVariables.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY' --output text | cut -c1-8)"
  sk="$(aws amplify get-app --app-id "$SOURCE_APP" --query 'app.environmentVariables.CLERK_SECRET_KEY' --output text | cut -c1-8)"
  [ "$pk" = "pk_live_" ] || die "source app publishable key is not a live key (prefix $pk); refusing to copy"
  [ "$sk" = "sk_live_" ] || die "source app secret key is not a live key (prefix $sk); refusing to copy"
  aws amplify get-app --app-id "$SOURCE_APP" --query 'app.environmentVariables' --output json \
    | jq --arg app "$app_id" --arg role "$role" --arg fallback "$FALLBACK_ROLE" --arg funding "$FUNDING_APP_URL" '{
        appId: $app,
        iamServiceRoleArn: (if $role == "None" or $role == "" then $fallback else $role end),
        environmentVariables: {
          CLERK_SECRET_KEY: .CLERK_SECRET_KEY,
          NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: .NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
          NEXT_PUBLIC_API_URL: .NEXT_PUBLIC_API_URL,
          NEXT_PUBLIC_CLERK_SIGN_IN_URL: "/sign-in",
          NEXT_PUBLIC_CLERK_SIGN_UP_URL: "/sign-up",
          NEXT_PUBLIC_FUNDING_APP_URL: $funding
        }
      }' > "$tmp"
  jq -e '.environmentVariables | to_entries | all(.value != null and .value != "")' "$tmp" >/dev/null \
    || die "a copied environment variable is empty; check the source app"
  aws amplify update-app --cli-input-json "file://$tmp" --query 'keys(app.environmentVariables)' --output json
  rm -f "$tmp"; trap - EXIT
  echo "env: set (values not shown)"

  # 2. Branch main: production, SSR, auto-build on push.
  if aws amplify get-branch --app-id "$app_id" --branch-name "$BRANCH" >/dev/null 2>&1; then
    aws amplify update-branch --app-id "$app_id" --branch-name "$BRANCH" --stage PRODUCTION --framework "Next.js - SSR" --enable-auto-build --query 'branch.{branch:branchName,stage:stage,framework:framework,autoBuild:enableAutoBuild}' --output json
  else
    aws amplify create-branch --app-id "$app_id" --branch-name "$BRANCH" --stage PRODUCTION --framework "Next.js - SSR" --enable-auto-build --query 'branch.{branch:branchName,stage:stage,framework:framework,autoBuild:enableAutoBuild}' --output json
  fi

  # 3. Domain: apex + prefix, the shape the audit and rep apps use. Route 53
  #    holds the zone in this account, so Amplify adds the records itself and
  #    the apex certificate validation record already exists.
  if aws amplify get-domain-association --app-id "$app_id" --domain-name "$DOMAIN" >/dev/null 2>&1; then
    echo "domain: $PREFIX.$DOMAIN already associated"
  else
    aws amplify create-domain-association --app-id "$app_id" --domain-name "$DOMAIN" --no-enable-auto-sub-domain \
      --sub-domain-settings "prefix=$PREFIX,branchName=$BRANCH" \
      --query 'domainAssociation.{domain:domainName,status:domainStatus}' --output json
  fi

  # 4. Build with the env vars in place (the console's first build ran without them).
  local job
  if job="$(aws amplify start-job --app-id "$app_id" --branch-name "$BRANCH" --job-type RELEASE --query 'jobSummary.jobId' --output text 2>&1)"; then
    echo "build: job $(echo "$job" | head -1 | tr -cd '0-9') started; run '$0 status $app_id' to follow it"
  else
    echo "build: not started, a job is already pending or running; when it ends run '$0 build $app_id'"
  fi
  echo
  echo "MANUAL, no CLI: add https://$PREFIX.$DOMAIN to the Clerk Dashboard allowed origins,"
  echo "or sign-in on the portal will be refused after a green build."
}

status() {
  resolve_app
  echo "--- latest build ---"
  aws amplify list-jobs --app-id "$app_id" --branch-name "$BRANCH" --max-items 1 \
    --query 'jobSummaries[0].{job:jobId,status:status,type:jobType,started:startTime,ended:endTime}' --output json
  echo "--- domain ---"
  aws amplify get-domain-association --app-id "$app_id" --domain-name "$DOMAIN" \
    --query 'domainAssociation.{status:domainStatus,reason:statusReason,subs:subDomains[].{prefix:subDomainSetting.prefix,branch:subDomainSetting.branchName,verified:verified,dns:dnsRecord}}' --output json 2>/dev/null \
    || echo "no association for $DOMAIN yet"
  echo "--- hosts ---"
  echo "https://$BRANCH.$(aws amplify get-app --app-id "$app_id" --query 'app.defaultDomain' --output text)"
  echo "https://$PREFIX.$DOMAIN"
}

build() {
  resolve_app
  aws amplify start-job --app-id "$app_id" --branch-name "$BRANCH" --job-type RELEASE \
    --query 'jobSummary.{job:jobId,status:status}' --output json
}

case "$mode" in
  wire) wire ;;
  build) build ;;
  status) status ;;
  *) sed -n '2,11p' "$0"; exit 2 ;;
esac
