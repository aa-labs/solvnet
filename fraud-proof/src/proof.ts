#!/usr/bin/env node

import chalk from "chalk";
import ora from "ora";
import { ethers } from "ethers";

// Configure the RPC provider and contract details
const RPC_URL = "https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID"; // Replace with your RPC URL
const provider = new ethers.providers.JsonRpcProvider(RPC_URL);

const STAKING_CONTRACT_ADDRESS = "0xYourStakingContractAddress"; // Replace with your staking contract address
const STAKING_CONTRACT_ABI = [
  // Minimal ABI for checking staking data
  "function getStakeInfo(address user) view returns (uint256 startTime, uint256 lockPeriod, bool refunded)",
  "function slashStake(address user) public",
];

// Initialize the contract instance
const stakingContract = new ethers.Contract(
  STAKING_CONTRACT_ADDRESS,
  STAKING_CONTRACT_ABI,
  provider
);

// Loader utility
const loader = ora({
  spinner: "dots",
  text: chalk.blueBright("Fetching data from blockchain..."),
});

// Parse user address from CLI
const [, , address] = process.argv;

if (!address || !ethers.utils.isAddress(address)) {
  console.error(chalk.red("Error: Invalid or missing address."));
  console.log(`Usage: yarn run address ${chalk.green("0x123...")}`);
  process.exit(1);
}

// Format time for display
const formatTime = (seconds: number) => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${days}d ${hours}h ${minutes}m`;
};

// Fetch and evaluate stake information
const fetchStakeInfo = async () => {
  loader.start();

  try {
    const [startTime, lockPeriod, refunded] =
      await stakingContract.getStakeInfo(address);

    loader.succeed(chalk.green("Data fetched successfully."));

    const now = Math.floor(Date.now() / 1000);
    const elapsed = now - startTime;
    const timeLeft = lockPeriod - elapsed;

    console.log(
      chalk.bold(`\nStake Information for ${chalk.yellow(address)}:`)
    );
    console.log(
      `${chalk.blue("Start Time:")} ${new Date(
        startTime * 1000
      ).toLocaleString()}`
    );
    console.log(`${chalk.blue("Lock Period:")} ${formatTime(lockPeriod)}`);
    console.log(`${chalk.blue("Elapsed Time:")} ${formatTime(elapsed)}`);
    console.log(
      `${chalk.blue("Time Remaining:")} ${
        timeLeft > 0 ? formatTime(timeLeft) : chalk.green("None")
      }`
    );
    console.log(
      `${chalk.blue("Refunded:")} ${
        refunded ? chalk.green("Yes") : chalk.red("No")
      }`
    );

    // Categorize address status
    if (refunded) {
      console.log(chalk.greenBright("\nStatus: Refunded ✅"));
    } else if (timeLeft <= 0) {
      console.log(chalk.redBright("\nStatus: Red - Slashing Required 🚨"));
    } else {
      console.log(
        chalk.hex('#FFA500')(
          `\nStatus: Orange - ${formatTime(timeLeft)} left before slashing ⚠️`
        )
      );
    }
  } catch (error: unknown) {
    loader.fail(chalk.red("Error fetching data from blockchain."));
    console.error(chalk.red(error instanceof Error ? error.message : String(error)));
  }
};

// Run the script
fetchStakeInfo();
