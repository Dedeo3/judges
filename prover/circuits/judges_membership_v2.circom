pragma circom 2.1.6;

include "poseidon.circom";
include "comparators.circom";

// Judges Redesign B membership circuit (README task 2; also the fix for the audit's critical
// on-chain proof-forgery finding).
//
// Proves knowledge of a private `secret` such that:
//   1. leaf       == Poseidon(secret)                              -- the identity commitment
//   2. leaf is included in the LeanIMT with root `merkleRoot`      -- the server-published set
//   3. nullifier  == Poseidon(secret, applicationIdHash, EPOCH)    -- domain-scoped uniqueness
// and binds `policyHash` (the wallet/action binding) as a public input.
//
// Unlike the pre-B circuit, the commitment is no longer a free public value the caller supplies:
// it must be a leaf under a root the server actually published, which an outsider cannot forge.
// The secret itself is derived client-side from a wallet signature (packages/crypto/identity.ts),
// so the server never learns it.
//
// Merkle recomputation mirrors zk-kit's binary-merkle-root.circom / Semaphore v4 LeanIMT
// semantics: a private `depth` says how many of the MAX_DEPTH levels are real. `indices[i]` is
// the direction bit at level i (0 = the running node is the left child). The root is the running
// node after exactly `depth` hashes. packages/crypto/src/tree.ts reproduces the identical root in
// TypeScript and is pinned against this template by packages/crypto's tree.test.ts and
// prover/scripts/test_acceptance_v2.ts.
template JudgesMembershipV2(MAX_DEPTH) {
    // toField(sha256("default")) -- identical to packages/crypto's DEFAULT epoch and the pre-B circuit.
    var EPOCH = 3287441947728172013782129861452133600647806307473692417618422066152406542478;

    // Public inputs
    signal input merkleRoot;
    signal input nullifier;
    signal input applicationIdHash;
    signal input policyHash;

    // Private witness
    signal input secret;
    signal input depth;
    signal input indices[MAX_DEPTH];
    signal input siblings[MAX_DEPTH];

    signal output policyHashEcho;

    // (1) identity commitment leaf = Poseidon(secret)
    component leafHasher = Poseidon(1);
    leafHasher.inputs[0] <== secret;

    // (2) LeanIMT inclusion: recompute the root, require it to equal the public root.
    signal nodes[MAX_DEPTH + 1];
    nodes[0] <== leafHasher.out;

    component isDepth[MAX_DEPTH + 1];
    component hasher[MAX_DEPTH];
    signal left[MAX_DEPTH];
    signal right[MAX_DEPTH];
    signal rootParts[MAX_DEPTH + 1];
    signal rootAcc[MAX_DEPTH + 1];
    rootAcc[0] <== 0;

    for (var i = 0; i < MAX_DEPTH; i++) {
        // indices[i] must be a bit -- circomlib's mux/interpolation does NOT enforce this, and an
        // unconstrained selector would let a prover interpolate a fake child ordering.
        indices[i] * (indices[i] - 1) === 0;

        // Order the running node and its sibling by the direction bit:
        //   indices[i] == 0 -> node is the left child; == 1 -> node is the right child.
        left[i]  <== nodes[i] + indices[i] * (siblings[i] - nodes[i]);
        right[i] <== siblings[i] + indices[i] * (nodes[i] - siblings[i]);

        hasher[i] = Poseidon(2);
        hasher[i].inputs[0] <== left[i];
        hasher[i].inputs[1] <== right[i];
        nodes[i + 1] <== hasher[i].out;

        // The root is nodes[i] exactly when the real depth is i (levels >= depth pass through).
        isDepth[i] = IsEqual();
        isDepth[i].in[0] <== depth;
        isDepth[i].in[1] <== i;
        rootParts[i] <== isDepth[i].out * nodes[i];
        rootAcc[i + 1] <== rootAcc[i] + rootParts[i];
    }

    // Full-depth (depth == MAX_DEPTH) tree: the root is the last node.
    isDepth[MAX_DEPTH] = IsEqual();
    isDepth[MAX_DEPTH].in[0] <== depth;
    isDepth[MAX_DEPTH].in[1] <== MAX_DEPTH;
    rootParts[MAX_DEPTH] <== isDepth[MAX_DEPTH].out * nodes[MAX_DEPTH];

    signal computedRoot;
    computedRoot <== rootAcc[MAX_DEPTH] + rootParts[MAX_DEPTH];
    merkleRoot === computedRoot;

    // (3) nullifier == Poseidon(secret, applicationIdHash, EPOCH)
    component nullifierHasher = Poseidon(3);
    nullifierHasher.inputs[0] <== secret;
    nullifierHasher.inputs[1] <== applicationIdHash;
    nullifierHasher.inputs[2] <== EPOCH;
    nullifier === nullifierHasher.out;

    // (4) bind the wallet/action policy hash into the public inputs (Groth16 soundness binds it,
    //     so a caller substituting a different policyHash fails verification).
    policyHashEcho <== policyHash;
}

// Public signal order emitted by snarkjs (outputs first, then declared public inputs):
//   [policyHashEcho, merkleRoot, nullifier, applicationIdHash, policyHash]
// JudgesVerifier (Redesign B) must build its publicSignals array in exactly this order.
component main {public [merkleRoot, nullifier, applicationIdHash, policyHash]} = JudgesMembershipV2(20);
