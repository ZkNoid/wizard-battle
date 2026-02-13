import { useEffect, useRef } from 'react';
import type { Stater } from '../../../../../common/stater/stater';
import type { State } from '../../../../../common/stater/state';
import { WizardId } from '../../../../../common/wizards';
import { useEngineStore } from '@/lib/store/engineStore';
import { EntityType, gameEventEmitter } from '@/engine';
import {
  DEFAULT_USER_POSITION,
  DEFAULT_ENEMY_POSITION,
  SPECTRAL_ENTITY_ID,
  OPPONENT_SPECTRAL_ENTITY_ID,
  DECOY_ENTITY_ID,
} from '../constants';

interface UseEntityManagementProps {
  stater: Stater | null;
  opponentState: State | null;
  hasSpectralProjectionEffect: () => boolean;
  hasOpponentSpectralProjectionEffect: () => boolean;
  getDecoyEffect: () => { x: number; y: number } | null;
}

export function useEntityManagement({
  stater,
  opponentState,
  hasSpectralProjectionEffect,
  hasOpponentSpectralProjectionEffect,
  getDecoyEffect,
}: UseEntityManagementProps) {
  const {
    addEntity,
    getAllEntities,
    initMovementHandler,
    clearEntities,
    removeEntity,
    getEntity,
  } = useEngineStore();

  const isInitialized = useRef<boolean>(false);

  // Get all entities for rendering
  const entities = getAllEntities();

  // Initialize user and enemy entities
  useEffect(() => {
    const cleanupMovement = initMovementHandler();

    if (!isInitialized.current) {
      const user = {
        id: 'user',
        type:
          stater?.state.wizardId.toString() === WizardId.MAGE.toString()
            ? EntityType.WIZARD
            : stater?.state.wizardId.toString() === WizardId.ARCHER.toString()
              ? EntityType.ARCHER
              : stater?.state.wizardId.toString() === WizardId.PHANTOM_DUELIST.toString()
                ? EntityType.PHANTOM_DUELIST
                : EntityType.WIZARD,
        tilemapPosition: DEFAULT_USER_POSITION,
      };

      addEntity(user);

      const enemy = {
        id: 'enemy',
        type:
          opponentState?.wizardId.toString() === WizardId.MAGE.toString()
            ? EntityType.WIZARD
            : opponentState?.wizardId.toString() === WizardId.ARCHER.toString()
              ? EntityType.ARCHER
              : opponentState?.wizardId.toString() === WizardId.PHANTOM_DUELIST.toString()
                ? EntityType.PHANTOM_DUELIST
                : EntityType.WIZARD,
        tilemapPosition: DEFAULT_ENEMY_POSITION,
      };

      addEntity(enemy);

      isInitialized.current = true;
    }

    return () => {
      cleanupMovement();
      clearEntities();
      isInitialized.current = false;
    };
  }, [initMovementHandler, addEntity, clearEntities, stater, opponentState]);

  // Manage spectral projection entity based on effect presence
  useEffect(() => {
    const hasEffect = hasSpectralProjectionEffect();
    const spectralEntity = getEntity(SPECTRAL_ENTITY_ID);

    if (hasEffect && !spectralEntity) {
      const userPosition = stater?.state?.playerStats?.position?.value;
      const spectral = {
        id: SPECTRAL_ENTITY_ID,
        type: EntityType.SPECTRAL_PHANTOM_DUELIST,
        tilemapPosition: userPosition
          ? { x: +userPosition.x, y: +userPosition.y }
          : DEFAULT_USER_POSITION,
        mirrorEntityId: 'user',
      };
      addEntity(spectral);
      console.log('👻 Created spectral projection entity');
    } else if (!hasEffect && spectralEntity) {
      removeEntity(SPECTRAL_ENTITY_ID);
      console.log('👻 Removed spectral projection entity');
    }
  }, [
    stater?.state?.onEndEffects,
    hasSpectralProjectionEffect,
    getEntity,
    addEntity,
    removeEntity,
    stater?.state?.playerStats?.position?.value,
  ]);

  // Manage opponent spectral projection entity
  useEffect(() => {
    const hasEffect = hasOpponentSpectralProjectionEffect();
    const spectralEntity = getEntity(OPPONENT_SPECTRAL_ENTITY_ID);
    const isOpponentVisible =
      opponentState?.playerStats?.position?.isSome &&
      +opponentState.playerStats.position.isSome === 1;

    if (hasEffect && !spectralEntity && isOpponentVisible) {
      const opponentPosition = opponentState?.playerStats?.position?.value;
      const spectral = {
        id: OPPONENT_SPECTRAL_ENTITY_ID,
        type: EntityType.SPECTRAL_PHANTOM_DUELIST,
        tilemapPosition: opponentPosition
          ? { x: +opponentPosition.x, y: +opponentPosition.y }
          : DEFAULT_ENEMY_POSITION,
        mirrorEntityId: 'enemy',
      };
      addEntity(spectral);
      console.log('👻 Created opponent spectral projection entity');
    } else if (spectralEntity && (!hasEffect || !isOpponentVisible)) {
      removeEntity(OPPONENT_SPECTRAL_ENTITY_ID);
      console.log(
        '👻 Removed opponent spectral projection entity (effect:',
        hasEffect,
        ', visible:',
        isOpponentVisible,
        ')'
      );
    }
  }, [
    opponentState?.onEndEffects,
    hasOpponentSpectralProjectionEffect,
    getEntity,
    addEntity,
    removeEntity,
    opponentState?.playerStats?.position?.value,
    opponentState?.playerStats?.position?.isSome,
  ]);

  // Manage decoy entity based on effect presence
  useEffect(() => {
    const decoyPosition = getDecoyEffect();
    const decoyEntity = getEntity(DECOY_ENTITY_ID);

    if (decoyPosition && !decoyEntity) {
      const decoy = {
        id: DECOY_ENTITY_ID,
        type: EntityType.DECOY,
        tilemapPosition: { x: decoyPosition.x, y: decoyPosition.y },
      };
      addEntity(decoy);
      console.log('🎭 Created decoy entity at', decoyPosition);
    } else if (decoyPosition && decoyEntity) {
      if (
        decoyEntity.tilemapPosition.x !== decoyPosition.x ||
        decoyEntity.tilemapPosition.y !== decoyPosition.y
      ) {
        gameEventEmitter.move(
          DECOY_ENTITY_ID,
          decoyPosition.x,
          decoyPosition.y
        );
      }
    } else if (!decoyPosition && decoyEntity) {
      removeEntity(DECOY_ENTITY_ID);
      console.log('🎭 Removed decoy entity');
    }
  }, [
    stater?.state?.onEndEffects,
    getDecoyEffect,
    getEntity,
    addEntity,
    removeEntity,
  ]);

  return {
    entities,
  };
}

