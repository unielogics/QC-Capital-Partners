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
  const { isSignedIn } = useAuth();
  const { isLoaded } = useUser();
  const token = useToken();
  const signedIn = MOCK ? true : isSignedIn === true;

  const auth = useQuery({
    queryKey: ["auth-me"],
    queryFn: async () => api<AuthMe>("/auth/me", { authToken: await token() }),
    enabled: signedIn,
    staleTime: 60_000,
  });
  const consoles = auth.data?.consoles ?? [];
  const canEnter = auth.data ? (auth.data.consoles ? consoles.some((c) => c.key === "capital") : auth.data.role === "capital_partner") : false;

  const cp = useQuery({
    queryKey: ["capital-me"],
    queryFn: async () => api<Me>("/capital/me", { authToken: await token() }),
    enabled: signedIn && canEnter,
    staleTime: 30_000,
  });

  const me = cp.data ?? null;
  return {
    auth: auth.data ?? null,
    me,
    consoles,
    canEnter,
    preview: me?.preview ?? false,
    cleared: me?.preview ? true : me?.gate?.cleared ?? false,
    status: me?.status ?? null,
    isResolving: (!MOCK && !isLoaded) || (signedIn && (auth.isLoading || (canEnter && cp.isLoading))),
    error: auth.error ?? cp.error ?? null,
    refetch: () => {
      void auth.refetch();
      void cp.refetch();
    },
  };
}
