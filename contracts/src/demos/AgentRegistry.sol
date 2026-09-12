// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IJudgesVerifier} from "../interfaces/IJudgesVerifier.sol";

/// @notice Demo B from README §15: an AI agent can only be registered if a real user-controlled
///         credential authorized the registration.
/// @dev This is the README §15.B "AI-native trust layer" case — the registry itself holds no
///      identity, only the proof that some verified credential stood behind each agent.
contract AgentRegistry {
    IJudgesVerifier public immutable judges;
    bytes32 public immutable domain;

    struct Agent {
        address owner;
        string name;
        uint256 registeredAt;
    }

    mapping(uint256 agentId => Agent) public agents;
    uint256 public agentCount;

    event AgentRegistered(uint256 indexed agentId, address indexed owner, string name);

    error EmptyName();

    constructor(address _judges, bytes32 _domain) {
        judges = IJudgesVerifier(_judges);
        domain = _domain;
    }

    /// @notice The action binding a proof for this registration must commit to.
    /// @dev Binding the name means a lifted proof can't be used to register a different agent.
    function contextHashFor(string calldata name) public view returns (bytes32) {
        return sha256(abi.encodePacked(domain, "register", name));
    }

    /// @param wallet The wallet the proof is bound to; the agent is owned by this address rather
    ///        than `msg.sender`, since that's what the proof commits to.
    function registerAgent(
        string calldata name,
        bytes calldata proof,
        bytes32 walletCommitment,
        bytes32 nullifier,
        address wallet
    ) external returns (uint256 agentId) {
        if (bytes(name).length == 0) revert EmptyName();

        judges.verify(proof, walletCommitment, domain, nullifier, contextHashFor(name), wallet);

        agentId = ++agentCount;
        agents[agentId] = Agent({owner: wallet, name: name, registeredAt: block.timestamp});

        emit AgentRegistered(agentId, wallet, name);
    }
}
