import { useCallback } from 'react';
import {
  useAppKit,
  useAppKitAccount,
  useAppKitNetwork,
} from '@reown/appkit/react';
import { encodeAbiParameters } from 'viem';
import { useWriteContract, usePublicClient } from 'wagmi';
import { useInventoryStore } from '@/lib/store';
import { env } from '@/env';
import { json } from 'stream/consumers';

const COMMIT_BATCH_ABI = [
  {
    type: 'function',
    name: 'commitBatch',
    inputs: [{ name: 'batch', type: 'bytes[]', internalType: 'bytes[]' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const;

const gameRegistryAddress =
  env.NEXT_PUBLIC_GAME_REGISTRY_ADDRESS as `0x${string}`;

export function useInventorySync() {
  const { address } = useAppKitAccount();
  // const { caipNetwork } = useAppKitNetwork();
  const { open } = useAppKit();
  const { mutateAsync: writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const processInventoryData = useCallback(
    async (data: any) => {
      console.log('Account:', address);
      if (!address) {
        void open();
        return;
      }
      // console.log('Current Network:', caipNetwork?.name, caipNetwork?.id);

      console.log('Processing inventory data for sync:', JSON.stringify(data));

      const batch: `0x${string}`[] = [];

      for (const batchItem of data.signedData as {
        resourceHash: `0x${string}`;
        commit: `0x${string}`;
        signature: `0x${string}`;
      }[]) {
        console.log('Encoding batch resourceHash:', batchItem.resourceHash);
        console.log('Encoding batch commit:', batchItem.commit);
        console.log('Encoding batch signature:', batchItem.signature);

        const encoded = encodeAbiParameters(
          [
            { name: 'resourceHash', type: 'bytes32' },
            { name: 'commit', type: 'bytes' },
            { name: 'signature', type: 'bytes' },
          ],
          [batchItem.resourceHash, batchItem.commit, batchItem.signature]
        );
        batch.push(encoded);
        //if (batch.length >= 2) break;
      }
      console.log('Encoded batch data:', batch);
      console.log('gameRegistryAddress:', gameRegistryAddress);

      const CHUNK_SIZE = 5;
      const chunks: `0x${string}`[][] = [];
      for (let i = 0; i < batch.length; i += CHUNK_SIZE) {
        chunks.push(batch.slice(i, i + CHUNK_SIZE));
      }
      console.log(
        `Sending ${batch.length} items in ${chunks.length} chunk(s) of up to ${CHUNK_SIZE}`
      );

      for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
        const chunk = chunks[chunkIndex]!;
        let receipt = undefined;
        try {
          console.log(
            `Submitting chunk ${chunkIndex + 1}/${chunks.length} (${chunk.length} items)`
          );
          const txHash = await writeContractAsync({
            address: gameRegistryAddress,
            abi: COMMIT_BATCH_ABI,
            functionName: 'commitBatch',
            args: [chunk],
          });
          console.log(`Chunk ${chunkIndex + 1} transaction submitted:`, txHash);
          alert(
            `Chunk ${chunkIndex + 1}/${chunks.length} submitted: ${txHash}`
          );

          receipt = await publicClient!.waitForTransactionReceipt({
            hash: txHash,
          });
          console.log(
            `Chunk ${chunkIndex + 1} confirmed:`,
            receipt.status,
            receipt.transactionHash
          );
          alert(
            `Chunk ${chunkIndex + 1}/${chunks.length} confirmed: ${receipt.transactionHash}`
          );
        } catch (error) {
          console.log(`Chunk ${chunkIndex + 1} failed:`, error);
          alert(
            `Chunk ${chunkIndex + 1}/${chunks.length} failed: ${receipt?.transactionHash}, error: ${error}`
          );
          break;
        }
      }
    },
    [address, writeContractAsync, publicClient]
  );

  return { processInventoryData };
}
