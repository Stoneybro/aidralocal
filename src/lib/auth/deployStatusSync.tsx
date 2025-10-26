import { useEffect } from "react";
import useWalletDeployment from "@/hooks/useWalletDeployment";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";

export function DeploymentStatusSync() {
  const { authenticated, ready} = usePrivy();
  const router = useRouter();
  const { data: isDeployed, isLoading: isDeploymentCheckLoading } =
    useWalletDeployment();
  useEffect(() => {
    if (ready && authenticated && !isDeploymentCheckLoading) {
     if (isDeployed) {
       router.push("/wallet");
     }
    }
  }, [ready, isDeployed, isDeploymentCheckLoading, authenticated,router]);

  return null;
}
