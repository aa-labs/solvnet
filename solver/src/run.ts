import { ethers } from "ethers"
import Uniswapabi from "../abi/UniswapSolver.json"
import VaultAbi from "../abi/Vault.json"
import addresses from "../address.json";
import { RPC_URL } from "./config";
import dotenv from "dotenv";

dotenv.config();

export const solve = async () => {
    const { USDC, USDT, UNISWAP, VAULT } = addresses;
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    console.log(process.env.PRIVATE_KEY)

    // priv key belongs to solver
    const signer = new ethers.Wallet(process.env.PRIVATE_KEY || "", provider);
    const vaultContract = new ethers.Contract(VAULT, VaultAbi.abi, signer);

    const duration = 86400; // hardcoding this for now
    
    // for solver: lease USDC tokens from vault
    let leaseFundsResp = await vaultContract.lease(duration, 1000000, USDC);

    await leaseFundsResp.wait();

    // for solver: swap usdc to usdt now
    const uniswapContract = new ethers.Contract(UNISWAP, Uniswapabi.abi, signer);

    const amountIn = ethers.parseUnits("0.1", 6);
    const amountOut = ethers.parseUnits("0.1", 6);

    let swapResp = await uniswapContract.swapUSDCtoUSDT(amountIn, amountOut, duration);

    await swapResp.wait();
    console.log("Swap contract response", swapResp);
}