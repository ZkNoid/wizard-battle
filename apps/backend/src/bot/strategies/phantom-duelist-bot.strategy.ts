import { IPublicState } from '../../../../common/types/matchmaking.types';
import { IUserAction } from '../../../../common/types/gameplay.types';
import { Wizard, allWizards, WizardId } from '../../../../common/wizards';
import { BaseBotStrategy } from './base-bot.strategy';

const LOW_HP_THRESHOLD = 60;

/**
 * @title Phantom Duelist Bot Strategy
 * @notice Bot strategy for the Phantom Duelist wizard.
 * @dev Action pattern: use a defensive ally spell (ShadowVeil etc.) when HP is
 *      low, otherwise attack. Uses generic ally/enemy split — no hardcoded IDs.
 *      Phantom Duelist has no Heal; its ally spells are utility/stealth buffs.
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

    const { allySpells, enemySpells } = this.splitSpells(available);
    const actions: IUserAction[] = [];

    // Read current HP to decide whether to use a defensive ally spell
    let currentHP = 100;
    try {
      const parsed = JSON.parse(currentState.fields);
      currentHP = parseInt(parsed?.playerStats?.hp?.magnitude ?? '100');
    } catch { /* use default */ }

    if (currentHP <= LOW_HP_THRESHOLD && allySpells.length > 0) {
      // Prioritise a defensive/utility ally spell (ShadowVeil, SpectralProjection…)
      const pick = allySpells[Math.floor(Math.random() * allySpells.length)]!;
      actions.push(
        this.buildSpellAction(botId, pick.spellId.toString(), opponentState, undefined, currentState)
      );
    }

    // Fill remaining slot with a random enemy attack spell
    if (actions.length < 2 && enemySpells.length > 0) {
      const pick = enemySpells[Math.floor(Math.random() * enemySpells.length)]!;
      actions.push(
        this.buildSpellAction(botId, pick.spellId.toString(), opponentState, undefined, currentState)
      );
    }

    return actions;
  }
}
