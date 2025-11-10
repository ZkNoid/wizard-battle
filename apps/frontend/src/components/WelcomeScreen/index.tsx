'use client';

import Image from 'next/image';
import { motion } from 'motion/react';

export default function WelcomeScreen({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="absolute inset-0 z-[9999] h-screen w-full overflow-hidden"
      onClick={onClick}
    >
      <Image
        src="/loading/title.png"
        alt="title"
        unoptimized={true}
        quality={100}
        width={3840}
        height={2160}
        className="z-2 pixel-art absolute inset-0 size-full object-fill object-center"
      />
      <Image
        src="/loading/wizard.png"
        alt="wizard"
        unoptimized={true}
        quality={100}
        width={3840}
        height={2160}
        className="z-1 pixel-art absolute inset-0 size-full object-fill object-center"
      />
      <Image
        src="/loading/background.png"
        alt="background"
        unoptimized={true}
        quality={100}
        width={3840}
        height={2160}
        className="-z-1 pixel-art absolute inset-0 size-full object-fill object-center"
      />
      <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center justify-center gap-1">
        <span className="font-pixel text-4xl font-bold text-[#ACB0BC]">
          Click to start
        </span>
        <div className="flex gap-1">
          <motion.span
            className="font-pixel text-4xl font-bold text-[#ACB0BC]"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{
              duration: 1.4,
              repeat: Infinity,
              ease: 'easeInOut',
              times: [0, 0.5, 1],
            }}
          >
            .
          </motion.span>
          <motion.span
            className="font-pixel text-4xl font-bold text-[#ACB0BC]"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{
              duration: 1.4,
              repeat: Infinity,
              ease: 'easeInOut',
              times: [0, 0.5, 1],
              delay: 0.2,
            }}
          >
            .
          </motion.span>
          <motion.span
            className="font-pixel text-4xl font-bold text-[#ACB0BC]"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{
              duration: 1.4,
              repeat: Infinity,
              ease: 'easeInOut',
              times: [0, 0.5, 1],
              delay: 0.4,
            }}
          >
            .
          </motion.span>
        </div>
      </div>
    </button>
  );
}
