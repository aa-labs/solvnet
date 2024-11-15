import { ethers } from "hardhat"

const deploy = async () => {
    const [deployer] = await ethers.getSigners();
    const UniswapFactory = await ethers.getContractFactory(
        "USDCUSDTUniswapSwap"
    );
    const UniswapContract = await UniswapFactory.connect(deployer).deploy(
        "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", // three random addresses
        "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
        "0xc2132D05D31c914a87C6611C10748AEb04B58e8F"
    );
    let UniswapContractAddress = await UniswapContract.getAddress();
    console.log("Uniswap Contract deployed at: ", UniswapContractAddress);
}

deploy();