// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @notice Pure secp256r1 verification via a staticcall to an EIP-7951 P256VERIFY precompile.
/// @dev Input layout per EIP-7951: hash || r || s || qx || qy, each a 32-byte big-endian value
///      (160 bytes total). Output: 32 bytes equal to 1 on a valid signature, empty bytes
///      otherwise. The precompile address is chain-specific and passed in by the caller so this
///      library stays portable across any EIP-7951 chain, not just Monad.
library P256Verifier {
    function verify(address precompile, bytes32 hash, bytes32 r, bytes32 s, bytes32 qx, bytes32 qy)
        internal
        view
        returns (bool valid)
    {
        (bool success, bytes memory output) = precompile.staticcall(abi.encodePacked(hash, r, s, qx, qy));
        if (!success || output.length != 32) {
            return false;
        }
        return abi.decode(output, (uint256)) == 1;
    }
}
