// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {DeployJudges} from "../script/DeployJudges.s.sol";
import {NullifierRegistry} from "../src/NullifierRegistry.sol";
import {CommitmentTree} from "../src/CommitmentTree.sol";
import {JudgesVerifier} from "../src/JudgesVerifier.sol";
import {MonadP256Adapter} from "../src/MonadP256Adapter.sol";
import {SybilResistantDAO} from "../src/demos/SybilResistantDAO.sol";
import {AgentRegistry} from "../src/demos/AgentRegistry.sol";
import {SybilResistantFaucet} from "../src/demos/SybilResistantFaucet.sol";
import {JudgesField} from "../src/libraries/JudgesField.sol";

/// @notice Runs the real deploy script's logic locally and asserts the wiring.
/// @dev The point: a mis-wired deployment (registry pointing at the wrong verifier, a demo
///      deployed with the wrong domain) would look completely fine until the first real proof
///      failed on testnet. Every assertion here is something that would otherwise only surface
///      after spending gas.
contract DeployJudgesTest is Test {
    DeployJudges script;
    DeployJudges.Deployment deployment;

    uint256 constant CLAIM_AMOUNT = 0.05 ether;

    function setUp() public {
        script = new DeployJudges();
        deployment = script.deploy(CLAIM_AMOUNT);
    }

    function test_AllContractsDeployed() public view {
        assertTrue(deployment.groth16Verifier != address(0));
        assertTrue(deployment.nullifierRegistry != address(0));
        assertTrue(deployment.commitmentTree != address(0));
        assertTrue(deployment.p256Adapter != address(0));
        assertTrue(deployment.judgesVerifier != address(0));
        assertTrue(deployment.dao != address(0));
        assertTrue(deployment.agentRegistry != address(0));
        assertTrue(deployment.faucet != address(0));
    }

    /// @dev The cycle-breaking step. If `setVerifier` were skipped, every `verify()` would revert
    ///      with NotVerifier the first time anyone tried to use the system.
    function test_NullifierRegistryPointsAtJudgesVerifier() public view {
        assertEq(NullifierRegistry(deployment.nullifierRegistry).verifier(), deployment.judgesVerifier);
    }

    function test_VerifierWiredToGroth16AndRegistry() public view {
        JudgesVerifier verifier = JudgesVerifier(deployment.judgesVerifier);
        assertEq(address(verifier.zkVerifier()), deployment.groth16Verifier);
        assertEq(address(verifier.nullifierRegistry()), deployment.nullifierRegistry);
    }

    /// @dev Redesign B: the verifier must point at the CommitmentTree, and the tree must have a
    ///      root poster set — otherwise no root could ever be published and every proof would
    ///      revert with UnknownRoot.
    function test_VerifierWiredToCommitmentTree() public view {
        JudgesVerifier verifier = JudgesVerifier(deployment.judgesVerifier);
        assertEq(address(verifier.commitmentTree()), deployment.commitmentTree);
    }

    function test_CommitmentTreeRootPosterConfigured() public view {
        assertTrue(CommitmentTree(deployment.commitmentTree).rootPoster() != address(0));
    }

    /// @dev `setVerifier` is one-shot, so a second deployment run can't silently repoint an
    ///      existing registry at a new verifier.
    /// @dev The prank matters: whoever *ran* the deployment is the registry's `deployer`. Here
    ///      that's the script contract, because this test calls `script.deploy()` externally.
    ///      Under `forge script --broadcast` the CREATEs are re-sent as top-level transactions
    ///      from the signing EOA, so there it's the EOA instead. Either way the script spends
    ///      the one-shot `setVerifier` immediately, which is what this asserts — without the
    ///      prank we'd only be testing `NotDeployer`, an artifact of the harness rather than the
    ///      property we care about.
    function test_RegistryVerifierCannotBeRepointed() public {
        vm.prank(address(script));
        vm.expectRevert(NullifierRegistry.VerifierAlreadySet.selector);
        NullifierRegistry(deployment.nullifierRegistry).setVerifier(address(0xDEAD));
    }

    /// @dev And nobody else can claim it either, whichever address ends up as deployer.
    function test_NonDeployerCannotSetVerifier() public {
        vm.prank(address(0xA11CE));
        vm.expectRevert(NullifierRegistry.NotDeployer.selector);
        NullifierRegistry(deployment.nullifierRegistry).setVerifier(address(0xDEAD));
    }

    function test_DemosPointAtJudgesVerifier() public view {
        assertEq(address(SybilResistantDAO(deployment.dao).judges()), deployment.judgesVerifier);
        assertEq(address(AgentRegistry(deployment.agentRegistry).judges()), deployment.judgesVerifier);
        assertEq(address(SybilResistantFaucet(payable(deployment.faucet)).judges()), deployment.judgesVerifier);
    }

    /// @dev Each demo must carry the domain derived from its own app-id string — this is what the
    ///      frontend's `appId` has to match, and what keeps a proof minted for one demo from
    ///      being replayed against another.
    function test_DemoDomainsDerivedFromAppIds() public view {
        assertEq(SybilResistantDAO(deployment.dao).domain(), bytes32(JudgesField.hashToField("judges-dao")));
        assertEq(
            AgentRegistry(deployment.agentRegistry).domain(),
            bytes32(JudgesField.hashToField("judges-agent-registry"))
        );
        assertEq(
            SybilResistantFaucet(payable(deployment.faucet)).domain(), bytes32(JudgesField.hashToField("judges-faucet"))
        );
    }

    function test_DemoDomainsAreDistinct() public view {
        bytes32 daoDomain = SybilResistantDAO(deployment.dao).domain();
        bytes32 agentDomain = AgentRegistry(deployment.agentRegistry).domain();
        bytes32 faucetDomain = SybilResistantFaucet(payable(deployment.faucet)).domain();

        assertTrue(daoDomain != agentDomain);
        assertTrue(daoDomain != faucetDomain);
        assertTrue(agentDomain != faucetDomain);
    }

    function test_FaucetClaimAmountConfigured() public view {
        assertEq(SybilResistantFaucet(payable(deployment.faucet)).claimAmount(), CLAIM_AMOUNT);
    }

    function test_P256AdapterTargetsDocumentedPrecompile() public view {
        assertEq(MonadP256Adapter(deployment.p256Adapter).PRECOMPILE(), address(0x100));
    }
}
