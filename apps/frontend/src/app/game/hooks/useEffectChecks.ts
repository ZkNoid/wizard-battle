import { useCallback, useRef, useEffect } from 'react';
import type { Stater } from '../../../../../common/stater/stater';
import type { State } from '../../../../../common/stater/state';
import {
  SPECTRAL_PROJECTION_EFFECT_ID,
  DECOY_EFFECT_ID,
} from '../constants';

interface UseEffectChecksProps {
  stater: Stater | null;
  opponentState: State | null;
}

export function useEffectChecks({
  stater,
  opponentState,
}: UseEffectChecksProps) {
  const staterRef = useRef(stater);
  const opponentStateRef = useRef(opponentState);

  // Keep refs in sync
  useEffect(() => {
    staterRef.current = stater;
  }, [stater]);

  useEffect(() => {
    opponentStateRef.current = opponentState;
  }, [opponentState]);

  // Check if spectral projection effect is active for the player
  const hasSpectralProjectionEffect = useCallback(() => {
    if (!staterRef.current?.state?.onEndEffects) return false;

    return staterRef.current.state.onEndEffects.some((effect) =>
      effect.effectId.equals(SPECTRAL_PROJECTION_EFFECT_ID).toBoolean()
    );
  }, []);

  // Check if opponent has spectral projection effect
  const hasOpponentSpectralProjectionEffect = useCallback(() => {
    if (!opponentStateRef.current?.onEndEffects) return false;

    return opponentStateRef.current.onEndEffects.some((effect) =>
      effect.effectId.equals(SPECTRAL_PROJECTION_EFFECT_ID).toBoolean()
    );
  }, []);

  // Get decoy effect position if active (returns null if no decoy effect)
  const getDecoyEffect = useCallback((): { x: number; y: number } | null => {
    if (!staterRef.current?.state?.onEndEffects) return null;

    const effect = staterRef.current.state.onEndEffects.find((effect) =>
      effect.effectId.equals(DECOY_EFFECT_ID).toBoolean()
    );

    if (!effect) return null;

    // Decode position from param (x = number % 8, y = Math.floor(number / 8))
    const param = +effect.param;
    const x = param % 8;
    const y = Math.floor(param / 8);

    return { x, y };
  }, []);

  return {
    staterRef,
    opponentStateRef,
    hasSpectralProjectionEffect,
    hasOpponentSpectralProjectionEffect,
    getDecoyEffect,
  };
}

