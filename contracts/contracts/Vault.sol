// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@uniswap/v2-core/contracts/interfaces/IERC20.sol";

contract Vault {

    uint64 public TOTAL_LIQUIDITY;
    uint64 public MAX_WITHDRAWABLE_LIQUIDITY = 1000000;
    uint64 public noOfLeases = 0;

    struct SolverLease {
        uint256 duration;
        uint64 amount;
        address tokenAddress;
        bool status;
    }

    mapping(uint64 => SolverLease) public leases;
    mapping(address => uint64) public loaners;

    // called by offchain cron job which will pull tokens from user
    function deposit(address _token, uint64 _amount, address _from) public {
        IERC20(_token).transferFrom(msg.sender, address(this), _amount);
        TOTAL_LIQUIDITY += _amount;
    }   

    // called by solver
    function lease(uint256 _duration, uint64 _amount, address _tokenAddress) public {
        // uint64 _prevLease = loaners[msg.sender];
        // require(TOTAL_LIQUIDITY >= _amount, "Not enough liquidity");
        // require(_prevLease + _amount <= MAX_WITHDRAWABLE_LIQUIDITY, "Amount exceeds max withdrawable liquidity");
        
        // TOTAL_LIQUIDITY -= _amount;
        // IERC20(_tokenAddress).transfer(msg.sender, _amount);
        
        // loaners[msg.sender] += _amount;
        leases[noOfLeases] = SolverLease(_duration, _amount, _tokenAddress, true);
        noOfLeases++;
    } 

    // called by offchain cron job which will pay user his share back
    function payback() public {

    }

    function getTotalNoOfLeases() public view returns (uint256) {
        return noOfLeases;
    }
}