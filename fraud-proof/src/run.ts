import { ethers } from "ethers";
import chalk from "chalk";
import ora from "ora";
import dotenv from "dotenv";
import cron from "node-cron";

dotenv.config();

// Configure the RPC provider and contract details
const RPC_URL = "https://base-mainnet.g.alchemy.com/v2/7h2x2EBIOQzBvKSktrewDIjd4kJIigyG"; // Replace with your RPC URL
const provider = new ethers.providers.JsonRpcProvider(RPC_URL);

const STAKING_CONTRACT_ADDRESS = "0xd75f1992708016d4a28b6b74CEf9CFa18A29A575" ; // Replace with your staking contract address
const STAKING_CONTRACT_ABI = [ 
  "function initiateSolverSlashing(address _smartAccount, uint32 _targetChainId, uint256 _leaseId) external payable",
];

const DEMO_SMART_ACCOUNT = "0x5065dd346560441c8b73c1c2E1C973Ec35d13789"; 
const DEMO_SOLVER_ADDRESS = "0x5637bD5c6669AbEF9aF19EE0232dc2104604a1E8";
const signer = new ethers.Wallet(process.env.PRIVATE_KEY || "", provider);

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
const saAddresses = [
  DEMO_SMART_ACCOUNT
];

const solverAddresses = [
  DEMO_SOLVER_ADDRESS
];

const arbitrumChainId = 30110;
const leaseId = 1;

const scheduleSlashChecks = () => {
  // */5 * * * * for every 5 mins
  const task = cron.schedule('*/3 * * * * *', async () => {
    loader.start();

    loader.succeed(chalk.yellow("Checking for slashing..."));

    for (let i = 0; i < saAddresses.length; i++) {
      const saAddress = saAddresses[i];
      try {
        let slashTxn = await stakingContract.initiateSolverSlashing(saAddress, arbitrumChainId, leaseId, { gasLimit: 1000000 });
        let receipt = await slashTxn.wait();
      } catch (error) {
        console.log(error);
      }
      console.log(
        chalk.bold(`\nChecking lease for solver ${chalk.yellow(saAddress)}`)
      );
    }

    loader.succeed(chalk.green("Slashing checks completed"));
  });

  return task;
};

const task = scheduleSlashChecks();

task.start();