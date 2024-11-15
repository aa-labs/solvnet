import { ethers } from "ethers"
import Uniswapabi from "../abi/UniswapSolver.json"
import VaultAbi from "../abi/Vault.json"
import addresses from "../address.json";
import { RPC_URL } from "./config";
import dotenv from "dotenv";

dotenv.config();

export const solve = async () => {
    const { USDC, USDT, UNISWAP } = addresses;
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    console.log(process.env.PRIVATE_KEY)

    // priv key belongs to solver
    const signer = new ethers.Wallet(process.env.PRIVATE_KEY || "", provider);
    const vaultContract = new ethers.Contract(UNISWAP, VaultAbi.abi, signer);

    const duration = 86400; // hardcoding this for now
    
    // for solver: lease USDC tokens from vault
    await vaultContract.lease(USDC, 1000000);

    // for solver: make a swap from usdc to usdt
}