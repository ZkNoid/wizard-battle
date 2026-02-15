import * as allNetworks from '@reown/appkit/networks';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { cookieStorage, createStorage } from 'wagmi';
//import { auroWallet } from '@/connectors/AuroConnector';
import { env } from '@/env';

// Get projectId from https://cloud.reown.com
export const projectId = env.NEXT_PUBLIC_REOWN_PROJECT_ID;

if (!projectId) {
  throw new Error(
    'NEXT_PUBLIC_REOWN_PROJECT_ID is not defined. Please set it in your .env.local file. Get your project ID from https://cloud.reown.com'
  );
}
// Define supported networks (excluding Base to avoid Base Account SDK)
export const networks = Object.values(allNetworks).filter(
  (network) =>
    typeof network === 'object' &&
    network !== null &&
    'id' in network &&
    !('name' in network && typeof network.name === 'string' && network.name.toLowerCase().includes('base'))
) as unknown as [allNetworks.AppKitNetwork, ...allNetworks.AppKitNetwork[]];

// Set up Wagmi Adapter with better error handling
export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage,
  }),
  ssr: true,
  projectId,
  networks,
  //connectors: [auroWallet()],
});

// Ensure config is properly initialized
export const config = wagmiAdapter.wagmiConfig;

// Validate the configuration
if (!config) {
  throw new Error('Wagmi config failed to initialize');
}
