import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Wallet, Activity, Settings, Loader2 } from "lucide-react";
import { ethers } from "ethers";
import { formatSeconds } from "@/lib/utils";
import { useSmartAccount } from "@/hooks/useSmartAccount";
import { Hex } from "viem";
import SolvNetModuleAbi from "@/abi/SolvNet.json";
import NexusAbi from "@/abi/nexus.json";
import { base } from "viem/chains";

const RPC_URL =
  "https://base-mainnet.g.alchemy.com/v2/7h2x2EBIOQzBvKSktrewDIjd4kJIigyG";
const MODULE_ADDRESS = "0x78c98F914f10a3C7A2FEbB677d76bE83EfB6BB13";
const TOKEN_ADDRESSES = {
  ETH: ethers.constants.AddressZero,
  MEME: "0xA72Df9090233Bf229B39Ea87Ec6b92501dF6d7C2",
  LADDU: "0x6845533D4be0A2988E49C99cDe9e1ba677344F5a",
};
const TOKEN_DECIMALS = {
  ETH: 18,
  MEME: 18,
  LADDU: 18,
};

interface TokenBalance {
  logo: string;
  symbol: string;
  name: string;
  amount: string;
  address?: string;
}

interface Lease {
  duration: string;
  apr: number;
  token: string;
  amount: number;
  status: string;
}

const User = () => {
  const { login } = usePrivy();
  const { accountAddress, nexusClient } = useSmartAccount();
  const [config, setConfig] = useState({
    apr: "",
    tokenType: "",
    leaseAmount: "",
    leaseDuration: "",
  });
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [isConfigLoading, setIsConfigLoading] = useState(false);
  const [isFetchingState, setIsFetchingState] = useState(false);

  // Function to fetch token balances
  const fetchBalances = async (address: string) => {
    if (!address) return;

    setIsLoading(true);
    try {
      const tokens = [
        {
          address: TOKEN_ADDRESSES.ETH, // ETH
          symbol: "ETH",
          name: "Ethereum",
          logo: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
          decimals: TOKEN_DECIMALS.ETH,
        },
        {
          address: TOKEN_ADDRESSES.MEME,
          symbol: "MEME",
          name: "Rug Token",
          logo: "https://assets.coingecko.com/coins/images/33566/standard/dogwifhat.jpg",
          decimals: TOKEN_DECIMALS.MEME,
        },
        {
          address: TOKEN_ADDRESSES.LADDU,
          symbol: "LADDU",
          name: "Laddus",
          logo: "https://assets.coingecko.com/coins/images/12424/standard/RSFOmQ.png",
          decimals: TOKEN_DECIMALS.LADDU,
        },
      ];

      const provider = new ethers.providers.JsonRpcProvider(RPC_URL);

      const balancePromises = tokens.map(async (token) => {
        let balance;
        if (token.address === TOKEN_ADDRESSES.ETH) {
          balance = await provider.getBalance(address);
        } else {
          const tokenContract = new ethers.Contract(
            token.address,
            ["function balanceOf(address) view returns (uint256)"],
            provider
          );
          balance = await tokenContract.balanceOf(address);
        }

        return {
          logo: token.logo,
          symbol: token.symbol,
          name: token.name,
          amount: ethers.utils.formatUnits(balance, token.decimals),
        };
      });

      const tokenBalances = await Promise.all(balancePromises);
      setBalances(tokenBalances);
    } catch (error) {
      console.error("Error fetching balances:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLeases = async () => {
    if (!accountAddress) return;

    setIsLoading(true);
    try {
      const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
      const solvNetModuleContract = new ethers.Contract(
        MODULE_ADDRESS,
        SolvNetModuleAbi.abi,
        provider
      );

      // Fetch active lease IDs for the user's smart account
      const activeLeaseIds = await solvNetModuleContract.getActiveLeases(
        accountAddress
      );
      console.log("herr", activeLeaseIds);

      let leasesData: Lease[] = [];

      for (let i = 0; i < activeLeaseIds.length; i++) {
        const leaseId = activeLeaseIds[i];
        const leaseResp = await solvNetModuleContract.getLease(
          accountAddress,
          leaseId
        );

        const tokenSymbol =
          leaseResp.token === ethers.constants.AddressZero
            ? "ETH"
            : Object.keys(TOKEN_ADDRESSES).find(
                (key) =>
                  TOKEN_ADDRESSES[key as keyof typeof TOKEN_ADDRESSES] ===
                  leaseResp.token
              ) || "Unknown";

        const tokenDecimals =
          leaseResp.token === ethers.constants.AddressZero
            ? 18
            : TOKEN_DECIMALS[tokenSymbol as keyof typeof TOKEN_DECIMALS];

        let lease: Lease = {
          duration: formatSeconds(
            parseInt(leaseResp.startTime) +
              parseInt(leaseResp.amount) -
              Math.floor(Date.now() / 1000)
          ),
          token: tokenSymbol,
          amount: parseFloat(
            ethers.utils.formatUnits(leaseResp.amount, tokenDecimals)
          ),
          apr: parseFloat(ethers.utils.formatUnits(leaseResp.apr, 2)),
          status: leaseResp.status === 1 ? "Active" : "Fulfilled",
        };

        leasesData.push(lease);
      }

      setLeases(leasesData);
    } catch (error) {
      console.error("Error fetching active leases:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfigChange = (e: any) => {
    setConfig({ ...config, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setIsConfigLoading(true);
    try {
      if (!nexusClient || !accountAddress) {
        console.error("Nexus client or account address is not initialized.");
        return;
      }

      // Prepare the configuration data
      const configData = [
        {
          token:
            config.tokenType === "ETH"
              ? ethers.constants.AddressZero
              : TOKEN_ADDRESSES[
                  config.tokenType as keyof typeof TOKEN_ADDRESSES
                ],
          max_amount: ethers.utils.parseUnits(
            config.leaseAmount,
            TOKEN_DECIMALS[config.tokenType as keyof typeof TOKEN_DECIMALS]
          ),
          apr: ethers.utils.parseUnits(config.apr, 2), // Adjust decimal places as needed
          max_duration: parseInt(config.leaseDuration) * 24 * 60 * 60, // Convert days to seconds
        },
      ];
      console.log("configData", configData);

      const initData = new ethers.utils.AbiCoder().encode(
        [
          "tuple(address token, uint256 max_amount, uint256 apr, uint256 max_duration)[]",
        ],
        [configData]
      );

      const isEnabled = await nexusClient.isModuleInstalled({
        module: {
          address: MODULE_ADDRESS,
          type: "executor",
        },
      });

      console.log("isEnabled", isEnabled);
      if (!isEnabled) {
        // Install the module by calling `installModule` on the smart account
        // Create an interface for the smart account (Nexus contract)
        const nexusInterface = new ethers.utils.Interface(NexusAbi.abi);
        // Encode the function data for `installModule`
        const installModuleData = nexusInterface.encodeFunctionData(
          "installModule",
          [
            2, //executor
            MODULE_ADDRESS,
            initData,
          ]
        );

        // Send the transaction to the smart account
        const hash = await nexusClient.sendTransaction({
          to: accountAddress as Hex, // Sending to the smart account address
          data: installModuleData as Hex,
          value: 0n,
          chain: base,
        });
        console.log("Module installation transaction:", hash);

        const receipt = await nexusClient.waitForTransactionReceipt({ hash });
        console.log("Module installation receipt:", receipt);
      } else {
        // Update config -> call `updateLeaseConfig` on the module
        const moduleInterface = new ethers.utils.Interface(
          SolvNetModuleAbi.abi
        );

        const updateData = moduleInterface.encodeFunctionData(
          "updateLeaseConfig",
          [
            config.tokenType === "ETH"
              ? ethers.constants.AddressZero
              : TOKEN_ADDRESSES[
                  config.tokenType as keyof typeof TOKEN_ADDRESSES
                ],
            configData[0],
          ]
        );

        const tx = await nexusClient.sendTransaction({
          calls: [
            {
              to: MODULE_ADDRESS as Hex,
              data: updateData as Hex,
            },
          ],
        });

        console.log("Configuration update transaction:", tx);
      }
    } catch (error) {
      console.error("Error updating configuration:", error);
    } finally {
      setIsConfigLoading(false);
    }
  };

  const fetchPreviousState = async () => {
    setIsFetchingState(true);
    try {
      if (!accountAddress || !nexusClient) {
        console.error("Account address or Nexus client is not available.");
        return;
      }

      // Check if the module is installed
      const isInstalled = await nexusClient.isModuleInstalled({
        module: {
          address: MODULE_ADDRESS,
          type: "executor",
        },
      });

      if (!isInstalled) {
        console.log("Module is not installed.");
        return;
      }

      // Create a contract instance of the SolvNetModule
      const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
      const solvNetModuleContract = new ethers.Contract(
        MODULE_ADDRESS,
        SolvNetModuleAbi.abi,
        provider
      );

      const tokenAddress =
        config.tokenType === "ETH"
          ? ethers.constants.AddressZero
          : TOKEN_ADDRESSES[config.tokenType as keyof typeof TOKEN_ADDRESSES];
      // Fetch the lease configuration
      const leaseConfig = await solvNetModuleContract.getLeaseConfig(
        accountAddress,
        tokenAddress
      );

      // Update the config state with the fetched configuration
      setConfig({
        apr: ethers.utils.formatUnits(leaseConfig.apr, 2),
        tokenType: config.tokenType,
        leaseAmount: ethers.utils.formatUnits(
          leaseConfig.max_amount,
          TOKEN_DECIMALS[config.tokenType as keyof typeof TOKEN_DECIMALS]
        ),
        leaseDuration: (leaseConfig.max_duration / (24 * 60 * 60)).toString(),
      });

      console.log("Fetched previous configuration:", leaseConfig);
    } catch (error) {
      console.error("Error fetching previous configuration:", error);
    } finally {
      setIsFetchingState(false);
    }
  };

  useEffect(() => {
    if (accountAddress) {
      fetchBalances(accountAddress);
      fetchLeases();
      fetchPreviousState();
    }
  }, [accountAddress, config.tokenType]);

  return (
    <main className="max-w-7xl mx-auto flex-grow flex flex-col md:flex-row overflow-hidden p-4 min-h-[calc(100vh-160px)]">
      {/* Left Side - User Balance and Active Leases */}
      <div className="w-full md:w-3/5 p-4 space-y-4">
        {/* User Balance Overview */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Wallet className="w-5 h-5 text-gray-500" />
              <CardTitle className="font-lexend">User Balance</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">Fetching tokens...</p>
              </div>
            ) : balances.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                  <Wallet className="w-8 h-8 text-gray-400" />
                </div>
                <p className="mt-4 text-lg font-medium text-gray-500">
                  No tokens found
                </p>
                <p className="mt-2 text-sm text-gray-400">
                  Connect your wallet to view your tokens
                </p>
                {!accountAddress && (
                  <Button onClick={login} variant="outline" className="mt-4">
                    Connect Wallet
                  </Button>
                )}
              </div>
            ) : (
              <div className="max-h-[300px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Token</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {balances.map((balance, index) => (
                      <TableRow key={index}>
                        <TableCell className="flex items-center gap-2">
                          <img
                            src={balance.logo}
                            alt={balance.symbol}
                            className="w-6 h-6 rounded-full"
                          />
                          <div>
                            <div className="font-medium">{balance.symbol}</div>
                            <div className="text-sm text-gray-500">
                              {balance.name}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {parseFloat(balance.amount).toFixed(6)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Leases */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-gray-500" />
              <CardTitle className="font-lexend">Active Leases</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Token</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>APR</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leases.map((lease, index) => (
                  <TableRow key={index}>
                    <TableCell>{lease.token}</TableCell>
                    <TableCell>{lease.amount}</TableCell>
                    <TableCell>{lease.apr + "%"}</TableCell>
                    <TableCell>{lease.duration}</TableCell>
                    <TableCell>{lease.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Right Side - Edit Configuration */}
      <div className="w-full md:w-2/5 p-4">
        <Card className="h-full">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Settings className="w-5 h-5 text-gray-500" />
              <CardTitle className="font-lexend">Edit Configuration</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="apr">APR (%)</Label>
                <Input
                  id="apr"
                  name="apr"
                  value={config.apr}
                  onChange={handleConfigChange}
                  placeholder="Enter desired APR"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tokenType">Token Type</Label>
                <Select
                  name="tokenType"
                  value={config.tokenType}
                  onValueChange={(value) =>
                    setConfig({ ...config, tokenType: value })
                  }
                >
                  <SelectTrigger id="tokenType">
                    <SelectValue placeholder="Select token type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ETH">ETH</SelectItem>
                    <SelectItem value="MEME">MEME</SelectItem>
                    <SelectItem value="LADDU">LADDU</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="leaseAmount">Lease Amount</Label>
                <Input
                  id="leaseAmount"
                  name="leaseAmount"
                  value={config.leaseAmount}
                  onChange={handleConfigChange}
                  placeholder="Enter lease amount"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="leaseDuration">Lease Duration</Label>
                <Select
                  name="leaseDuration"
                  value={config.leaseDuration}
                  onValueChange={(value) =>
                    setConfig({ ...config, leaseDuration: value })
                  }
                >
                  <SelectTrigger id="leaseDuration">
                    <SelectValue placeholder="Select lease duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex space-x-2">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isConfigLoading}
                >
                  {isConfigLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Confirm/Edit"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={fetchPreviousState}
                  className="flex-1"
                  disabled={isFetchingState}
                >
                  {isFetchingState ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Fetching...
                    </>
                  ) : (
                    "Fetch Previous State"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default User;
