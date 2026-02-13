/**
 * Character ID mapping utility
 * Maps o1js Field hash values to character class names
 *
 * These Field values are computed as CircuitString.fromString(name).hash()
 * in the common/wizards.ts file.
 */

// Known Field hash values for character classes
// These are computed from:
// - WizardId.MAGE = CircuitString.fromString('Mage').hash()
// - WizardId.ARCHER = CircuitString.fromString('Archer').hash()
// - WizardId.PHANTOM_DUELIST = CircuitString.fromString('PhantomDuelist').hash()

export const CHARACTER_FIELD_MAP: Record<string, string> = {
  // Mage
  '26379918934747113910752671224022521101705711975340499383247461462116250414596': 'mage',
  // Archer
  '15534540181895727242040187098877370140191508692714809422489874640175397618910': 'archer',
  // Phantom Duelist
  '24564936149337623604422878336032606485698166923846361280665355107490730228457': 'duelist',
};

/**
 * Converts a character Field hash to its string name
 * @param fieldValue - The Field hash value as string or number
 * @returns The character class name ('mage', 'archer', 'duelist') or 'mage' as default
 */
export function fieldToCharacterName(fieldValue: string | number): string {
  const fieldStr = fieldValue.toString();
  return CHARACTER_FIELD_MAP[fieldStr] || 'mage';
}

/**
 * Extracts character name from player fields JSON
 * @param playerFields - JSON string containing player state fields
 * @returns The character class name or 'mage' as default
 */
export function extractCharacterFromFields(playerFields: string): string {
  try {
    const parsed = JSON.parse(playerFields);
    if (parsed.wizardId) {
      return fieldToCharacterName(parsed.wizardId);
    }
    return 'mage';
  } catch (error) {
    console.error('Failed to parse player fields:', error);
    return 'mage';
  }
}
