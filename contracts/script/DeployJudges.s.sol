// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {Groth16Verifier} from "../src/JudgesGroth16Verifier.sol";
import {NullifierRegistry} from "../src/NullifierRegistry.sol";
import {CommitmentTree} from "../src/CommitmentTree.sol";
import {MonadP256Adapter} from "../src/MonadP256Adapter.sol";
import {JudgesVerifier} from "../src/JudgesVerifier.sol";
import {JudgesField} from "../src/libraries/JudgesField.sol";
import {SybilResistantDAO} from "../src/demos/SybilResistantDAO.sol";
import {AgentRegistry} from "../src/demos/AgentRegistry.sol";
import {SybilResistantFaucet} from "../src/demos/SybilResistantFaucet.sol";

/// @notice Deploys the full Judges stack plus the three README §15 demos.
///
/// @dev Usage (Monad Testnet):
///        forge script script/DeployJudges.s.sol:DeployJudges \
///          --rpc-url monad_testnet --broadcast --verify
///      Supply the signer with a Foundry flag (`--private-key`, `--keystore`, `--ledger`, …).
///      This script deliberately never reads a private key itself — key handling stays entirely
///      with whoever runs it.
///
/// @dev The deployment logic lives in `deploy()`, which does no broadcasting, so
///      `test/DeployJudges.t.sol` can run the whole sequence locally and assert the wiring
///      without a funded key. `run()` is just `deploy()` wrapped in a broadcast.
contract DeployJudges is Script {
    /// @dev The app-id strings each demo's `domain` is derived from. The frontend must use these
    ///      exact strings as its `appId`, or the `applicationIdHash` public input in a proof
    ///      won't match the `domain` the contract was deployed with. Their hashes are pinned
    ///      against packages/crypto in test/JudgesField.t.sol.
    string internal constant DAO_APP_ID = "judges-dao";
    string internal constant AGENT_REGISTRY_APP_ID = "judges-agent-registry";
    string internal constant FAUCET_APP_ID = "judges-faucet";

    uint256 internal constant DEFAULT_FAUCET_CLAIM_AMOUNT = 0.01 ether;

    struct Deployment {
        address groth16Verifier;
        address nullifierRegistry;
        address commitmentTree;
        address p256Adapter;
        address judgesVerifier;
        address dao;
        address agentRegistry;
        address faucet;
    }

    function run() external returns (Deployment memory deployment) {
        uint256 claimAmount = vm.envOr("FAUCET_CLAIM_AMOUNT", DEFAULT_FAUCET_CLAIM_AMOUNT);

        vm.startBroadcast();
        deployment = deploy(claimAmount);
        vm.stopBroadcast();

        _logDeployment(deployment, claimAmount);
        _writeDeploymentFile(deployment);
    }

    function deploy(uint256 faucetClaimAmount) public returns (Deployment memory deployment) {
        // Order matters: JudgesVerifier needs the registry's address, and the registry needs the
        // verifier's — NullifierRegistry breaks that cycle with a deployer-only `setVerifier`
        // that can be called exactly once, after both exist.
        Groth16Verifier groth16Verifier = new Groth16Verifier();
        NullifierRegistry nullifierRegistry = new NullifierRegistry();

        // Redesign B: the membership-root history. Its `rootPoster` (the server key that publishes
        // roots) defaults to the deployer and can be rotated later; override with JUDGES_ROOT_POSTER.
        CommitmentTree commitmentTree = new CommitmentTree();
        commitmentTree.setRootPoster(vm.envOr("JUDGES_ROOT_POSTER", msg.sender));

        // Not called by JudgesVerifier (see its scope note), but deployed as a usable,
        // independently tested building block: onchain secp256r1 verification via Monad's native
        // P256VERIFY precompile is the protocol-level primitive this whole project is built on.
        MonadP256Adapter p256Adapter = new MonadP256Adapter();

        JudgesVerifier judgesVerifier =
            new JudgesVerifier(address(groth16Verifier), address(nullifierRegistry), address(commitmentTree));
        nullifierRegistry.setVerifier(address(judgesVerifier));

        SybilResistantDAO dao =
            new SybilResistantDAO(address(judgesVerifier), bytes32(JudgesField.hashToField(DAO_APP_ID)));
        AgentRegistry agentRegistry =
            new AgentRegistry(address(judgesVerifier), bytes32(JudgesField.hashToField(AGENT_REGISTRY_APP_ID)));
        SybilResistantFaucet faucet = new SybilResistantFaucet(
            address(judgesVerifier), bytes32(JudgesField.hashToField(FAUCET_APP_ID)), faucetClaimAmount
        );

        deployment = Deployment({
            groth16Verifier: address(groth16Verifier),
            nullifierRegistry: address(nullifierRegistry),
            commitmentTree: address(commitmentTree),
            p256Adapter: address(p256Adapter),
            judgesVerifier: address(judgesVerifier),
            dao: address(dao),
            agentRegistry: address(agentRegistry),
            faucet: address(faucet)
        });
    }

    function _logDeployment(Deployment memory d, uint256 claimAmount) internal pure {
        console.log("Groth16Verifier      ", d.groth16Verifier);
        console.log("NullifierRegistry    ", d.nullifierRegistry);
        console.log("CommitmentTree       ", d.commitmentTree);
        console.log("MonadP256Adapter     ", d.p256Adapter);
        console.log("JudgesVerifier       ", d.judgesVerifier);
        console.log("SybilResistantDAO    ", d.dao);
        console.log("AgentRegistry        ", d.agentRegistry);
        console.log("SybilResistantFaucet ", d.faucet);
        console.log("Faucet claim amount (wei)", claimAmount);
    }

    /// @dev Written as the env-var block the frontend expects, so wiring `apps/web` after a
    ///      deploy is a copy-paste rather than seven manual transcriptions.
    function _writeDeploymentFile(Deployment memory d) internal {
        string memory path = string.concat("deployments/", vm.toString(block.chainid), ".env");
        string memory contents = string.concat(
            "NEXT_PUBLIC_JUDGES_VERIFIER_ADDRESS=",
            vm.toString(d.judgesVerifier),
            "\nNEXT_PUBLIC_JUDGES_DAO_ADDRESS=",
            vm.toString(d.dao),
            "\nNEXT_PUBLIC_JUDGES_AGENT_REGISTRY_ADDRESS=",
            vm.toString(d.agentRegistry),
            "\nNEXT_PUBLIC_JUDGES_FAUCET_ADDRESS=",
            vm.toString(d.faucet),
            "\nNEXT_PUBLIC_JUDGES_COMMITMENT_TREE_ADDRESS=",
            vm.toString(d.commitmentTree),
            "\n# Not consumed by the frontend, recorded for docs/architecture.md:\n",
            "# NullifierRegistry=",
            vm.toString(d.nullifierRegistry),
            "\n# Groth16Verifier=",
            vm.toString(d.groth16Verifier),
            "\n# MonadP256Adapter=",
            vm.toString(d.p256Adapter),
            "\n"
        );
        vm.writeFile(path, contents);
        console.log("Wrote", path);
    }
}
