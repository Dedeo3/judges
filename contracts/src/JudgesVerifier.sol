// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IJudgesVerifier} from "./interfaces/IJudgesVerifier.sol";
import {NullifierRegistry} from "./NullifierRegistry.sol";
import {Groth16Verifier} from "./JudgesGroth16Verifier.sol";

/// @notice Combines the Phase 5 ZK membership proof with Phase 4's nullifier registry —
///         README §9.1's JudgesVerifier.
///
/// @dev Scope decision, documented here rather than left implicit: this contract does NOT take
///      raw WebAuthn/P-256 signature bytes and does NOT call into MonadP256Adapter. The P-256
///      signature was already verified once, off-chain, during the real WebAuthn ceremony that
///      registered the credential (packages/webauthn, Phase 1) — the ZK proof's soundness
///      transitively vouches for that, since `credentialSecret` (and therefore any valid
///      `walletCommitment`/`nullifier` pair) is only derivable server-side for a credential that
///      passed that ceremony. Re-verifying the raw signature on every `verify()` call would mean
///      shipping WebAuthn assertion bytes on-chain every time, defeating the point of proving
///      the relationship in zero-knowledge instead. `MonadP256Adapter` remains a separately
///      useful, independently tested building block (e.g. for a future smart-account /ERC-4337-
///      style flow that validates a live passkey signature per transaction) — it's simply not
///      wired into *this* proof-of-personhood path.
contract JudgesVerifier is IJudgesVerifier {
    Groth16Verifier public immutable zkVerifier;
    NullifierRegistry public immutable nullifierRegistry;

    error InvalidProof();
    error MalformedProof();

    constructor(address _zkVerifier, address _nullifierRegistry) {
        zkVerifier = Groth16Verifier(_zkVerifier);
        nullifierRegistry = NullifierRegistry(_nullifierRegistry);
    }

    /// @param proof ABI-encoded (uint256[2] pA, uint256[2][2] pB, uint256[2] pC) — Groth16 proof.
    function verify(
        bytes calldata proof,
        bytes32 walletCommitment,
        bytes32 domain,
        bytes32 nullifier,
        bytes32 policyHash,
        address wallet
    ) external override returns (bool valid) {
        (uint256[2] memory pA, uint256[2][2] memory pB, uint256[2] memory pC) =
            _decodeProof(proof);

        // Order matches the circuit's declared public signals exactly: one output
        // (policyHashEcho) followed by four public inputs (walletCommitment, nullifier,
        // applicationIdHash, policyHash) — see JudgesGroth16Verifier.sol's provenance note.
        uint256[5] memory publicSignals = [
            uint256(policyHash),
            uint256(walletCommitment),
            uint256(nullifier),
            uint256(domain),
            uint256(policyHash)
        ];

        if (!zkVerifier.verifyProof(pA, pB, pC, publicSignals)) {
            revert InvalidProof();
        }

        nullifierRegistry.consume(domain, nullifier, wallet);
        return true;
    }

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
