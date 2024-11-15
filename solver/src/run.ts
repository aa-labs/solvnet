import { ethers } from "ethers"
import Uniswapabi from "../abi/UniswapSolver.json"
import addresses from "../address.json";
import { RPC_URL } from "./config";

export const solve = async () => {
    const { USDC, USDT, UNISWAP } = addresses;
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    // show call swap method here
}