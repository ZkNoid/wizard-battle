'use client';

import { useEffect, type ReactNode } from 'react';
import { initPostHog, trackEvent } from './posthog-utils';
import { AnalyticsEvents } from './events';

interface PostHogProviderProps {
  children: ReactNode;
}

export function PostHogProvider({ children }: PostHogProviderProps) {
  useEffect(() => {
    // Initialize PostHog
    initPostHog();

    // Track app loaded
    trackEvent(AnalyticsEvents.FUNNEL_APP_LOADED);
    trackEvent(AnalyticsEvents.SESSION_START);
    trackEvent(AnalyticsEvents.GAME_LOADED);
  }, []);

  return <>{children}</>;
}
