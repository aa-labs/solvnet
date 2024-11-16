// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {SolverStaking} from "../src/SolverStaking.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
import {SolvNetModule} from "../src/SolvNetModule.sol";

contract SolverStakingTest is Test {
    SolverStaking public staking;
    MockERC20 public stakingToken;

    address public owner;
    address public solver;
    address public user;
    address public endpoint;

    uint256 public constant INITIAL_BALANCE = 1000 ether;
    uint256 public constant STAKE_AMOUNT = 100 ether;

    // Foundry fork id for fork testing
    uint256 mainnetFork;

    event Staked(address indexed solver, uint256 amount);
    event UnstakeRequested(address indexed solver, uint256 amount, uint256 availableAt);
    event Unstaked(address indexed solver, uint256 amount);
    event Slashed(address indexed solver, uint256 amount);
    event ReadRequestSent(bytes32 guid);

    function setUp() public {
        // Create the fork
        string memory mainnetUrl = vm.envString("RPC_URL_1");
        mainnetFork = vm.createFork(mainnetUrl);
        vm.selectFork(mainnetFork);
        vm.rollFork(19_274_877);

        owner = makeAddr("owner");
        solver = makeAddr("solver");
        user = makeAddr("user");
        endpoint = 0x1a44076050125825900e736c501f859c50fE728c;

        // Deploy mock token
        stakingToken = new MockERC20("Staking Token", "STK");

        vm.startPrank(owner);
        // Deploy staking contract
        staking = new SolverStaking(endpoint, address(stakingToken), owner, address(0));

        // Mint tokens to solver
        stakingToken.mint(solver, INITIAL_BALANCE);
        vm.stopPrank();
    }

    function test_Initialization() public {
        assertEq(address(staking.stakingToken()), address(stakingToken));
        assertEq(staking.owner(), owner);
        assertEq(staking.totalStaked(), 0);
    }

    function test_Stake() public {
        vm.startPrank(solver);
        stakingToken.approve(address(staking), STAKE_AMOUNT);

        vm.expectEmit(true, true, true, true);
        emit Staked(solver, STAKE_AMOUNT);

        staking.stake(STAKE_AMOUNT);

        (uint256 amount,,) = staking.stakes(solver);
        assertEq(amount, STAKE_AMOUNT);
        assertEq(staking.totalStaked(), STAKE_AMOUNT);
        vm.stopPrank();
    }

    function test_StakeZeroAmount() public {
        vm.startPrank(solver);
        vm.expectRevert(abi.encodeWithSelector(SolverStaking.ZeroAmount.selector, 0));
        staking.stake(0);
        vm.stopPrank();
    }

    function test_Unstake() public {
        // First stake
        vm.startPrank(solver);
        stakingToken.approve(address(staking), STAKE_AMOUNT);
        staking.stake(STAKE_AMOUNT);

        uint256 unstakeAmount = 50 ether;
        vm.expectEmit(true, true, true, true);
        emit UnstakeRequested(solver, unstakeAmount, block.timestamp + 7 days);

        staking.unstake(unstakeAmount);

        (uint256 amount, uint256 timestamp, uint256 pendingAmount) = staking.stakes(solver);
        assertEq(amount, STAKE_AMOUNT - unstakeAmount);
        assertEq(pendingAmount, unstakeAmount);
        assertEq(timestamp, block.timestamp + 7 days);
        vm.stopPrank();
    }

    function test_CompleteUnstake() public {
        // Setup: stake and request unstake
        vm.startPrank(solver);
        stakingToken.approve(address(staking), STAKE_AMOUNT);
        staking.stake(STAKE_AMOUNT);
        staking.unstake(STAKE_AMOUNT);

        // Try to complete unstake before timelock
        vm.expectRevert(
            abi.encodeWithSelector(
                SolverStaking.TimelockNotExpired.selector, solver, block.timestamp, block.timestamp + 7 days
            )
        );
        staking.completeUnstake();

        // Wait for timelock to expire
        vm.warp(block.timestamp + 7 days);

        vm.expectEmit(true, true, true, true);
        emit Unstaked(solver, STAKE_AMOUNT);

        staking.completeUnstake();

        (uint256 amount, uint256 timestamp, uint256 pendingAmount) = staking.stakes(solver);
        assertEq(amount, 0);
        assertEq(timestamp, 0);
        assertEq(pendingAmount, 0);
        vm.stopPrank();
    }

    function test_GetMaxLiquidity() public {
        vm.startPrank(solver);
        stakingToken.approve(address(staking), STAKE_AMOUNT);
        staking.stake(STAKE_AMOUNT);

        uint256 maxLiquidity = staking.getMaxLiquidity(solver);
        assertEq(maxLiquidity, STAKE_AMOUNT * STAKE_AMOUNT);
        vm.stopPrank();
    }

    function test_SetSolvModuleContracts() public {
        uint32[] memory chainIds = new uint32[](2);
        chainIds[0] = 1;
        chainIds[1] = 2;

        address[] memory contracts = new address[](2);
        contracts[0] = makeAddr("contract1");
        contracts[1] = makeAddr("contract2");

        vm.prank(owner);
        staking.setSolvModuleContracts(chainIds, contracts);

        assertEq(staking.solvModuleContracts(chainIds[0]), contracts[0]);
        assertEq(staking.solvModuleContracts(chainIds[1]), contracts[1]);
    }

    function test_SetSolvModuleContractsLengthMismatch() public {
        uint32[] memory chainIds = new uint32[](2);
        address[] memory contracts = new address[](1);

        vm.expectRevert(abi.encodeWithSelector(SolverStaking.ArrayLengthMismatch.selector, 2, 1));

        vm.prank(owner);
        staking.setSolvModuleContracts(chainIds, contracts);
    }

    function test_OnlyOwnerFunctions() public {
        uint32[] memory chainIds = new uint32[](1);
        address[] memory contracts = new address[](1);

        vm.prank(solver);
        vm.expectRevert();
        staking.setSolvModuleContracts(chainIds, contracts);

        vm.prank(solver);
        vm.expectRevert();
        staking.setReadChannel(1);

        vm.prank(solver);
        vm.expectRevert();
        staking.withdraw();
    }
}
