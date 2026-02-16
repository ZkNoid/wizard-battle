import { useState, useCallback, type RefObject } from 'react';
import { Int64, Field } from 'o1js';
import { allSpells, SpellId } from '../../../../../common/stater/spells';
import { Position } from '../../../../../common/stater/structs';
import type { Stater } from '../../../../../common/stater/stater';
import type { State } from '../../../../../common/stater/state';
import type {
  IUserAction,
  IUserActions,
} from '../../../../../common/types/gameplay.types';
import { WizardId } from '../../../../../common/wizards';
import { EventBus } from '@/game/EventBus';
import type { GamePhaseManager } from '@/game/GamePhaseManager';
import { gameEventEmitter } from '@/engine';
import { indexToCoordinates } from '../utils';
import type { ActionInfo } from '../types';

interface UseSpellActionsProps {
  stater: Stater | null;
  opponentState: State | null;
  staterRef: RefObject<Stater | null>;
  opponentStateRef: RefObject<State | null>;
  gamePhaseManager: GamePhaseManager | null;
  setActionSend: (value: boolean) => void;
  setPickedSpellId: (id: Field | null) => void;
  isValidCastPosition: (
    spell: (typeof allSpells)[0],
    x: number,
    y: number
  ) => boolean;
}

export function useSpellActions({
  stater,
  opponentState,
  staterRef,
  opponentStateRef,
  gamePhaseManager,
  setActionSend,
  setPickedSpellId,
  isValidCastPosition,
}: UseSpellActionsProps) {
  const [actionInfo, setActionInfo] = useState<ActionInfo>({
    movementDone: false,
    spellCastDone: false,
  });
  const [preparedActions, setPreparedActions] = useState<IUserAction[]>([]);

  // Reset action state for new turn
  const resetActionState = useCallback(() => {
    setActionInfo({ movementDone: false, spellCastDone: false });
    setPreparedActions([]);
  }, []);

  // Sync state between refs and game event emitter
  const syncState = useCallback(() => {
    if (staterRef.current) {
      const newXAlly = +staterRef.current.state.playerStats.position.value.x;
      const newYAlly = +staterRef.current.state.playerStats.position.value.y;
      gameEventEmitter.move('user', newXAlly, newYAlly);
      gameEventEmitter.move('spectral-user', newXAlly, newYAlly);
    }

    if (opponentStateRef.current) {
      const newXEnemy = +opponentStateRef.current.playerStats.position.value.x;
      const newYEnemy = +opponentStateRef.current.playerStats.position.value.y;
      gameEventEmitter.move('enemy', newXEnemy, newYEnemy);
      gameEventEmitter.move('spectral-enemy', newXEnemy, newYEnemy);
    }
  }, [staterRef, opponentStateRef]);

  // Create a user action for spell casting
  const createUserAction = useCallback(
    (
      spellId: string,
      x: number,
      y: number,
      isEnemy: boolean
    ): IUserAction | null => {
      const spell = allSpells.find((s) => s.id.toString() === spellId);
      if (!spell) {
        console.log('Spell not found');
        return null;
      }

      const cast = spell.cast(
        stater?.state!,
        stater?.state?.playerId!,
        opponentState!.playerId,
        new Position({ x: Int64.from(x), y: Int64.from(y) })
      );

      const targetPlayerId = isEnemy
        ? opponentState?.playerId?.toString()
        : stater?.state?.playerId?.toString();

      if (!targetPlayerId) {
        console.log(`${isEnemy ? 'Opponent' : 'Stater'} state not found`);
        return null;
      }

      return {
        playerId: targetPlayerId,
        spellId: spell.id.toString(),
        caster: stater?.state?.playerId?.toString() ?? '',
        spellCastInfo: JSON.stringify(
          spell.modifierData.toJSON(cast.additionalData)
        ),
      };
    },
    [stater?.state, opponentState]
  );

  // Submit spell action(s) to the game phase manager
  const submitSpellAction = useCallback(
    (
      userAction: IUserAction | null,
      updatedActionInfo: ActionInfo,
      companionAction?: IUserAction | null
    ) => {
      let actions = preparedActions;
      if (userAction) {
        actions = [...actions, userAction];
      }
      if (companionAction) {
        actions = [...actions, companionAction];
      }

      if (!updatedActionInfo.movementDone || !updatedActionInfo.spellCastDone) {
        console.log('Adding to prepared actions');
        if (userAction || companionAction) {
          setPreparedActions(actions);
        }
        return;
      }

      console.log('Submitting actions');

      const userActions: IUserActions = {
        actions,
        signature: '',
      };

      gamePhaseManager?.submitPlayerActions(userActions);
      setActionSend(true);
    },
    [gamePhaseManager, setActionSend, preparedActions]
  );

  // Handle map click for spell casting or movement
  const handleMapClick = useCallback(
    (
      x: number,
      y: number,
      isEnemy: boolean,
      pickedSpellId: Field | null
    ) => {
      console.log(`${isEnemy ? 'Enemy' : 'Ally'} map clicked:`, x, y);

      let spellId: Field | null = pickedSpellId;
      let updatedActionInfo = { ...actionInfo };

      // Default to move spell if no spell is picked and clicking on ally map
      if (!pickedSpellId && !isEnemy) {
        spellId = SpellId['Move'] ? Field.from(SpellId['Move']) : null;
        if (actionInfo.movementDone) {
          console.log('Movement already done');
          return;
        }

        const userX = +stater?.state?.playerStats.position.value.x!;
        const userY = +stater?.state?.playerStats.position.value.y!;
        const speed = +stater?.state?.playerStats.speed!;

        if (Math.abs(userX - x) + Math.abs(userY - y) > speed) {
          console.log('Location is too far away. Speed:', speed);
          return;
        }

        updatedActionInfo = {
          ...actionInfo,
          movementDone: true,
        };
      } else {
        if (actionInfo.spellCastDone) {
          console.log('Spell cast already done');
          return;
        }
        updatedActionInfo = {
          ...actionInfo,
          spellCastDone: true,
        };
      }

      if (!spellId) {
        console.log('No spell picked');
        return;
      }

      // Find the spell
      const spell = allSpells.find(
        (s) => s.id.toString() === spellId.toString()
      );

      if (!spell) {
        console.log('Spell not found');
        return;
      }

      // Emit spell cast event for audio
      EventBus.emit('cast-spell', x, y, spell);

      // Check if target is correct
      if (spell.target === 'enemy' && !isEnemy) {
        console.log('Target is incorrect');
        return;
      }
      if (spell.target === 'ally' && isEnemy) {
        console.log('Target is incorrect');
        return;
      }

      // Check if position is valid for casting (castedArea restriction)
      if (!isValidCastPosition(spell, x, y)) {
        console.log('Position is not valid for casting this spell');
        return;
      }

      let userAction = createUserAction(spellId.toString(), x, y, isEnemy);
      if (!userAction) return;

      // Handle companion spell if present
      let companionAction: IUserAction | null = null;
      if (spell.companionSpellId) {
        const companionSpell = allSpells.find(
          (s) => s.id.toString() === spell.companionSpellId!.toString()
        );
        if (companionSpell) {
          console.log('Creating companion spell action:', companionSpell.name);
          companionAction = createUserAction(
            companionSpell.id.toString(),
            x,
            y,
            false // companion spell targets ally (self)
          );
        }
      }

      setActionInfo(updatedActionInfo);

      console.log(
        'userAction.playerId:',
        userAction.playerId,
        stater?.state?.playerId?.toString()
      );
      if (userAction.playerId === stater?.state?.playerId?.toString()) {
        console.log('Apply actions locally');
        stater!.applyActionsLocally(
          { actions: [userAction], signature: '' },
          opponentState!
        );
        syncState();
        if (spell.globalStatus !== 'global') {
          userAction = null;
        }
      }

      // Apply companion spell locally if it targets self
      if (
        companionAction &&
        companionAction.playerId === stater?.state?.playerId?.toString()
      ) {
        console.log('Apply companion spell locally');
        stater!.applyActionsLocally(
          { actions: [companionAction], signature: '' },
          opponentState!
        );
        syncState();
        const companionSpell = allSpells.find(
          (s) => s.id.toString() === spell.companionSpellId!.toString()
        );
        if (companionSpell?.globalStatus !== 'global') {
          companionAction = null;
        }
      }

      console.log('userAction:', userAction);
      console.log('companionAction:', companionAction);

      // Submit both main and companion actions
      submitSpellAction(userAction, updatedActionInfo, companionAction);

      // Play animation
      gameEventEmitter.playAnimationOneTime(
        'user',
        spell.name.toLowerCase(),
        stater?.state.wizardId.toString() === WizardId.ARCHER.toString()
          ? 4.6
          : 3.6
      );

      // Reset picked spell
      setPickedSpellId(null);
    },
    [
      actionInfo,
      stater,
      opponentState,
      createUserAction,
      submitSpellAction,
      isValidCastPosition,
      setPickedSpellId,
      syncState,
    ]
  );

  // Handlers for tilemap clicks
  const handleTilemapClick = useCallback(
    (index: number, pickedSpellId: Field | null) => {
      const { x, y } = indexToCoordinates(index);
      handleMapClick(x, y, false, pickedSpellId);
    },
    [handleMapClick]
  );

  const handleTilemapClickEnemy = useCallback(
    (index: number, pickedSpellId: Field | null) => {
      const { x, y } = indexToCoordinates(index);
      handleMapClick(x, y, true, pickedSpellId);
    },
    [handleMapClick]
  );

  return {
    actionInfo,
    preparedActions,
    resetActionState,
    syncState,
    handleMapClick,
    handleTilemapClick,
    handleTilemapClickEnemy,
  };
}

