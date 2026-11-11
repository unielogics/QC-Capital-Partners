"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "./api";
import { useToken } from "./useMe";

export function useDocumentLink(scope: string) {
  const token = useToken(), [pending, setPending] = useState(false);
  const active = useRef(scope); active.current = scope;
  const request = useRef<{ controller: AbortController; popup: Window } | null>(null);
  useEffect(() => { setPending(false); return () => { request.current?.controller.abort(); request.current?.popup.close(); request.current = null; }; }, [scope]);
  const open = async (path: string) => {
    if (request.current) return;
    const popup = window.open("about:blank", "_blank");
    if (!popup) throw new Error("Allow a new tab for this document, then try again.");
    popup.opener = null; popup.document.title = "Opening document"; popup.document.body.textContent = "Preparing the document link…";
    const current = { controller: new AbortController(), popup }; request.current = current; setPending(true);
    try {
      const result = await api<{ url: string }>(path, { method: "POST", authToken: await token(), signal: current.controller.signal });
      if (current.controller.signal.aborted || active.current !== scope) return;
      if (popup.closed) throw new Error("The document tab was closed. Select the document again.");
      const url = new URL(result.url, window.location.origin);
      if (!["http:", "https:"].includes(url.protocol)) throw new Error("The document service returned an invalid link.");
      popup.location.replace(url.href);
    } catch (error) { popup.close(); if (!current.controller.signal.aborted) throw error; }
    finally { if (request.current === current) { request.current = null; if (!current.controller.signal.aborted) setPending(false); } }
  };
  return { open, pending };
}
