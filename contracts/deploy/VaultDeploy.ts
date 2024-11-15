import { ethers } from "hardhat"

const deploy = async () => {
    const [deployer] = await ethers.getSigners();
    const VaultFactory = await ethers.getContractFactory(
        "Vault"
    );
    const VaultContract = await VaultFactory.connect(deployer).deploy();
    let vaultContractAddress = await VaultContract.getAddress();
    console.log("Vault Contract deployed at: ", vaultContractAddress);
}

deploy();