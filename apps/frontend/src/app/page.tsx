"use client";

import { FullscreenLoader } from "@/components/shared/FullscreenLoader";
import dynamic from "next/dynamic";

const Home = dynamic(() => import("./Home"), {
  ssr: false,
  loading: () => <FullscreenLoader />,
});

export default function Page() {
  return <Home />;
}
