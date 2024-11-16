// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {OAppRead} from "LayerZero-v2/packages/layerzero-v2/evm/oapp/contracts/oapp/OAppRead.sol";
import {Origin} from "LayerZero-v2/packages/layerzero-v2/evm/oapp/contracts/oapp/interfaces/IOAppReceiver.sol";
import {
    MessagingParams,
    MessagingFee,
    MessagingReceipt,
    ILayerZeroEndpointV2
} from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";
import {
    EVMCallRequestV1,
    EVMCallComputeV1,
    ReadCodecV1
} from "devtools/packages/oapp-evm/contracts/oapp/libs/ReadCodecV1.sol";
import {OptionsBuilder} from "devtools/packages/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
import {SolvNetModule} from "./SolvNetModule.sol";
import {AddressCast} from "@layerzerolabs/lz-evm-protocol-v2/contracts/libs/AddressCast.sol";
// import {console2} from "forge-std/console2.sol";

contract SolverStaking is Ownable, ReentrancyGuard, OAppRead {
    // Custom Errors
    error ZeroAmount(uint256 amount);
    error TokenTransferFailed(address token, address from, address to, uint256 amount);
    error InsufficientStake(address solver, uint256 requested, uint256 available);
    error NoUnstakeRequest(address solver);
    error TimelockNotExpired(address solver, uint256 currentTime, uint256 unlockTime);
    error NoPendingUnstake(address solver);
    error NoStakeToSlash(address solver);
    error NoExpiredLease(address user);
    error RemoteContractNotSet(uint32 chainId);
    error ArrayLengthMismatch(uint256 chainIdsLength, uint256 contractsLength);
    error EidNotSet(uint256 chainId);

    // state
    IERC20 public stakingToken;

    struct StakeInfo {
        uint256 amount;
        uint256 unstakeTimestamp;
        uint256 pendingUnstakeAmount;
    }

    mapping(address => StakeInfo) public stakes;
    mapping(uint32 chainId => address) public solvModuleContracts;
    mapping(uint256 chainId => uint32 eid) public eids;

    // unstake timelock
    uint256 public constant UNSTAKE_TIMELOCK = 7 days;
    uint256 public totalStaked; // total staked amount

    uint32 public readChannel;

    // events
    event Staked(address indexed solver, uint256 amount);
    event UnstakeRequested(address indexed solver, uint256 amount, uint256 availableAt);
    event Unstaked(address indexed solver, uint256 amount);
    event Slashed(address indexed solver, uint256 amount);
    event AuthorizedSlasher(address indexed slasher);
    event RevokedSlasher(address indexed slasher);
    event LeaseStatusFetched(address indexed user);
    event ReadRequestSent(bytes32 guid);
    event LeaseStatusProcessed(address indexed user);
    event LeaseExpiryResponse(bool isExpired, SolvNetModule.Lease lease);
    event Received(address indexed sender, uint256 amount);

    // add logic to authorize slashers?
    constructor(address _endpoint, address _stakingToken, address _owner, address _solvNetModule)
        Ownable(_owner)
        OAppRead(_endpoint, _owner)
    {
        readChannel = 4294967294;

        stakingToken = IERC20(_stakingToken);
        eids[1] = 30101;
        eids[8453] = 30184;
        eids[42161] = 30110;

        // _setPeer(readChannel, AddressCast.toBytes32(address(this)));
        _setPeer(eids[1], AddressCast.toBytes32(_solvNetModule));
        _setPeer(eids[8453], AddressCast.toBytes32(_solvNetModule));
        _setPeer(eids[42161], AddressCast.toBytes32(_solvNetModule));

        // ILayerZeroEndpointV2 endpoint = ILayerZeroEndpointV2(_endpoint);
        // endpoint.setSendLibrary(address(this), readChannel, 0x1273141a3f7923AA2d9edDfA402440cE075ed8Ff);
        // endpoint.setSendLibrary(address(this), eids[1], 0x1273141a3f7923AA2d9edDfA402440cE075ed8Ff);
        // endpoint.setSendLibrary(address(this), eids[8453], 0x1273141a3f7923AA2d9edDfA402440cE075ed8Ff);
        // endpoint.setSendLibrary(address(this), eids[42161], 0x1273141a3f7923AA2d9edDfA402440cE075ed8Ff);
    }

    // Stake a certain amount of tokens.
    function stake(uint256 _amount) external nonReentrant {
        if (_amount == 0) revert ZeroAmount(_amount);

        // Transfer staking tokens from the solver to this contract
        if (!stakingToken.transferFrom(msg.sender, address(this), _amount)) {
            revert TokenTransferFailed(address(stakingToken), msg.sender, address(this), _amount);
        }

        // Update the stake info
        stakes[msg.sender].amount += _amount;
        // Update total staked
        totalStaked += _amount;
        emit Staked(msg.sender, _amount);
    }

    // Request to unstake a certain amount of tokens with a timelock.
    function unstake(uint256 _amount) external nonReentrant {
        StakeInfo storage stakeInfo = stakes[msg.sender];
        if (_amount == 0) revert ZeroAmount(_amount);
        if (stakeInfo.amount < _amount) revert InsufficientStake(msg.sender, _amount, stakeInfo.amount);

        // Update the staked amount
        stakeInfo.amount -= _amount;
        // Update total staked
        totalStaked -= _amount;
        // Set the unstake timestamp if not already set or set in the past
        if (stakeInfo.unstakeTimestamp == 0 || block.timestamp >= stakeInfo.unstakeTimestamp) {
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
        if (unstakeTime == 0) revert NoUnstakeRequest(msg.sender);
        if (block.timestamp < unstakeTime) revert TimelockNotExpired(msg.sender, block.timestamp, unstakeTime);
        uint256 unstakeAmount = stakeInfo.pendingUnstakeAmount;
        if (unstakeAmount == 0) revert NoPendingUnstake(msg.sender);

        stakeInfo.unstakeTimestamp = 0;
        stakeInfo.pendingUnstakeAmount = 0;
        if (!stakingToken.transfer(msg.sender, unstakeAmount)) {
            revert TokenTransferFailed(address(stakingToken), address(this), msg.sender, unstakeAmount);
        }
        emit Unstaked(msg.sender, unstakeAmount);
    }

    // Calculates the maximum liquidity the solver can access based on their stake.
    function getMaxLiquidity(address _solver) external view returns (uint256 maxLiquidity) {
        uint256 stakeAmount = stakes[_solver].amount;
        maxLiquidity = stakeAmount * stakeAmount; // Quadratic staking: n^2
    }

    // Sets the lease contract addresses for cross-chain reads.
    function setSolvModuleContracts(uint32[] calldata _chainIds, address[] calldata _leaseContracts)
        external
        onlyOwner
    {
        if (_chainIds.length != _leaseContracts.length) {
            revert ArrayLengthMismatch(_chainIds.length, _leaseContracts.length);
        }

        for (uint256 i = 0; i < _chainIds.length; i++) {
            solvModuleContracts[_chainIds[i]] = _leaseContracts[i];
        }
    }

    // Gets the lease status of a user across chains using LayerZero Read.
    function initiateSolverSlashing(address _smartAccount, uint32 _targetChainId, uint256 _leaseId) external payable {
        address remoteContract = solvModuleContracts[_targetChainId];
        if (remoteContract == address(0)) revert RemoteContractNotSet(_targetChainId);

        uint32 targetEid = eids[_targetChainId];
        if (targetEid == 0) revert EidNotSet(_targetChainId);

        EVMCallRequestV1 memory readRequest = EVMCallRequestV1({
            appRequestLabel: 0,
            targetEid: targetEid,
            isBlockNum: false,
            blockNumOrTimestamp: uint64(block.timestamp),
            confirmations: 0, // Adjust as needed
            to: remoteContract,
            callData: abi.encodeCall(SolvNetModule.checkLeaseExpiry, (_smartAccount, _leaseId))
        });
        EVMCallRequestV1[] memory readRequests = new EVMCallRequestV1[](1);
        readRequests[0] = readRequest;

        // No compute settings required for this example
        EVMCallComputeV1 memory computeSettings = EVMCallComputeV1({
            computeSetting: 3, // NONE
            targetEid: 0,
            isBlockNum: false,
            blockNumOrTimestamp: 0,
            confirmations: 0,
            to: address(0)
        });

        // Encode the read command
        bytes memory cmd = ReadCodecV1.encode(0, readRequests, computeSettings);

        // Send the read request using LayerZero's _lzSend
        MessagingReceipt memory receipt = _lzSend(
            targetEid,
            cmd,
            OptionsBuilder.addExecutorLzReceiveOption(OptionsBuilder.newOptions(), 100_000, 0),
            MessagingFee(msg.value, 0), // Ensure to send sufficient msg.value for fees
            payable(msg.sender)
        );

        emit ReadRequestSent(receipt.guid);
    }

    /**
     * @notice Internal function to handle incoming LayerZero read responses.
     * @param _origin The origin information containing the source Endpoint ID.
     * @param _guid The unique identifier for the received message.
     * @param _message The encoded message data.
     * @param _executor The executor address.
     * @param _extraData Additional data.
     */
    function _lzReceive(
        Origin calldata _origin,
        bytes32 _guid,
        bytes calldata _message,
        address _executor,
        bytes calldata _extraData
    ) internal override {
        // Decode the response
        (bool isExpired, SolvNetModule.Lease memory lease) = abi.decode(_message, (bool, SolvNetModule.Lease));
        emit LeaseExpiryResponse(isExpired, lease);

        if (isExpired) {
            _slashSolver(lease.leaser);
        }
    }

    // Slash a solver's stake for failing to return funds.
    function _slashSolver(address _solver) internal nonReentrant {
        uint256 slashedAmount = stakes[_solver].amount + stakes[_solver].pendingUnstakeAmount;
        if (slashedAmount == 0) revert NoStakeToSlash(_solver);

        // Reset the solver's stake info
        stakes[_solver].amount = 0;
        stakes[_solver].pendingUnstakeAmount = 0;
        stakes[_solver].unstakeTimestamp = 0;

        // Update total staked
        totalStaked -= slashedAmount;

        // Transfer the slashed amount to the affected user
        // if (!stakingToken.transfer(_userAddress, slashedAmount)) {
        //     revert TokenTransferFailed(address(stakingToken), address(this), _userAddress, slashedAmount);
        // }

        emit Slashed(_solver, slashedAmount);
    }

    function setEids(uint256 _chainId, uint32 _eid) external onlyOwner {
        eids[_chainId] = _eid;
    }

    function setReadChannel(uint32 _readChannel) external onlyOwner {
        readChannel = _readChannel;
    }

    receive() external payable {
        emit Received(msg.sender, msg.value);
    }

    function withdraw() external onlyOwner {
        payable(msg.sender).transfer(address(this).balance);
    }
}
