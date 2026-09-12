// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @notice Verifies secp256r1 (P-256 / WebAuthn) signatures.
interface IP256Verifier {
    /// @return valid True iff (r, s) is a valid secp256r1 signature over `hash` by public key (qx, qy).
    function verify(bytes32 hash, bytes32 r, bytes32 s, bytes32 qx, bytes32 qy) external view returns (bool valid);
}
