// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @notice Domain-separated nullifier uniqueness registry (README §9.3).
/// @dev A nullifier prevents reuse of the same underlying credential secret within one
///      application domain — it does not prove a person can't create multiple independent
///      credentials (README §7.5, §27).
contract NullifierRegistry {
    mapping(bytes32 domain => mapping(bytes32 nullifier => bool used)) public usedNullifier;

    /// @dev Settable exactly once, by the deployer, after the consuming verifier contract
    ///      (JudgesVerifier, Phase 9) is itself deployed — avoids a constructor-argument
    ///      circular dependency between the two contracts.
    address public verifier;
    address private immutable deployer;

    event HumanVerified(bytes32 indexed domain, bytes32 indexed nullifier, address indexed wallet);
    event VerifierSet(address indexed verifier);

    error NullifierAlreadyUsed(bytes32 domain, bytes32 nullifier);
    error NotVerifier();
    error NotDeployer();
    error VerifierAlreadySet();

    constructor() {
        deployer = msg.sender;
    }

    function setVerifier(address _verifier) external {
        if (msg.sender != deployer) revert NotDeployer();
        if (verifier != address(0)) revert VerifierAlreadySet();
        verifier = _verifier;
        emit VerifierSet(_verifier);
    }

    modifier onlyVerifier() {
        if (msg.sender != verifier) revert NotVerifier();
        _;
    }

    function isNullifierUsed(bytes32 domain, bytes32 nullifier) external view returns (bool) {
        return usedNullifier[domain][nullifier];
    }

    /// @dev Only callable by the registered verifier contract — an unauthenticated public
    ///      `consume` would let anyone front-run and "burn" a nullifier before its rightful
    ///      owner submits their real verification (a griefing/DoS vector).
    function consume(bytes32 domain, bytes32 nullifier, address wallet) external onlyVerifier {
        if (usedNullifier[domain][nullifier]) {
            revert NullifierAlreadyUsed(domain, nullifier);
        }
        usedNullifier[domain][nullifier] = true;
        emit HumanVerified(domain, nullifier, wallet);
    }
}
