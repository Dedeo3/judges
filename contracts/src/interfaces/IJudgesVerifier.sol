// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @notice Verifies a Judges membership proof and enforces domain-scoped nullifier uniqueness.
/// @dev Deviates from README §9.1's architectural sketch in two ways, both explicitly permitted
///      there ("the interface above is an architectural target, not a final audited contract"):
///        1. `proof` is ABI-encoded (uint[2], uint[2][2], uint[2]) Groth16 calldata, not an
///           opaque generic blob -- decoding a known shape is cheaper and clearer than a fully
///           generic format this MVP has no second consumer for.
///        2. `verify` also takes `policyHash` and `wallet`: `policyHash` is a genuine public
///           circuit input (see JudgesGroth16Verifier.sol's provenance note), and `wallet` is
///           needed for the `HumanVerified` event / nullifier bookkeeping — README's sketch
///           omitted both.
interface IJudgesVerifier {
    function verify(
        bytes calldata proof,
        bytes32 walletCommitment,
        bytes32 domain,
        bytes32 nullifier,
        bytes32 policyHash,
        address wallet
    ) external returns (bool valid);

    function isNullifierUsed(bytes32 domain, bytes32 nullifier) external view returns (bool);
}
