// hooks/useSimpleTransfer.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type TransferParams = {
  to: string;
  amount: string;
};

/**
 * Dummy function that simulates blockchain transaction
 * Replace this with your real smart account code later
 */
async function simulateBlockchainTransfer(params: TransferParams) {
  console.log('🔵 Simulating blockchain transfer:', params);
  
  // Simulate network delay (1-3 seconds)
  const delay = 1000 + Math.random() * 2000;
  await new Promise(resolve => setTimeout(resolve, delay));
  
  // 90% success rate for testing both success and failure
  if (Math.random() < 0.9) {
    // Generate fake transaction hash (64 hex characters)
    const txHash = '0x' + Array.from({ length: 64 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
    
    console.log('✅ Transaction successful:', txHash);
    return { transactionHash: txHash };
  } else {
    // Simulate failure (10% chance)
    console.log('❌ Transaction failed');
    throw new Error('Insufficient funds for gas');
  }
}

/**
 * React Query hook for executing transfers
 * Returns mutation functions for transaction execution
 */
export function useSimpleTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: TransferParams) => {
      try {
        console.log('🚀 Starting transfer...', params);
        
        // Call dummy blockchain function
        const result = await simulateBlockchainTransfer(params);
        
        console.log('📦 Transaction result:', result);
        toast.success('Transfer successful!');
        return result;
        
      } catch (error) {
        console.error('💥 Transfer failed:', error);
        toast.error(`Transfer failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["walletBalance"] });
    },
  });
}

/**
 * LATER: Replace simulateBlockchainTransfer with your real code:
 * 
 * async function realBlockchainTransfer(params: TransferParams) {
 *   const smartAccountClient = await getClient();
 *   
 *   const hash = await smartAccountClient.sendUserOperation({
 *     account: smartAccountClient.account,
 *     calls: [{
 *       to: params.to,
 *       value: parseEther(params.amount),
 *       data: "0x"
 *     }]
 *   });
 *   
 *   const receipt = await smartAccountClient.waitForUserOperationReceipt({ hash });
 *   return { transactionHash: receipt.receipt.transactionHash };
 * }
 */