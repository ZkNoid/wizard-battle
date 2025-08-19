"use client";
import dynamic from "next/dynamic";

const BaseLayout = dynamic(() => import("@/components/BaseLayout"), {
  ssr: false,
});

export default BaseLayout;
