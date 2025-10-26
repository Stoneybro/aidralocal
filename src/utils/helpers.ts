
import { readContract } from "@/lib/server";
import { zeroAddress, formatUnits } from "viem";
import { AidraSmartWalletABI } from "@/lib/abi/AidraSmartWalletAbi";
import { formatNumber } from "./format";




export const PYUSDAddress = "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9";
/**
 * Fetches wallet balances :
 * - availableBalance: spendable funds
 * - committedFunds: locked rewards
 * - totalBalance: total ETH in smart account
 */

export async function fetchWalletBalance(smartAccountAddress: `0x${string}`) {
  const [availableEthBalance, committedEthBalance, availablePyusdBalance, committedPyuBalance] = await Promise.all([
    readContract({
      address: smartAccountAddress,
      abi:  AidraSmartWalletABI,
      functionName: "getAvailableBalance",
      args: [zeroAddress],
    }),
    readContract({
      address: smartAccountAddress,
      abi:  AidraSmartWalletABI,
      functionName: "s_committedFunds",
      args: [zeroAddress],
    }),
    readContract({
      address: smartAccountAddress,
      abi:  AidraSmartWalletABI,
      functionName: "getAvailableBalance",
      args: [PYUSDAddress],
    }),
    readContract({
      address: smartAccountAddress,
      abi:  AidraSmartWalletABI,
      functionName: "s_committedFunds",
      args: [PYUSDAddress],
    }),
  ]);

  return {
    availableEthBalance: formatNumber(availableEthBalance as bigint),
    committedEthBalance: formatNumber(committedEthBalance as bigint),
    availablePyusdBalance: formatUnits(availablePyusdBalance as bigint,6),
    committedPyusdBalance: formatUnits(committedPyuBalance as bigint,6),
  };
}