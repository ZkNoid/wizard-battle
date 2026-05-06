import { IPublicState } from '../../../../common/types/matchmaking.types';
import { IUserAction } from '../../../../common/types/gameplay.types';
import { Wizard, allWizards, WizardId } from '../../../../common/wizards';
import { BaseBotStrategy } from './base-bot.strategy';

/** Absolute HP threshold below which the phantom prioritises a defensive ally spell. */
const PHANTOM_LOW_HP = 60;
/** Phantom is melee → close to 0 distance. */
const PHANTOM_IDEAL_DISTANCE = 0;

/**
 * @title Phantom Duelist Bot Strategy
 * @notice Two actions per turn: positioning + spell.
 * @dev Closes distance to the opponent every turn (melee). Uses a defensive
 *      ally spell (ShadowVeil / SpectralProjection) when HP is low; otherwise
 *      casts the highest-scoring enemy spell evaluated against the projected
 *      post-move position (DusksEmbrace / SpectralArrow / PhantomEcho).
 */
export class PhantomDuelistBotStrategy extends BaseBotStrategy {
  protected getWizard(): Wizard {
    const wizard = allWizards.find(
      (w) => w.id.toString() === WizardId.PHANTOM_DUELIST.toString()
    );
    if (!wizard) throw new Error('PhantomDuelist wizard not found');
    return wizard;
  }

  protected pickActions(
    botId: string,
    currentState: IPublicState,
    opponentState?: IPublicState
  ): IUserAction[] {
    const available = this.getAvailableSpells(currentState);
    if (available.length === 0) return [];

    const p = this.perceive(currentState, opponentState);
    const { allySpells, enemySpells } = this.splitSpells(available);
    const actions: IUserAction[] = [];

    // ── Move: close the gap ─────────────────────────────────────────────────
    let projectedPos = p.selfPos;
    if (p.selfPos && p.selfSpeed > 0) {
      const dest = p.oppPos
        ? this.pickMoveTowards(
            p.selfPos,
            p.oppPos,
            p.selfSpeed,
            PHANTOM_IDEAL_DISTANCE
          )
        : this.randomWalk(p.selfPos, p.selfSpeed);

      if (dest.x !== p.selfPos.x || dest.y !== p.selfPos.y) {
        const moveAction = this.buildMoveAction(botId, dest);
        if (moveAction) {
          actions.push(moveAction);
          projectedPos = dest;
        }
      }
    }

    // ── Defensive: low HP → ally spell (ShadowVeil etc.) ────────────────────
    const lowHp = p.selfHp <= PHANTOM_LOW_HP;
    if (lowHp && allySpells.length > 0) {
      const pick = allySpells[Math.floor(Math.random() * allySpells.length)]!;
      actions.push(
        this.buildSpellAction(
          botId,
          pick.spellId.toString(),
          opponentState,
          undefined,
          currentState
        )
      );
      return actions;
    }

    // ── Offensive: best attack vs projected position ────────────────────────
    const attack = this.pickBestAttack(enemySpells, projectedPos, p.oppPos);
    if (attack) {
      actions.push(
        this.buildSpellAction(
          botId,
          attack.spell.spellId.toString(),
          opponentState,
          attack.targetPos,
          currentState
        )
      );
    } else if (allySpells.length > 0) {
      const pick = allySpells[Math.floor(Math.random() * allySpells.length)]!;
      actions.push(
        this.buildSpellAction(
          botId,
          pick.spellId.toString(),
          opponentState,
          undefined,
          currentState
        )
      );
    }

    return actions;
  }
}
