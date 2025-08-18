import { Field } from "o1js";
import { WizardId } from "../../wizards";
import { type SpellCast, SpellStats } from "../structs";
import type { State } from "../state";

export interface ISpell {
  id: Field;
  wizardId: Field;
  cooldown: Field;
  name: string;
  description: string;
  image: string;
  modifyer: (state: State, spellCast: SpellCast<any>) => void;
  defaultValue: SpellStats;
}
