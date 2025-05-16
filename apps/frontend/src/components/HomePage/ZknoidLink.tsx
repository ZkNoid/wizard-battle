"use client";

import { motion } from "motion/react";
import { Button } from "../shared/Button";
import { ZknoidLogo } from "./assets/zknoid-logo";
import { useRouter } from "next/navigation";
import { SOCIALS } from "@/lib/constants/socials";

export function ZknoidLink() {
  const router = useRouter();
  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, ease: "easeOut", delay: 2.5 }}
      className="flex items-center gap-4"
    >
      <Button
        variant="gray"
        onClick={() => {
          router.push(SOCIALS.zknoidLanding);
        }}
        className="w-70 h-15"
      >
        <ZknoidLogo className="w-22 h-6" />
      </Button>
    </motion.div>
  );
}
