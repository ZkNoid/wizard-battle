/**
 * Script to compute Field hash values for character names
 * Run this to verify the character mapping values
 */

import { CircuitString } from 'o1js';

const characterNames = ['Mage', 'Archer', 'PhantomDuelist'];

console.log('Computing character Field hash values:\n');

for (const name of characterNames) {
  const hash = CircuitString.fromString(name).hash();
  console.log(`${name}:`);
  console.log(`  Hash: ${hash.toString()}`);
  console.log('');
}
