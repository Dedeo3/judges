/** Matches contracts/src/interfaces/IJudgesVerifier.sol. */
export const judgesVerifierAbi = [
  {
    type: "function",
    name: "verify",
    stateMutability: "nonpayable",
    inputs: [
      { name: "proof", type: "bytes" },
      { name: "walletCommitment", type: "bytes32" },
      { name: "domain", type: "bytes32" },
      { name: "nullifier", type: "bytes32" },
      { name: "policyHash", type: "bytes32" },
      { name: "wallet", type: "address" },
    ],
    outputs: [{ name: "valid", type: "bool" }],
  },
  {
    type: "function",
    name: "isNullifierUsed",
    stateMutability: "view",
    inputs: [
      { name: "domain", type: "bytes32" },
      { name: "nullifier", type: "bytes32" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;
