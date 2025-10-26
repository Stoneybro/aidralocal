/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { aggregateTransactionHistory } from './txAggregator';
import { UnifiedTransaction, TransactionType, UNIFIED_WALLET_HISTORY_QUERY } from './indexTypes';


const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT || 'http://localhost:8080/v1/graphql';

async function fetchGraphQL<T>(query: string, variables?: Record<string, any>): Promise<T> {
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.statusText}`);
  }

  const result = await response.json();
  
  if (result.errors) {
    throw new Error(result.errors[0]?.message || 'GraphQL query error');
  }

  return result.data;
}

// Main hook: Get unified transaction history
export function useUnifiedWalletHistory(
  walletId: string,
  options?: UseQueryOptions<UnifiedTransaction[]>
) {
  return useQuery({
    queryKey: ['unified-wallet-history', walletId],
    queryFn: async () => {
      const data = await fetchGraphQL(UNIFIED_WALLET_HISTORY_QUERY, { 
        walletId: walletId.toLowerCase() 
      });
      return aggregateTransactionHistory(data);
    },
    enabled: !!walletId,
    staleTime: 30000, // 30 seconds
    ...options,
  });
}

// Optional: Paginated version with client-side filtering
export function useUnifiedWalletHistoryPaginated(
  walletId: string,
  options?: {
    pageSize?: number;
    filterTypes?: TransactionType[];
  } & UseQueryOptions<UnifiedTransaction[]>
) {
  const { pageSize = 50, filterTypes, ...queryOptions } = options || {};
  
  return useQuery({
    queryKey: ['unified-wallet-history-paginated', walletId, filterTypes],
    queryFn: async () => {
      const data = await fetchGraphQL(UNIFIED_WALLET_HISTORY_QUERY, { 
        walletId: walletId.toLowerCase() 
      });
      let transactions = aggregateTransactionHistory(data);
      
      // Apply type filters if provided
      if (filterTypes && filterTypes.length > 0) {
        transactions = transactions.filter(tx => filterTypes.includes(tx.type));
      }
      
      return transactions;
    },
    enabled: !!walletId,
    staleTime: 30000,
    ...queryOptions,
  });
}