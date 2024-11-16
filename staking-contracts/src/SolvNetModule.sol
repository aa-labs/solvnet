// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "modulekit/Modules.sol";
import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

contract SolvNetModule is ERC7579ExecutorBase {
    struct TokenWiseLeaseConfig {
        address token;
        uint256 max_amount;
        uint256 apr;
        uint256 max_duration;
    }

    struct Lease {
        uint256 id;
        address token;
        uint256 amount;
        uint256 startTime;
        address leaser;
        LeaseStatus status;
    }

    enum LeaseStatus {
        None,
        Active,
        Fulfilled
    }

    // Custom Errors
    error InvalidTokenAddress(address token);
    error InvalidRecipient(address recipient);
    error TokenNotConfigured(address smartAccount, address token);
    error AmountExceedsMaximum(uint256 requested, uint256 maximum);
    error TokenTransferFailed(address token, address from, address to, uint256 amount);
    error LeaseNotActive(address smartAccount, uint256 leaseId);
    error ActiveLeasesExist(address smartAccount, uint256[] leaseIds);
    error TokenMismatch(address expectedToken, address providedToken);
    error AmountMustBeGreaterThanZero(address token);
    error IncorrectETHAmount(uint256 amount);
    error IncorrectRepaymentAmount(uint256 provided, uint256 expected);

    // state
    mapping(address sa => mapping(address token => TokenWiseLeaseConfig)) leaseConfigs;
    mapping(address sa => mapping(uint256 leaseId => Lease)) leases;
    mapping(address sa => uint256[] activeLeases) activeLeases;
    mapping(address sa => bool initialized) initialized;
    uint256 nextLeaseId;

    // events
    event ModuleInitialized(address indexed account, TokenWiseLeaseConfig[] config);
    event ModuleUninitialized(address indexed account);
    event LeaseConfigUpdated(address indexed account, TokenWiseLeaseConfig config);
    event LeaseStarted(address indexed account, uint256 leaseId, Lease lease);
    event LeaseFulfilled(address indexed account, uint256 leaseId);
    event LeaseExpired(address indexed account, uint256 leaseId);

    function getLeaseConfig(address sa, address token) public view returns (TokenWiseLeaseConfig memory) {
        return leaseConfigs[sa][token];
    }

    function getLease(address sa, uint256 leaseId) public view returns (Lease memory) {
        return leases[sa][leaseId];
    }

    function getActiveLeases(address sa) public view returns (uint256[] memory) {
        return activeLeases[sa];
    }

    /**
     * @notice Called when the module is installed on a smart account.
     * @param data Encoded TokenWiseLeaseConfig.
     */
    function onInstall(bytes calldata data) external override {
        TokenWiseLeaseConfig[] memory config = abi.decode(data, (TokenWiseLeaseConfig[]));
        for (uint256 i = 0; i < config.length; i++) {
            if (config[i].token == address(0)) revert InvalidTokenAddress(config[i].token);
            leaseConfigs[msg.sender][config[i].token] = config[i];
        }
        initialized[msg.sender] = true;
        emit ModuleInitialized(msg.sender, config);
    }

    /**
     * @notice Called when the module is uninstalled from a smart account.
     */
    function onUninstall(bytes calldata) external override {
        address sa = msg.sender;
        if (activeLeases[sa].length > 0) revert ActiveLeasesExist(sa, activeLeases[sa]);
        initialized[sa] = false;
        emit ModuleUninitialized(sa);
    }

    /**
     * @notice Updates the lease configuration for a specific token.
     * @param config The new lease configuration.
     */
    function updateLeaseConfig(TokenWiseLeaseConfig calldata config) external {
        if (config.max_amount == 0) revert AmountMustBeGreaterThanZero(config.token);
        leaseConfigs[msg.sender][config.token] = config;
        emit LeaseConfigUpdated(msg.sender, config);
    }

    /**
     * @notice Internal function to transfer tokens from smart account to lease creator
     * @param from The smart account address
     * @param to The lease creator address
     * @param token The token address (address(0) for native token)
     * @param amount The amount to transfer
     */
    function _transferLeasedTokens(address from, address to, address token, uint256 amount) internal returns (bool) {
        // Handle native token transfer
        if (token == address(0)) {
            bytes memory result = _execute({
                account: from,
                to: to,
                value: amount,
                data: "" // Empty data for ETH transfer
            });
            return result.length == 0;
        }
        // Handle ERC20 transfer
        else {
            if (address(from).code.length == 0) {
                IERC20(token).transferFrom(from, to, amount);
                return true;
            } else {
                // Create calldata for ERC20 transferFrom
                bytes memory callData = abi.encodeWithSelector(IERC20.transfer.selector, to, amount);

                bytes memory result = _execute({account: from, to: token, value: 0, data: callData});

                // Check if transfer was successful
                if (result.length > 0) {
                    return abi.decode(result, (bool));
                }
                return true; // Some tokens don't return a value
            }
        }
    }

    function startLeases(
        address[] calldata smartAccounts,
        address[] calldata tokens,
        uint256[] calldata amounts,
        address[] calldata tos
    ) external returns (uint256[] memory leaseIds) {
        leaseIds = new uint256[](smartAccounts.length);

        for (uint256 i = 0; i < smartAccounts.length; i++) {
            leaseIds[i] = startLease(smartAccounts[i], tokens[i], amounts[i], tos[i]);
        }
    }

    /**
     * @notice Starts a new lease for the specified token and amount
     * @param smartAccount The smart account to transfer tokens from
     * @param token The token address (address(0) for native token)
     * @param amount The amount to lease
     * @param to The lease creator address who will receive the tokens
     */
    function startLease(address smartAccount, address token, uint256 amount, address to)
        public
        returns (uint256 leaseId)
    {
        if (to == address(0)) revert InvalidRecipient(to);
        TokenWiseLeaseConfig storage config = leaseConfigs[smartAccount][token];
        if (config.token != token && !(token == address(0) && config.token == token)) {
            revert TokenNotConfigured(smartAccount, token);
        }
        if (amount > config.max_amount) revert AmountExceedsMaximum(amount, config.max_amount);

        leaseId = nextLeaseId++;
        Lease storage lease = leases[smartAccount][leaseId];
        lease.id = leaseId;
        lease.token = token;
        lease.amount = amount;
        lease.startTime = block.timestamp;
        lease.status = LeaseStatus.Active;
        lease.leaser = to;

        activeLeases[smartAccount].push(leaseId);
        config.max_amount -= amount;

        // Transfer tokens from smart account to lease creator
        if (!_transferLeasedTokens(smartAccount, to, token, amount)) {
            revert TokenTransferFailed(token, smartAccount, to, amount);
        }

        emit LeaseStarted(smartAccount, leaseId, lease);
    }

    /**
     * @notice Calculates the total repayment amount including interest
     * @param smartAccount The smart account address
     * @param leaseId The lease ID
     * @return total The total amount to be repaid
     */
    function calculateRepaymentAmount(address smartAccount, uint256 leaseId) public view returns (uint256) {
        Lease storage lease = leases[smartAccount][leaseId];
        TokenWiseLeaseConfig storage config = leaseConfigs[smartAccount][lease.token];

        // Calculate time elapsed in seconds
        uint256 timeElapsed = block.timestamp - lease.startTime;

        // Calculate interest: (principal * apr * timeElapsed) / (365 days * 10000)
        // APR is in basis points (e.g., 500 = 5%)
        uint256 interest = (lease.amount * config.apr * timeElapsed) / (365 days * 10000);

        return lease.amount + interest;
    }

    /**
     * @notice Fulfills a specific lease with interest
     * @param smartAccount The smart account address
     * @param leaseId The ID of the lease to fulfill
     */
    function fulfillLease(address smartAccount, uint256 leaseId) external payable {
        Lease storage lease = leases[smartAccount][leaseId];
        if (lease.status != LeaseStatus.Active) revert LeaseNotActive(smartAccount, leaseId);

        uint256 repaymentAmount = calculateRepaymentAmount(smartAccount, leaseId);

        // Handle native token (ETH)
        if (lease.token == address(0)) {
            if (msg.value != repaymentAmount) {
                revert IncorrectETHAmount(repaymentAmount);
            }
            (bool success,) = smartAccount.call{value: repaymentAmount}("");
            if (!success) {
                revert TokenTransferFailed(address(0), address(this), smartAccount, repaymentAmount);
            }
        }
        // Handle ERC20 tokens
        else {
            IERC20 token = IERC20(lease.token);
            uint256 allowance = token.allowance(msg.sender, address(this));
            if (allowance < repaymentAmount) {
                revert IncorrectRepaymentAmount(allowance, repaymentAmount);
            }

            bool success = token.transferFrom(msg.sender, smartAccount, repaymentAmount);
            if (!success) {
                revert TokenTransferFailed(lease.token, msg.sender, smartAccount, repaymentAmount);
            }
        }

        lease.status = LeaseStatus.Fulfilled;

        // Remove the lease from active leases by finding the index and removing it
        uint256 index = 0;
        for (uint256 i = 0; i < activeLeases[smartAccount].length; i++) {
            if (activeLeases[smartAccount][i] == leaseId) {
                index = i;
                break;
            }
        }
        activeLeases[smartAccount][index] = activeLeases[smartAccount][activeLeases[smartAccount].length - 1];
        activeLeases[smartAccount].pop();

        emit LeaseFulfilled(smartAccount, leaseId);
    }

    /**
     * @notice Checks and updates the lease status if it has expired.
     * @param account The user's smart account address
     * @param leaseId The lease ID to check
     */
    function checkLeaseExpiry(address account, uint256 leaseId) external view returns (bool, address) {
        Lease storage lease = leases[account][leaseId];
        TokenWiseLeaseConfig storage config = leaseConfigs[account][lease.token];

        return (
            lease.status == LeaseStatus.Active && block.timestamp >= lease.startTime + config.max_duration, lease.leaser
        );
    }

    /**
     * @notice Checks if this module matches the given module type ID
     * @param moduleTypeId The ID of the module type to check
     * @return True if this module matches the given type, false otherwise
     */
    function isModuleType(uint256 moduleTypeId) external pure returns (bool) {
        return moduleTypeId == TYPE_EXECUTOR;
    }

    /*//////////////////////////////////////////////////////////////
                           INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Executes a token transfer on behalf of the account.
     * @param from The address from which tokens will be transferred.
     * @param to The recipient address.
     * @param tokenAddress The ERC20 token address.
     * @param amount The amount of tokens to transfer.
     */
    function _executeTokenTransfer(address from, address to, address tokenAddress, uint256 amount) internal {
        // Create calldata for ERC20 transfer
        bytes memory data = abi.encodeWithSelector(IERC20.transfer.selector, to, amount);

        // Execute the token transfer
        (bool success, bytes memory result) =
            tokenAddress.call(abi.encodeWithSelector(IERC20.transferFrom.selector, from, to, amount));
        require(success && (result.length == 0 || abi.decode(result, (bool))), "Token transfer failed");
    }

    /*//////////////////////////////////////////////////////////////
                             MODULE METADATA
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Returns the name of the module.
     */
    function name() external pure returns (string memory) {
        return "SolvNetModule";
    }

    /**
     * @notice Returns the version of the module.
     */
    function version() external pure returns (string memory) {
        return "1.0.0";
    }

    /**
     * @notice Checks if the module is initialized on a smart account.
     * @param smartAccount The smart account address.
     * @return True if initialized, false otherwise.
     */
    function isInitialized(address smartAccount) public view override returns (bool) {
        return initialized[smartAccount];
    }

    // Add this to handle native token reception
    receive() external payable {}
}
