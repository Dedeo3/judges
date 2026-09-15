// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @notice Redesign B: on-chain history of the off-chain LeanIMT root of identity commitments.
///
/// @dev This is the piece that makes membership the on-chain soundness check. The pre-B verifier
///      accepted a proof over any commitment the caller supplied, so anyone could mint a valid
///      "verified human" proof with an invented secret. In B the circuit proves the commitment is
///      a leaf under a root recorded here, and only the server's `rootPoster` can record a root —
///      so an outsider cannot forge membership.
///
///      The server (packages/crypto builds the tree off-chain) posts a new root after each batch
///      of registrations. Every posted root stays valid forever: the tree is append-only (no
///      revocation), so a proof generated against a slightly-stale root still verifies, which is
///      exactly the "root history" the design calls for. Nullifier uniqueness (NullifierRegistry)
///      independently prevents a stale root from enabling a repeated action.
contract CommitmentTree {
    /// @dev The address that deployed this contract; the only one allowed to set/rotate the poster.
    address public immutable deployer;

    /// @dev The server key permitted to publish new roots. Set by the deployer after deploy.
    address public rootPoster;

    /// @dev The most recently posted root (informational; verification accepts any known root).
    bytes32 public currentRoot;

    /// @dev Monotonically increasing count of roots posted (also the 1-based index in events).
    uint256 public rootCount;

    /// @dev root => block.timestamp it was first posted (0 means never posted).
    mapping(bytes32 root => uint256 postedAt) public rootPostedAt;

    event RootPosterSet(address indexed poster);
    event RootPosted(bytes32 indexed root, uint256 index, uint256 timestamp);

    error NotDeployer();
    error NotRootPoster();
    error ZeroAddress();
    error ZeroRoot();
    error RootAlreadyPosted();

    constructor() {
        deployer = msg.sender;
    }

    /// @dev Repeatable on purpose (unlike NullifierRegistry's one-shot verifier): the server's
    ///      posting key is operational, not load-bearing for soundness, so it must be rotatable.
    ///      Only the deployer can rotate it.
    function setRootPoster(address poster) external {
        if (msg.sender != deployer) revert NotDeployer();
        if (poster == address(0)) revert ZeroAddress();
        rootPoster = poster;
        emit RootPosterSet(poster);
    }

    /// @notice Publish a new Merkle root. Only the registered `rootPoster` may call this.
    function postRoot(bytes32 newRoot) external {
        if (msg.sender != rootPoster) revert NotRootPoster();
        if (newRoot == bytes32(0)) revert ZeroRoot();
        if (rootPostedAt[newRoot] != 0) revert RootAlreadyPosted();

        rootPostedAt[newRoot] = block.timestamp;
        currentRoot = newRoot;
        rootCount += 1;
        emit RootPosted(newRoot, rootCount, block.timestamp);
    }

    /// @notice True iff `root` is a non-zero root this contract has posted.
    function isKnownRoot(bytes32 root) external view returns (bool) {
        return root != bytes32(0) && rootPostedAt[root] != 0;
    }
}
