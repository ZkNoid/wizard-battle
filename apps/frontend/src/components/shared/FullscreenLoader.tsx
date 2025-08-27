"use client";

import { motion } from "motion/react";

export function FullscreenLoader() {
  return (
    <div className="pointer-events-none fixed inset-0 z-[1000] h-screen w-screen bg-[url('/background.svg')] bg-cover bg-center bg-no-repeat">
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1000,
          pointerEvents: "none",
        }}
        className="pointer-events-none fixed inset-0 backdrop-blur-lg"
      >
        {/* Animated loader */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            pointerEvents: "none",
          }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{
              repeat: Infinity,
              duration: 1,
              ease: "linear",
            }}
            style={{
              width: 64,
              height: 64,
              border: "8px solid rgba(242, 242, 242, 0.4)",
              borderTop: "8px solid #f2f2f2",
              borderRadius: "50%",
              boxShadow:
                "0 0 20px rgba(242, 242, 242, 0.6), inset 0 0 20px rgba(242, 242, 242, 0.1)",
              filter: "brightness(1.2) contrast(1.3)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
