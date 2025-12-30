import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ScrollBar } from './assets/scroll-bar';
import { ScrollTrigger } from './assets/scroll-trigger';

interface ScrollProps {
  className?: string;
  children: ReactNode;
  height?: string;
  scrollbarWidth?: number;
  scrollbarGap?: number;
  alwaysShowScrollbar?: boolean;
}

export function Scroll({
  className = '',
  children,
  height = '400px',
  scrollbarWidth = 24,
  scrollbarGap = 8,
  alwaysShowScrollbar = false,
}: ScrollProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollTrackRef = useRef<HTMLDivElement>(null);
  const [thumbHeight, setThumbHeight] = useState(20);
  const [thumbTop, setThumbTop] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ y: 0, scrollTop: 0 });
  const [showScrollbar, setShowScrollbar] = useState(false);
  const [isScrollable, setIsScrollable] = useState(false);

  // Update scrollbar size and position
  const updateScrollbar = () => {
    if (!contentRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = contentRef.current;

    // Check if scrollbar is needed
    const needsScrollbar = scrollHeight > clientHeight;
    setIsScrollable(needsScrollbar);
    setShowScrollbar(alwaysShowScrollbar || needsScrollbar);

    // Calculate thumb height
    const scrollRatio = clientHeight / scrollHeight;
    const calculatedThumbHeight = Math.max(
      clientHeight * scrollRatio,
      50 // minimum thumb height
    );

    // Calculate thumb position
    const maxScroll = scrollHeight - clientHeight;
    const maxThumbTop = clientHeight - calculatedThumbHeight;
    const calculatedThumbTop =
      maxScroll > 0 ? (scrollTop / maxScroll) * maxThumbTop : 0;

    setThumbHeight(calculatedThumbHeight);
    setThumbTop(calculatedThumbTop);
  };

  // Handle content scroll
  const handleScroll = () => {
    if (!isDragging) {
      updateScrollbar();
    }
  };

  // Start dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!contentRef.current) return;

    setIsDragging(true);
    setDragStart({
      y: e.clientY,
      scrollTop: contentRef.current.scrollTop,
    });
  };

  // Click on track (not on thumb)
  const handleTrackClick = (e: React.MouseEvent) => {
    if (!contentRef.current || !scrollTrackRef.current) return;

    const trackRect = scrollTrackRef.current.getBoundingClientRect();
    const clickY = e.clientY - trackRect.top;

    // Don't react if clicking on the thumb
    if (clickY >= thumbTop && clickY <= thumbTop + thumbHeight) {
      return;
    }

    const { scrollHeight, clientHeight } = contentRef.current;
    const maxScroll = scrollHeight - clientHeight;
    const maxThumbTop = clientHeight - thumbHeight;

    // Scroll to click position
    const targetScrollTop = (clickY / clientHeight) * scrollHeight;
    contentRef.current.scrollTop = Math.min(
      Math.max(0, targetScrollTop),
      maxScroll
    );
  };

  // Handle dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!contentRef.current) return;

      const { scrollHeight, clientHeight } = contentRef.current;
      const maxScroll = scrollHeight - clientHeight;
      const maxThumbTop = clientHeight - thumbHeight;

      // Calculate offset
      const deltaY = e.clientY - dragStart.y;
      const scrollDelta =
        maxScroll > 0 ? (deltaY / maxThumbTop) * maxScroll : 0;

      contentRef.current.scrollTop = Math.min(
        Math.max(0, dragStart.scrollTop + scrollDelta),
        maxScroll
      );
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, thumbHeight]);

  // Update scrollbar on resize
  useEffect(() => {
    const resizeObserver = new ResizeObserver(updateScrollbar);

    if (contentRef.current) {
      resizeObserver.observe(contentRef.current);
      updateScrollbar();
    }

    return () => resizeObserver.disconnect();
  }, [children, alwaysShowScrollbar]);

  return (
    <div className={`relative ${className}`} style={{ height }}>
      {/* Scrollable content */}
      <div
        ref={contentRef}
        onScroll={handleScroll}
        className="scrollbar-hide h-full overflow-y-scroll"
        style={{
          paddingRight:
            showScrollbar || alwaysShowScrollbar
              ? `${scrollbarWidth + scrollbarGap}px`
              : '0',
          scrollbarWidth: 'none', // Firefox
          msOverflowStyle: 'none', // IE
        }}
      >
        {children}
      </div>

      {/* Custom scrollbar */}
      {showScrollbar && (
        <div
          ref={scrollTrackRef}
          className={`absolute right-0 top-0 ${isScrollable ? 'cursor-pointer' : 'cursor-default'}`}
          style={{ width: `${scrollbarWidth}px`, height: '100%' }}
          onClick={isScrollable ? handleTrackClick : undefined}
        >
          {/* Scrollbar track */}
          <div className="absolute inset-0">
            <ScrollBar className="h-full w-full" />
          </div>

          {/* Scroll thumb */}
          <div
            className={`absolute transition-opacity ${isScrollable ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
            style={{
              top: `${thumbTop}px`,
              height: `${thumbHeight}px`,
              width: '36px',
              left: '50%',
              transform: 'translateX(-50%)',
              opacity: isScrollable ? (isDragging ? 1 : 0.8) : 0.5,
            }}
            onMouseDown={isScrollable ? handleMouseDown : undefined}
            onMouseEnter={
              isScrollable
                ? (e) => (e.currentTarget.style.opacity = '1')
                : undefined
            }
            onMouseLeave={
              isScrollable
                ? (e) => {
                    if (!isDragging) e.currentTarget.style.opacity = '0.8';
                  }
                : undefined
            }
          >
            <ScrollTrigger className="h-full w-full" />
          </div>
        </div>
      )}
    </div>
  );
}
