'use client';

import Image from 'next/image';
import { motion } from 'motion/react';
import { useState, useEffect } from 'react';

export function FullscreenLoader({
  text = 'Loading',
  showWizard = true,
  showTitle = false,
}: {
  text?: string;
  showWizard?: boolean;
  showTitle?: boolean;
}) {
  const [imagesLoaded, setImagesLoaded] = useState({
    background: false,
    wizard: false,
    title: false,
  });

  // Подсчитываем, сколько изображений нужно загрузить
  const totalImages = 1 + (showWizard ? 1 : 0) + (showTitle ? 1 : 0);
  const loadedImages =
    (imagesLoaded.background ? 1 : 0) +
    (showWizard && imagesLoaded.wizard ? 1 : 0) +
    (showTitle && imagesLoaded.title ? 1 : 0);

  const allImagesLoaded = loadedImages === totalImages;

  return (
    <div className="absolute inset-0 z-[9999] h-screen w-full overflow-hidden bg-black">
      {showTitle && (
        <Image
          src="/loading/title.png"
          alt="title"
          unoptimized={true}
          quality={100}
          width={3840}
          height={2160}
          className={`z-2 pixel-art absolute inset-0 size-full object-fill object-center transition-opacity duration-300 ${
            allImagesLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setImagesLoaded((prev) => ({ ...prev, title: true }))}
        />
      )}
      {showWizard && (
        <Image
          src="/loading/wizard.png"
          alt="wizard"
          unoptimized={true}
          quality={100}
          width={3840}
          height={2160}
          className={`z-1 pixel-art absolute inset-0 size-full object-fill object-center transition-opacity duration-300 ${
            allImagesLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setImagesLoaded((prev) => ({ ...prev, wizard: true }))}
        />
      )}
      <Image
        src="/loading/background.png"
        alt="background"
        unoptimized={true}
        quality={100}
        width={3840}
        height={2160}
        className={`-z-1 pixel-art absolute inset-0 size-full object-fill object-center transition-opacity duration-300 ${
          allImagesLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={() =>
          setImagesLoaded((prev) => ({ ...prev, background: true }))
        }
      />
      <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center justify-center gap-1">
        <span className="font-pixel text-4xl font-bold text-[#ACB0BC]">
          {text}
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
    </div>
  );
}
