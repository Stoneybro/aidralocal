"use client";
import React, { useState, useEffect } from "react";
import { Label } from "@radix-ui/react-label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useDeployWallet } from "@/hooks/useDeployWallet";

function Page() {
  const [checked, setChecked] = useState(false);
  const { mutate: deployWallet, isPending } = useDeployWallet();

  return (
    <div>
      <div className='bg-background flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10'>
        <div className='w-full max-w-md flex flex-col gap-6 justify-center items-center text-center'>

          <div className=' text-3xl font-semibold text-center'>
            Deploy your Aidra Wallet
          </div>
          <div className=' flex flex-col'>
            <div className="">Aidra is a non-custodial ERC-4337 smart wallet.</div>
            <div className=""> Demo mode allows one wallet per social login.</div>
            <div className="">All transactions are gasless and run exclusively on base sepolia for this demo.</div>
            
            
           
            
            

          </div>
          <Label className='hover:bg-muted/50 dark:hover:bg-muted/30 flex items-start gap-3 rounded-lg border p-3 has-[[aria-checked=true]]:border-black has-[[aria-checked=true]]:bg-muted dark:has-[[aria-checked=true]]:border-accent dark:has-[[aria-checked=true]]:bg-muted/50'>
            <Checkbox
              checked={checked}
              onCheckedChange={() => {
                setChecked(!checked);
              }}
              id='toggle-2'
              className='data-[state=checked]:border-black data-[state=checked]:bg-black data-[state=checked]:text-white dark:data-[state=checked]:border-accent dark:data-[state=checked]:bg-muted'
            />
            <div className='flex flex-col items-start justify-center gap-1.5 font-normal'>
              <p className='text-sm leading-none font-medium'>
                Accept terms and conditions.
              </p>
              <p className='text-muted-foreground text-left text-sm'>
                By clicking this checkbox, you agree to the terms and
                conditions.
              </p>
            </div>
          </Label>
          <Button
            variant={"default"}
            className="w-full"
            onClick={() => deployWallet()}
            disabled={!checked || isPending}
          >
            {isPending ? "Deploying..." : "Deploy Wallet"}
          </Button>

        </div>

      </div>
    </div>
  );
}

export default Page;