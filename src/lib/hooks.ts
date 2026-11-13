"use client";

import { useQuery, type QueryKey } from "@tanstack/react-query";
import { api } from "./api";
import { useToken } from "./useMe";

export function useApiQuery<T>(key: QueryKey, path: string, enabled = true, staleTime = 15_000, refetchInterval: number | false = false) {
  const token = useToken();
  return useQuery({ queryKey: key, queryFn: async () => api<T>(path, { authToken: await token() }), enabled, staleTime, refetchInterval, refetchIntervalInBackground: false });
}
