// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import "modulekit/ModuleKit.sol";
import "../src/SolvNetModule.sol";
import "modulekit/external/ERC7579.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract SolvModuleTest is RhinestoneModuleKit, Test {
    using ModuleKitHelpers for *;
    using ModuleKitUserOp for *;

    uint256 constant EXECUTION_MODULE_TYPE = 2;

    // Account and modules
    AccountInstance internal instance;
    SolvNetModule internal solvModule;

    // Test tokens
    IERC20 testToken;
    IERC20 testToken2;

    // Test addresses
    address leaseCreator;
    address alice;

    // Foundry fork id for fork testing
    uint256 mainnetFork;

    function setUp() public {
        // Create the fork
        string memory mainnetUrl = vm.envString("RPC_URL_1");
        mainnetFork = vm.createFork(mainnetUrl);
        vm.selectFork(mainnetFork);
        vm.rollFork(19_274_877);

        // Initialize the RhinestoneModuleKit
        init();

        // Deploy test tokens
        testToken = new MockERC20("Test Token", "TEST");
        testToken2 = new MockERC20("Test Token 2", "TEST2");
        vm.label(address(testToken), "TestToken");
        vm.label(address(testToken2), "TestToken2");

        // Setup test addresses
        leaseCreator = makeAddr("leaseCreator");
        vm.label(leaseCreator, "LeaseCreator");
        alice = makeAddr("alice");
        vm.label(alice, "Alice");

        // Create the SolvModule
        solvModule = new SolvNetModule();
        vm.label(address(solvModule), "SolvNetModule");

        // Create the account and deal tokens
        instance = makeAccountInstance("Account");
        vm.deal(instance.account, 10 ether);
        deal(address(testToken), instance.account, 1000e18);
        deal(address(testToken2), instance.account, 1000e18);
        vm.label(address(instance.account), "Account");

        vm.deal(instance.account, 10 ether);
        deal(address(testToken), alice, 1000e18);
        deal(address(testToken2), alice, 1000e18);
        vm.label(address(alice), "Account");

        // Create initial lease config
        SolvNetModule.TokenWiseLeaseConfig memory config = SolvNetModule.TokenWiseLeaseConfig({
            token: address(testToken),
            max_amount: 100e18,
            apr: 500, // 5%
            max_duration: 30 days
        });
        SolvNetModule.TokenWiseLeaseConfig[] memory configs = new SolvNetModule.TokenWiseLeaseConfig[](1);
        configs[0] = config;

        // Install the module
        instance.installModule({
            moduleTypeId: EXECUTION_MODULE_TYPE,
            module: address(solvModule),
            data: abi.encode(configs)
        });
        vm.prank(alice);
        solvModule.updateLeaseConfig(address(testToken), config);
    }

    function test_moduleInstallation() public {
        assertTrue(solvModule.isInitialized(instance.account));

        // Verify lease config using getter
        SolvNetModule.TokenWiseLeaseConfig memory config =
            solvModule.getLeaseConfig(instance.account, address(testToken));

        assertEq(config.token, address(testToken));
        assertEq(config.max_amount, 100e18);
        assertEq(config.max_duration, 30 days);
        assertEq(config.apr, 500);
    }

    function test_updateLeaseConfig() public {
        SolvNetModule.TokenWiseLeaseConfig memory newConfig = SolvNetModule.TokenWiseLeaseConfig({
            token: address(testToken2),
            max_amount: 200e18,
            apr: 1000, // 10%
            max_duration: 60 days
        });

        vm.prank(instance.account);
        solvModule.updateLeaseConfig(address(testToken2), newConfig);

        // Verify updated config using getter
        SolvNetModule.TokenWiseLeaseConfig memory config =
            solvModule.getLeaseConfig(instance.account, address(testToken2));

        assertEq(config.token, address(testToken2));
        assertEq(config.max_amount, 200e18);
        assertEq(config.max_duration, 60 days);
        assertEq(config.apr, 1000);
    }

    function test_startLease() public {
        uint256 initialBalance = testToken.balanceOf(instance.account);
        uint256 initialCreatorBalance = testToken.balanceOf(leaseCreator);
        uint256 leaseAmount = 50e18;

        solvModule.startLease(instance.account, address(testToken), leaseAmount, leaseCreator);

        // Verify token transfer
        assertEq(testToken.balanceOf(instance.account), initialBalance - leaseAmount);
        assertEq(testToken.balanceOf(leaseCreator), initialCreatorBalance + leaseAmount);

        // Verify lease details using getter
        SolvNetModule.Lease memory lease = solvModule.getLease(instance.account, 0);

        assertEq(lease.id, 0);
        assertEq(lease.token, address(testToken));
        assertEq(lease.amount, leaseAmount);
        assertEq(lease.startTime, block.timestamp);
        assertEq(uint8(lease.status), uint8(SolvNetModule.LeaseStatus.Active));

        // Verify active leases using getter
        uint256[] memory activeLeases = solvModule.getActiveLeases(instance.account);
        assertEq(activeLeases.length, 1);
        assertEq(activeLeases[0], 0);
    }

    function test_fulfillLeaseWithInterest() public {
        // Start a lease
        uint256 leaseAmount = 100e18;
        solvModule.startLease(instance.account, address(testToken), leaseAmount, leaseCreator);

        // Fast forward 30 days
        vm.warp(block.timestamp + 30 days);

        // Calculate expected repayment
        uint256 expectedRepayment = solvModule.calculateRepaymentAmount(instance.account, 0);
        assertTrue(expectedRepayment > leaseAmount);

        // Approve tokens for repayment
        vm.startPrank(leaseCreator);
        deal(address(testToken), leaseCreator, expectedRepayment);
        testToken.approve(address(solvModule), expectedRepayment);

        // Fulfill lease
        uint256 initialAccountBalance = testToken.balanceOf(instance.account);
        solvModule.fulfillLease(instance.account, 0);
        vm.stopPrank();

        // Verify repayment
        assertEq(testToken.balanceOf(instance.account), initialAccountBalance + expectedRepayment);

        // Verify lease status using getter
        SolvNetModule.Lease memory lease = solvModule.getLease(instance.account, 0);
        assertEq(uint8(lease.status), uint8(SolvNetModule.LeaseStatus.Fulfilled));

        // Verify active leases using getter
        uint256[] memory activeLeases = solvModule.getActiveLeases(instance.account);
        assertEq(activeLeases.length, 0);
    }

    function test_multipleLeasesPerToken() public {
        // Start two leases for the same token
        solvModule.startLease(instance.account, address(testToken), 30e18, leaseCreator);
        solvModule.startLease(instance.account, address(testToken), 40e18, leaseCreator);

        // Verify both leases are active using getter
        SolvNetModule.Lease memory lease1 = solvModule.getLease(instance.account, 0);
        SolvNetModule.Lease memory lease2 = solvModule.getLease(instance.account, 1);

        assertEq(uint8(lease1.status), uint8(SolvNetModule.LeaseStatus.Active));
        assertEq(uint8(lease2.status), uint8(SolvNetModule.LeaseStatus.Active));

        // Verify active leases using getter
        uint256[] memory activeLeases = solvModule.getActiveLeases(instance.account);
        assertEq(activeLeases.length, 2);
        assertEq(activeLeases[0], 0);
        assertEq(activeLeases[1], 1);
    }

    function test_leaseExpiry() public {
        // Start a lease
        solvModule.startLease(instance.account, address(testToken), 50e18, leaseCreator);

        // Fast forward past max duration
        vm.warp(block.timestamp + 31 days);

        // Check expiry
        (bool isExpired,) = solvModule.checkLeaseExpiry(instance.account, 0);
        assertTrue(isExpired);

        // Verify lease status using getter
        SolvNetModule.Lease memory lease = solvModule.getLease(instance.account, 0);
        assertEq(uint8(lease.status), uint8(SolvNetModule.LeaseStatus.Active));
    }

    function test_nativeTokenLease() public {
        // Setup native token lease config
        SolvNetModule.TokenWiseLeaseConfig memory config = SolvNetModule.TokenWiseLeaseConfig({
            token: address(0),
            max_amount: 1 ether,
            apr: 500,
            max_duration: 30 days
        });

        vm.prank(instance.account);
        solvModule.updateLeaseConfig(address(0), config);

        // Start lease
        uint256 initialBalance = address(instance.account).balance;
        uint256 initialLeaseCreatorBalance = leaseCreator.balance;
        uint256 leaseAmount = 0.5 ether;

        vm.prank(leaseCreator);
        uint256 leaseId = solvModule.startLease(instance.account, address(0), leaseAmount, leaseCreator);

        // Verify native token transfer
        assertEq(leaseCreator.balance, initialLeaseCreatorBalance + leaseAmount);
        assertEq(instance.account.balance, initialBalance - leaseAmount);

        // Verify lease details
        SolvNetModule.Lease memory lease = solvModule.getLease(instance.account, leaseId);

        assertEq(lease.token, address(0));
        assertEq(lease.amount, leaseAmount);
        assertEq(uint8(lease.status), uint8(SolvNetModule.LeaseStatus.Active));
    }

    function test_startLease_eoa() public {
        vm.prank(alice);
        testToken.approve(address(solvModule), type(uint256).max);

        uint256 initialBalance = testToken.balanceOf(alice);
        uint256 initialCreatorBalance = testToken.balanceOf(leaseCreator);
        uint256 leaseAmount = 50e18;

        solvModule.startLease(alice, address(testToken), leaseAmount, leaseCreator);

        // Verify token transfer
        assertEq(testToken.balanceOf(alice), initialBalance - leaseAmount);
        assertEq(testToken.balanceOf(leaseCreator), initialCreatorBalance + leaseAmount);

        // Verify lease details using getter
        SolvNetModule.Lease memory lease = solvModule.getLease(alice, 0);

        assertEq(lease.id, 0);
        assertEq(lease.token, address(testToken));
        assertEq(lease.amount, leaseAmount);
        assertEq(lease.startTime, block.timestamp);
        assertEq(uint8(lease.status), uint8(SolvNetModule.LeaseStatus.Active));

        // Verify active leases using getter
        uint256[] memory activeLeases = solvModule.getActiveLeases(alice);
        assertEq(activeLeases.length, 1);
        assertEq(activeLeases[0], 0);
    }

    function test_RevertWhen_InvalidRecipient() public {
        vm.expectRevert(abi.encodeWithSelector(SolvNetModule.InvalidRecipient.selector, address(0)));
        solvModule.startLease(
            instance.account,
            address(testToken),
            50e18,
            address(0) // Invalid recipient
        );
    }

    function test_RevertWhen_AmountExceedsMaximum() public {
        uint256 excessAmount = 101e18; // Max is 100e18 from setup

        vm.expectRevert(abi.encodeWithSelector(SolvNetModule.AmountExceedsMaximum.selector, excessAmount, 100e18));
        solvModule.startLease(instance.account, address(testToken), excessAmount, leaseCreator);
    }

    function test_RevertWhen_TokenNotConfigured() public {
        address randomToken = makeAddr("randomToken");

        vm.expectRevert(
            abi.encodeWithSelector(SolvNetModule.TokenNotConfigured.selector, instance.account, randomToken)
        );
        solvModule.startLease(instance.account, randomToken, 50e18, leaseCreator);
    }
}

// Mock ERC20 token for testing
contract MockERC20 is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
