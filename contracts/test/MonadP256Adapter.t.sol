// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {MonadP256Adapter} from "../src/MonadP256Adapter.sol";

/// @dev Test vector is a real secp256r1 (P-256) keypair generated and locally verified with
///      Node's `crypto` module (prime256v1, SHA-256 digest, IEEE P1363 signature encoding),
///      then emitted straight into this file by that same script (no manual transcription) --
///      so a failure here means the precompile disagrees, not that the vector itself is wrong.
///
/// @dev IMPORTANT: `--fork-url` replays cached remote *state* through Foundry's own local EVM
///      (revm) -- it does not proxy opcode execution to the real node. Monad's P256VERIFY is a
///      custom precompile revm has no built-in knowledge of, so a plain `adapter.verify(...)`
///      call in a forked test silently hits an "empty account" at 0x100 and always returns
///      false, regardless of vector validity (confirmed: `cast call` against the live RPC with
///      identical calldata returns 1, proving the vector, the address, and the calldata layout
///      are all correct -- only the local simulation is blind to the precompile). We therefore
///      use `vm.rpc("eth_call", ...)` to send these checks straight to the real forked RPC
///      endpoint, hitting the actual on-chain precompile instead of the local one.
contract MonadP256AdapterTest is Test {
    MonadP256Adapter adapter;

    bytes32 constant HASH = 0x7fca1a26faeb0a0c43df84c098891b7ec519b3f6acc2626769bf7172a2552fef;
    bytes32 constant R = 0x842d4794b7c34c514b34291143b3931460df7990f452bfc8b16b04b87f77741f;
    bytes32 constant S = 0x47ffadae7f7446552c5714a196a4de887023635a1c66cb4a5f8ac2ea7a823850;
    bytes32 constant QX = 0x441c05f83906b87c7b25a04f602805d52a3f22fe0ec698938db8adf1869466ca;
    bytes32 constant QY = 0xcaf8508986a24d2f19e90ff5017c6fcd5ac133dffade764b4be538c368e644d4;

    function setUp() public {
        // This is the one suite that genuinely needs network access: Monad's P256VERIFY is a
        // custom precompile Foundry's local EVM doesn't implement, so the assertions are sent to
        // a real node (see the contract-level note). Consequence: with no egress, `setUp` fails
        // with a DNS error that looks exactly like a broken contract. `SKIP_FORK_TESTS=1` opts
        // out explicitly for offline or network-restricted environments -- deliberately opt-OUT,
        // since silently skipping would mean nobody notices the day it stops being exercised.
        if (vm.envOr("SKIP_FORK_TESTS", false)) {
            vm.skip(true);
            return;
        }

        // Self-forking (rather than requiring `--fork-url` on the command line) so plain
        // `forge test` works in CI with no extra flags. MONAD_TESTNET_RPC_URL is a public,
        // unauthenticated RPC -- no secret needed -- but defaults here too in case the env
        // var isn't set locally.
        string memory rpcUrl = vm.envOr("MONAD_TESTNET_RPC_URL", string("https://testnet-rpc.monad.xyz"));
        vm.createSelectFork(rpcUrl);

        // Deployed so the calldata-encoding logic (abi.encodePacked layout, precompile address
        // constant) is exercised and compiles/links correctly, even though its *result* can't
        // be trusted in this local simulation -- see the contract-level @dev note above.
        adapter = new MonadP256Adapter();
    }

    function _callPrecompileOnChain(bytes32 hash, bytes32 r, bytes32 s, bytes32 qx, bytes32 qy)
        internal
        returns (bool valid)
    {
        bytes memory input = abi.encodePacked(hash, r, s, qx, qy);
        string memory params = string.concat(
            '[{"to":"0x0000000000000000000000000000000000000100","data":"',
            vm.toString(input),
            '"},"latest"]'
        );
        bytes memory result = vm.rpc("eth_call", params);
        if (result.length != 32) return false;
        return abi.decode(result, (uint256)) == 1;
    }

    function test_AdapterAddressMatchesDocumentedPrecompile() public view {
        assertEq(adapter.PRECOMPILE(), 0x0000000000000000000000000000000000000100);
    }

    function test_ValidSignatureVerifies() public {
        assertTrue(_callPrecompileOnChain(HASH, R, S, QX, QY));
    }

    function test_ModifiedMessageFails() public {
        bytes32 modifiedHash = bytes32(uint256(HASH) ^ 1);
        assertFalse(_callPrecompileOnChain(modifiedHash, R, S, QX, QY));
    }

    function test_ModifiedRFails() public {
        bytes32 modifiedR = bytes32(uint256(R) ^ 1);
        assertFalse(_callPrecompileOnChain(HASH, modifiedR, S, QX, QY));
    }

    function test_ModifiedSFails() public {
        bytes32 modifiedS = bytes32(uint256(S) ^ 1);
        assertFalse(_callPrecompileOnChain(HASH, R, modifiedS, QX, QY));
    }

    function test_WrongKeyFails() public {
        bytes32 wrongQx = bytes32(uint256(QX) ^ 1);
        assertFalse(_callPrecompileOnChain(HASH, R, S, wrongQx, QY));
    }
}
