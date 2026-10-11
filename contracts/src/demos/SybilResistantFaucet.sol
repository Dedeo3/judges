// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IJudgesVerifier} from "../interfaces/IJudgesVerifier.sol";

/// @notice Demo C from README §15: one claim per verified credential per domain.
/// @dev README calls this "the clearest visual demonstration of why the primitive matters" — the
///      second claim from the same credential simply reverts with `NullifierAlreadyUsed`.
contract SybilResistantFaucet {
    IJudgesVerifier public immutable judges;
    bytes32 public immutable domain;
    uint256 public immutable claimAmount;

    event Claimed(address indexed wallet, uint256 amount);
    event Funded(address indexed from, uint256 amount);

    error InsufficientFaucetBalance();
    error TransferFailed();

    constructor(address _judges, bytes32 _domain, uint256 _claimAmount) {
        judges = IJudgesVerifier(_judges);
        domain = _domain;
        claimAmount = _claimAmount;
    }

    /// @notice The action binding a proof for a claim must commit to.
    function contextHashFor() public view returns (bytes32) {
        return sha256(abi.encodePacked(domain, "claim"));
    }

    /// @param wallet The wallet the proof is bound to. Funds go *here*, not to `msg.sender` —
    ///        so a third party submitting someone else's proof just pays gas to deliver that
    ///        person their own claim.
    function claim(bytes calldata proof, bytes32 merkleRoot, bytes32 nullifier, address wallet) external {
        if (address(this).balance < claimAmount) revert InsufficientFaucetBalance();

        // Consumes the nullifier before any transfer, so a reentrant claim hits
        // NullifierAlreadyUsed rather than draining the faucet.
        judges.verify(proof, merkleRoot, domain, nullifier, contextHashFor(), wallet);

        (bool ok,) = payable(wallet).call{value: claimAmount}("");
        if (!ok) revert TransferFailed();

        emit Claimed(wallet, claimAmount);
    }

    receive() external payable {
        emit Funded(msg.sender, msg.value);
    }
}
