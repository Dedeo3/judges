// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IP256Verifier} from "./interfaces/IP256Verifier.sol";
import {P256Verifier} from "./libraries/P256Verifier.sol";

/// @notice Monad-specific binding to the native P256VERIFY precompile (EIP-7951).
/// @dev Address (0x0100) and calldata layout confirmed against Monad's own documentation
///      (https://docs.monad.xyz/developer-essentials/precompiles) — this is the one file that
///      would need to change if Judges were ported to a different EIP-7951 chain with a
///      different precompile address.
contract MonadP256Adapter is IP256Verifier {
    address public constant PRECOMPILE = 0x0000000000000000000000000000000000000100;

    function verify(bytes32 hash, bytes32 r, bytes32 s, bytes32 qx, bytes32 qy)
        external
        view
        override
        returns (bool valid)
    {
        return P256Verifier.verify(PRECOMPILE, hash, r, s, qx, qy);
    }
}
