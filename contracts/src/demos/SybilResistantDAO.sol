// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IJudgesVerifier} from "../interfaces/IJudgesVerifier.sol";

/// @notice Demo A from README §15: one verified credential, one vote per proposal.
/// @dev The sybil resistance is entirely Judges': `verify` reverts if the nullifier for this
///      domain was already consumed, so a second vote from the same credential can't land — no
///      per-voter bookkeeping in this contract at all.
contract SybilResistantDAO {
    IJudgesVerifier public immutable judges;

    /// @dev Configured at deploy time from the app's domain string (see the deploy script) so
    ///      there's no hardcoded hash here to drift out of sync with the crypto package. Passing
    ///      it to `verify` is also what prevents a proof minted for another app being replayed
    ///      here: the domain is a public input to the ZK proof.
    bytes32 public immutable domain;

    struct Proposal {
        string description;
        uint256 yesVotes;
        uint256 noVotes;
        bool exists;
    }

    mapping(uint256 proposalId => Proposal) public proposals;
    uint256 public proposalCount;

    event ProposalCreated(uint256 indexed proposalId, string description);
    event Voted(uint256 indexed proposalId, address indexed wallet, bool support);

    error UnknownProposal();

    constructor(address _judges, bytes32 _domain) {
        judges = IJudgesVerifier(_judges);
        domain = _domain;
    }

    function createProposal(string calldata description) external returns (uint256 proposalId) {
        proposalId = ++proposalCount;
        proposals[proposalId] = Proposal({description: description, yesVotes: 0, noVotes: 0, exists: true});
        emit ProposalCreated(proposalId, description);
    }

    /// @notice The action binding a proof for this vote must commit to.
    /// @dev Clients read this off-chain and pass it to `judges.prove({ contextHash })` rather
    ///      than reimplementing the hashing in TypeScript — one definition, no drift. Binding
    ///      `support` is what stops a lifted proof from being flipped to the opposite vote.
    function contextHashFor(uint256 proposalId, bool support) public view returns (bytes32) {
        return sha256(abi.encodePacked(domain, "vote", proposalId, support));
    }

    /// @param wallet The wallet the proof is bound to. The vote is attributed to this address,
    ///        not `msg.sender`, since that is what the proof cryptographically commits to.
    function vote(
        uint256 proposalId,
        bool support,
        bytes calldata proof,
        bytes32 walletCommitment,
        bytes32 nullifier,
        address wallet
    ) external {
        if (!proposals[proposalId].exists) revert UnknownProposal();

        // Reverts on an invalid proof, a wallet/action mismatch, or a reused nullifier.
        judges.verify(proof, walletCommitment, domain, nullifier, contextHashFor(proposalId, support), wallet);

        if (support) {
            proposals[proposalId].yesVotes++;
        } else {
            proposals[proposalId].noVotes++;
        }

        emit Voted(proposalId, wallet, support);
    }
}
