import { useState } from "react";
import { LineChart, Wallet, Network, History, Circle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Input } from "@/components/ui/input";
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

const Solver = () => {
  const [selectedToken, setSelectedToken] = useState("ETH");
  const [stakeAmount, setStakeAmount] = useState("");
  const [unstakeAmount, setUnstakeAmount] = useState("");

  // Mock data (replace with actual data fetching logic)
  const totalStaked = "1000 ETH";
  const rewardsEarned = "50 ETH";
  const accessLimit = "500 ETH";
  const networkStatus = "Active";
  const fraudProofStatus = "Active";

  const handleStake = () => {
    // Implement staking logic
    console.log("Staking", stakeAmount, selectedToken);
  };

  const handleUnstake = () => {
    // Implement unstaking logic
    console.log("Unstaking", unstakeAmount, selectedToken);
  };

  return (
    <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 min-h-[calc(100vh-160px)]">
      {/* Top Section: Grid with Staking Overview and Management */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {/* Left Side: Combined Staking Overview & Network Status */}
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="h-5 w-5" />
              Staking Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col h-full" style={{ minHeight: '200px' }}>
              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <CardDescription>Total Staked</CardDescription>
                  <p className="text-2xl font-bold">{totalStaked}</p>
                </div>
                <div>
                  <CardDescription>Rewards Earned</CardDescription>
                  <p className="text-2xl font-bold">{rewardsEarned}</p>
                </div>
                <div>
                  <CardDescription>Access Limit</CardDescription>
                  <p className="text-2xl font-bold">{accessLimit}</p>
                </div>
              </div>

              {/* Network Status Section */}
              <div className="pt-4 border-t mt-auto">
                <h3 className="flex items-center gap-2 font-semibold mb-4">
                  <Network className="h-5 w-5" />
                  Network Status
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <CardDescription>Network Status</CardDescription>
                    <p className="text-lg font-semibold flex items-center gap-2">
                      {networkStatus}
                      <Circle className="h-3 w-3 fill-green-500 text-green-500" />
                    </p>
                  </div>
                  <div>
                    <CardDescription>Watchtower Status</CardDescription>
                    <p className="text-lg font-semibold flex items-center gap-2">
                      {fraudProofStatus}
                      <Circle className="h-3 w-3 fill-green-500 text-green-500" />
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Side: Stake Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Stake Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4">
              <Select onValueChange={(value) => setSelectedToken(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select token" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ETH">ETH</SelectItem>
                  <SelectItem value="USDC">USDC</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                placeholder="Stake Amount"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
              />
              <Input
                type="number"
                placeholder="Unstake Amount"
                value={unstakeAmount}
                onChange={(e) => setUnstakeAmount(e.target.value)}
              />
              <div className="flex space-x-2">
                <Button onClick={handleStake}>Stake</Button>
                <Button onClick={handleUnstake} variant="outline">
                  Unstake
                </Button>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <p>Current staked balance: {totalStaked}</p>
          </CardFooter>
        </Card>
      </div>

      {/* Transaction History (Full Width) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Transaction History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date/Time</TableHead>
                <TableHead>Token Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>2023-04-01 14:30</TableCell>
                <TableCell>ETH</TableCell>
                <TableCell>10</TableCell>
                <TableCell>Stake</TableCell>
                <TableCell>Success</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>2023-03-28 09:15</TableCell>
                <TableCell>USDC</TableCell>
                <TableCell>5000</TableCell>
                <TableCell>Unstake</TableCell>
                <TableCell>Success</TableCell>
              </TableRow>
              {/* Add more rows as needed */}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
};

export default Solver;
