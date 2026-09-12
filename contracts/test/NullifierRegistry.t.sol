// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {NullifierRegistry} from "../src/NullifierRegistry.sol";

contract NullifierRegistryTest is Test {
    NullifierRegistry registry;

    bytes32 constant DOMAIN_A = keccak256("dao-alpha");
    bytes32 constant DOMAIN_B = keccak256("dao-beta");
    bytes32 constant NULLIFIER = keccak256("credential-secret-derived-nullifier");

    address wallet = address(0xBEEF);

    function setUp() public {
        registry = new NullifierRegistry();
        registry.setVerifier(address(this));
    }

    function test_ConsumeMarksNullifierUsed() public {
        assertFalse(registry.isNullifierUsed(DOMAIN_A, NULLIFIER));
        registry.consume(DOMAIN_A, NULLIFIER, wallet);
        assertTrue(registry.isNullifierUsed(DOMAIN_A, NULLIFIER));
    }

    function test_ConsumeEmitsHumanVerified() public {
        vm.expectEmit(true, true, true, true);
        emit NullifierRegistry.HumanVerified(DOMAIN_A, NULLIFIER, wallet);
        registry.consume(DOMAIN_A, NULLIFIER, wallet);
    }

    function test_DuplicateNullifierInSameDomainReverts() public {
        registry.consume(DOMAIN_A, NULLIFIER, wallet);
        vm.expectRevert(abi.encodeWithSelector(NullifierRegistry.NullifierAlreadyUsed.selector, DOMAIN_A, NULLIFIER));
        registry.consume(DOMAIN_A, NULLIFIER, wallet);
    }

    function test_SameNullifierInDifferentDomainSucceeds() public {
        registry.consume(DOMAIN_A, NULLIFIER, wallet);
        registry.consume(DOMAIN_B, NULLIFIER, wallet);
        assertTrue(registry.isNullifierUsed(DOMAIN_A, NULLIFIER));
        assertTrue(registry.isNullifierUsed(DOMAIN_B, NULLIFIER));
    }

    function test_UnauthorizedCallerCannotConsume() public {
        vm.prank(address(0xdeadbeef));
        vm.expectRevert(NullifierRegistry.NotVerifier.selector);
        registry.consume(DOMAIN_A, NULLIFIER, wallet);
    }

    function test_VerifierCanOnlyBeSetOnce() public {
        vm.expectRevert(NullifierRegistry.VerifierAlreadySet.selector);
        registry.setVerifier(address(0x1234));
    }

    function test_OnlyDeployerCanSetVerifier() public {
        NullifierRegistry fresh = new NullifierRegistry();
        vm.prank(address(0xdeadbeef));
        vm.expectRevert(NullifierRegistry.NotDeployer.selector);
        fresh.setVerifier(address(this));
    }
}
