import { IPublicState } from '../../../../common/types/matchmaking.types';
import { IUserAction } from '../../../../common/types/gameplay.types';
import { Wizard, allWizards, WizardId } from '../../../../common/wizards';
import { BaseBotStrategy } from './base-bot.strategy';

/** Manhattan distance the archer tries to keep from the opponent. */
const ARCHER_KITE_DISTANCE = 3;
/** HP fraction below which the bot prioritises a defensive utility spell. */
const ARCHER_LOW_HP_RATIO = 0.4;

/**
 * @title Archer Bot Strategy
 * @notice Two actions per turn: move + spell.
 * @dev Movement: kite at ~3 tiles when opp visible, random walk otherwise.
 *      Spell: lowest HP → defensive utility (Decoy/Cloud); else best-scoring
 *      enemy spell against the opponent (AimingShot / HailOfArrows / Arrow).
 */
export class ArcherBotStrategy extends BaseBotStrategy {
  protected getWizard(): Wizard {
    const wizard = allWizards.find(
      (w) => w.id.toString() === WizardId.ARCHER.toString()
    );
    if (!wizard) throw new Error('Archer wizard not found');
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

    // ── Move: kite when opp visible, random walk otherwise ─────────────────
    let projectedPos = p.selfPos;
    if (p.selfPos && p.selfSpeed > 0) {
      const dest = p.oppPos
        ? this.pickMoveTowards(
            p.selfPos,
            p.oppPos,
            p.selfSpeed,
            ARCHER_KITE_DISTANCE
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

    // ── Defensive: low HP → Decoy / Cloud (utility ally spells) ─────────────
    const lowHp = p.selfHp <= p.selfMaxHp * ARCHER_LOW_HP_RATIO;
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

    // ── Offensive: best attack vs (post-move) self position ─────────────────
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
