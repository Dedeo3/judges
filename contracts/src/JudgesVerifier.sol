// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IJudgesVerifier} from "./interfaces/IJudgesVerifier.sol";
import {NullifierRegistry} from "./NullifierRegistry.sol";
import {CommitmentTree} from "./CommitmentTree.sol";
import {Groth16Verifier} from "./JudgesGroth16Verifier.sol";
import {JudgesField} from "./libraries/JudgesField.sol";

/// @notice Redesign B entry point: verifies the ZK membership proof, requires the proof's Merkle
///         root to be one the server published, and enforces domain-scoped nullifier uniqueness.
///
/// @dev What changed from the pre-B design, and why: the pre-B circuit proved only "I know a
///      secret and public-key hash that hash to this commitment/nullifier", with the commitment
///      supplied by the caller and never checked against anything. That let anyone forge a valid
///      proof over an invented secret (confirmed in audit). B proves LeanIMT membership of the
///      commitment under `merkleRoot`, and this contract rejects any `merkleRoot` the
///      `CommitmentTree` hasn't recorded — so a proof is only valid for a secret whose commitment
///      the server actually inserted. The secret is derived client-side (packages/crypto), so the
///      server never learns it (closes README §27.8).
///
///      Still true: this contract does NOT take raw WebAuthn/P-256 signature bytes. The P-256
///      signature is checked once, off-chain, during the WebAuthn ceremony that gates a
///      commitment's insertion into the tree. `MonadP256Adapter` remains a separately useful,
///      independently tested building block.
contract JudgesVerifier is IJudgesVerifier {
    Groth16Verifier public immutable zkVerifier;
    NullifierRegistry public immutable nullifierRegistry;
    CommitmentTree public immutable commitmentTree;

    error InvalidProof();
    error MalformedProof();
    error UnknownRoot();

    constructor(address _zkVerifier, address _nullifierRegistry, address _commitmentTree) {
        zkVerifier = Groth16Verifier(_zkVerifier);
        nullifierRegistry = NullifierRegistry(_nullifierRegistry);
        commitmentTree = CommitmentTree(_commitmentTree);
    }

    /// @inheritdoc IJudgesVerifier
    /// @dev Mirrors `derivePolicyHash` in packages/crypto — both sides hash the same 52 raw
    ///      bytes (32-byte context ‖ 20-byte address). Byte-oriented on purpose: hashing display
    ///      strings across TS and Solidity is exactly where these two halves silently diverge.
    function policyHashFor(bytes32 contextHash, address wallet) public pure returns (bytes32) {
        return bytes32(JudgesField.policyHash(contextHash, wallet));
    }

    /// @inheritdoc IJudgesVerifier
    function verify(
        bytes calldata proof,
        bytes32 merkleRoot,
        bytes32 domain,
        bytes32 nullifier,
        bytes32 contextHash,
        address wallet
    ) external override returns (bool valid) {
        // The proof's membership root must be one the server published. Without this a caller
        // could supply any self-consistent (root, proof) pair and pass verification.
        if (!commitmentTree.isKnownRoot(merkleRoot)) {
            revert UnknownRoot();
        }

        (uint256[2] memory pA, uint256[2][2] memory pB, uint256[2] memory pC) = _decodeProof(proof);

        // Derived, never accepted from the caller: this is the wallet/action binding, so letting
        // a caller pass it directly would let them assert any binding they like.
        uint256 policyHash = uint256(policyHashFor(contextHash, wallet));

        // Order matches the circuit's declared public signals exactly: one output
        // (policyHashEcho) followed by four public inputs (merkleRoot, nullifier,
        // applicationIdHash, policyHash) — see judges_membership_v2.circom.
        uint256[5] memory publicSignals =
            [policyHash, uint256(merkleRoot), uint256(nullifier), uint256(domain), policyHash];

        if (!zkVerifier.verifyProof(pA, pB, pC, publicSignals)) {
            revert InvalidProof();
        }

        nullifierRegistry.consume(domain, nullifier, wallet);
        return true;
    }

    /// @inheritdoc IJudgesVerifier
    function isNullifierUsed(bytes32 domain, bytes32 nullifier) external view override returns (bool) {
        return nullifierRegistry.isNullifierUsed(domain, nullifier);
    }

    function _decodeProof(bytes calldata proof)
        private
        pure
        returns (uint256[2] memory pA, uint256[2][2] memory pB, uint256[2] memory pC)
    {
        if (proof.length != 8 * 32) {
            revert MalformedProof();
        }
        (pA, pB, pC) = abi.decode(proof, (uint256[2], uint256[2][2], uint256[2]));
    }
}
