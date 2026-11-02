// Numbers and dates the way the design shows them: $2.4M, $25K, 11.25%, 12 mo.

const n = (v: string | number | null | undefined): number | null => {
  if (v == null || v === "") return null;
  const x = typeof v === "number" ? v : Number(v);
  return Number.isFinite(x) ? x : null;
};

export const usd = (v: string | number | null | undefined): string => {
  const x = n(v);
  return x == null ? "—" : "$" + Math.round(x).toLocaleString("en-US");
};

export const compact = (v: string | number | null | undefined): string => {
  const x = n(v);
  if (x == null) return "—";
  if (Math.abs(x) >= 1e6) return "$" + (x / 1e6).toFixed(2).replace(/\.?0+$/, "") + "M";
  if (Math.abs(x) >= 1e3) return "$" + Math.round(x / 1e3) + "K";
  return "$" + Math.round(x);
};

export const pct = (v: string | number | null | undefined, digits = 2): string => {
  const x = n(v);
  return x == null ? "—" : x.toFixed(digits) + "%";
};

export const months = (v: number | null | undefined): string => (v == null ? "—" : `${v} mo`);

export const day = (v: string | null | undefined): string => {
  if (!v) return "—";
  const d = v.length <= 10 ? new Date(`${v}T12:00:00`) : new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

export const LIEN: Record<string, string> = { first: "1st", second: "2nd" };
export const FREQ: Record<string, string> = { monthly: "Monthly", quarterly: "Quarterly", at_maturity: "At maturity" };
export const STATUS: Record<string, [string, string]> = {
  open: ["Open", "tag tag-success"],
  closing: ["Closing", "tag tag-warning"],
  fully_subscribed: ["Fully subscribed", "tag tag-neutral"],
  funded: ["Funded", "tag tag-neutral"],
  repaid: ["Repaid", "tag tag-success"],
  workout: ["In workout", "tag tag-danger"],
};
export const OUTCOME: Record<string, [string, string]> = {
  performing: ["Performing", "tag tag-accent"],
  repaid_in_full: ["Repaid in full", "tag tag-success"],
  repaid_after_extension: ["Repaid after extension", "tag tag-warning"],
  in_workout: ["In workout", "tag tag-danger"],
};
export const SERVICER: Record<string, [string, string]> = {
  current: ["Current", "tag tag-success"],
  late: ["Late", "tag tag-warning"],
  paid_in_full: ["Paid in full", "tag tag-neutral"],
  in_workout: ["In workout", "tag tag-danger"],
};
export const SUB_STATUS: Record<string, [string, string]> = {
  requested: ["Requested", "tag tag-warning"],
  documents_sent: ["Documents sent", "tag tag-accent"],
  signed: ["Signed", "tag tag-accent"],
  funded: ["Funded", "tag tag-success"],
  cancelled: ["Cancelled", "tag tag-neutral"],
  declined: ["Declined", "tag tag-danger"],
};
export const INVESTING_AS: Record<string, string> = { individual: "Private investor", family_office: "Family office", entity: "Entity" };
export const initials = (name: string | null | undefined): string => (name || "?").split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
