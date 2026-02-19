'use client';

import { trackEvent } from './posthog-utils';
import { AnalyticsEvents } from './events';
import type { ScreenLoadProps, ComponentLoadProps } from './types';

// Track page load performance
export function trackPageLoad(screenName: string) {
  if (typeof window === 'undefined') return;

  // Wait for the page to fully load
  if (document.readyState === 'complete') {
    capturePageLoadMetrics(screenName);
  } else {
    window.addEventListener('load', () => capturePageLoadMetrics(screenName), {
      once: true,
    });
  }
}

function capturePageLoadMetrics(screenName: string) {
  if (typeof window === 'undefined' || !window.performance) return;

  const perfData = window.performance.timing;
  const loadTime = perfData.loadEventEnd - perfData.navigationStart;

  const eventName =
    screenName === 'home'
      ? AnalyticsEvents.SCREEN_LOAD_HOME
      : screenName === 'game'
        ? AnalyticsEvents.SCREEN_LOAD_GAME
        : screenName === 'play'
          ? AnalyticsEvents.SCREEN_LOAD_PLAY
          : 'screen_load';

  const properties: ScreenLoadProps = {
    load_time_ms: loadTime,
    screen_name: screenName,
    performance_timing: {
      dns_time: perfData.domainLookupEnd - perfData.domainLookupStart,
      tcp_time: perfData.connectEnd - perfData.connectStart,
      request_time: perfData.responseStart - perfData.requestStart,
      response_time: perfData.responseEnd - perfData.responseStart,
      dom_processing_time: perfData.domComplete - perfData.domLoading,
      dom_content_loaded: perfData.domContentLoadedEventEnd - perfData.navigationStart,
    },
  };

  trackEvent(eventName, properties);
}

// Track component load time
export function trackComponentLoad(componentName: string, startTime: number) {
  if (typeof window === 'undefined') return;

  const duration = performance.now() - startTime;

  const properties: ComponentLoadProps = {
    component_name: componentName,
    duration_ms: Math.round(duration),
  };

  trackEvent(AnalyticsEvents.COMPONENT_LOAD, properties);
}

// Performance monitoring utility
export class PerformanceMonitor {
  private startTime: number;
  private label: string;

  constructor(label: string) {
    this.label = label;
    this.startTime = performance.now();
  }

  end() {
    trackComponentLoad(this.label, this.startTime);
  }
}

// Hook-friendly performance tracker
export function usePerformanceTracker(componentName: string) {
  const startTime = performance.now();

  return {
    trackLoad: () => trackComponentLoad(componentName, startTime),
  };
}
