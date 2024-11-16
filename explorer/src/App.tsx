import { useState } from "react";
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
      staked: "100,000",
      accessibleLiquidity: "1,000,000",
      performance: 98.5,
      activeLeases: 12,
    },
    {
      id: 2,
      name: "Beta Network",
      staked: "75,000",
      accessibleLiquidity: "562,500",
      performance: 97.8,
      activeLeases: 8,
    },
  ];

  const smartAccounts = [
    {
      id: 1,
      name: "Safe Wallet A",
      availableTokens: ["USDC"],
      leaseAmount: "5",
      apr: 4.5,
      duration: "7 days",
    },
    {
      id: 2,
      name: "Safe Wallet B",
      availableTokens: ["DAI", "USDT"],
      leaseAmount: "180,000",
      apr: 5.2,
      duration: "14 days",
    },
    {
      id: 3,
      name: "Safe Wallet B",
      availableTokens: ["DAI", "USDT"],
      leaseAmount: "180,000",
      apr: 5.2,
      duration: "14 days",
    },
    {
      id: 4,
      name: "Safe Wallet B",
      availableTokens: ["DAI", "USDT"],
      leaseAmount: "180,000",
      apr: 5.2,
      duration: "14 days",
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
                  {smartAccounts.map((account) => (
                    <div
                      key={account.id}
                      className="p-4 bg-white rounded-lg border hover:shadow-lg transition-shadow"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{account.name}</h3>
                          <p className="text-sm text-gray-500">
                            Available: {account.availableTokens.join(", ")}
                          </p>
                          <p className="text-sm text-gray-600 mt-2">
                            Lease Amount: {account.leaseAmount} USDC
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
