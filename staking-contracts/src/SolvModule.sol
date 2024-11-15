// // SPDX-License-Identifier: MIT
// pragma solidity ^0.8.26;

// import "modulekit/Modules.sol";
// import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

// contract SolvNetModule is Module {
//     // struct, enum
//     struct LeaseConfig {
//         address token;
//         uint256 amount;
//         uint256 duration; // seconds
//         uint256 apr; // in basis points (e.g., 500 = 5%)
//         LeaseStatus status;
//         uint256 startTime;
//     }
//     enum LeaseStatus {
//         None,
//         Pending,
//         Active,
//         Expired,
//         Fulfilled
//     }

//     // state
//     mapping(address => LeaseConfig) public leaseConfigs; // account => LeaseConfig
//     address public vaultAddress;

//     // events
//     event ModuleInitialized(address indexed account, LeaseConfig config);
//     event ModuleUninitialized(address indexed account);
//     event LeaseConfigUpdated(address indexed account, LeaseConfig config);
//     event LeaseStarted(address indexed account);
//     event LeaseFulfilled(address indexed account);
//     event LeaseExpired(address indexed account);

//     /**
//      * @notice Called when the module is installed on a smart account.
//      * @param data Encoded LeaseConfig and vaultAddress.
//      */
//     function onInstall(bytes calldata data) external override {
//         // Decode the data to get initial LeaseConfig and vaultAddress
//         (LeaseConfig memory config, address _vaultAddress) = abi.decode(
//             data,
//             (LeaseConfig, address)
//         );
//         require(_vaultAddress != address(0), "Invalid vault address");
//         vaultAddress = _vaultAddress;
//         leaseConfigs[msg.sender] = config;
//         emit ModuleInitialized(msg.sender, config);
//     }

//     /**
//      * @notice Called when the module is uninstalled from a smart account.
//      * @param data Not used in this context.
//      */
//     function onUninstall(bytes calldata data) external override {
//         delete leaseConfigs[msg.sender];
//         emit ModuleUninitialized(msg.sender);
//     }

//     /**
//      * @notice Updates the lease configuration for the user's account.
//      * @param config The new lease configuration.
//      */
//     function updateLeaseConfig(LeaseConfig calldata config) external {
//         require(config.token != address(0), "Invalid token address");
//         require(config.amount > 0, "Amount must be greater than zero");
//         leaseConfigs[msg.sender] = config;
//         emit LeaseConfigUpdated(msg.sender, config);
//     }

//     /**
//      * @notice Allows the vault to pull tokens from the user's account.
//      * @param account The user's smart account address.
//      */
//     function pullTokens(address account) external {
//         require(msg.sender == vaultAddress, "Only vault can pull tokens");
//         LeaseConfig storage config = leaseConfigs[account];
//         require(
//             config.status == LeaseStatus.None ||
//                 config.status == LeaseStatus.Expired ||
//                 config.status == LeaseStatus.Fulfilled,
//             "Lease already active or pending"
//         );

//         // Transfer tokens from the user's account to the vault
//         IERC20 token = IERC20(config.token);
//         uint256 amount = config.amount;

//         // Ensure the user's account has enough balance
//         require(
//             token.balanceOf(account) >= amount,
//             "Insufficient balance in user's account"
//         );

//         // Execute the transfer on behalf of the user's account
//         _executeTokenTransfer(account, vaultAddress, config.token, amount);

//         // Update the lease status
//         config.status = LeaseStatus.Active;
//         config.startTime = block.timestamp;

//         emit LeaseStarted(account);
//     }

//     /**
//      * @notice Allows the vault to mark the lease as fulfilled and return tokens if needed.
//      * @param account The user's smart account address.
//      */
//     function fulfillLease(address account) external {
//         require(msg.sender == vaultAddress, "Only vault can fulfill lease");
//         LeaseConfig storage config = leaseConfigs[account];
//         require(config.status == LeaseStatus.Active, "Lease not active");

//         // Implement logic to handle the fulfillment, e.g., return tokens to user, distribute rewards
//         // For simplicity, we assume tokens are returned to the user's account

//         // Transfer tokens back to the user's account from the vault
//         _executeTokenTransfer(
//             vaultAddress,
//             account,
//             config.token,
//             config.amount
//         );

//         // Update the lease status
//         config.status = LeaseStatus.Fulfilled;

//         emit LeaseFulfilled(account);
//     }

//     /**
//      * @notice Checks and updates the lease status if it has expired.
//      * @param account The user's smart account address.
//      */
//     function checkLeaseExpiry(address account) external {
//         LeaseConfig storage config = leaseConfigs[account];
//         if (
//             config.status == LeaseStatus.Active &&
//             block.timestamp >= config.startTime + config.duration
//         ) {
//             config.status = LeaseStatus.Expired;
//             emit LeaseExpired(account);
//         }
//     }

//     /*//////////////////////////////////////////////////////////////
//                            INTERNAL FUNCTIONS
//     //////////////////////////////////////////////////////////////*/

//     /**
//      * @notice Executes a token transfer on behalf of the account.
//      * @param from The address from which tokens will be transferred.
//      * @param to The recipient address.
//      * @param tokenAddress The ERC20 token address.
//      * @param amount The amount of tokens to transfer.
//      */
//     function _executeTokenTransfer(
//         address from,
//         address to,
//         address tokenAddress,
//         uint256 amount
//     ) internal {
//         // Create calldata for ERC20 transfer
//         bytes memory data = abi.encodeWithSelector(
//             IERC20.transfer.selector,
//             to,
//             amount
//         );

//         // Execute the token transfer
//         (bool success, bytes memory result) = tokenAddress.call(
//             abi.encodeWithSelector(
//                 IERC20.transferFrom.selector,
//                 from,
//                 to,
//                 amount
//             )
//         );
//         require(
//             success && (result.length == 0 || abi.decode(result, (bool))),
//             "Token transfer failed"
//         );
//     }

//     /*//////////////////////////////////////////////////////////////
//                              MODULE METADATA
//     //////////////////////////////////////////////////////////////*/

//     /**
//      * @notice Returns the name of the module.
//      */
//     function name() external pure returns (string memory) {
//         return "SolvNetModule";
//     }

//     /**
//      * @notice Returns the version of the module.
//      */
//     function version() external pure returns (string memory) {
//         return "1.0.0";
//     }

//     /**
//      * @notice Checks if the module is initialized on a smart account.
//      * @param smartAccount The smart account address.
//      * @return True if initialized, false otherwise.
//      */
//     function isInitialized(
//         address smartAccount
//     ) public view override returns (bool) {
//         return leaseConfigs[smartAccount].token != address(0);
//     }
// }
