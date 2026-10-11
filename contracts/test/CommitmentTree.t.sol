// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {CommitmentTree} from "../src/CommitmentTree.sol";

/// @notice Access control and root-history behaviour for the Redesign B CommitmentTree.
/// @dev No ZK proof needed here — this is the plain contract logic the membership check relies on.
contract CommitmentTreeTest is Test {
    CommitmentTree tree;
    address poster = address(0xB0B);

    bytes32 constant ROOT_A = bytes32(uint256(0xA11));
    bytes32 constant ROOT_B = bytes32(uint256(0xB22));

    function setUp() public {
        tree = new CommitmentTree(); // deployer == this test contract
        tree.setRootPoster(poster);
    }

    function test_DeployerIsThisContract() public view {
        assertEq(tree.deployer(), address(this));
    }

    function test_OnlyDeployerCanSetRootPoster() public {
        vm.prank(address(0xBADD));
        vm.expectRevert(CommitmentTree.NotDeployer.selector);
        tree.setRootPoster(address(0xCAFE));
    }

    function test_RootPosterIsRotatable() public {
        tree.setRootPoster(address(0xCAFE));
        assertEq(tree.rootPoster(), address(0xCAFE));
    }

    function test_SetRootPosterRejectsZero() public {
        vm.expectRevert(CommitmentTree.ZeroAddress.selector);
        tree.setRootPoster(address(0));
    }

    function test_OnlyRootPosterCanPost() public {
        vm.expectRevert(CommitmentTree.NotRootPoster.selector);
        tree.postRoot(ROOT_A); // called by this contract, which is deployer but not poster
    }

    function test_PostRootRecordsAndTracksHistory() public {
        assertFalse(tree.isKnownRoot(ROOT_A));

        vm.prank(poster);
        tree.postRoot(ROOT_A);
        assertTrue(tree.isKnownRoot(ROOT_A));
        assertEq(tree.currentRoot(), ROOT_A);
        assertEq(tree.rootCount(), 1);

        vm.prank(poster);
        tree.postRoot(ROOT_B);
        assertTrue(tree.isKnownRoot(ROOT_B));
        assertEq(tree.currentRoot(), ROOT_B);
        assertEq(tree.rootCount(), 2);

        // A superseded root stays valid (append-only history).
        assertTrue(tree.isKnownRoot(ROOT_A));
    }

    function test_PostRootRejectsZeroRoot() public {
        vm.prank(poster);
        vm.expectRevert(CommitmentTree.ZeroRoot.selector);
        tree.postRoot(bytes32(0));
    }

    function test_PostRootRejectsDuplicate() public {
        vm.prank(poster);
        tree.postRoot(ROOT_A);
        vm.prank(poster);
        vm.expectRevert(CommitmentTree.RootAlreadyPosted.selector);
        tree.postRoot(ROOT_A);
    }

    function test_UnknownRootAndZeroAreNotKnown() public view {
        assertFalse(tree.isKnownRoot(ROOT_A));
        assertFalse(tree.isKnownRoot(bytes32(0)));
    }
}
