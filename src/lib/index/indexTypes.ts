import { aggregateTransactionHistory } from "./txAggregator";


// ============================================
// Unified Transaction History Query
// ============================================

export const UNIFIED_WALLET_HISTORY_QUERY = `
  query GetUnifiedWalletHistory($walletId: String!) {
    # Wallet deployment info
    Wallet(where: { id: { _eq: $walletId } }) {
      id
      owner
      createdAt
      createdTxHash
      createdAtBlock
      totalTransactions
      totalExecutions
      totalIntentExecutions
    }
    
    # Execute transactions (including contract calls)
    Transaction(
      where: {
        wallet_id: { _eq: $walletId }
        actionType: { _eq: "EXECUTE" }
      }
      order_by: [{ timestamp: desc }]
    ) {
      id
      actionType
      token
      value
      amount
      timestamp
      target
      transactionHash
      recipient
      data
      selector
      success
    }
    
    # Execute batch transactions
    executeBatchTransactions: Transaction(
      where: {
        wallet_id: { _eq: $walletId }
        actionType: { _eq: "EXECUTE_BATCH" }
      }
      order_by: [{ timestamp: desc }]
    ) {
      id
      actionType
      token
      value
      amount
      timestamp
      transactionHash
      data
      success
      batchExecution {
        id
        batchSize
        totalValue
        calls {
          id
          target
          value
          selector
          data
          success
        }
      }
    }
    
    # Batch actions (individual WalletAction events with actionType="BATCH")
    batchActions: Transaction(
      where: {
        wallet_id: { _eq: $walletId }
        actionType: { _eq: "BATCH" }
      }
      order_by: [{ timestamp: desc }]
    ) {
      id
      actionType
      target
      value
      selector
      success
      timestamp
      transactionHash
      batchExecution {
        id
        batchSize
        totalValue
      }
    }
    
    # Intent executions with recipients
    IntentExecution(
      where: {
        intent: { wallet_id: { _eq: $walletId } }
      }
      order_by: [{ timestamp: desc }]
    ) {
      id
      transactionCount
      totalValue
      failedAmount
      successfulTransfers
      failedTransfers
      timestamp
      transactionHash
      intent {
        id
        token
        name
        recipientCount
        status
        interval
        duration
      }
      transfers {
        id
        recipient
        amount
        success
        token
      }
    }
    
    # Intents (all statuses)
    Intent(
      where: {
        wallet_id: { _eq: $walletId }
      }
      order_by: [{ createdAt: desc }]
    ) {
      id
      token
      name
      status
      createdAt
      createdTxHash
      totalCommitment
      recipientCount
      totalTransactionCount
      interval
      duration
      transactionStartTime
      transactionEndTime
      executionCount
      totalValueTransferred
      totalFailedAmount
      lastExecutedAt
      cancelledAt
      cancelledTxHash
      amountRefunded
      failedAmountRecovered
    }
    
    # Commitments (for context)
    Commitment(
      where: { wallet_id: { _eq: $walletId } }
      order_by: [{ lastUpdated: desc }]
    ) {
      id
      token
      amount
      lastUpdated
    }
  }
`;


// ============================================
// TypeScript Types for Transaction History
// ============================================

export enum TransactionType {
  WALLET_DEPLOYED = 'WALLET_DEPLOYED',
  EXECUTE = 'EXECUTE',
  EXECUTE_BATCH = 'EXECUTE_BATCH',
  INTENT_EXECUTED = 'INTENT_EXECUTED',
  INTENT_CREATED = 'INTENT_CREATED',
  INTENT_CANCELLED = 'INTENT_CANCELLED',
  CONTRACT_CALL = 'CONTRACT_CALL',
}

export interface BaseTransaction {
  type: TransactionType;
  timestamp: bigint;
  transactionHash: string;
  id: string;
}

export interface WalletDeployedTransaction extends BaseTransaction {
  type: TransactionType.WALLET_DEPLOYED;
  owner: string;
  walletAddress: string;
  blockNumber: bigint;
}

export interface ExecuteTransaction extends BaseTransaction {
  type: TransactionType.EXECUTE | TransactionType.CONTRACT_CALL;
  token: string | null;
  value: bigint;
  to: string;
  recipient?: string;
  data?: string;
  selector?: string;
  success: boolean;
  label?:string;
}

export interface ExecuteBatchTransaction extends BaseTransaction {
  type: TransactionType.EXECUTE_BATCH;
  token: string | null;
  totalValue: bigint;
  batchSize: bigint;
  recipientsCount: number;
  calls: Array<{
    target: string;
    value: bigint;
    selector: string;
    data?: string;
    success: boolean;
  }>;
  data?: string;
  success: boolean;
}

export interface IntentExecutedTransaction extends BaseTransaction {
  type: TransactionType.INTENT_EXECUTED;
  intentId: string;
  intentName: string;
  token: string;
  totalValue: bigint;
  transactionCount: bigint;
  recipientCount: number;
  recipients: Array<{
    address: string;
    amount: bigint;
    success: boolean;
  }>;
  successfulTransfers: number;
  failedTransfers: number;
  failedAmount: bigint;
  interval: bigint;
  duration: bigint;
}

export interface IntentCreatedTransaction extends BaseTransaction {
  type: TransactionType.INTENT_CREATED;
  intentId: string;
  intentName: string;
  token: string;
  totalValue: bigint;
  recipientCount: number;
  totalTransactionCount: bigint;
  interval: bigint;
  duration: bigint;
  startTime: bigint;
  endTime: bigint;
  status: string;
}

export interface IntentCancelledTransaction extends BaseTransaction {
  type: TransactionType.INTENT_CANCELLED;
  intentId: string;
  intentName: string;
  token: string;
  totalValue: bigint;
  recipientCount: number;
  totalTransactionCount: bigint;
  interval: bigint;
  duration: bigint;
  amountRefunded?: bigint;
  failedAmountRecovered?: bigint;
  createdAt: bigint;
}

export type UnifiedTransaction =
  | WalletDeployedTransaction
  | ExecuteTransaction
  | ExecuteBatchTransaction
  | IntentExecutedTransaction
  | IntentCreatedTransaction
  | IntentCancelledTransaction;





