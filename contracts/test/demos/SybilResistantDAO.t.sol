// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {SybilResistantDAO} from "../../src/demos/SybilResistantDAO.sol";
import {NullifierRegistry} from "../../src/NullifierRegistry.sol";
import {MockJudgesVerifier} from "../mocks/MockJudgesVerifier.sol";

contract SybilResistantDAOTest is Test {
    MockJudgesVerifier judges;
    SybilResistantDAO dao;

    bytes32 constant DOMAIN = keccak256("judges-dao");
    bytes32 constant WALLET_COMMITMENT = keccak256("wallet-commitment");
    bytes32 constant NULLIFIER = keccak256("nullifier-a");
    bytes constant PROOF = hex"00";

    address voter = address(0xBEEF);

    function setUp() public {
        judges = new MockJudgesVerifier();
        dao = new SybilResistantDAO(address(judges), DOMAIN);
        dao.createProposal("Fund the thing");
    }

    function test_VoteCountsAndAttributesToBoundWallet() public {
        dao.vote(1, true, PROOF, WALLET_COMMITMENT, NULLIFIER, voter);

        (, uint256 yes, uint256 no,) = dao.proposals(1);
        assertEq(yes, 1);
        assertEq(no, 0);

        (,,,, address recordedWallet) = judges.lastCall();
        assertEq(recordedWallet, voter);
    }

    /// @dev The headline demo: the same credential voting twice is rejected by the nullifier,
    ///      with no per-voter bookkeeping in the DAO itself.
    function test_SecondVoteWithSameNullifierRejected() public {
        dao.vote(1, true, PROOF, WALLET_COMMITMENT, NULLIFIER, voter);

        vm.expectRevert(abi.encodeWithSelector(NullifierRegistry.NullifierAlreadyUsed.selector, DOMAIN, NULLIFIER));
        dao.vote(1, false, PROOF, WALLET_COMMITMENT, NULLIFIER, voter);

        (, uint256 yes, uint256 no,) = dao.proposals(1);
        assertEq(yes, 1);
        assertEq(no, 0);
    }

    function test_DifferentCredentialCanAlsoVote() public {
        dao.vote(1, true, PROOF, WALLET_COMMITMENT, NULLIFIER, voter);
        dao.vote(1, false, PROOF, WALLET_COMMITMENT, keccak256("nullifier-b"), address(0xCAFE));

        (, uint256 yes, uint256 no,) = dao.proposals(1);
        assertEq(yes, 1);
        assertEq(no, 1);
    }

    function test_VotePassesDaoDomainToVerifier() public {
        dao.vote(1, true, PROOF, WALLET_COMMITMENT, NULLIFIER, voter);
        (, bytes32 recordedDomain,,,) = judges.lastCall();
        assertEq(recordedDomain, DOMAIN);
    }

    /// @dev The contextHash the DAO passes must differ per (proposal, support) pair, or a proof
    ///      minted for "yes on 1" could be redirected to "no on 1" or to another proposal.
    function test_ContextHashDiffersPerProposalAndSupport() public view {
        assertTrue(dao.contextHashFor(1, true) != dao.contextHashFor(1, false));
        assertTrue(dao.contextHashFor(1, true) != dao.contextHashFor(2, true));
    }

    function test_VoteOnUnknownProposalReverts() public {
        vm.expectRevert(SybilResistantDAO.UnknownProposal.selector);
        dao.vote(99, true, PROOF, WALLET_COMMITMENT, NULLIFIER, voter);
    }

    function test_InvalidProofReverts() public {
        judges.setShouldRejectProof(true);
        vm.expectRevert(MockJudgesVerifier.MockInvalidProof.selector);
        dao.vote(1, true, PROOF, WALLET_COMMITMENT, NULLIFIER, voter);
    }
}
