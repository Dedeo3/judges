import { describe, expect, it } from "vitest";
import {
  buildIdentityTree,
  generateCircuitMerkleProof,
  leanIMTHash,
  MAX_TREE_DEPTH,
} from "./tree";
import { deriveIdentityCommitment } from "./identity";

const leaves = [111n, 222n, 333n, 444n, 555n].map(deriveIdentityCommitment);

/**
 * Recomputes the root the way the circuit's BinaryMerkleRoot(MAX_TREE_DEPTH) does — the exact
 * check the ZK proof enforces. Pinning it here means a divergence between this TS witness and the
 * circom template shows up as a failing test, not a silently unsatisfiable proof.
 */
function circuitRoot(proof: ReturnType<typeof generateCircuitMerkleProof>): bigint {
  let node = proof.leaf;
  for (let i = 0; i < MAX_TREE_DEPTH; i++) {
    const withinTree = i < proof.depth;
    const left = proof.indices[i] === 0n ? node : proof.siblings[i];
    const right = proof.indices[i] === 0n ? proof.siblings[i] : node;
    const combined = leanIMTHash(left, right);
    node = withinTree ? combined : node;
  }
  return node;
}

describe("identity tree", () => {
  it("pads indices and siblings to MAX_TREE_DEPTH", () => {
    const tree = buildIdentityTree(leaves);
    const proof = generateCircuitMerkleProof(tree, leaves[2]);
    expect(proof.indices).toHaveLength(MAX_TREE_DEPTH);
    expect(proof.siblings).toHaveLength(MAX_TREE_DEPTH);
    expect(proof.depth).toBeLessThanOrEqual(MAX_TREE_DEPTH);
  });

  it("produces a proof whose circuit recomputation equals the tree root", () => {
    const tree = buildIdentityTree(leaves);
    for (const leaf of leaves) {
      const proof = generateCircuitMerkleProof(tree, leaf);
      expect(proof.root).toBe(tree.root);
      expect(circuitRoot(proof)).toBe(tree.root);
    }
  });

  it("recomputes a WRONG root if a sibling is tampered", () => {
    const tree = buildIdentityTree(leaves);
    const proof = generateCircuitMerkleProof(tree, leaves[1]);
    const tampered = { ...proof, siblings: [...proof.siblings] };
    tampered.siblings[0] = tampered.siblings[0] + 1n;
    expect(circuitRoot(tampered)).not.toBe(tree.root);
  });

  it("rejects a leaf that isn't a member", () => {
    const tree = buildIdentityTree(leaves);
    expect(() => generateCircuitMerkleProof(tree, 999999n)).toThrow();
  });

  it("works for a single-leaf tree (depth 0)", () => {
    const tree = buildIdentityTree([leaves[0]]);
    const proof = generateCircuitMerkleProof(tree, leaves[0]);
    expect(proof.depth).toBe(0);
    expect(circuitRoot(proof)).toBe(tree.root);
    expect(tree.root).toBe(leaves[0]); // a one-leaf LeanIMT root is the leaf itself
  });
});
