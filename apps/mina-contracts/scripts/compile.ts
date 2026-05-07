import { TournamentManager } from '../src/TournamentManager.js';
import { Mina } from 'o1js';
import dotenv from 'dotenv';

dotenv.config();

const MINA_NETWORK_URL =
  process.env.MINA_NETWORK_URL ||
  'https://api.minascan.io/node/devnet/v1/graphql';

const MINA_ARCHIVE_URL =
  process.env.MINA_ARCHIVE_URL ||
  'https://api.minascan.io/archive/devnet/v1/graphql';

const networkId = MINA_NETWORK_URL.includes('mainnet') ? 'mainnet' : 'devnet';

const network = Mina.Network({
  mina: MINA_NETWORK_URL,
  archive: MINA_ARCHIVE_URL,
  networkId: networkId as 'mainnet' | 'devnet',
});

Mina.setActiveInstance(network);

const result = await TournamentManager.compile();

console.log(result.verificationKey);
console.log(result.verificationKey.hash.toString());
