import { fetchStakeInfo } from "./proof";
import { ethers } from "ethers";
import chalk from "chalk";
import ora from "ora";
import dotenv from "dotenv";

dotenv.config();

// Configure the RPC provider and contract details
const RPC_URL = "https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID"; // Replace with your RPC URL
const provider = new ethers.providers.JsonRpcProvider(RPC_URL);

const STAKING_CONTRACT_ADDRESS = "0xYourStakingContractAddress"; // Replace with your staking contract address
const STAKING_CONTRACT_ABI = [
  "function slash(address _solver, address _userAddress) external",
];

const signer = new ethers.Wallet(process.env.PRIVATE_KEY || '', provider);

// Initialize the contract instance
const stakingContract = new ethers.Contract(
  STAKING_CONTRACT_ADDRESS,
  STAKING_CONTRACT_ABI,
  signer
);

// Loader utility
const loader = ora({
  spinner: "dots",
  text: chalk.blueBright("Fetching data from blockchain..."),
});


// ith solver has taken lease from ith user liq
const saAddresses = ["0xc2132D05D31c914a87C6611C10748AEb04B58e8F", "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", "0xc2132D05D31c914a87C6611C10748AEb04B58e8F"];
const solverAddresses = ["0xc2132D05D31c914a87C6611C10748AEb04B58e8F", "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", "0xc2132D05D31c914a87C6611C10748AEb04B58e8F"];

(async () => {
    loader.start();

    for (let i = 0; i < saAddresses.length; i++) {
        const saAddress = saAddresses[i];
        const solverAddress = solverAddresses[i];
        try {
            let slashTxn = await stakingContract.slash(solverAddress, saAddress);
            await slashTxn.wait();
        } catch (error) {
            console.log(error);
        }
        console.log(
            chalk.bold(`\nChecking lease for solver ${chalk.yellow(saAddress)}`)
        );
    }

    loader.succeed(chalk.green("Slashing checks completed"));
})();
