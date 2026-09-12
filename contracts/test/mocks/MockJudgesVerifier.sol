// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IJudgesVerifier} from "../../src/interfaces/IJudgesVerifier.sol";
import {NullifierRegistry} from "../../src/NullifierRegistry.sol";

/// @notice Stands in for JudgesVerifier in the demo-integration tests.
/// @dev Deliberate test architecture: the demo contracts' own logic (vote counting, agent
///      records, faucet payouts, one-action-per-nullifier) is worth testing on every run, but
///      generating a real Groth16 proof takes minutes per proof. The real cryptographic path is
///      covered separately and with real proofs in JudgesVerifier.t.sol; this mock reproduces
///      the two behaviours the demos actually depend on — reverting on a bad proof, and
///      reverting with the real `NullifierAlreadyUsed` error on reuse.
contract MockJudgesVerifier is IJudgesVerifier {
    mapping(bytes32 domain => mapping(bytes32 nullifier => bool used)) public used;
    bool public shouldRejectProof;

    struct RecordedCall {
        bytes32 walletCommitment;
        bytes32 domain;
        bytes32 nullifier;
        bytes32 contextHash;
        address wallet;
    }

    RecordedCall public lastCall;

    error MockInvalidProof();

    function setShouldRejectProof(bool value) external {
        shouldRejectProof = value;
    }

    function verify(
        bytes calldata,
        bytes32 walletCommitment,
        bytes32 domain,
        bytes32 nullifier,
        bytes32 contextHash,
        address wallet
    ) external override returns (bool) {
        if (shouldRejectProof) revert MockInvalidProof();
        if (used[domain][nullifier]) revert NullifierRegistry.NullifierAlreadyUsed(domain, nullifier);

        used[domain][nullifier] = true;
        lastCall = RecordedCall(walletCommitment, domain, nullifier, contextHash, wallet);
        return true;
    }

    function isNullifierUsed(bytes32 domain, bytes32 nullifier) external view override returns (bool) {
        return used[domain][nullifier];
    }

    function policyHashFor(bytes32 contextHash, address wallet) external pure override returns (bytes32) {
        return sha256(abi.encodePacked(contextHash, wallet));
    }
}
