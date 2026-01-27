// import { createConnector } from 'wagmi';
// import {
//   Address,
//   ProviderRpcError,
//   SwitchChainError,
//   UserRejectedRequestError,
// } from 'viem';

// // Extend Window interface for Mina provider
// declare global {
//   interface Window {
//     mina?: {
//       requestAccounts: () => Promise<string[]>;
//       getAccounts: () => Promise<string[]>;
//       requestNetwork: () => Promise<{ chainId: string }>;
//       switchChain: (params: {
//         chainId: string;
//       }) => Promise<{ chainId: string }>;
//       on: (event: string, handler: (data: any) => void) => void;
//       removeListener: (event: string, handler: (data: any) => void) => void;
//       signMessage: (params: { message: string }) => Promise<{
//         signature: { field: string; scalar: string };
//         publicKey: string;
//       }>;
//       sendTransaction: (params: {
//         to: string;
//         amount: number;
//         memo?: string;
//         fee?: number;
//       }) => Promise<{ hash: string }>;
//     };
//   }
// }

// // Mina to EVM address converter (for display purposes in wagmi)
// // This creates a deterministic EVM address from Mina address
// function minaToEvmAddress(minaAddress: string): Address {
//   // Simple hash function to convert Mina address to EVM format
//   // In production, you might want a more sophisticated mapping
//   const hash = Array.from(minaAddress).reduce((acc, char) => {
//     return (acc << 5) - acc + char.charCodeAt(0);
//   }, 0);

//   const hexHash = Math.abs(hash).toString(16).padStart(40, '0').slice(0, 40);
//   return `0x${hexHash}` as Address;
// }

// export function auroWallet() {
//   let _provider: Window['mina'] | undefined;
//   let _accountsChanged: ((accounts: string[]) => void) | undefined;
//   let _chainChanged: ((chainId: string) => void) | undefined;
//   let _disconnect: (() => void) | undefined;

//   return createConnector<Window['mina']>((config) => ({
//     id: 'auro-wallet',
//     name: 'Auro Wallet',
//     type: 'injected' as any,

//     icon: 'https://docs.aurowallet.com/general/~gitbook/image?url=https%3A%2F%2F2203488592-files.gitbook.io%2F%7E%2Ffiles%2Fv0%2Fb%2Fgitbook-x-prod.appspot.com%2Fo%2Fspaces%252FflmFYdr6bJClvjo52m9Y%252Ficon%252Fxc4MIzgttAmnwWWo4ICu%252Flogo-500x.png%3Falt%3Dmedia%26token%3D4cc734df-c563-4b74-8687-81c9945f254a&width=96&height=96&sign=293404e5&sv=2',

//     async setup() {
//       // Wait for provider to be available
//       if (typeof window === 'undefined') return;

//       const provider = window.mina;
//       if (provider) {
//         _provider = provider;
//       }
//     },

//     async connect({ chainId } = {}) {
//       try {
//         const provider = await this.getProvider();
//         if (!provider) throw new Error('Auro Wallet not installed');

//         const accounts = await provider.requestAccounts();

//         if (!accounts || accounts.length === 0) {
//           throw new UserRejectedRequestError(new Error('No accounts found'));
//         }

//         const minaAccount = accounts[0];
//         const evmAddress = minaToEvmAddress(minaAccount);

//         // Set up event listeners
//         _accountsChanged = this.onAccountsChanged.bind(this);
//         _chainChanged = this.onChainChanged.bind(this);
//         _disconnect = this.onDisconnect.bind(this);

//         provider.on('accountsChanged', _accountsChanged);
//         provider.on('chainChanged', _chainChanged);
//         provider.on('disconnect', _disconnect);

//         // Get current chain ID (Mina specific)
//         let currentChainId = chainId;
//         try {
//           const network = await provider.requestNetwork();
//           currentChainId = parseInt(network.chainId) || 0;
//         } catch (err) {
//           currentChainId = 0; // Default Mina chain ID
//         }

//         // Store the original Mina address for later use
//         config.storage?.setItem('auro.minaAddress', minaAccount);

//         return {
//           accounts: [evmAddress],
//           chainId: currentChainId,
//         };
//       } catch (error) {
//         if ((error as any)?.code === 4001) {
//           throw new UserRejectedRequestError(error as Error);
//         }
//         throw error;
//       }
//     },

//     async disconnect() {
//       const provider = await this.getProvider();
//       if (!provider) return;

//       if (_accountsChanged) {
//         provider.removeListener('accountsChanged', _accountsChanged);
//         _accountsChanged = undefined;
//       }
//       if (_chainChanged) {
//         provider.removeListener('chainChanged', _chainChanged);
//         _chainChanged = undefined;
//       }
//       if (_disconnect) {
//         provider.removeListener('disconnect', _disconnect);
//         _disconnect = undefined;
//       }

//       config.storage?.removeItem('auro.minaAddress');
//     },

//     async getAccounts() {
//       const provider = await this.getProvider();
//       if (!provider) return [];

//       try {
//         const accounts = await provider.getAccounts();
//         if (!accounts || accounts.length === 0) return [];

//         // Convert Mina addresses to EVM format for wagmi
//         return accounts.map(minaToEvmAddress);
//       } catch {
//         return [];
//       }
//     },

//     async getChainId() {
//       const provider = await this.getProvider();
//       if (!provider) return 0;

//       try {
//         const network = await provider.requestNetwork();
//         return parseInt(network.chainId) || 0;
//       } catch {
//         return 0; // Default Mina chain ID
//       }
//     },

//     async getProvider() {
//       if (typeof window === 'undefined') return undefined;

//       if (!_provider) {
//         _provider = window.mina;
//       }

//       return _provider;
//     },

//     async isAuthorized() {
//       try {
//         const provider = await this.getProvider();
//         if (!provider) return false;

//         const accounts = await provider.getAccounts();
//         return !!(accounts && accounts.length > 0);
//       } catch {
//         return false;
//       }
//     },

//     async switchChain({ chainId }) {
//       const provider = await this.getProvider();
//       if (!provider) throw new Error('Auro Wallet not installed');

//       try {
//         await provider.switchChain({ chainId: chainId.toString() });
//         return { id: chainId } as any;
//       } catch (error) {
//         throw new SwitchChainError(error as Error);
//       }
//     },

//     onAccountsChanged(accounts) {
//       if (accounts.length === 0) {
//         config.emitter.emit('disconnect');
//       } else {
//         const minaAccount = accounts[0];
//         const evmAddress = minaToEvmAddress(minaAccount);
//         config.storage?.setItem('auro.minaAddress', minaAccount);
//         config.emitter.emit('change', {
//           accounts: [evmAddress],
//         });
//       }
//     },

//     onChainChanged(chain) {
//       const chainId = parseInt(chain.toString());
//       config.emitter.emit('change', { chainId });
//     },

//     onDisconnect() {
//       config.emitter.emit('disconnect');
//       config.storage?.removeItem('auro.minaAddress');
//     },
//   }));
// }

// // Helper function to get the original Mina address from storage
// export function getMinaAddress(storage: any): string | null {
//   return storage?.getItem('auro.minaAddress') || null;
// }
