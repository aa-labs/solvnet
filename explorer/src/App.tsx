import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Activity,
  Wallet,
  ArrowRight,
  AlertCircle,
  Check,
  Clock,
  TrendingUp,
  Shield,
  Database,
} from "lucide-react";
import Navbar from "./components/main/Navbar";
import Footer from "./components/main/Footer";

const SolvNetDashboard = () => {
  // Sample data
  const incomingOrders = [
    {
      id: 1,
      protocol: "Uniswap",
      amount: "50,000",
      token: "USDC",
      urgency: "high",
    },
    {
      id: 2,
      protocol: "Aave",
      amount: "25,000",
      token: "DAI",
      urgency: "medium",
    },
    {
      id: 3,
      protocol: "Curve",
      amount: "100,000",
      token: "USDT",
      urgency: "low",
    },
  ];

  const solvers = [
    {
      id: 1,
      name: "Alpha Solver",
      staked: "0.01",
      accessibleLiquidity: "300",
      performance: 100,
      activeLeases: 2,
    },
    {
      id: 2,
      name: "Beta Network",
      staked: "0.01",
      accessibleLiquidity: "100",
      performance: 100,
      activeLeases: 8,
    },
  ];

  const TOKEN_ADDRESSES = {
    ETH: "0x0000000000000000000000000000000000000000",
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    USDT: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
  };

  const smartAccounts = [
    {
      address: "0x0197d7FaFCA118Bc91f6854B9A2ceea94E676585",
      availableTokens: [TOKEN_ADDRESSES.USDC],
    },
    {
      address: "0x0197d7FaFCA118Bc91f6854B9A2ceea94E676585",
      availableTokens: [TOKEN_ADDRESSES.USDC],
    },
    {
      address: "0x0197d7FaFCA118Bc91f6854B9A2ceea94E676585",
      availableTokens: [TOKEN_ADDRESSES.USDT],
    },
  ];

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "high":
        return "text-red-500";
      case "medium":
        return "text-yellow-500";
      case "low":
        return "text-green-500";
      default:
        return "text-gray-500";
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF8EF]">
      {/* Header */}
      <Navbar />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-12 gap-6">
          {/* Smart Accounts */}
          <div className="col-span-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Wallet className="mr-2" /> Smart Accounts Leasing Funds
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {smartAccounts.map((account, index) => (
                    <div
                      key={index}
                      className="p-4 bg-white rounded-lg border hover:shadow-lg transition-shadow"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">
                            {account.address.slice(0, 6)}...
                            {account.address.slice(-4)}
                          </h3>
                          <p className="text-sm text-gray-500">
                            Available:{" "}
                            {account.availableTokens.map((token, index) => {
                              const tokenKey = Object.keys(
                                TOKEN_ADDRESSES
                              ).find(
                                (key) =>
                                  TOKEN_ADDRESSES[
                                    key as keyof typeof TOKEN_ADDRESSES
                                  ] === token
                              );
                              return <span key={index}>{tokenKey}</span>;
                            })}
                          </p>
                          <p className="text-sm text-gray-600 mt-2">
                            Lease Amount: {account.leaseAmount ?? 0} USDC
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {account.apr}% APR
                          </p>
                          <p className="text-sm text-gray-500">
                            {account.duration} lease
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Active Solvers */}
          <div className="col-span-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="mr-2" /> Active Solvers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {solvers.map((solver) => (
                    <div
                      key={solver.id}
                      className="p-4 bg-white rounded-lg border hover:shadow-lg transition-shadow"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{solver.name}</h3>
                          <p className="text-sm text-gray-500">
                            Staked: {solver.staked} USDC
                          </p>
                          <p className="text-sm text-gray-600 mt-2">
                            Accessible Liquidity: {solver.accessibleLiquidity}{" "}
                            USDC
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            Performance: {solver.performance}%
                          </p>
                          <p className="text-sm text-gray-500">
                            {solver.activeLeases} active leases
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Incoming Orders */}
          <div className="col-span-12">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="mr-2" /> Incoming Orders
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {incomingOrders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-4 bg-white rounded-lg border"
                    >
                      <div className="flex items-center">
                        <AlertCircle
                          className={`${getUrgencyColor(order.urgency)} mr-3`}
                        />
                        <div>
                          <p className="font-medium">{order.protocol}</p>
                          <p className="text-sm text-gray-500">
                            {order.amount} {order.token}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`capitalize ${getUrgencyColor(
                          order.urgency
                        )}`}
                      >
                        {order.urgency} priority
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Lease Transactions Visualization */}
          <div className="col-span-12">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="mr-2" /> Active Lease Transactions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center space-x-4 p-4">
                  <div className="flex flex-col items-center">
                    <Wallet className="h-8 w-8 text-blue-500" />
                    <p className="mt-2">Smart Accounts</p>
                  </div>
                  <ArrowRight className="h-8 w-8 text-gray-400" />
                  <div className="flex flex-col items-center">
                    <Shield className="h-8 w-8 text-green-500" />
                    <p className="mt-2">Solvers</p>
                  </div>
                  <ArrowRight className="h-8 w-8 text-gray-400" />
                  <div className="flex flex-col items-center">
                    <Database className="h-8 w-8 text-purple-500" />
                    <p className="mt-2">Protocols</p>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Check className="text-green-500" />
                    <p className="text-sm">
                      Latest transaction: Safe Wallet A → Alpha Solver → Uniswap
                      (50,000 USDC)
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 mt-2">
                    <Clock className="text-yellow-500" />
                    <p className="text-sm">
                      Processing: Safe Wallet B → Beta Network → Aave (25,000
                      DAI)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default SolvNetDashboard;
