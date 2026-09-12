// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {SybilResistantFaucet} from "../../src/demos/SybilResistantFaucet.sol";
import {NullifierRegistry} from "../../src/NullifierRegistry.sol";
import {MockJudgesVerifier} from "../mocks/MockJudgesVerifier.sol";

contract SybilResistantFaucetTest is Test {
    MockJudgesVerifier judges;
    SybilResistantFaucet faucet;

    bytes32 constant DOMAIN = keccak256("judges-faucet");
    bytes32 constant WALLET_COMMITMENT = keccak256("wallet-commitment");
    bytes32 constant NULLIFIER = keccak256("nullifier-a");
    bytes constant PROOF = hex"00";
    uint256 constant CLAIM_AMOUNT = 1 ether;

    address claimer = address(0xBEEF);

    function setUp() public {
        judges = new MockJudgesVerifier();
        faucet = new SybilResistantFaucet(address(judges), DOMAIN, CLAIM_AMOUNT);
        vm.deal(address(faucet), 10 ether);
    }

    function test_ClaimPaysTheBoundWallet() public {
        uint256 before = claimer.balance;
        faucet.claim(PROOF, WALLET_COMMITMENT, NULLIFIER, claimer);
        assertEq(claimer.balance, before + CLAIM_AMOUNT);
    }

    /// @dev Funds follow the *bound* wallet, not the sender: a third party submitting someone
    ///      else's proof just pays gas to deliver that person their own claim.
    function test_ThirdPartySubmitterDoesNotReceiveFunds() public {
        address submitter = address(0xD00D);
        vm.deal(submitter, 1 ether);
        uint256 submitterBefore = submitter.balance;

        vm.prank(submitter);
        faucet.claim(PROOF, WALLET_COMMITMENT, NULLIFIER, claimer);

        assertEq(claimer.balance, CLAIM_AMOUNT);
        assertEq(submitter.balance, submitterBefore);
    }

    function test_SecondClaimWithSameNullifierRejected() public {
        faucet.claim(PROOF, WALLET_COMMITMENT, NULLIFIER, claimer);

        vm.expectRevert(abi.encodeWithSelector(NullifierRegistry.NullifierAlreadyUsed.selector, DOMAIN, NULLIFIER));
        faucet.claim(PROOF, WALLET_COMMITMENT, NULLIFIER, claimer);

        assertEq(claimer.balance, CLAIM_AMOUNT);
    }

    function test_DifferentCredentialCanClaim() public {
        faucet.claim(PROOF, WALLET_COMMITMENT, NULLIFIER, claimer);
        faucet.claim(PROOF, WALLET_COMMITMENT, keccak256("nullifier-b"), address(0xCAFE));

        assertEq(claimer.balance, CLAIM_AMOUNT);
        assertEq(address(0xCAFE).balance, CLAIM_AMOUNT);
    }

    function test_EmptyFaucetReverts() public {
        SybilResistantFaucet empty = new SybilResistantFaucet(address(judges), DOMAIN, CLAIM_AMOUNT);
        vm.expectRevert(SybilResistantFaucet.InsufficientFaucetBalance.selector);
        empty.claim(PROOF, WALLET_COMMITMENT, NULLIFIER, claimer);
    }

    function test_InvalidProofReverts() public {
        judges.setShouldRejectProof(true);
        vm.expectRevert(MockJudgesVerifier.MockInvalidProof.selector);
        faucet.claim(PROOF, WALLET_COMMITMENT, NULLIFIER, claimer);
        assertEq(claimer.balance, 0);
    }

    function test_CanBeFunded() public {
        (bool ok,) = payable(address(faucet)).call{value: 1 ether}("");
        assertTrue(ok);
        assertEq(address(faucet).balance, 11 ether);
    }
}
