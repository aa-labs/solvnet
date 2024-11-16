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
const TEE_EXPLORER = "https://ra-quote-explorer.vercel.app/reports";
const VERIFICATION_HASH =
  "a03404f3b9ff15461d4e907f4f4c8c203875c494bf50c71c5659517c18805961";
const DEMO_SMART_ACCOUNT = "0x5065dd346560441c8b73c1c2E1C973Ec35d13789";

const readStream = async (stream: any) => {
  const reader = stream.getReader();
  let result = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += new TextDecoder().decode(value);
  }

  return result;
};

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
  leaseId: number;
  smartAccount: string;
  token: string;
  amount: number;
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
  leaseId: number,
  provider: JsonRpcProvider
) => {
  const { SOLVE_MODULE, USDC } = addresses;
  let leaseOwner = saAddress;

  const signer = new ethers.Wallet(process.env.PRIVATE_KEY || "", provider);
  const solveModuleContract = new ethers.Contract(
    SOLVE_MODULE,
    SOLVER_MODULE_ABI,
    signer
  );
  const tokenContract = new ethers.Contract(USDC, ERC20_ABI, signer);

  //! TODO the approval should be with solver module here right ?
  // some random amount for now

  try {
    const approve = await tokenContract.approve(SOLVE_MODULE, 100);
    let receipt = await approve.wait();
  } catch (err) {
    console.error("Error approving token", err);
  }

  try {
    let leasePayBackResp = await solveModuleContract.fulfillLease(
      leaseOwner,
      leaseId
    );

    let receipt = await leasePayBackResp.wait();
    return receipt;
  } catch (err) {
    console.error("Error fulfilling lease", err);
  }
};

const getLease = async (
  saAddress: string,
  leaseId: number,
  provider: JsonRpcProvider
) => {
  const { SOLVE_MODULE } = addresses;
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY || "", provider);
  const solveModuleContract = new ethers.Contract(
    SOLVE_MODULE,
    SOLVER_MODULE_ABI,
    provider
  );
  // const lease = await solveModuleContract.getLease(saAddress, leaseId);
  // console.log("Lease", lease);

  //   struct Lease {
  //     uint256 id;
  //     address token;
  //     uint256 amount;
  //     uint256 startTime;
  //     LeaseStatus status;
  // }

  const demoLease: Lease = {
    leaseId: 1,
    smartAccount: saAddress,
    token: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    amount: 4,
    startTime: new Date(),
    status: "Active",
  };

  return demoLease;
};

const getAllLeases = async (provider: JsonRpcProvider, saAddress: string) => {
  const { SOLVE_MODULE } = addresses;
  const solveModuleContract = new ethers.Contract(
    SOLVE_MODULE,
    SOLVER_MODULE_ABI,
    provider
  );
  const leases = await solveModuleContract.getActiveLeases(saAddress);
  console.log("Leases", leases);

  // transform these leases into lease object and send those for solving
};

export const solve = async (tokenAmount: number): Promise<String[]> => {
  const { USDC } = addresses;
  const provider = new ethers.JsonRpcProvider(RPC_URL);

  const signer = new ethers.Wallet(process.env.PRIVATE_KEY || "", provider);

  let smartAccountAddresses = [DEMO_SMART_ACCOUNT];
  let toAddresses = [signer.address];
  let tokenAddresses = [USDC];
  let tokenAmounts = [ethers.parseUnits("1", 6)];

  let receipt = await startLeases(smartAccountAddresses, tokenAddresses, tokenAmounts, toAddresses, provider);

  console.log("Start lease txn receipt", receipt);

  const leaseStartedEvents = receipt.events.filter(
    (event: { event: string }) => event.event === "LeaseStarted"
  );

  console.log("Lease started events", leaseStartedEvents);

  const leaseIds = leaseStartedEvents.map((event: any) => {
    const { smartAccount, leaseId, _ } = event.args;
    return {
      smartAccount: smartAccount.toString(),
      leaseId: leaseId.toString(),
    };
  });

  console.log("LeaseIds", leaseIds);

  //! demo
  // let leaseIds = [
  //   {
  //     leaseId: 1,
  //     smartAccount: "0x124",
  //   },
  //   {
  //     leaseId: 1,
  //     smartAccount: "0x124",
  //   },
  //   {
  //     leaseId: 1,
  //     smartAccount: "0x124",
  //   },    
  //   {
  //     leaseId: 1,
  //     smartAccount: "0x124",
  //   }
  // ];

  let leases = [];
  for (let leaseId of leaseIds) {
    const lease = await getLease(leaseId.smartAccount, leaseId.leaseId, provider);
    leases.push(lease);
  }

  console.log("Fetched leaseIds", leaseIds);

  // sort leases
  leases = leases.sort((a, b) => a.amount - b.amount);

  let totalFullfilledAmount = 0;
  let saAddresses = [];

  for (let lease of leases) {
    totalFullfilledAmount += lease.amount;
    saAddresses.push(lease.smartAccount);
    if(totalFullfilledAmount >= tokenAmount) break;
  }

  // fetch active leases and find the one which matches the solver intent
  const response = await fetch(`${MATCHER_BASE_URL}/api/getOptimalMatches`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userLeaseRequests: demoUserLeaseRequests,
      solverRequests: demoSolverRequests,
    }),
  });

  console.log("Optimal lease for solver", response.body);

  const attestationReportResp = await fetch(
    `${MATCHER_BASE_URL}/api/remoteAttestation`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  const attestationData = await readStream(attestationReportResp.body);
  console.log("Attestation report", attestationData);

  //! TODO: we need to request attestation here and verify it
  console.log(
    "Attestation verification result can be found here ",
    `${TEE_EXPLORER}/${VERIFICATION_HASH}`
  );

  // for solver: swap usdc to usdt now a.k.a using lease here
  // const uniswapContract = new ethers.Contract(UNISWAP, Uniswapabi.abi, signer);

  // const amountIn = ethers.parseUnits("0.1", 6);
  // const amountOut = ethers.parseUnits("0.1", 6);
  // const duration = 86400;

  // let swapResp = await uniswapContract.swapUSDCtoUSDT(
  //   amountIn,
  //   amountOut,
  //   duration
  // );

  // await swapResp.wait();
  // console.log("Swap contract response", swapResp);

  // wait for 1 min
  console.log("Solver solving...");
  await new Promise((resolve) => setTimeout(resolve, 600));

  // hardcoded saAddresses for now
  return saAddresses;
};

export const fullfillLease = async (leaseOwner: string, leaseId: number) => {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  try {
    await fulfillLease(leaseOwner, leaseId, provider);
  } catch (err) {
    console.error("Error fulfilling lease", err);
  }
};
