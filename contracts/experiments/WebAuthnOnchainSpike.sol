// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {P256Verifier} from "../src/libraries/P256Verifier.sol";

/// @notice MEASUREMENT SPIKE — not deployed, not wired into anything, not audited.
///
/// @dev Exists to answer one question with numbers instead of opinions: what would it cost to put
///      the raw WebAuthn/P-256 signature check on `JudgesVerifier.verify()`'s path (README §5's
///      "native P256VERIFY as an onchain trust primitive", taken literally) instead of verifying
///      the signature off-chain during the ceremony?
///
///      Verifying a WebAuthn assertion on-chain is NOT just one precompile call. The signature
///      covers sha256(authenticatorData ‖ sha256(clientDataJSON)), and none of the surrounding
///      checks can be skipped without making the whole thing forgeable:
///        - rpIdHash must match, or a signature from another site is accepted
///        - the UV flag must be set, or "user verified" assurance means nothing
///        - the challenge inside clientDataJSON must match, or any past assertion replays
///      That last one is why base64url encoding ends up on-chain: WebAuthn embeds the challenge
///      into JSON as base64url text, so the contract has to encode its expected challenge and
///      compare bytes.
///
///      See contracts/test/WebAuthnOnchainSpike.t.sol for the measured cost.
contract WebAuthnOnchainSpike {
    address internal constant P256_PRECOMPILE = 0x0000000000000000000000000000000000000100;

    bytes internal constant BASE64URL_TABLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

    /// @dev Flags byte in authenticatorData: bit 0 = user present, bit 2 = user verified.
    uint8 internal constant FLAG_USER_PRESENT = 0x01;
    uint8 internal constant FLAG_USER_VERIFIED = 0x04;

    /// @dev Grouped into a struct because ten flat parameters blow the stack ("stack too deep").
    ///      Production WebAuthn libraries do the same thing for the same reason.
    struct Assertion {
        bytes authenticatorData;
        bytes clientDataJSON;
        uint256 typeIndex;
        uint256 challengeIndex;
        bytes32 r;
        bytes32 s;
        bytes32 qx;
        bytes32 qy;
    }

    function verifyAssertion(Assertion calldata assertion, bytes32 expectedRpIdHash, bytes32 expectedChallenge)
        external
        view
        returns (bool)
    {
        bytes calldata authenticatorData = assertion.authenticatorData;
        if (authenticatorData.length < 37) return false;
        if (bytes32(authenticatorData[0:32]) != expectedRpIdHash) return false;

        uint8 flags = uint8(authenticatorData[32]);
        if (flags & FLAG_USER_PRESENT == 0) return false;
        if (flags & FLAG_USER_VERIFIED == 0) return false;

        if (!_matchesAt(assertion.clientDataJSON, assertion.typeIndex, '"type":"webauthn.get"')) return false;
        if (!_matchesAt(assertion.clientDataJSON, assertion.challengeIndex, _challengeField(expectedChallenge))) {
            return false;
        }

        bytes32 clientDataHash = sha256(assertion.clientDataJSON);
        bytes32 messageHash = sha256(bytes.concat(authenticatorData, clientDataHash));

        return P256Verifier.verify(P256_PRECOMPILE, messageHash, assertion.r, assertion.s, assertion.qx, assertion.qy);
    }

    function _challengeField(bytes32 challenge) internal pure returns (bytes memory) {
        return abi.encodePacked('"challenge":"', _encodeBase64Url32(challenge), '"');
    }

    function _matchesAt(bytes calldata haystack, uint256 offset, bytes memory needle)
        internal
        pure
        returns (bool)
    {
        if (offset + needle.length > haystack.length) return false;
        return keccak256(haystack[offset:offset + needle.length]) == keccak256(needle);
    }

    /// @dev base64url of exactly 32 bytes -> 43 chars, no padding. Fixed-size on purpose: the
    ///      general-case encoder costs more and a WebAuthn challenge is always 32 bytes here.
    function _encodeBase64Url32(bytes32 data) internal pure returns (bytes memory out) {
        bytes memory table = BASE64URL_TABLE;
        out = new bytes(43);

        uint256 o = 0;
        for (uint256 i = 0; i < 30; i += 3) {
            uint256 chunk =
                (uint256(uint8(data[i])) << 16) | (uint256(uint8(data[i + 1])) << 8) | uint256(uint8(data[i + 2]));
            out[o++] = table[(chunk >> 18) & 0x3F];
            out[o++] = table[(chunk >> 12) & 0x3F];
            out[o++] = table[(chunk >> 6) & 0x3F];
            out[o++] = table[chunk & 0x3F];
        }

        // Trailing 2 bytes -> 3 chars (16 bits, low 2 bits of the last char are zero padding).
        uint256 last = (uint256(uint8(data[30])) << 8) | uint256(uint8(data[31]));
        out[o++] = table[(last >> 10) & 0x3F];
        out[o++] = table[(last >> 4) & 0x3F];
        out[o] = table[(last << 2) & 0x3F];
    }
}
