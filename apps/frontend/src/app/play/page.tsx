"use client";

import { FullscreenLoader } from "@/components/shared/FullscreenLoader";
import dynamic from "next/dynamic";

const Play = dynamic(() => import("@/components/Play"), {
  ssr: false,
  loading: () => <FullscreenLoader />,
});

export default function PlayPage() {
  return <Play />;
}
