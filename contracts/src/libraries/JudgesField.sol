// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @notice The one on-chain definition of Judges' field arithmetic, mirroring
///         packages/crypto's `field.ts`.
/// @dev Every value the ZK circuit sees as a public input must be reduced into BN254's scalar
///      field the same way the prover reduced it. That makes `FIELD_PRIME` a constant two
///      languages have to agree on, so it lives in exactly one place per language — here, and in
///      `packages/crypto/src/field.ts`. `contracts/test/JudgesField.t.sol` asserts the two agree
///      on concrete values.
library JudgesField {
    /// @dev BN254 (alt_bn128) scalar field prime — the field circomlib's Poseidon operates over.
    uint256 internal constant FIELD_PRIME =
        21888242871839275222246405745257275088548364400416034343698204186575808495617;

    /// @dev Mirrors `toField` in packages/crypto: interpret the digest big-endian, reduce mod p.
    function toField(bytes32 digest) internal pure returns (uint256) {
        return uint256(digest) % FIELD_PRIME;
    }

    /// @dev Mirrors `hashToField` in packages/crypto. Used to turn an app-id string
    ///      ("judges-dao") into the `domain` a demo contract is deployed with, so the deploy
    ///      script never has to carry a hardcoded hash.
    function hashToField(string memory value) internal pure returns (uint256) {
        return toField(sha256(bytes(value)));
    }

    /// @dev Mirrors `derivePolicyHash` in packages/crypto: the wallet/action binding
    ///      (README §7.2). Byte-oriented on purpose — 32-byte context ‖ 20-byte address — since
    ///      hashing display strings is where the two halves would silently diverge.
    function policyHash(bytes32 contextHash, address wallet) internal pure returns (uint256) {
        return toField(sha256(abi.encodePacked(contextHash, wallet)));
    }
}
