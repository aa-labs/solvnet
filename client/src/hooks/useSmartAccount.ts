import { useState, useEffect } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { createNexusClient, NexusClient } from "@biconomy/sdk";
import { base } from "viem/chains";
import { http } from "viem";

export const useSmartAccount = () => {
  const { logout } = usePrivy();
  const { wallets } = useWallets();
  const [nexusClient, setNexusClient] = useState<NexusClient | null>(null);
  const [accountAddress, setAccountAddress] = useState<string | null>(null);

  // console.log(`EOA: ${user?.wallet?.address}\n SA: ${accountAddress}`);

  const logoutSmartAccount = () => {
    setAccountAddress(null);
    logout();
  };

  useEffect(() => {
    const initAccount = async () => {
      const bundlerUrl =
        "https://bundler.biconomy.io/api/v3/8453/abc";
      const client = await wallets[0].getEthereumProvider();

      try {
        const nexusClient = await createNexusClient({
          signer: client as any,
          chain: base,
          transport: http(),
          bundlerTransport: http(bundlerUrl),
        });

        const smartAccountAddress = await nexusClient.account.address;
        setAccountAddress(smartAccountAddress);
        // Store nexus client instance
        setNexusClient(nexusClient);
      } catch (error) {
        console.log(error);
      }
    };
    if (wallets.length > 0) initAccount();
  }, [wallets]);

  return { accountAddress, logoutSmartAccount, nexusClient };
};
