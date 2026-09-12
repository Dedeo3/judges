// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {AgentRegistry} from "../../src/demos/AgentRegistry.sol";
import {NullifierRegistry} from "../../src/NullifierRegistry.sol";
import {MockJudgesVerifier} from "../mocks/MockJudgesVerifier.sol";

contract AgentRegistryTest is Test {
    MockJudgesVerifier judges;
    AgentRegistry registry;

    bytes32 constant DOMAIN = keccak256("judges-agent-registry");
    bytes32 constant WALLET_COMMITMENT = keccak256("wallet-commitment");
    bytes32 constant NULLIFIER = keccak256("nullifier-a");
    bytes constant PROOF = hex"00";

    address creator = address(0xBEEF);

    function setUp() public {
        judges = new MockJudgesVerifier();
        registry = new AgentRegistry(address(judges), DOMAIN);
    }

    function test_RegistersAgentOwnedByBoundWallet() public {
        uint256 agentId = registry.registerAgent("scout-1", PROOF, WALLET_COMMITMENT, NULLIFIER, creator);

        (address owner, string memory name, uint256 registeredAt) = registry.agents(agentId);
        assertEq(owner, creator);
        assertEq(name, "scout-1");
        assertEq(registeredAt, block.timestamp);
        assertEq(registry.agentCount(), 1);
    }

    function test_SecondRegistrationWithSameNullifierRejected() public {
        registry.registerAgent("scout-1", PROOF, WALLET_COMMITMENT, NULLIFIER, creator);

        vm.expectRevert(abi.encodeWithSelector(NullifierRegistry.NullifierAlreadyUsed.selector, DOMAIN, NULLIFIER));
        registry.registerAgent("scout-2", PROOF, WALLET_COMMITMENT, NULLIFIER, creator);

        assertEq(registry.agentCount(), 1);
    }

    function test_ContextHashBindsTheAgentName() public view {
        assertTrue(registry.contextHashFor("scout-1") != registry.contextHashFor("scout-2"));
    }

    function test_EmptyNameRejected() public {
        vm.expectRevert(AgentRegistry.EmptyName.selector);
        registry.registerAgent("", PROOF, WALLET_COMMITMENT, NULLIFIER, creator);
    }

    function test_InvalidProofReverts() public {
        judges.setShouldRejectProof(true);
        vm.expectRevert(MockJudgesVerifier.MockInvalidProof.selector);
        registry.registerAgent("scout-1", PROOF, WALLET_COMMITMENT, NULLIFIER, creator);
        assertEq(registry.agentCount(), 0);
    }
}
