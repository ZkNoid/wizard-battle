"use client";

import { Button } from "../shared/Button";
import { motion } from "motion/react";

export default function ConnectWallet() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, ease: "easeOut", delay: 2.5 }}
      className="w-full"
    >
      <Button
        text="Connect Wallet"
        onClick={() => {}}
        className="w-70 h-15 ml-auto text-base font-bold"
      />
    </motion.div>
  );
}
