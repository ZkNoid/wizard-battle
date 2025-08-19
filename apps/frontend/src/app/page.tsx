"use client";

import dynamic from "next/dynamic";

const Home = dynamic(() => import("./Home"), {
  ssr: false,
  loading: () => <div>Loading…</div>,
});

export default function Page() {
  return <Home />;
}
