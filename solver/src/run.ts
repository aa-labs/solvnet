import { ethers, JsonRpcProvider } from "ethers"
import Uniswapabi from "../abi/UniswapSolver.json"
import VaultAbi from "../abi/Vault.json"
import addresses from "../address.json";
import { RPC_URL } from "./config";
import dotenv from "dotenv";

dotenv.config();

const SOLVER_MODULE_ABI = [
    "function startLeases( address[] calldata smartAccounts, address[] calldata tokens, uint256[] calldata amounts, address[] calldata tos) external"
];

const startLeases = async (saAddress: string[], tokenAddresses: string[], tokenAmounts: BigInt[], toAddresses: string[], provider: JsonRpcProvider) => {
    const { SOLVE_MODULE } = addresses;
    const signer = new ethers.Wallet(process.env.PRIVATE_KEY || "", provider);
    const solveModuleContract = new ethers.Contract(SOLVE_MODULE, SOLVER_MODULE_ABI, signer);

    let leaseFundsResp = await solveModuleContract.startLeases(saAddress, tokenAddresses, tokenAmounts, toAddresses);

    await leaseFundsResp.wait();
}

export const solve = async () => {
    const { USDC, USDT, UNISWAP, VAULT, SOLVE_MODULE } = addresses;
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    const signer = new ethers.Wallet(process.env.PRIVATE_KEY || "", provider);
    

    // loop over multiple chains and lease tokens over diff chains

    // for solver: swap usdc to usdt now
    const uniswapContract = new ethers.Contract(UNISWAP, Uniswapabi.abi, signer);

    const amountIn = ethers.parseUnits("0.1", 6);
    const amountOut = ethers.parseUnits("0.1", 6);
    const duration = 86400;

    let swapResp = await uniswapContract.swapUSDCtoUSDT(amountIn, amountOut, duration);

    await swapResp.wait();
    console.log("Swap contract response", swapResp);
}