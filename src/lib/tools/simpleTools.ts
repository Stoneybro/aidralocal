// lib/tools/simple-transfer-tool.ts
import { tool } from 'ai';
import { z } from 'zod';

/**
 * Simple single transfer tool
 * Parses user input and prepares for execution
 */
export const singleTransferTool = tool({
  description: 'Send ETH to a single address. Use this when user wants to transfer crypto to one recipient.',
  
  inputSchema: z.object({
    to: z.string().describe('Recipient Ethereum address (0x...)'),
    amount: z.string().describe('Amount in ETH (e.g., "0.1")'),
  }),
  
  execute: async ({ to, amount }) => {
    // Simple validation
    if (!to.startsWith('0x') || to.length !== 42) {
      throw new Error('Invalid Ethereum address');
    }
    
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      throw new Error('Invalid amount');
    }
    
    // Return data for user confirmation
    return {
      status: 'pending_confirmation',
      details: {
        to,
        amount,
        estimatedGas: '0.001', // Dummy gas estimate
      },
      message: 'Transfer ready. Please confirm to proceed.',
    };
  },
});

// Export as a tool set (AI SDK expects this format)
export const simpleToolSet = {
  sendETH: singleTransferTool,
};