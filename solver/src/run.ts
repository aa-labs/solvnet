import { ethers, JsonRpcProvider } from "ethers";
import Uniswapabi from "../abi/UniswapSolver.json";
import addresses from "../address.json";
import { RPC_URL } from "./config";
import dotenv from "dotenv";
import chalk from "chalk";

dotenv.config();

const SOLVER_MODULE_ABI = [
  "function startLeases(address[] calldata smartAccounts, address[] calldata tokens, uint256[] calldata amounts, address[] calldata tos) external returns (uint256[] memory leaseIds)",
  "function startLease(address smartAccount, address token, uint256 amount, address to) public returns (uint256 leaseId)",
  "function fulfillLease(address smartAccount, uint256 leaseId) external payable",
  "function getActiveLeases(address sa) public view returns (uint256[] memory)",
  "struct TokenWiseLeaseConfig {" +
    "address token," +
    "uint256 max_amount," +
    "uint256 apr," +  
    "uint256 max_duration," +
    "}",
  "function getLeaseConfig(address sa, address token) public view returns (tuple(address token, uint256 max_amount, uint256 apr, uint256 max_duration))",
  "enum LeaseStatus { None, Active, Fulfilled }",
  "struct Lease {" +
    "uint256 id," +
    "address token," +
    "uint256 amount," +
    "uint256 startTime," +
    "address leaser," +
    "uint8 status" +
    "}",

  "function getLease(address sa, uint256 leaseId) public view returns (tuple(uint256 id, address token, uint256 amount, uint256 startTime, address leaser, uint8 status))",
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
  startTime: number;
  status: string;
  solver: string;
}

interface Config {
  token: string, 
  amount: number,
  apr: number,
  max_duration: number
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
      toAddresses,
      {
        gasLimit: 1000000,
      }
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
    const approve = await tokenContract.approve(SOLVE_MODULE, ethers.parseUnits("1", 6));
    let receipt = await approve.wait();
  } catch (err) {
    console.error("Error approving token", err);
  }

  try {
    let leasePayBackResp = await solveModuleContract.fulfillLease(
      leaseOwner,
      leaseId, {
        gasLimit: 1000000
      }
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
  const solveModuleContract = new ethers.Contract(
    SOLVE_MODULE,
    SOLVER_MODULE_ABI,
    provider
  );
  const lease = await solveModuleContract.getLease(saAddress, leaseId);

  const getLeaseStatus = (status: number): string => {
    const statusMap: { [key: string]: string } = {
      "0": "None",
      "1": "Active",
      "2": "Fulfilled",
    };
    return statusMap[status.toString()] || "Unknown";
  };

  const leaseResp: Lease = {
    leaseId: Number(lease[0]),
    smartAccount: saAddress,
    token: lease[1],
    amount: Number(lease[2]),
    startTime: Number(lease[3]),
    status: getLeaseStatus(Number(lease[5])),
    solver: lease[4],
  };

  return leaseResp;
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
  

  return leases;
  // transform these leases into lease object and send those for solving
};

const getLeaseConfig = async (provider: JsonRpcProvider, saAddress: string, tokenAddress: string): Promise<Config> => {
  const { SOLVE_MODULE } = addresses;
  const solveModuleContract = new ethers.Contract(
    SOLVE_MODULE,
    SOLVER_MODULE_ABI,
    provider
  );
  const leases = await solveModuleContract.getLeaseConfig(saAddress, tokenAddress);
  console.log("Leases", leases);

  const config: Config = {
    token: leases[0],
    amount: Number(leases[1]),
    apr: Number(leases[2]),
    max_duration: Number(leases[3])
  };

  return config;
}

export const solve = async (tokenAmount: number, tokenAddress: string): Promise<String[]> => {
  const { USDC, LADDU, RUG_PULL } = addresses;
  const provider = new ethers.JsonRpcProvider(RPC_URL);

  const signer = new ethers.Wallet(process.env.PRIVATE_KEY || "", provider);

  let smartAccountAddresses = [DEMO_SMART_ACCOUNT, "0x8264064B0568f48ea884b21aEfE131B09314197e", "0x6845533D4be0A2988E49C99cDe9e1ba677344F5a", ""];
  let toAddresses = [signer.address];
  let tokenAddresses = [USDC];
  let tokenAmounts = [ethers.parseUnits("1", 6)];

  console.log(chalk.italic("Finding the most optimal leases...."));
  console.log(chalk.italic("Starting leases..."));

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

  console.log(chalk.green("Fetched optimal leases from TEE matching engine"));

  const attestationData = await readStream(attestationReportResp.body);
  console.log("Attestation report", attestationData);

  console.log(chalk.green("Verified attestation report!!"));

  //! TODO: we need to request attestation here and verify it
  console.log(
    "Attestation verification result can be found here ",
    `${TEE_EXPLORER}/${VERIFICATION_HASH}`
  );

  console.log(chalk.italic("Opting in leases..."));

  // let receipt = await startLeases(
  //   smartAccountAddresses,
  //   tokenAddresses,
  //   tokenAmounts,
  //   toAddresses,
  //   provider
  // );

  // console.log("Start lease txn receipt", receipt);

  let rugpullLease = [];
  let ladduLease = [];

  for (let i = 0; i < smartAccountAddresses.length; i++) {
    let leasesResp = await getLeaseConfig(provider, smartAccountAddresses[i], RUG_PULL);
    rugpullLease.push({ leasesResp, saAddress: smartAccountAddresses[i] });
  }

  for (let i = 0; i < smartAccountAddresses.length; i++) {
    let leasesResp = await getLeaseConfig(provider, smartAccountAddresses[i], LADDU);
    ladduLease.push({ leasesResp, saAddress: smartAccountAddresses[i] });
  }

  rugpullLease.sort((a, b) => a.leasesResp.amount  - b.leasesResp.amount);
  ladduLease.sort((a, b) => a.leasesResp.amount - b.leasesResp.amount);

  console.log(rugpullLease);
  console.log(ladduLease);

  let solSA = [];

  if(tokenAddress === RUG_PULL) {
    let totalFullfilledAmount = 0;
     for(let i = 0; i < rugpullLease.length; i++) {
      totalFullfilledAmount += rugpullLease[i].leasesResp.amount;
      solSA.push(rugpullLease[i].saAddress);
      if (totalFullfilledAmount >= tokenAmount) break;
     }
  }

  if(tokenAddress === LADDU) {
    let totalFullfilledAmount = 0;
     for(let i = 0; i < ladduLease.length; i++) {
      totalFullfilledAmount += ladduLease[i].leasesResp.amount;
      solSA.push(ladduLease[i].saAddress);
      if (totalFullfilledAmount >= tokenAmount) break;
     }
  }


  // interface LeaseId {
  //   leaseId: number;
  //   smartAccount: string;
  // }


  // sort leases
  // leases = leases.sort((a, b) => a.amount - b.amount);

  // let totalFullfilledAmount = 0;
  // let saAddresses = [];

  // for (let lease of leases) {
    // totalFullfilledAmount += lease.amount;
    // saAddresses.push(lease.smartAccount);
    // if (totalFullfilledAmount >= tokenAmount) break;
  // }

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
  console.log(chalk.italic("Opted in to one or multiple lease..."));

  console.log(chalk.italic("Solver using the leased funds to solve now..."));
  await new Promise((resolve) => setTimeout(resolve, 600));

  return solSA;
};

export const fullfillLease = async (leaseOwner: string, leaseId: number) => {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  try {
    console.log(chalk.yellow("Fulfilling lease..."));
    await fulfillLease(leaseOwner, leaseId, provider);
    console.log(chalk.green("Lease fulfilled successfully"));
  } catch (err) {
    console.error("Error fulfilling lease", err);
  }
};
