'use client';

import { useEffect } from 'react';
import posthog from 'posthog-js';
import type { WalletType, UserProperties } from './types';

// Initialize PostHog (should be called once in the app)
export function initPostHog() {
  if (typeof window === 'undefined') return;

  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const apiHost =
    process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://posthog.zknoid.io/';

  if (!apiKey) {
    console.warn('PostHog API key not found. Analytics will not be tracked.');
    return;
  }

  if (!posthog.__loaded) {
    posthog.init(apiKey, {
      api_host: apiHost,
      capture_pageview: false, // We'll track manually
      capture_pageleave: true,
      autocapture: false, // Manual control over events
      disable_session_recording: true, // Session replay disabled
      loaded: (posthog) => {
        if (process.env.NODE_ENV === 'development') {
          posthog.debug();
          console.log('PostHog initialized in debug mode');
        }
      },
    });
  }
}

// Hook to use PostHog instance
export function usePostHog() {
  useEffect(() => {
    initPostHog();
  }, []);

  return posthog;
}

// Identify user with wallet address
export function identifyUser(address: string, walletType: WalletType) {
  if (!posthog.__loaded) return;

  posthog.identify(address, {
    wallet_address: address,
    wallet_type: walletType,
  });
}

// Set user properties
export function setUserProperties(properties: UserProperties) {
  if (!posthog.__loaded) return;

  posthog.people.set(properties);
}

// Track a custom event
export function trackEvent(
  eventName: string,
  properties?: Record<string, any>
) {
  if (!posthog.__loaded) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[PostHog Mock]', eventName, properties);
    }
    return;
  }

  posthog.capture(eventName, properties);
}

// Track page view
export function trackPageView(pageName?: string) {
  if (!posthog.__loaded) return;

  posthog.capture('$pageview', {
    page_name: pageName,
  });
}

// Reset user (on logout)
export function resetUser() {
  if (!posthog.__loaded) return;

  posthog.reset();
}

// Check if PostHog is loaded
export function isPostHogLoaded(): boolean {
  return posthog.__loaded || false;
}
