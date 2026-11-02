"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Gate } from "@/components/Gate";
import { useMe } from "@/lib/useMe";

// Home is the gate until the gate clears, then the marketplace.
export default function HomePage() {
  const router = useRouter();
  const { me, cleared, preview, isResolving } = useMe();
  useEffect(() => {
    if (!isResolving && (cleared || preview)) router.replace("/marketplace");
  }, [cleared, preview, isResolving, router]);
  if (isResolving || !me || cleared || preview) return <div className="card elev-sm w-[min(640px,100%)] mx-auto h-40" aria-busy="true" />;
  return <Gate me={me} />;
}
