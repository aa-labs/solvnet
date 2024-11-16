import { useState, useEffect } from "react";
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
import { ethers } from "ethers";
import SolvNetContractAbi from "@/abi/SolvNet.json";

// Hardcoded data
const RPC_URL =
  "https://base-mainnet.g.alchemy.com/v2/7h2x2EBIOQzBvKSktrewDIjd4kJIigyG";
const MODULE_ADDRESS = "0x78c98F914f10a3C7A2FEbB677d76bE83EfB6BB13";
const TOKEN_ADDRESSES = {
  ETH: "0x0000000000000000000000000000000000000000",
  MEME: "0xA72Df9090233Bf229B39Ea87Ec6b92501dF6d7C2",
  LADDU: "0x6845533D4be0A2988E49C99cDe9e1ba677344F5a",
};

interface Lease {
  id: number;
  smartAccount: {
    address: string;
    availableTokens: string[];
    leaseAmount: number;
    apr: number;
    duration: string;
  };
  solver: {
    id: number;
    name: string;
    staked: string;
    accessibleLiquidity: string;
    performance: number;
    activeLeases: number;
  };
  amount: string;
  token: string;
  status: string;
}

interface IncomingOrder {
  id: number;
  protocol: string;
  amount: string;
  token: string;
  urgency: string;
}

interface LeaseTransaction {
  id: number;
  description: string;
  status: string;
}

const SolvNetDashboard = () => {
  const [incomingOrders, setIncomingOrders] = useState<IncomingOrder[]>([]);

  const [solvers, setSolvers] = useState([
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
  ]);

  const [smartAccounts, setSmartAccounts] = useState([
    {
      address: "0x8264064B0568f48ea884b21aEfE131B09314197e",
      availableTokens: [TOKEN_ADDRESSES.MEME],
      leaseAmount: 10000,
      apr: 2,
      duration: "7 days",
    },
    {
      address: "0x6845533D4be0A2988E49C99cDe9e1ba677344F5a",
      availableTokens: [TOKEN_ADDRESSES.LADDU],
      leaseAmount: 10000,
      apr: 3,
      duration: "14 days",
    },
    {
      address: "0x5065dd346560441c8b73c1c2E1C973Ec35d13789",
      availableTokens: [TOKEN_ADDRESSES.MEME],
      leaseAmount: 20000,
      apr: 6,
      duration: "30 days",
    },
  ]);

  const [activeLeases, setActiveLeases] = useState<Lease[]>([]);
  const [leaseTransactions, setLeaseTransactions] = useState<
    LeaseTransaction[]
  >([]);

  const fetchLeaseInfo = async () => {
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const solvNetModuleContract = new ethers.Contract(
      MODULE_ADDRESS,
      SolvNetContractAbi.abi,
      provider
    );

    // Fetch active lease IDs for the user's smart account
    let leasesData: Lease[] = [];
    for (let i = 0; i < smartAccounts.length; i++) {
      const activeLeaseIds = await solvNetModuleContract.getActiveLeases(
        smartAccounts[i].address
      );
      console.log("herr", activeLeaseIds);

      for (let j = 0; j < activeLeaseIds.length; j++) {
        const leaseId = activeLeaseIds[j];
        const leaseResp = await solvNetModuleContract.getLease(
          smartAccounts[i].address,
          leaseId
        );

        leasesData.push(leaseResp);
      }
    }

    setActiveLeases(leasesData);
  };

  // Function to simulate adding incoming orders every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const newOrderId = incomingOrders.length + 1;
      const newOrder = {
        id: newOrderId,
        protocol: `Protocol ${newOrderId}`,
        amount: (Math.floor(Math.random() * 10) + 100).toString(),
        token: "MEME",
        urgency: ["low", "medium", "high"][Math.floor(Math.random() * 3)],
      };

      setIncomingOrders((prevOrders) => [...prevOrders, newOrder]);

      // Call backend solver API with the amount needed
      handleSolverRequest(newOrder.amount);
    }, 20000);

    return () => clearInterval(interval);
  }, [incomingOrders]);

  // Function to handle solver request
  const handleSolverRequest = async (amountNeeded: string) => {
    try {
      const response = await fetch(
        "https://dcfe-210-1-49-173.ngrok-free.app/solve",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: amountNeeded,
          }),
        }
      );

      const data = await response.json();

      // Assume data.solvers is the list of solvers returned
      // For demo, we'll use the existing solvers
      const solverList = data.solvers || solvers;

      // Highlight the first solver
      const selectedSolver = solverList[0];

      // Add to active leases
      const newLease = {
        id: activeLeases.length + 1,
        smartAccount: smartAccounts[activeLeases.length % smartAccounts.length],
        solver: selectedSolver,
        amount: amountNeeded,
        token: "MEME",
        status: "Active",
      };

      setActiveLeases((prevLeases) => [...prevLeases, newLease]);

      // Add to lease transactions
      setLeaseTransactions((prevTransactions) => [
        ...prevTransactions,
        {
          id: prevTransactions.length + 1,
          description: `Smart Account ${newLease.smartAccount.address.slice(
            0,
            6
          )}... → ${
            selectedSolver.name
          } → Protocol (Amount: ${amountNeeded} MEME)`,
          status: "Processing",
        },
      ]);
    } catch (error) {
      console.error("Error calling solver API:", error);
    }
  };

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
      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 min-h-[calc(100vh-160px)]">
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
                <div className="space-y-2">
                  {smartAccounts.map((account, index) => (
                    <div
                      key={index}
                      className="p-3 bg-white rounded-lg border hover:shadow-lg transition-shadow"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">
                            {account.address.slice(0, 6)}...
                            {account.address.slice(-4)}
                          </h3>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">
                              {account.availableTokens.map((token, idx) => {
                                const tokenKey = Object.keys(
                                  TOKEN_ADDRESSES
                                ).find(
                                  (key) =>
                                    TOKEN_ADDRESSES[
                                      key as keyof typeof TOKEN_ADDRESSES
                                    ] === token
                                );
                                return <span key={idx}>{tokenKey} ({account.leaseAmount} USDC)</span>;
                              })}
                            </span>
                          </div>
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
          <div className="col-span-6 my-auto">
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
          <div className="col-span-6 max-h-[300px] overflow-y-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="mr-2" /> Incoming Orders
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {incomingOrders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-2 bg-white rounded-lg border"
                    >
                      <div className="flex items-center">
                        <AlertCircle className={`${getUrgencyColor(order.urgency)} mr-2 h-4 w-4`} />
                        <div>
                          <p className="font-medium text-xs">{order.protocol}</p>
                          <p className="text-gray-500 text-xs">
                            {order.amount} {order.token}
                          </p>
                        </div>
                      </div>
                      <span className={`capitalize text-xs ${getUrgencyColor(order.urgency)}`}>
                        {order.urgency}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Active Lease Transactions */}
          <div className="col-span-6 max-h-[300px]">
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
                <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-2">
                  {leaseTransactions.map((transaction) => (
                    <div
                      key={transaction.id.toString()}
                      className="flex items-center space-x-2"
                    >
                      {transaction.status === "Completed" ? (
                        <Check className="text-green-500" />
                      ) : (
                        <Clock className="text-yellow-500" />
                      )}
                      <p className="text-sm">{transaction.description}</p>
                    </div>
                  ))}
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
