"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import useWalletDeployment from "@/hooks/useWalletDeployment";

export default function LoadingPage() {
  const router = useRouter();
  const { data: isDeployed, isLoading } = useWalletDeployment();

  useEffect(() => {
    if (isLoading) {
      return; // Wait for the check to complete
    }

    if (isDeployed) {
      router.replace("/wallet");
    } else {
      router.replace("/deploy");
    }
  }, [isDeployed, isLoading, router]);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center">
      <p>Please wait...</p>
      {/* You can add a spinner here */}
    </div>
  );
}
