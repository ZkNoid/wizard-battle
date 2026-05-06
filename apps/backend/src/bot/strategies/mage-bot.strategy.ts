import { IPublicState } from '../../../../common/types/matchmaking.types';
import { IUserAction } from '../../../../common/types/gameplay.types';
import { Wizard, allWizards, WizardId } from '../../../../common/wizards';
import { allSpells } from '../../../../common/stater/spells';
import { BaseBotStrategy, BotPosition } from './base-bot.strategy';

/** Ideal Manhattan distance from the opponent (Lightning + FireBall sweet spot). */
const MAGE_IDEAL_DISTANCE = 1;
const MAGE_LOW_HP_RATIO = 0.5;
/** Manhattan distance above which Teleport is preferred over walking. */
const MAGE_TELEPORT_GAP = 4;

/**
 * @title Mage Bot Strategy
 * @notice Two actions per turn: positioning + spell.
 * @dev Positioning: Teleport adjacent to opponent when the gap is large and
 *      Teleport is ready; otherwise walk one step toward them.
 *      Spell:  Heal at low HP → otherwise highest-scoring enemy spell
 *      (Lightning > FireBall > Laser, evaluated for AOE overlap).
 */
export class MageBotStrategy extends BaseBotStrategy {
  protected getWizard(): Wizard {
    const wizard = allWizards.find(
      (w) => w.id.toString() === WizardId.MAGE.toString()
    );
    if (!wizard) throw new Error('Mage wizard not found');
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

    // ── Resolve positioning ────────────────────────────────────────────────
    const teleportSpell = allySpells.find((s) => {
      const def = allSpells.find(
        (d) => d.id.toString() === s.spellId.toString()
      );
      return def?.name === 'Teleport';
    });
    const healSpell = allySpells.find((s) => {
      const def = allSpells.find(
        (d) => d.id.toString() === s.spellId.toString()
      );
      return def?.name === 'Heal';
    });

    const distToOpp =
      p.selfPos && p.oppPos
        ? Math.abs(p.selfPos.x - p.oppPos.x) +
          Math.abs(p.selfPos.y - p.oppPos.y)
        : 0;

    let projectedPos: BotPosition | null = p.selfPos;
    let usedAllyAsMovement = false;

    if (
      teleportSpell &&
      p.oppPos &&
      distToOpp > MAGE_TELEPORT_GAP
    ) {
      // Teleport adjacent to the opponent (within map bounds).
      const target = this.adjacentTile(p.oppPos);
      actions.push(
        this.buildSpellAction(
          botId,
          teleportSpell.spellId.toString(),
          opponentState,
          target,
          currentState
        )
      );
      projectedPos = target;
      usedAllyAsMovement = true;
    } else if (p.selfPos && p.selfSpeed > 0) {
      const dest = p.oppPos
        ? this.pickMoveTowards(
            p.selfPos,
            p.oppPos,
            p.selfSpeed,
            MAGE_IDEAL_DISTANCE
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

    // ── Heal first if low HP (dedicated 2nd action) ─────────────────────────
    const lowHp = p.selfHp <= p.selfMaxHp * MAGE_LOW_HP_RATIO;
    if (lowHp && healSpell && !usedAllyAsMovement) {
      actions.push(
        this.buildSpellAction(
          botId,
          healSpell.spellId.toString(),
          opponentState,
          projectedPos ?? undefined,
          currentState
        )
      );
      return actions;
    }

    // ── Best attack (uses post-move position) ───────────────────────────────
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
    } else if (
      enemySpells.length === 0 &&
      allySpells.length > 0 &&
      !usedAllyAsMovement
    ) {
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

  /** Pick a tile orthogonally adjacent to `pos` that is in-bounds. */
  private adjacentTile(pos: BotPosition): BotPosition {
    const candidates: BotPosition[] = [
      { x: pos.x + 1, y: pos.y },
      { x: pos.x - 1, y: pos.y },
      { x: pos.x, y: pos.y + 1 },
      { x: pos.x, y: pos.y - 1 },
    ].filter(
      (c) => c.x >= 0 && c.y >= 0 && c.x < this.mapSize && c.y < this.mapSize
    );
    if (candidates.length === 0) return pos;
    return candidates[Math.floor(Math.random() * candidates.length)]!;
  }
}
