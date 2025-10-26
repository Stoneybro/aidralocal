/* eslint-disable @typescript-eslint/no-explicit-any */
import { TransactionType } from "./indexTypes";
import { UnifiedTransaction } from "./indexTypes";

export function aggregateTransactionHistory(data: any): UnifiedTransaction[] {
  // helpers
  const asBigInt = (v: any, fallback = "0") => {
    try { return BigInt(v ?? fallback); }
    catch { return BigInt(fallback); }
  };

  // Special addresses and selectors (lowercase for comparisons)
  const FAUCET_ADDR = "0xba0d4cf5c094732316bd370445e0571430acfc5d".toLowerCase(); // faucet -> label as faucet-claim
  const PYUSD_ADDR  = "0xcac524bca292aaade2df8a05cc58f0a65b1b3bb9".toLowerCase(); // treat as pyusd token and name as execute
  const DROP_ADDR   = "0xd77d00b7b600f52d84f807a80f723019d6a78535".toLowerCase(); // drop these txs entirely
  const SELECTOR_ZERO = "0x00000000";
  const SELECTOR_SHORT_ZERO = "0x00000";
  const SELECTOR_EMPTYCALL = "0x4e71d92d"; // treated as empty/no-function (native eth style)

  const root = data?.data ?? data ?? {};
  const findArray = (...names: string[]) => {
    for (const n of names) {
      const key = Object.keys(root).find(k => k.toLowerCase() === n.toLowerCase());
      if (!key) continue;
      const v = root[key];
      if (Array.isArray(v)) return v;
      if (v == null) return undefined;
      return [v];
    }
    return undefined;
  };

  const transactions: UnifiedTransaction[] = [];

  // WALLET DEPLOYED (single or array)
  const walletArr = findArray("wallet", "Wallet");
  let walletDeployTs: bigint | undefined;
  if (walletArr && walletArr.length > 0) {
    const w = walletArr[0];
    walletDeployTs = asBigInt(w.createdAt);
    transactions.push({
      type: TransactionType.WALLET_DEPLOYED,
      id: `wallet-deployed-${w.id}`,
      timestamp: walletDeployTs,
      transactionHash: w.createdTxHash,
      owner: w.owner,
      walletAddress: w.id,
      blockNumber: asBigInt(w.createdAtBlock, "0"),
    });
  }

  // normalize helper for target address
  const getTarget = (tx: any) => (tx.target ?? tx.to ?? tx.toAddress ?? "").toString().toLowerCase();

  // helper that respects wallet deployment time
  const isAfterWalletDeploy = (ts: any) => {
    try {
      const t = asBigInt(ts ?? "0");
      if (typeof walletDeployTs === "undefined") return true; // no wallet deploy info => allow
      return t >= walletDeployTs;
    } catch {
      return false;
    }
  };

  // EXECUTE / CONTRACT_CALL transactions (Transaction, Transaction executed, executeTransactions)
  const execArr = findArray("executeTransactions", "transaction", "Transaction", "transactions");
  if (execArr) {
    execArr.forEach((tx: any) => {
      // drop if tx timestamp is before wallet deployment
      if (!isAfterWalletDeploy(tx.timestamp)) return;

      const target = getTarget(tx);

      // Rule: drop txs to DROP_ADDR
      if (target === DROP_ADDR) return;

      // determine base type
      const hasCalldata = !!(tx.data && tx.data.length > 2);
      let txType = hasCalldata ? TransactionType.CONTRACT_CALL : TransactionType.EXECUTE;

      // default token resolution
      let tokenField: any = tx.token ?? null;

      // Rule: faucet call labeling
      const isFaucetCall = target === FAUCET_ADDR;

      // Rule: PYUSD address forces execute and token = pyusd
      if (target === PYUSD_ADDR) {
        tokenField = "pyusd";
        txType = TransactionType.EXECUTE;
      }

      // selectors that mean native ETH/no-function; set token to eth
      const sel = (tx.selector ?? "").toString().toLowerCase();
      if ([SELECTOR_ZERO, SELECTOR_SHORT_ZERO, SELECTOR_EMPTYCALL].includes(sel)) {
        tokenField = "eth";
      }

      const baseRecord: any = {
        type: txType,
        id: tx.id,
        timestamp: asBigInt(tx.timestamp),
        transactionHash: tx.transactionHash,
        token: tokenField,
        value: asBigInt(tx.value ?? tx.amount ?? "0"),
        to: tx.target ?? tx.to,
        recipient: tx.recipient ?? null,
        data: tx.data ?? null,
        selector: tx.selector ?? null,
        success: !!tx.success,
      };

      if (isFaucetCall) baseRecord.label = "faucet-claim";

      transactions.push(baseRecord);
    });
  }

  // EXECUTE BATCH transactions including nested batchExecution.calls
  const batchArr = findArray("executeBatchTransactions", "executeBatchTransactions", "executeBatches", "batchActions");
  if (batchArr) {
    batchArr.forEach((tx: any) => {
      // drop if batch timestamp is before wallet deployment
      if (!isAfterWalletDeploy(tx.timestamp)) return;

      // drop if top-level targets the DROP_ADDR
      const topTarget = getTarget(tx);
      if (topTarget === DROP_ADDR) return;

      const total = tx.totalValue ?? tx.value ?? tx.amount ?? "0";
      const recipients = tx.recipients || tx.recipientsList || [];

      // token resolution for batch top-level
      let tokenField = tx.token ?? null;
      if (topTarget === PYUSD_ADDR) tokenField = "pyusd";

      const batchRecord: any = {
        type: TransactionType.EXECUTE_BATCH,
        id: tx.id,
        timestamp: asBigInt(tx.timestamp),
        transactionHash: tx.transactionHash,
        token: tokenField,
        totalValue: asBigInt(total),
        data: tx.data ?? null,
        recipientsCount: Array.isArray(recipients) ? recipients.length : undefined,
        recipients: Array.isArray(recipients) ? recipients : [],
        success: !!tx.success,
        // new fields supported
        batchSize: tx.batchExecution?.batchSize ? Number(tx.batchExecution.batchSize) : undefined,
      };

      transactions.push(batchRecord);

      // If batchExecution.calls present, push each call as its own execute/contract_call entry
      const calls = tx.batchExecution?.calls ?? tx.calls ?? [];
      if (Array.isArray(calls)) {
        calls.forEach((call: any, idx: number) => {
          // use parent timestamp for call time; skip if before wallet deploy
          if (!isAfterWalletDeploy(tx.timestamp)) return;

          const callTarget = (call.target ?? "").toString().toLowerCase();
          if (callTarget === DROP_ADDR) return; // drop calls to DROP_ADDR

          // call selector checks for native eth
          const callSel = (call.selector ?? "").toString().toLowerCase();
          let callToken: any = call.token ?? tokenField ?? null;
          if ([SELECTOR_ZERO, SELECTOR_SHORT_ZERO, SELECTOR_EMPTYCALL].includes(callSel)) {
            callToken = "eth";
          }
          if (callTarget === PYUSD_ADDR) callToken = "pyusd";

          transactions.push({
            type: (call.data && call.data.length > 2) ? TransactionType.CONTRACT_CALL : TransactionType.EXECUTE,
            id: `${tx.id}-call-${idx}`,
            timestamp: asBigInt(tx.timestamp), // batch call timestamp uses parent timestamp
            transactionHash: tx.transactionHash,
            token: callToken,
            value: asBigInt(call.value ?? call.amount ?? "0"),
            to: call.target,
            data: call.data ?? null,
            selector: call.selector ?? null,
            success: !!call.success,

          });
        });
      }
    });
  }

  // INTENT EXECUTIONS (supports additional intent fields like interval, duration, lastExecutedAt)
  const intentExecArr = findArray("intentExecutions", "IntentExecution", "IntentExecuted", "intentExecuted");
  if (intentExecArr) {
    intentExecArr.forEach((exe: any) => {
      // drop if execution timestamp is before wallet deployment
      if (!isAfterWalletDeploy(exe.timestamp)) return;

      // skip if top-level execution target is DROP_ADDR (defensive)
      const exeTarget = getTarget(exe);
      if (exeTarget === DROP_ADDR) return;

      const transfers = (exe.transfers || []).map((t: any) => ({
        address: t.recipient,
        amount: asBigInt(t.amount ?? "0"),
        token: t.token ?? null,
        success: !!t.success,
      }));

      transactions.push({
        type: TransactionType.INTENT_EXECUTED,
        id: exe.id,
        timestamp: asBigInt(exe.timestamp),
        transactionHash: exe.transactionHash,
        intentId: exe.intent?.id ?? null,
        intentName: exe.intent?.name ?? null,
        token: exe.intent?.token ?? exe.token ?? null,
        totalValue: asBigInt(exe.totalValue ?? exe.totalValueTransferred ?? exe.totalValueTransferred ?? "0"),
        transactionCount: asBigInt(exe.transactionCount ?? "0"),
        recipientCount: typeof exe.intent?.recipientCount !== "undefined" ? exe.intent.recipientCount : (transfers.length || 0),
        recipients: transfers,
        successfulTransfers: exe.successfulTransfers ?? 0,
        failedTransfers: exe.failedTransfers ?? 0,
        failedAmount: asBigInt(exe.failedAmount ?? exe.totalFailedAmount ?? "0"),
        // guarded additional fields from new payload
        interval:asBigInt(exe.intent.interval),
        duration:  asBigInt(exe.intent.duration) ,
      });
    });
  }

  // INTENT CREATED / CANCELLED with new fields
  const intentCreatedArr = findArray("intentsCreated", "Intent", "intents", "intentsCreated");
  if (intentCreatedArr) {
    intentCreatedArr.forEach((intent: any) => {
      // drop if intent createdAt is before wallet deployment
      if (!isAfterWalletDeploy(intent.createdAt ?? intent.timestampCreated ?? intent.createdAtBlock)) return;

      const start = intent.transactionStartTime ?? intent.startTime ?? "0";
      const end = intent.transactionEndTime ?? intent.endTime ?? "0";
      const duration = (() => {
        try { return asBigInt(end) - asBigInt(start); } catch { return BigInt(0); }
      })();

      transactions.push({
        type: TransactionType.INTENT_CREATED,
        id: `intent-created-${intent.id}`,
        timestamp: asBigInt(intent.createdAt ?? intent.timestampCreated ?? "0"),
        transactionHash: intent.createdTxHash ?? intent.transactionHash ?? null,
        intentId: intent.id,
        intentName: intent.name ?? null,
        token: intent.token ?? null,
        totalValue: asBigInt(intent.totalCommitment ?? intent.totalValue ?? "0"),
        recipientCount: intent.recipientCount ?? 0,
        totalTransactionCount: asBigInt(intent.totalTransactionCount ?? intent.totalTransactionCount ?? "0"),
        interval: asBigInt(intent.interval ?? "0"),
        duration,
        startTime: asBigInt(start),
        endTime: asBigInt(end),
        status: intent.status ?? null,
      });

      if ((intent.status ?? "").toUpperCase() === "CANCELLED" && intent.cancelledAt) {
        transactions.push({
          type: TransactionType.INTENT_CANCELLED,
          id: `intent-cancelled-${intent.id}`,
          timestamp: asBigInt(intent.cancelledAt),
          transactionHash: intent.cancelledTxHash ?? null,
          intentId: intent.id,
          intentName: intent.name ?? null,
          token: intent.token ?? null,
          totalValue: asBigInt(intent.totalCommitment ?? intent.totalValue ?? "0"),
          recipientCount: intent.recipientCount ?? 0,
          totalTransactionCount: asBigInt(intent.totalTransactionCount ?? "0"),
          interval: asBigInt(intent.interval ?? "0"),
          duration,
          amountRefunded: intent.amountRefunded ? asBigInt(intent.amountRefunded) : undefined,
          failedAmountRecovered: intent.failedAmountRecovered ? asBigInt(intent.failedAmountRecovered) : undefined,
          createdAt: asBigInt(intent.createdAt ?? "0"),
        });
      }
    });
  }

  // final sort desc by timestamp
  return transactions.sort((a, b) => {
    if (a.timestamp > b.timestamp) return -1;
    if (a.timestamp < b.timestamp) return 1;
    return 0;
  });
}


