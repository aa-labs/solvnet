import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  networks: {
    polygon: {
      url: `https://polygon-mainnet.g.alchemy.com/v2/M6obmh9NhecgkyNlK0G00anwrpBnjzwA`,
      accounts: [
        `79c4470693fa966f626ced8d46a6b7f28b787e8f7ac0060af5122939f530f071`,
      ],
      timeout: 1000000000, // need to increase the timeout here
    },
    localhost: {
      url: "http://localhost:8545",
      accounts: [
        `0x8166f546bab6da521a8369cab06c5d2b9e46670292d85c875ee9ec20e84ffb61`,
        `0xea6c44ac03bff858b476bba40716402b03e41b8e97e276d1baec7c37d42484a0`,
        `0xea6c44ac03bff858b476bba40716402b03e41b8e97e276d1baec7c37d42484a0`
      ]
    }
  },
};

export default config;
