// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
// import "./SolvNetModule.sol";

contract Vault {
    // state variables
    uint256 public totalLiquidity;
    uint256 public constant MAX_WITHDRAWABLE_LIQUIDITY = 1_000_000 ether;

    // Solver address => Amount borrowed
    mapping(address => uint256) public loaners;
    // User account => Amount pending to be pulled
    mapping(address => uint256) public pendingLiquidity;

    address public moduleAddress;
    address public botAddress;

    // events
    event Deposit(address indexed token, uint256 amount, address indexed from);
    event LeaseProvided(
        address indexed solver,
        uint256 amount,
        address indexed token
    );
    event Payback(address indexed solver, uint256 amount);
    event LiquidityPulled(
        address indexed userAccount,
        uint256 amount,
        address indexed token
    );

    // will be called by the ai agent bot
    modifier onlyBot() {
        require(msg.sender == botAddress, "Only bot can call this function");
        _;
    }

    constructor(address _moduleAddress, address _botAddress) {
        moduleAddress = _moduleAddress;
        botAddress = _botAddress;
    }

    // Called by the bot to pull tokens from user's smart account
    function pullTokensFromUser(address userAccount) external onlyBot {
        // SolvNetModule module = SolvNetModule(moduleAddress);
        // SolvNetModule.LeaseConfig memory config = module.leaseConfigs(
        //     userAccount
        // );
        // require(
        //     config.status == SolvNetModule.LeaseStatus.None ||
        //         config.status == SolvNetModule.LeaseStatus.Expired ||
        //         config.status == SolvNetModule.LeaseStatus.Fulfilled,
        //     "Lease already active or pending"
        // );
        // // Call the module's pullTokens function
        // module.pullTokens(userAccount);
        // // Update total liquidity
        // totalLiquidity += config.amount;
        // emit LiquidityPulled(userAccount, config.amount, config.token);
    }

    // allows solvers to lease liqudity from the vault
    function lease(
        uint256 _duration,
        uint256 _amount,
        address _tokenAddress
    ) external {
        require(totalLiquidity >= _amount, "Not enough liquidity");
        require(
            loaners[msg.sender] + _amount <= MAX_WITHDRAWABLE_LIQUIDITY,
            "Amount exceeds max withdrawable liquidity"
        );

        totalLiquidity -= _amount;
        loaners[msg.sender] += _amount;
        // Transfer tokens to the solver
        IERC20(_tokenAddress).transfer(msg.sender, _amount);
        emit LeaseProvided(msg.sender, _amount, _tokenAddress);
    }

    // Called by solvers to pay back the borrowed amount
    function payback(address _tokenAddress, uint256 _amount) external {
        require(
            loaners[msg.sender] >= _amount,
            "Payback amount exceeds loaned amount"
        );
        // Transfer tokens from the solver to the vault
        IERC20(_tokenAddress).transferFrom(msg.sender, address(this), _amount);
        loaners[msg.sender] -= _amount;
        totalLiquidity += _amount;
        emit Payback(msg.sender, _amount);
    }

    // Called by the bot to check and update lease statuses
    function checkLeaseExpiries(
        address[] calldata userAccounts
    ) external onlyBot {
        // SolvNetModule module = SolvNetModule(moduleAddress);
        // for (uint256 i = 0; i < userAccounts.length; i++) {
        //     module.checkLeaseExpiry(userAccounts[i]);
        // }
    }
}
