// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

// import {OAppRead} from "LayerZero-v2/packages/layerzero-v2/evm/oapp/contracts/oapp/OAppRead.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";

contract SolverStaking is Ownable, ReentrancyGuard {
    // state
    IERC20 public stakingToken;

    struct StakeInfo {
        uint256 amount;
        uint256 unstakeTimestamp;
        uint256 pendingUnstakeAmount;
    }

    mapping(address => StakeInfo) public stakes;

    // unstake timelock
    uint256 public constant UNSTAKE_TIMELOCK = 7 days;
    uint256 public totalStaked; // total staked amount

    // events
    event Staked(address indexed solver, uint256 amount);
    event UnstakeRequested(
        address indexed solver,
        uint256 amount,
        uint256 availableAt
    );
    event Unstaked(address indexed solver, uint256 amount);
    event Slashed(address indexed solver, uint256 amount, address indexed user);
    event AuthorizedSlasher(address indexed slasher);
    event RevokedSlasher(address indexed slasher);
    event LeaseStatusFetched(address indexed user, LeaseStatus status);
    event ReadRequestSent(bytes32 guid);
    event LeaseStatusProcessed(address indexed user, LeaseStatus status);

    // add logic to authorize slashers?

    // constructor(
    //     address _endpoint,
    //     address _stakingToken
    // ) OAppRead(_endpoint, address(0)) {
    //     stakingToken = IERC20(_stakingToken);
    // }

    constructor(address _stakingToken) Ownable(msg.sender) {
        stakingToken = IERC20(_stakingToken);
    }

    // Stake a certain amount of tokens.
    function stake(uint256 _amount) external nonReentrant {
        require(_amount > 0, "Amount must be greater than zero");
        // Transfer staking tokens from the solver to this contract
        require(
            stakingToken.transferFrom(msg.sender, address(this), _amount),
            "Token transfer failed"
        );
        // Update the stake info
        stakes[msg.sender].amount += _amount;
        // Update total staked
        totalStaked += _amount;
        emit Staked(msg.sender, _amount);
    }

    // Request to unstake a certain amount of tokens with a timelock.
    function unstake(uint256 _amount) external nonReentrant {
        StakeInfo storage stakeInfo = stakes[msg.sender];
        require(_amount > 0, "Amount must be greater than zero");
        require(stakeInfo.amount >= _amount, "Not enough staked balance");

        // Update the staked amount
        stakeInfo.amount -= _amount;
        // Update total staked
        totalStaked -= _amount;
        // Set the unstake timestamp if not already set or set in the past
        if (
            stakeInfo.unstakeTimestamp == 0 ||
            block.timestamp >= stakeInfo.unstakeTimestamp
        ) {
            stakeInfo.unstakeTimestamp = block.timestamp + UNSTAKE_TIMELOCK;
        }
        // Accumulate the pending unstake amount
        stakeInfo.pendingUnstakeAmount += _amount;

        // Emit event
        emit UnstakeRequested(msg.sender, _amount, stakeInfo.unstakeTimestamp);
    }

    // Completes the unstaking process after the timelock.
    function completeUnstake() external nonReentrant {
        StakeInfo storage stakeInfo = stakes[msg.sender];
        uint256 unstakeTime = stakeInfo.unstakeTimestamp;
        require(unstakeTime > 0, "No unstake request found");
        require(
            block.timestamp >= unstakeTime,
            "Unstake timelock not yet expired"
        );
        uint256 unstakeAmount = stakeInfo.pendingUnstakeAmount;
        require(unstakeAmount > 0, "No pending unstake amount");
        stakeInfo.unstakeTimestamp = 0;
        stakeInfo.pendingUnstakeAmount = 0;
        require(
            stakingToken.transfer(msg.sender, unstakeAmount),
            "Token transfer failed"
        );
        emit Unstaked(msg.sender, unstakeAmount);
    }

    // Slash a solver's stake for failing to return funds.
    function slash(
        address _solver,
        address _userAddress
    ) external nonReentrant {
        // Check the lease status of the user across chains
        LeaseStatus status = getLeaseStatus(_userAddress);
        require(status == LeaseStatus.Expired, "No expired lease found");

        // Slash the solver's stake
        uint256 slashedAmount = stakes[_solver].amount +
            stakes[_solver].pendingUnstakeAmount;
        require(slashedAmount > 0, "Solver has no stake to slash");

        // Reset the solver's stake info
        stakes[_solver].amount = 0;
        stakes[_solver].pendingUnstakeAmount = 0;
        stakes[_solver].unstakeTimestamp = 0;

        // Update total staked
        totalStaked -= slashedAmount;

        // Transfer the slashed amount to the affected user
        require(
            stakingToken.transfer(_userAddress, slashedAmount),
            "Token transfer failed"
        );

        emit Slashed(_solver, slashedAmount, _userAddress);
    }

    // Calculates the maximum liquidity the solver can access based on their stake.
    function getMaxLiquidity(
        address _solver
    ) external view returns (uint256 maxLiquidity) {
        uint256 stakeAmount = stakes[_solver].amount;
        maxLiquidity = stakeAmount * stakeAmount; // Quadratic staking: n^2
    }

    ///////////////////////////////////////////////////
    ///////////////////////////////////////////////////
    ///////////////////////////////////////////////////
    ///////////////////////////////////////////////////

    // layer zero lease logic check using lzRead
    enum LeaseStatus {
        Pending,
        Expired,
        Fulfilled
    }
    // Mapping of chain IDs to lease contract addresses
    mapping(uint32 => address) public remoteLeaseContracts;

    // Array of target chain IDs
    uint32[] public targetChainIds;

    // Sets the lease contract addresses for cross-chain reads.
    function setRemoteLeaseContracts(
        uint32[] calldata _chainIds,
        address[] calldata _leaseContracts
    ) external onlyOwner {
        require(
            _chainIds.length == _leaseContracts.length,
            "Array lengths must match"
        );
        for (uint256 i = 0; i < _chainIds.length; i++) {
            remoteLeaseContracts[_chainIds[i]] = _leaseContracts[i];
            targetChainIds.push(_chainIds[i]);
        }
    }

    // Gets the lease status of a user across chains using LayerZero Read.
    function getLeaseStatus(
        address _userAddress
    ) internal returns (LeaseStatus status) {
        // Prepare read requests
        // uint256 chainCount = targetChainIds.length;
        // EVMCallRequestV1[] memory readRequests = new EVMCallRequestV1[](
        //     chainCount
        // );

        // for (uint256 i = 0; i < chainCount; i++) {
        //     uint32 targetChainId = targetChainIds[i];
        //     address remoteContract = remoteLeaseContracts[targetChainId];
        //     require(remoteContract != address(0), "Remote contract not set");

        //     // Prepare the calldata to call the lease status function on the remote contract
        //     bytes memory callData = abi.encodeWithSelector(
        //         bytes4(keccak256("getUserLeaseStatus(address)")),
        //         _userAddress
        //     );

        //     readRequests[i] = EVMCallRequestV1({
        //         appRequestLabel: uint16(i + 1),
        //         targetEid: targetChainId,
        //         isBlockNum: false,
        //         blockNumOrTimestamp: uint64(block.timestamp),
        //         confirmations: 15, // Adjust as needed
        //         to: remoteContract,
        //         callData: callData
        //     });
        // }

        // // No compute settings required for this example
        // EVMCallComputeV1 memory computeSettings = EVMCallComputeV1({
        //     computeSetting: 3, // NONE
        //     targetEid: 0,
        //     isBlockNum: false,
        //     blockNumOrTimestamp: 0,
        //     confirmations: 0,
        //     to: address(0)
        // });

        // // Encode the read command
        // bytes memory cmd = ReadCodecV1.encode(0, readRequests, computeSettings);

        // // Send the read request using LayerZero's _lzSend
        // MessagingReceipt memory receipt = _lzSend(
        //     READ_CHANNEL,
        //     cmd,
        //     "", // No extra options
        //     MessagingFee(msg.value, 0), // Ensure to send sufficient msg.value for fees
        //     payable(msg.sender)
        // );

        // emit ReadRequestSent(receipt.guid);

        // // For this example, we'll assume status is Pending until response is received
        // return LeaseStatus.Pending;
    }

    /**
     * @notice Internal function to handle incoming LayerZero read responses.
     * @param _origin The origin information containing the source Endpoint ID.
     * @param _guid The unique identifier for the received message.
     * @param _message The encoded message data.
     * @param _executor The executor address.
     * @param _extraData Additional data.
     */
    // function _lzReceive(
    //     Origin calldata _origin,
    //     bytes32 _guid,
    //     bytes calldata _message,
    //     address _executor,
    //     bytes calldata _extraData
    // ) internal override {
    //     // Decode the response
    //     // For simplicity, we'll assume the response is LeaseStatus (uint8)
    //     LeaseStatus status = abi.decode(_message, (LeaseStatus));

    //     // Handle the status accordingly
    //     // In this example, we can emit an event or update a mapping
    //     emit LeaseStatusProcessed(msg.sender, status);
    // }
}
