"use client";

import dynamic from "next/dynamic";

const Play = dynamic(() => import("@/components/Play"), {
  ssr: false,
  loading: () => <div>Loading…</div>,
});

export default function PlayPage() {
  return <Play />;
}
