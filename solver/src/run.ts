import { ethers, JsonRpcProvider } from "ethers";
import Uniswapabi from "../abi/UniswapSolver.json";
import VaultAbi from "../abi/Vault.json";
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

interface LeaseEvent {
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
    const { smartAccount, leaseId, lease } = event.args;
    return {
      leaseId: leaseId.toString(),
    };
  });

  console.log("Fetched leaseIds", leaseIds);

  // for solver: swap usdc to usdt now a.k.a using lease amount here
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
