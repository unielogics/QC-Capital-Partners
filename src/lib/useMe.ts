"use client";

// Who is looking, and what they may see.
//
// /auth/me says which consoles the login opens; a capital partner's only
// console is "capital", and operators inherit it to preview. /capital/me is
// the member record with the gate (approved? waiting period over?). The
// backend enforces every one of these answers on each request; this hook
// only decides what to draw.

import { useAuth, useUser } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { api, MOCK } from "./api";
import type { AuthMe, Me } from "./types";

export const FUNDING_URL = (process.env.NEXT_PUBLIC_FUNDING_APP_URL ?? "https://app.qualifiedcommercial.com").replace(/\/+$/, "");

export function useToken() {
  const { getToken } = useAuth();
  return async () => (MOCK ? undefined : ((await getToken()) ?? undefined));
}

export function useMe() {
  const { isSignedIn, isLoaded: authLoaded, userId, sessionId } = useAuth();
  const { isLoaded } = useUser();
  const token = useToken();
  const signedIn = MOCK ? true : isSignedIn === true && authLoaded && isLoaded;
  const viewerKey = MOCK ? "mock-capital-viewer" : signedIn && userId && sessionId ? `${userId}:${sessionId}` : null;

  const auth = useQuery({
    queryKey: ["auth-me", viewerKey],
    queryFn: async () => api<AuthMe>("/auth/me", { authToken: await token() }),
    enabled: Boolean(viewerKey),
    staleTime: 60_000,
  });
  const currentAuth = viewerKey && !auth.isError ? auth.data ?? null : null;
  const consoles = currentAuth?.consoles ?? [];
  const canEnter = currentAuth ? (currentAuth.consoles ? consoles.some((c) => c.key === "capital") : currentAuth.role === "capital_partner") : false;

  const cp = useQuery({
    queryKey: ["capital-me", viewerKey],
    queryFn: async () => api<Me>("/capital/me", { authToken: await token() }),
    enabled: Boolean(viewerKey) && canEnter,
    staleTime: 30_000,
  });

  const me = viewerKey && canEnter && !cp.isError ? cp.data ?? null : null;
  return {
    auth: currentAuth,
    viewerKey,
    me,
    consoles,
    canEnter,
    preview: me?.preview ?? false,
    cleared: me?.preview ? true : me?.gate?.cleared ?? false,
    status: me?.status ?? null,
    isResolving: (!MOCK && (!authLoaded || !isLoaded || signedIn && !viewerKey)) || (Boolean(viewerKey) && (auth.isLoading || (canEnter && cp.isLoading))),
    error: viewerKey ? auth.error ?? cp.error ?? null : null,
    refetch: () => {
      if (viewerKey) void auth.refetch();
      if (viewerKey && canEnter) void cp.refetch();
    },
  };
}
