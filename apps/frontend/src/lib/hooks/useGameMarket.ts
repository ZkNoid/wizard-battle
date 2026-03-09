import { useCallback, useMemo } from 'react';
import { useAppKit, useAppKitAccount } from '@reown/appkit/react';
import {
  useWriteContract,
  usePublicClient,
  useReadContract,
} from 'wagmi';
import { parseEther, formatEther, keccak256, toBytes } from 'viem';
import { useMarketStore } from '@/lib/store/marketStore';

const GAME_MARKET_ADDRESS = process.env
  .NEXT_PUBLIC_GAME_MARKET_ADDRESS as `0x${string}`;

const GAME_MARKET_ABI = [
  {
    type: 'function',
    name: 'createOrder',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
      { name: 'price', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
      { name: 'paymentToken', type: 'address' },
      { name: 'paymentTokenId', type: 'uint256' },
      { name: 'nameHash', type: 'bytes32' },
    ],
    outputs: [{ name: 'orderId', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'fillOrder',
    inputs: [{ name: 'orderId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'cancelOrder',
    inputs: [{ name: 'orderId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'pauseOrder',
    inputs: [{ name: 'orderId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'unpauseOrder',
    inputs: [{ name: 'orderId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getProtocolFee',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'previewTotalPrice',
    inputs: [{ name: 'price', type: 'uint256' }],
    outputs: [{ name: 'totalPrice', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'checkTokenIsAllowed',
    inputs: [{ name: 'token', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
] as const;

const ERC20_ABI = [
  {
    type: 'function',
    name: 'approve',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'allowance',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

const ERC721_ABI = [
  {
    type: 'function',
    name: 'setApprovalForAll',
    inputs: [
      { name: 'operator', type: 'address' },
      { name: 'approved', type: 'bool' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'isApprovedForAll',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'operator', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
] as const;

const ERC1155_ABI = [
  {
    type: 'function',
    name: 'setApprovalForAll',
    inputs: [
      { name: 'operator', type: 'address' },
      { name: 'approved', type: 'bool' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'isApprovedForAll',
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'operator', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
] as const;

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

export function useGameMarket() {
  const { address } = useAppKitAccount();
  const { open } = useAppKit();
  const { writeContractAsync, isPending } = useWriteContract();
  const publicClient = usePublicClient();
  const { removeOrder, updateOrderStatus, loadAll } = useMarketStore();

  const { data: protocolFee } = useReadContract({
    address: GAME_MARKET_ADDRESS,
    abi: GAME_MARKET_ABI,
    functionName: 'getProtocolFee',
  });

  const requireWallet = useCallback(() => {
    if (!address) {
      void open();
      return false;
    }
    return true;
  }, [address, open]);

  const generateNameHash = useCallback((itemName: string): `0x${string}` => {
    return keccak256(toBytes(itemName));
  }, []);

  const previewTotalPrice = useCallback(
    async (price: bigint): Promise<bigint> => {
      if (!publicClient) return price;

      const result = await publicClient.readContract({
        address: GAME_MARKET_ADDRESS,
        abi: GAME_MARKET_ABI,
        functionName: 'previewTotalPrice',
        args: [price],
      });

      return result;
    },
    [publicClient]
  );

  const approveERC20 = useCallback(
    async (tokenAddress: `0x${string}`, amount: bigint) => {
      if (!requireWallet()) return;

      const txHash = await writeContractAsync({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [GAME_MARKET_ADDRESS, amount],
      });

      await publicClient?.waitForTransactionReceipt({ hash: txHash });
      return txHash;
    },
    [requireWallet, writeContractAsync, publicClient]
  );

  const approveNFT = useCallback(
    async (tokenAddress: `0x${string}`, isERC1155 = false) => {
      if (!requireWallet()) return;

      const abi = isERC1155 ? ERC1155_ABI : ERC721_ABI;

      const txHash = await writeContractAsync({
        address: tokenAddress,
        abi,
        functionName: 'setApprovalForAll',
        args: [GAME_MARKET_ADDRESS, true],
      });

      await publicClient?.waitForTransactionReceipt({ hash: txHash });
      return txHash;
    },
    [requireWallet, writeContractAsync, publicClient]
  );

  const createOrder = useCallback(
    async (params: {
      token: `0x${string}`;
      tokenId: bigint;
      price: bigint;
      amount: bigint;
      paymentToken: `0x${string}`;
      paymentTokenId?: bigint;
      itemName: string;
    }) => {
      if (!requireWallet()) return;

      const nameHash = generateNameHash(params.itemName);

      const txHash = await writeContractAsync({
        address: GAME_MARKET_ADDRESS,
        abi: GAME_MARKET_ABI,
        functionName: 'createOrder',
        args: [
          params.token,
          params.tokenId,
          params.price,
          params.amount,
          params.paymentToken,
          params.paymentTokenId ?? 0n,
          nameHash,
        ],
      });

      const receipt = await publicClient?.waitForTransactionReceipt({
        hash: txHash,
      });

      // Refresh market data
      if (address) {
        await loadAll(address);
      }

      return { txHash, receipt };
    },
    [
      requireWallet,
      writeContractAsync,
      publicClient,
      generateNameHash,
      address,
      loadAll,
    ]
  );

  const fillOrder = useCallback(
    async (params: { orderId: bigint; value?: bigint }) => {
      if (!requireWallet()) return;

      const txHash = await writeContractAsync({
        address: GAME_MARKET_ADDRESS,
        abi: GAME_MARKET_ABI,
        functionName: 'fillOrder',
        args: [params.orderId],
        value: params.value,
      });

      const receipt = await publicClient?.waitForTransactionReceipt({
        hash: txHash,
      });

      // Optimistic update
      removeOrder(Number(params.orderId));

      // Refresh market data
      if (address) {
        await loadAll(address);
      }

      return { txHash, receipt };
    },
    [requireWallet, writeContractAsync, publicClient, removeOrder, address, loadAll]
  );

  const cancelOrder = useCallback(
    async (orderId: bigint) => {
      if (!requireWallet()) return;

      const txHash = await writeContractAsync({
        address: GAME_MARKET_ADDRESS,
        abi: GAME_MARKET_ABI,
        functionName: 'cancelOrder',
        args: [orderId],
      });

      const receipt = await publicClient?.waitForTransactionReceipt({
        hash: txHash,
      });

      // Optimistic update
      removeOrder(Number(orderId));

      return { txHash, receipt };
    },
    [requireWallet, writeContractAsync, publicClient, removeOrder]
  );

  const pauseOrder = useCallback(
    async (orderId: bigint) => {
      if (!requireWallet()) return;

      const txHash = await writeContractAsync({
        address: GAME_MARKET_ADDRESS,
        abi: GAME_MARKET_ABI,
        functionName: 'pauseOrder',
        args: [orderId],
      });

      const receipt = await publicClient?.waitForTransactionReceipt({
        hash: txHash,
      });

      // Optimistic update
      updateOrderStatus(Number(orderId), 'PAUSED');

      return { txHash, receipt };
    },
    [requireWallet, writeContractAsync, publicClient, updateOrderStatus]
  );

  const unpauseOrder = useCallback(
    async (orderId: bigint) => {
      if (!requireWallet()) return;

      const txHash = await writeContractAsync({
        address: GAME_MARKET_ADDRESS,
        abi: GAME_MARKET_ABI,
        functionName: 'unpauseOrder',
        args: [orderId],
      });

      const receipt = await publicClient?.waitForTransactionReceipt({
        hash: txHash,
      });

      // Optimistic update
      updateOrderStatus(Number(orderId), 'OPEN');

      return { txHash, receipt };
    },
    [requireWallet, writeContractAsync, publicClient, updateOrderStatus]
  );

  const buyWithETH = useCallback(
    async (orderId: bigint, price: bigint) => {
      const totalPrice = await previewTotalPrice(price);

      return fillOrder({
        orderId,
        value: totalPrice,
      });
    },
    [fillOrder, previewTotalPrice]
  );

  const buyWithERC20 = useCallback(
    async (orderId: bigint, price: bigint, paymentToken: `0x${string}`) => {
      const totalPrice = await previewTotalPrice(price);

      // First approve the payment token
      await approveERC20(paymentToken, totalPrice);

      // Then fill the order (payment token is already stored in the order)
      return fillOrder({ orderId });
    },
    [fillOrder, previewTotalPrice, approveERC20]
  );

  return {
    // State
    address,
    isPending,
    protocolFee,
    marketAddress: GAME_MARKET_ADDRESS,

    // Utilities
    generateNameHash,
    previewTotalPrice,

    // Approvals
    approveERC20,
    approveNFT,

    // Market operations
    createOrder,
    fillOrder,
    cancelOrder,
    pauseOrder,
    unpauseOrder,

    // Convenience methods
    buyWithETH,
    buyWithERC20,
  };
}
