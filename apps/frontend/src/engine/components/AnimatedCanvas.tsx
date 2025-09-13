import React, { useRef, useEffect, useState } from 'react';
import type { Animation } from '../types/animation';

interface AnimatedCanvasProps {
  animation: Animation;
  image: HTMLImageElement;
  width?: number;
  height?: number;
  playing?: boolean;
  onAnimationComplete?: () => void;
  className?: string;
}

export function AnimatedCanvas({
  animation,
  image,
  width,
  height,
  playing = true,
  onAnimationComplete,
  className = '',
}: AnimatedCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [canvasSize, setCanvasSize] = useState({
    width: width || 64,
    height: height || 64,
  });
  const lastTimeRef = useRef<number>(0);

  // Effect to handle container size changes
  useEffect(() => {
    if (!containerRef.current) return;

    const updateCanvasSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const newWidth = width || Math.floor(rect.width);
        const newHeight = height || Math.floor(rect.height);

        setCanvasSize({ width: newWidth, height: newHeight });
      }
    };

    // Initial size
    updateCanvasSize();

    // Create ResizeObserver to watch for container size changes
    const resizeObserver = new ResizeObserver(() => {
      updateCanvasSize();
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [width, height]);

  useEffect(() => {
    if (!playing) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const animate = (currentTime: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = currentTime;
      }

      const deltaTime = currentTime - lastTimeRef.current;
      lastTimeRef.current = currentTime;

      setElapsedTime((prev) => {
        const newElapsed = prev + deltaTime;
        const currentFrame = animation.frames[currentFrameIndex];

        if (currentFrame && newElapsed >= currentFrame.duration) {
          const nextFrameIndex =
            (currentFrameIndex + 1) % animation.frames.length;

          // If animation is finished and should not loop
          if (nextFrameIndex === 0 && !animation.loop) {
            if (onAnimationComplete) {
              onAnimationComplete();
            }
            return prev;
          }

          setCurrentFrameIndex(nextFrameIndex);
          return 0;
        }

        return newElapsed;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animation, currentFrameIndex, playing, onAnimationComplete]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image.complete) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clearing canvas
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

    const frame = animation.frames[currentFrameIndex];

    if (!frame) return;

    // Drawing current frame
    ctx.drawImage(
      image,
      frame.frame.x, // source x
      frame.frame.y, // source y
      frame.frame.w, // source width
      frame.frame.h, // source height
      0, // destination x
      0, // destination y
      canvasSize.width, // destination width
      canvasSize.height // destination height
    );
  }, [image, animation, currentFrameIndex, canvasSize]);

  // Reset animation when animation changes
  useEffect(() => {
    setCurrentFrameIndex(0);
    setElapsedTime(0);
    lastTimeRef.current = 0;
  }, [animation]);

  return (
    <div ref={containerRef} className={`h-full w-full ${className}`}>
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className="h-full w-full"
        style={{
          imageRendering: 'pixelated',
        }}
      />
    </div>
  );
}
