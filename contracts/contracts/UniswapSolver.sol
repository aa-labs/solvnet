// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@uniswap/v2-core/contracts/interfaces/IERC20.sol";

contract USDCUSDTUniswapSwap {
    address public router;
    address public usdc;
    address public usdt;

    constructor(
        address _router, 
        address _usdc, 
        address _usdt
    ) {
        router = _router;
        usdc = _usdc;
        usdt = _usdt;
    }

    function swapUSDCtoUSDT(uint256 _amountIn, uint256 _amountOutMin, uint256 _deadline) external {
        IERC20(usdc).transferFrom(msg.sender, address(this), _amountIn); // Transfer USDC from sender to contract
        IERC20(usdc).approve(router, _amountIn); // Approve the router to spend USDC

        address[] memory path = new address[](2);
        path[0] = usdc; // USDC
        path[1] = usdt; // USDT

        IUniswapV2Router02(router).swapExactTokensForTokens(
            _amountIn, 
            _amountOutMin, 
            path, 
            msg.sender, // Send USDT back to the user
            _deadline
        );
    }
}
