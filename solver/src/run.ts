import { ethers, JsonRpcProvider } from "ethers";
import Uniswapabi from "../abi/UniswapSolver.json";
import addresses from "../address.json";
import { RPC_URL } from "./config";
import dotenv from "dotenv";

dotenv.config();

const SOLVER_MODULE_ABI = [
  "function startLeases( address[] calldata smartAccounts, address[] calldata tokens, uint256[] calldata amounts, address[] calldata tos) external",
  "function fulfillLease(address smartAccount, uint256 leaseId) external payable",
];

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
];

const MATCHER_BASE_URL = "http://localhost:3000";

const demoSolverRequests = [
    {
      id: "solver1",
      tokenAmount: 1000,
      duration: 30,
      tokenName: "USDC",
      apr: 5,
    },
    {
      id: "solver2",
      tokenAmount: 2000,
      duration: 60,
      tokenName: "USDC",
      apr: 6,
    },
  ];
  
  const demoUserLeaseRequests = [
    {
      id: "userLease1",
      tokenAmount: 800,
      duration: 25,
      tokenName: "USDC",
      apr: 7,
    },
    {
      id: "userLease2",
      tokenAmount: 1500,
      duration: 45,
      tokenName: "USDC",
      apr: 6.5,
    },
  ];

interface Lease {
  leaseId: string;
  smartAccount: string;
  token: string;
  amount: string;
  startTime: Date;
  status: string;
}

const startLeases = async (
  saAddress: string[],
  tokenAddresses: string[],
  tokenAmounts: BigInt[],
  toAddresses: string[],
  provider: JsonRpcProvider
) => {
  const { SOLVE_MODULE } = addresses;
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY || "", provider);
  const solveModuleContract = new ethers.Contract(
    SOLVE_MODULE,
    SOLVER_MODULE_ABI,
    signer
  );

  try {
    let leaseFundsResp = await solveModuleContract.startLeases(
      saAddress,
      tokenAddresses,
      tokenAmounts,
      toAddresses
    );

    let receipt = await leaseFundsResp.wait();
    return receipt;
  } catch (err) {
    console.error("Error starting leases", err);
  }
};

const fulfillLease = async (
  saAddress: string,
  leaseId: string,
  provider: JsonRpcProvider
) => {
  const { SOLVE_MODULE } = addresses;
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY || "", provider);
  const solveModuleContract = new ethers.Contract(
    SOLVE_MODULE,
    SOLVER_MODULE_ABI,
    signer
  );

  try {
    let leasePayBackResp = await solveModuleContract.fulfillLease(
      saAddress,
      leaseId
    );

    let receipt = await leasePayBackResp.wait();
    return receipt;
  } catch (err) {
    console.error("Error fulfilling lease", err);
  }
};

const getLease = async (saAddress: string, leaseId: string, provider: JsonRpcProvider) => {
    const { SOLVE_MODULE } = addresses;
    const signer = new ethers.Wallet(process.env.PRIVATE_KEY || "", provider);
    const solveModuleContract = new ethers.Contract(SOLVE_MODULE, SOLVER_MODULE_ABI, provider);
    const lease = await solveModuleContract.getLease(saAddress, leaseId);   
    console.log("Lease", lease);
}

const getAllLeases = async (provider: JsonRpcProvider, saAddress: string, ) => {
    const { SOLVE_MODULE } = addresses;
    const solveModuleContract = new ethers.Contract(SOLVE_MODULE, SOLVER_MODULE_ABI, provider);
    const leases = await solveModuleContract.getActiveLeases(saAddress);
    console.log("Leases", leases);

    // transform these leases into lease object and send those for solving 
}

export const solve = async () => {
  const { USDC, USDT, UNISWAP, VAULT, SOLVE_MODULE } = addresses;
  const provider = new ethers.JsonRpcProvider(RPC_URL);

  const signer = new ethers.Wallet(process.env.PRIVATE_KEY || "", provider);
  // loop over multiple chains and lease tokens over diff chains

  let receipt = await startLeases([], [], [], [], provider);
  const leaseStartedEvents = receipt.events.filter(
    (event: { event: string }) => event.event === "LeaseStarted"
  );

  const leaseIds = leaseStartedEvents.map((event: any) => {
    const { smartAccount, leaseId, _ } = event.args;
    return {
      smartAccount: smartAccount.toString(),
      leaseId: leaseId.toString(),
    };
  });

  const lease = getLease(leaseIds[0].smartAccount, leaseIds[0].leaseId, provider);

  console.log("Fetched leaseIds", leaseIds);

  // fetch active leases and find the one which matches the solver intent 
  const response = await fetch(`${MATCHER_BASE_URL}/api/getOptimalMatches`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userLeaseRequests: demoUserLeaseRequests,
      solverRequests: demoSolverRequests
    })
  });

  console.log("Optimal lease for solver", response);

  // for solver: swap usdc to usdt now a.k.a using lease here
  const uniswapContract = new ethers.Contract(UNISWAP, Uniswapabi.abi, signer);

  const amountIn = ethers.parseUnits("0.1", 6);
  const amountOut = ethers.parseUnits("0.1", 6);
  const duration = 86400;

  let swapResp = await uniswapContract.swapUSDCtoUSDT(
    amountIn,
    amountOut,
    duration
  );

  await swapResp.wait();
  console.log("Swap contract response", swapResp);

  // wait for 1 min
  await new Promise((resolve) => setTimeout(resolve, 60000));

  // returning lease now
  let leaseOwner = "0xLeaseOwner";
  const tokenContract = new ethers.Contract(USDC, ERC20_ABI, signer);
  const allowance = await tokenContract.allowance(signer.address, leaseOwner);
  receipt = allowance.wait();

  // fullfilling first lease for now
  await fulfillLease(leaseOwner, leaseIds[0].leaseId, provider);
};
