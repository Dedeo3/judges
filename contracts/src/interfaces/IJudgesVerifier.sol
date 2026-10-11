// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @notice Verifies a Judges membership proof and enforces domain-scoped nullifier uniqueness.
/// @dev Deviates from README §9.1's architectural sketch, all explicitly permitted there ("the
///      interface above is an architectural target, not a final audited contract"):
///        1. `proof` is ABI-encoded (uint[2], uint[2][2], uint[2]) Groth16 calldata, not an
///           opaque generic blob — decoding a known shape is cheaper and clearer than a fully
///           generic format this MVP has no second consumer for.
///        2. `verify` takes `contextHash` and `wallet` instead of a raw `policyHash`. The
///           circuit's `policyHash` public input is derived internally as
///           `sha256(contextHash ‖ wallet) % FIELD_PRIME`, which is what binds a proof to one
///           wallet and one action (README §7.2). Passing `policyHash` directly would let a
///           caller assert any binding they like, defeating the purpose.
///        3. Redesign B: the proof commits to a Merkle `merkleRoot` (LeanIMT of identity
///           commitments) rather than a bare `walletCommitment`. `verify` rejects any root the
///           CommitmentTree hasn't published, which is what makes membership — not just
///           knowledge of some secret — the on-chain soundness check.
interface IJudgesVerifier {
    /// @param proof ABI-encoded (uint256[2] pA, uint256[2][2] pB, uint256[2] pC).
    /// @param merkleRoot The membership-tree root the proof was generated against. Must be a root
    ///        the CommitmentTree has published, or `verify` reverts with `UnknownRoot`.
    /// @param contextHash App-defined action binding — a DAO folds in (proposalId, support), a
    ///        faucet its claim tag. The consumer recomputes this from its own call arguments, so
    ///        a stolen proof can't be redirected to a different action.
    /// @param wallet The wallet the proof was generated for. Consumers must credit *this*
    ///        address, not `msg.sender`, since it is the address cryptographically bound in.
    function verify(
        bytes calldata proof,
        bytes32 merkleRoot,
        bytes32 domain,
        bytes32 nullifier,
        bytes32 contextHash,
        address wallet
    ) external returns (bool valid);

    function isNullifierUsed(bytes32 domain, bytes32 nullifier) external view returns (bool);

    /// @notice The `policyHash` public input that `verify` will require for this binding.
    function policyHashFor(bytes32 contextHash, address wallet) external pure returns (bytes32);
}
