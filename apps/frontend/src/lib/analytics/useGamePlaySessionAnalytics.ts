'use client';

import { useEffect, useRef } from 'react';
import { trackEvent } from './posthog-utils';
import { AnalyticsEvents } from './events';
import type {
  GameActivityHeartbeatProps,
  GamePlaySessionEndProps,
  GamePlaySessionProps,
} from './types';

const HEARTBEAT_MS = 120_000;
const SURFACE: GamePlaySessionProps['surface'] = 'game_battle';

/**
 * Сессия на маршруте /game: старт/конец с duration_ms и редкий heartbeat
 * для распределения активности по времени суток в PostHog.
 */
export function useGamePlaySessionAnalytics() {
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    const start = Date.now();
    startedAtRef.current = start;
    trackEvent(AnalyticsEvents.GAME_PLAY_SESSION_START, {
      surface: SURFACE,
    });

    const onHeartbeat = () => {
      if (typeof document === 'undefined') return;
      const payload: GameActivityHeartbeatProps = {
        surface: SURFACE,
        visible: !document.hidden,
      };
      trackEvent(AnalyticsEvents.GAME_ACTIVITY_HEARTBEAT, payload);
    };

    const intervalId = window.setInterval(onHeartbeat, HEARTBEAT_MS);

    return () => {
      window.clearInterval(intervalId);
      const end = Date.now();
      const startAt = startedAtRef.current ?? end;
      const payload: GamePlaySessionEndProps = {
        surface: SURFACE,
        duration_ms: Math.max(0, end - startAt),
      };
      trackEvent(AnalyticsEvents.GAME_PLAY_SESSION_END, payload);
      startedAtRef.current = null;
    };
  }, []);
}
