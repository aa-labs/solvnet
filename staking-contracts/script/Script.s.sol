// SPDX-License-Identifier: UNLICENSED

// Usage: source .env && forge script ./script/Deploy.Deterministic.s.sol --rpc-url=$SEPOLIA_RPC_URL --broadcast --etherscan-api-key=$ETHERSCAN_API_KEY --verify

pragma solidity ^0.8.0;

import "forge-std/Script.sol";

import {SolverStaking} from "../src/SolverStaking.sol";
import {SolvNetModule} from "../src/SolvNetModule.sol";
import {MockERC20} from "../test/mocks/MockERC20.sol";

// Deployer
address constant CREATE2_FACTORY_ADDRESS = 0x4e59b44847b379578588920cA78FbF26c0B4956C;
address constant AMAN = 0x5065dd346560441c8b73c1c2E1C973Ec35d13789;

// Deployment Salts
string constant SOLVER_STAKING_SALT = "SOLVER_STAKING";
string constant SOLV_NET_MODULE_SALT = "SOLV_NET_MODULE";
string constant STAKING_TOKEN_SALT = "STAKING_TOKEN_4";
string constant MEME_TOKEN_SALT = "MEME_TOKEN_1";
string constant MEME_TOKEN_SALT_2 = "MEME_TOKEN_2";

// Deployment Configuration
address constant OWNER = 0x90f05C1E52FAfB4577A4f5F869b804318d56A1ee;
string constant STAKING_TOKEN_SYMBOL = "SOLVN";

// RPC Base
string constant RPC_BASE = "https://base-mainnet.g.alchemy.com/v2/G7Le1MzAcFgLuG6lIVw73_1wsZotpr28";
string constant RPC_ARBITRUM = "https://arb-mainnet.g.alchemy.com/v2/G7Le1MzAcFgLuG6lIVw73_1wsZotpr28";
string constant RPC_SCROLL = "https://scroll-mainnet.g.alchemy.com/v2/G7Le1MzAcFgLuG6lIVw73_1wsZotpr28";
string constant RPC_MORPH = "https://rpc-quicknode.morphl2.io";
string constant RPC_LINEA = "https://linea-mainnet.g.alchemy.com/v2/G7Le1MzAcFgLuG6lIVw73_1wsZotpr28";
string constant RPC_MANTLE = "https://mantle-mainnet.g.alchemy.com/v2/G7Le1MzAcFgLuG6lIVw73_1wsZotpr28";

uint256 constant TOKEN_AMT = 1000000000 ether;
uint256 constant SOLVER_INITIAL_STAKE = 1 ether;

string constant MEME_TOKEN_SYMBOL = "RUGPULL";
string constant MEME_TOKEN_SYMBOL_2 = "LADDU";

contract DeployDeterministic is Script {
    mapping(uint256 => address) layerzeroEndpoints;

    uint256 baseFork;
    uint256 arbitrumFork;
    uint256 scrollFork;
    uint256 morphFork;
    uint256 lineaFork;
    uint256 mantleFork;

    constructor() {
        layerzeroEndpoints[8453] = 0x1a44076050125825900e736c501f859c50fE728c;
        layerzeroEndpoints[42161] = 0x1a44076050125825900e736c501f859c50fE728c;

        baseFork = vm.createFork(RPC_BASE);
        arbitrumFork = vm.createFork(RPC_ARBITRUM);
        scrollFork = vm.createFork(RPC_SCROLL);
        morphFork = vm.createFork(RPC_MORPH);
        lineaFork = vm.createFork(RPC_LINEA);
        mantleFork = vm.createFork(RPC_MANTLE);
    }

    error Create2DeployerNotDeployed();
    error DeploymentFailed(bytes reason);
    error LayerZeroEndpointNotSet(uint256 chainId);
    error TransferFailed(address to, uint256 amount);
    error NotDeployedToExpectedAddress(address expected, address actual);
    error AddressDoesNotContainBytecode(address addr);

    function _generateUint256SaltFromString(string memory _salt) internal pure returns (uint256) {
        return uint256(keccak256(abi.encodePacked(_salt)));
    }

    function _generateDeterminsticAddress(string memory _salt, bytes memory _creationCode)
        internal
        pure
        returns (address)
    {
        uint256 salt = _generateUint256SaltFromString(_salt);
        bytes32 hash =
            keccak256(abi.encodePacked(bytes1(0xff), CREATE2_FACTORY_ADDRESS, salt, keccak256(_creationCode)));
        return address(uint160(uint256(hash)));
    }

    function _checkDeployer() internal view {
        if (CREATE2_FACTORY_ADDRESS.code.length == 0) {
            revert Create2DeployerNotDeployed();
        }
    }

    function _deploy(string memory _salt, bytes memory _creationCode) internal returns (address deployedAddress) {
        (bool success, bytes memory data) =
            CREATE2_FACTORY_ADDRESS.call(abi.encodePacked(_generateUint256SaltFromString(_salt), _creationCode));

        if (!success) {
            revert DeploymentFailed(data);
        }

        assembly ("memory-safe") {
            deployedAddress := shr(0x60, mload(add(data, 0x20)))
        }
    }

    function _deployWithSanityChecks(string memory _salt, bytes memory _creationCode)
        internal
        returns (address payable)
    {
        address expectedAddress = _generateDeterminsticAddress(_salt, _creationCode);

        if (address(expectedAddress).code.length != 0) {
            console2.log("contract already deployed at: ", expectedAddress);
            return payable(expectedAddress);
        }

        address addr = _deploy(_salt, _creationCode);

        if (addr != expectedAddress) {
            revert NotDeployedToExpectedAddress(expectedAddress, addr);
        }

        if (address(addr).code.length == 0) {
            revert AddressDoesNotContainBytecode(addr);
        }

        return payable(addr);
    }

    function _getLayerZeroEndpoint(uint256 chainId) internal view returns (address) {
        if (layerzeroEndpoints[chainId] == address(0)) {
            revert LayerZeroEndpointNotSet(chainId);
        }

        return layerzeroEndpoints[chainId];
    }

    function _fundToken(MockERC20 token, address to, uint256 amount) internal {
        uint256 balance = token.balanceOf(to);
        if (balance < amount) {
            token.mint(to, amount - balance);
        }
    }

    function _deployToken(string memory _name, string memory _symbol, string memory _salt)
        internal
        returns (MockERC20 token)
    {
        bytes memory creationCode =
            abi.encodePacked(vm.getCode("test/mocks/MockERC20.sol:MockERC20"), abi.encode(_name, _symbol));

        console2.log("Deploying Token ", _name, " on ", block.chainid);

        token = MockERC20(_deployWithSanityChecks(_salt, creationCode));

        _fundToken(token, OWNER, TOKEN_AMT);
        _fundToken(token, AMAN, TOKEN_AMT);
        // _fundToken(token, solverAddress, TOKEN_AMT);
    }

    function deployPrimaryChain(uint256 primaryFork, uint256 deployerPrivateKey, uint256 solverPrivateKey)
        internal
        returns (
            MockERC20 stakingToken,
            MockERC20 memeToken,
            MockERC20 memeToken2,
            SolverStaking solverStaking,
            SolvNetModule solvNetModule
        )
    {
        address deployerAddress = vm.addr(deployerPrivateKey);
        address solverAddress = vm.addr(solverPrivateKey);

        // Deploy on Base
        vm.selectFork(primaryFork);

        _checkDeployer();
        console2.log("Deployer is ready\n");

        vm.startBroadcast(deployerPrivateKey);

        console2.log("Deploying on Primary Chain ", block.chainid, "\n");

        // Deploy Staking Token
        console2.log("Deploying Staking Token");
        stakingToken = _deployToken(STAKING_TOKEN_SYMBOL, STAKING_TOKEN_SYMBOL, STAKING_TOKEN_SALT);

        // Deploy Meme Token
        console2.log("Deploying Meme Token");
        memeToken = _deployToken(MEME_TOKEN_SYMBOL, MEME_TOKEN_SYMBOL, MEME_TOKEN_SALT);

        // Deploy Meme Token 2
        console2.log("Deploying Meme Token 2");
        memeToken2 = _deployToken(MEME_TOKEN_SYMBOL_2, MEME_TOKEN_SYMBOL_2, MEME_TOKEN_SALT_2);

        // Deploy SolvNetModule
        console2.log("Deploying SolvNetModule");
        bytes memory solvNetModuleCreationCode = abi.encodePacked(vm.getCode("SolvNetModule"));
        solvNetModule = SolvNetModule(_deployWithSanityChecks(SOLV_NET_MODULE_SALT, solvNetModuleCreationCode));
        console2.log("SolvNetModule deployed at: ", address(solvNetModule), "\n");

        // Deploy SolverStaking
        console2.log("Deploying SolverStaking");
        bytes memory solverStakingCreationCode = abi.encodePacked(
            vm.getCode("SolverStaking"),
            abi.encode(_getLayerZeroEndpoint(block.chainid), address(stakingToken), OWNER, address(solvNetModule))
        );
        solverStaking = SolverStaking(_deployWithSanityChecks(SOLVER_STAKING_SALT, solverStakingCreationCode));
        console2.log("SolverStaking deployed at: ", address(solverStaking), "\n");

        // Configure Solver Staking
        console2.log("Configuring Solver Staking");
        uint32[] memory chainIds = new uint32[](6);
        chainIds[0] = 8453;
        chainIds[1] = 42161;
        chainIds[2] = 534352; // Scroll
        chainIds[3] = 2818; // Morph
        chainIds[4] = 59144; // Linea
        chainIds[5] = 5000; // Mantle

        address[] memory leaseContracts = new address[](6);
        leaseContracts[0] = address(solvNetModule);
        leaseContracts[1] = address(solvNetModule);
        leaseContracts[2] = address(solvNetModule);
        leaseContracts[3] = address(solvNetModule);
        leaseContracts[4] = address(solvNetModule);
        leaseContracts[5] = address(solvNetModule);
        solverStaking.setSolvModuleContracts(chainIds, leaseContracts);
        console2.log("Solver Staking configured\n");

        vm.stopBroadcast();

        return (stakingToken, memeToken, memeToken2, solverStaking, solvNetModule);
    }

    function deploySecondaryChain(uint256 secondaryFork, uint256 deployerPrivateKey, uint256 solverPrivateKey)
        internal
    {
        address deployerAddress = vm.addr(deployerPrivateKey);
        address solverAddress = vm.addr(solverPrivateKey);

        // Deploy on Base
        vm.selectFork(secondaryFork);

        _checkDeployer();
        console2.log("Deployer is ready\n");

        vm.startBroadcast(deployerPrivateKey);

        console2.log("Deploying on Secondary Chain ", block.chainid, "\n");

        // Deploy Staking Token
        _deployToken(STAKING_TOKEN_SYMBOL, STAKING_TOKEN_SYMBOL, STAKING_TOKEN_SALT);
        // Deploy Meme Token
        _deployToken(MEME_TOKEN_SYMBOL, MEME_TOKEN_SYMBOL, MEME_TOKEN_SALT);
        // Deploy Meme Token 2
        _deployToken(MEME_TOKEN_SYMBOL_2, MEME_TOKEN_SYMBOL_2, MEME_TOKEN_SALT_2);

        // Deploy SolvNetModule
        console2.log("Deploying SolvNetModule");
        bytes memory solvNetModuleCreationCode = abi.encodePacked(vm.getCode("SolvNetModule"));
        SolvNetModule solvNetModule =
            SolvNetModule(_deployWithSanityChecks(SOLV_NET_MODULE_SALT, solvNetModuleCreationCode));
        console2.log("SolvNetModule deployed at: ", address(solvNetModule), "\n");

        vm.stopBroadcast();
    }

    function tryLeaseFlow(
        uint256 deployerKey,
        uint256 solverKey,
        SolvNetModule solvNetModule,
        SolverStaking solverStaking,
        MockERC20 stakingToken
    ) internal {
        // Switch to Base
        vm.selectFork(baseFork);
        // Stake Solver
        vm.startBroadcast(solverKey);
        address solverAddress = vm.addr(solverKey);
        (uint256 amount,,) = solverStaking.stakes(solverAddress);
        if (amount == 0) {
            if (stakingToken.allowance(solverAddress, address(solverStaking)) < type(uint256).max / 2) {
                console2.log("Approving SolverStaking for Staking Token");
                stakingToken.approve(address(solverStaking), type(uint256).max);
            }
            console2.log("Staking Solver");
            solverStaking.stake(SOLVER_INITIAL_STAKE);
        } else {
            console2.log("Solver already staked, skipping");
        }
        vm.stopBroadcast();

        // Switch to Arbitrum
        vm.selectFork(arbitrumFork);

        vm.startBroadcast(deployerKey);

        address deployerAddress = vm.addr(deployerKey);

        // Deploy Meme Token 1
        console2.log("Deploying Meme Token");
        bytes memory memeTokenCreationCode = abi.encodePacked(
            vm.getCode("test/mocks/MockERC20.sol:MockERC20"), abi.encode(MEME_TOKEN_SYMBOL, MEME_TOKEN_SYMBOL)
        );
        MockERC20 memeToken = MockERC20(_deployWithSanityChecks(MEME_TOKEN_SALT, memeTokenCreationCode));
        console2.log("Meme Token deployed at: ", address(memeToken), "\n");

        // Mint Meme Token to Deployer
        console2.log("Minting Meme Token to Deployer");
        uint256 balance = memeToken.balanceOf(deployerAddress);
        if (balance < TOKEN_AMT) {
            console2.log("Minting Meme Token to Deployer");
            memeToken.mint(deployerAddress, TOKEN_AMT - balance);
        }

        // Set Lease Configuration
        console2.log("Setting Lease Configuration");
        SolvNetModule.TokenWiseLeaseConfig memory config = SolvNetModule.TokenWiseLeaseConfig({
            token: address(memeToken),
            max_amount: 100e18,
            apr: 500, // 5%
            max_duration: 5 seconds
        });
        solvNetModule.updateLeaseConfig(config);

        // Set infinite approval for SolverStaking
        console2.log("Setting infinite approval for SolverStaking");
        if (memeToken.allowance(deployerAddress, address(solvNetModule)) < type(uint256).max) {
            memeToken.approve(address(solvNetModule), type(uint256).max);
        }
        vm.stopBroadcast();

        vm.startBroadcast(solverKey);
        // Start Lease
        console2.log("Starting Lease");
        uint256 leaseId = solvNetModule.startLease(deployerAddress, address(memeToken), 100e18, solverAddress);
        console2.log("Lease started with ID: ", leaseId, "\n");
        vm.stopBroadcast();

        // Wait for 10 seconds
        vm.sleep(10_000);

        // Switch to Base
        vm.selectFork(baseFork);
        vm.startBroadcast(deployerKey);

        // Submit a fraud report
        console2.log("Submitting a fraud report");
        // solverStaking.initiateSolverSlashing{value: 0.005 ether}(deployerAddress, 42161, leaseId);
        address(solverStaking).call{value: 0.005 ether, gas: 1_000_000}(
            abi.encodeWithSelector(solverStaking.initiateSolverSlashing.selector, deployerAddress, 42161, leaseId)
        );
        vm.stopBroadcast();
    }

    function run_deploy() internal {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployerAddress = vm.addr(deployerPrivateKey);

        uint256 solverPrivateKey = vm.envUint("SOLVER_PRIVATE_KEY");
        address solverAddress = vm.addr(solverPrivateKey);

        console2.log("Deployer: ", deployerAddress);
        console2.log("Solver: ", solverAddress);

        (
            MockERC20 stakingToken,
            MockERC20 memeToken,
            MockERC20 memeToken2,
            SolverStaking solverStaking,
            SolvNetModule solvNetModule
        ) = deployPrimaryChain(baseFork, deployerPrivateKey, solverPrivateKey);

        deploySecondaryChain(scrollFork, deployerPrivateKey, solverPrivateKey);
        // deploySecondaryChain(lineaFork, deployerPrivateKey, solverPrivateKey);
        deploySecondaryChain(arbitrumFork, deployerPrivateKey, solverPrivateKey);
        deploySecondaryChain(mantleFork, deployerPrivateKey, solverPrivateKey);
        // deploySecondaryChain(morphFork, deployerPrivateKey, solverPrivateKey);

        // tryLeaseFlow(deployerPrivateKey, solverPrivateKey, solvNetModule, solverStaking, stakingToken);
    }

    function debug() internal {
        vm.selectFork(baseFork);
        SolvNetModule solvNetModule = SolvNetModule(payable(0xB9964233A0F328c52Ed063B8c70F089EdCaa9924));
        SolvNetModule.TokenWiseLeaseConfig memory config =
            solvNetModule.getLeaseConfig(AMAN, 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913);
        // SolvNetModule.TokenWiseLeaseConfig memory config =
        //     solvNetModule.getLeaseConfig(0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913, AMAN);

        console2.log("Token: ", config.token);
        console2.log("Max Amount: ", config.max_amount);
        console2.log("APR: ", config.apr);
        console2.log("Max Duration: ", config.max_duration);

        solvNetModule.startLease(AMAN, 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913, 1000000, address(this));
    }

    function run() external {
        run_deploy();
        // debug();
    }
}
