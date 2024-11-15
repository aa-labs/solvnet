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

interface TokenBalance {
  logo: string;
  symbol: string;
  name: string;
  amount: string;
  address?: string;
}

const User = () => {
  const { login, authenticated, user } = usePrivy();
  const [config, setConfig] = useState({
    apr: "",
    tokenType: "",
    leaseAmount: "",
    leaseDuration: "",
  });
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Function to fetch token balances
  const fetchBalances = async (address: string) => {
    if (!address) return;

    setIsLoading(true);
    try {
      // Example tokens - Base network tokens
      const tokens = [
        {
          address: "0x0000000000000000000000000000000000000000", // ETH
          symbol: "ETH",
          name: "Ethereum",
          logo: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
          decimals: 18,
        },
        {
          address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on Base
          symbol: "USDC",
          name: "USD Coin",
          logo: "https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png",
          decimals: 6,
        },
        // Add more Base network tokens as needed
      ];

      const provider = new ethers.providers.JsonRpcProvider(
        // Replace with your RPC URL
        "https://base-mainnet.g.alchemy.com/v2/7h2x2EBIOQzBvKSktrewDIjd4kJIigyG"
      );

      const balancePromises = tokens.map(async (token) => {
        let balance;
        if (token.address === "0x0000000000000000000000000000000000000000") {
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

  // Fetch balances when user connects wallet
  useEffect(() => {
    if (user?.wallet?.address) {
      fetchBalances(user.wallet.address);
    }
  }, [user?.wallet?.address]);

  // Placeholder data - replace with actual data fetching
  const activeLeases = [
    {
      token: "ETH",
      amount: "0.5",
      apr: "5%",
      duration: "7 days",
      status: "Active",
    },
    {
      token: "USDC",
      amount: "200",
      apr: "3.5%",
      duration: "30 days",
      status: "Active",
    },
    {
      token: "DAI",
      amount: "100",
      apr: "4%",
      duration: "14 days",
      status: "Expired",
    },
  ];

  const handleConfigChange = (e: any) => {
    setConfig({ ...config, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: any) => {
    e.preventDefault();
    // Here you would typically send this data to your backend or smart contract
    console.log("Submitting config:", config);
  };

  const fetchPreviousState = () => {
    // Placeholder - replace with actual data fetching
    setConfig({
      apr: "4.5",
      tokenType: "ETH",
      leaseAmount: "0.1",
      leaseDuration: "7",
    });
  };

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
                {!authenticated && (
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
                {activeLeases.map((lease, index) => (
                  <TableRow key={index}>
                    <TableCell>{lease.token}</TableCell>
                    <TableCell>{lease.amount}</TableCell>
                    <TableCell>{lease.apr}</TableCell>
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
                    <SelectItem value="USDC">USDC</SelectItem>
                    <SelectItem value="DAI">DAI</SelectItem>
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
                <Button type="submit" className="flex-1">
                  Confirm/Edit
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={fetchPreviousState}
                  className="flex-1"
                >
                  Fetch Previous State
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
