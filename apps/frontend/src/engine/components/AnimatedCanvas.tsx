import { useRef, useEffect, useState } from 'react';
import type { Animation } from '../types/animation';
import {
  setupHighQualityCanvas,
  calculateAspectRatioFit,
  getDevicePixelRatio,
} from '../utils/canvasUtils';
import { gameEventEmitter } from '../gameEventEmitter';

interface AnimatedCanvasProps {
  animation: Animation;
  image: HTMLImageElement;
  width?: number;
  height?: number;
  playing?: boolean;
  onAnimationComplete?: () => void;
  className?: string;
  scale?: number;
  entityId?: string; // For emitting animation complete events
}

export function AnimatedCanvas({
  animation,
  image,
  width,
  height,
  playing = true,
  onAnimationComplete,
  className = '',
  scale,
  entityId,
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
  const [pendingCompleteEvent, setPendingCompleteEvent] = useState<{
    entityId: string;
    animationName: string;
  } | null>(null);
  const lastTimeRef = useRef<number>(0);
  const devicePixelRatio = useRef<number>(getDevicePixelRatio());

  // Effect to handle container size changes and DPI
  useEffect(() => {
    if (!containerRef.current) return;

    const updateCanvasSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const newWidth = width || Math.floor(rect.width);
        const newHeight = height || Math.floor(rect.height);

        // Update device pixel ratio in case it changed
        devicePixelRatio.current = getDevicePixelRatio();

        setCanvasSize({ width: newWidth, height: newHeight });
      }
    };

    // Initial size
    updateCanvasSize();

    // Create ResizeObserver to watch for container size changes
    const resizeObserver = new ResizeObserver(() => {
      updateCanvasSize();
    });

    // Listen for changes in device pixel ratio (when moving between monitors)
    const mediaQuery = window.matchMedia(
      `(resolution: ${devicePixelRatio.current}dppx)`
    );
    const handleDPIChange = () => {
      updateCanvasSize();
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleDPIChange);
    }

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleDPIChange);
      }
    };
  }, [width, height]);

  // Effect to handle pending animation complete events
  useEffect(() => {
    if (pendingCompleteEvent) {
      gameEventEmitter.animationComplete(
        pendingCompleteEvent.entityId,
        pendingCompleteEvent.animationName
      );
      setPendingCompleteEvent(null);
    }
  }, [pendingCompleteEvent]);

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

          // If animation is finished and should not loop (including one-shot animations)
          if (nextFrameIndex === 0 && (!animation.loop || animation.oneTime)) {
            if (onAnimationComplete) {
              onAnimationComplete();
            }

            // Schedule animation complete event for entity system (async to avoid render conflicts)
            if (entityId && animation.name) {
              setPendingCompleteEvent({
                entityId,
                animationName: animation.name,
              });
            }

            // For one-shot animations, stop playing after completion
            if (animation.oneTime) {
              setCurrentFrameIndex(animation.frames.length - 1); // Stay on last frame
              return prev;
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

    const dpr = devicePixelRatio.current;
    const frame = animation.frames[currentFrameIndex];
    if (!frame) return;

    // Calculate optimal scaling to maintain aspect ratio
    const sourceWidth = frame.frame.w;
    const sourceHeight = frame.frame.h;

    // Apply custom scale from animation or prop
    const animationScale = scale ?? animation.scale ?? 1;

    const { width: baseDrawWidth, height: baseDrawHeight } =
      calculateAspectRatioFit(
        sourceWidth,
        sourceHeight,
        canvasSize.width,
        canvasSize.height
      );

    // Apply the custom scale
    const drawWidth = baseDrawWidth * animationScale;
    const drawHeight = baseDrawHeight * animationScale;

    // Calculate the required canvas size to accommodate the scaled animation
    const requiredCanvasWidth = Math.max(canvasSize.width, drawWidth);
    const requiredCanvasHeight = Math.max(canvasSize.height, drawHeight);

    // Set up canvas for high quality rendering with adjusted size
    setupHighQualityCanvas(
      canvas,
      ctx,
      requiredCanvasWidth,
      requiredCanvasHeight,
      dpr
    );

    // Clear canvas
    ctx.clearRect(0, 0, requiredCanvasWidth, requiredCanvasHeight);

    // Recalculate offset to center the scaled sprite in the potentially larger canvas
    const offsetX = (requiredCanvasWidth - drawWidth) / 2;
    const offsetY = (requiredCanvasHeight - drawHeight) / 2;

    // Draw current frame with proper scaling
    ctx.drawImage(
      image,
      frame.frame.x, // source x
      frame.frame.y, // source y
      sourceWidth, // source width
      sourceHeight, // source height
      offsetX, // destination x (centered)
      offsetY, // destination y (centered)
      drawWidth, // destination width (scaled)
      drawHeight // destination height (scaled)
    );
  }, [image, animation, currentFrameIndex, canvasSize, scale]);

  // Reset animation when animation changes
  useEffect(() => {
    setCurrentFrameIndex(0);
    setElapsedTime(0);
    lastTimeRef.current = 0;
  }, [animation]);

  return (
    <div
      ref={containerRef}
      className={`h-full w-full overflow-visible ${className}`}
    >
      <canvas
        ref={canvasRef}
        className="max-h-none max-w-none"
        style={
          {
            imageRendering: 'pixelated' as any,
            willChange: 'transform',
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          } as React.CSSProperties & {
            imageRendering?: string;
          }
        }
      />
    </div>
  );
}
