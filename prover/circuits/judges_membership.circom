pragma circom 2.1.6;

include "poseidon.circom";

// Judges Phase 5 (Mode A) membership circuit.
//
// Proves: I know a credentialSecret and credentialPublicKeyHash such that
//   1. walletCommitment == Poseidon(credentialSecret, credentialPublicKeyHash, applicationIdHash)
//   2. nullifier         == Poseidon(credentialSecret, applicationIdHash, EPOCH)
// without revealing credentialSecret or credentialPublicKeyHash.
//
// Scope note (README Mode A): this circuit does NOT verify the WebAuthn/P-256 signature itself
// -- that happens directly onchain via the native P256VERIFY precompile (Phase 3). This circuit
// only proves the privacy-sensitive credential-secret -> commitment/nullifier relationship.
// `epoch` is a fixed constant (no rotation policy yet, matching packages/crypto's default) so
// it isn't a circuit input at all.
//
// `policyHash` is declared as a public input purely so a Groth16 verifier will reject a proof
// if the caller supplies a different policyHash than the one the proof was generated against --
// SNARK soundness binds ALL public inputs into the verification equation, so this holds even
// though the circuit doesn't (yet) constrain it against real policy logic; a real policy engine
// is a later phase (README §26), not Phase 4/5 scope.
//
// IMPORTANT: `applicationIdHash` is used for BOTH the wallet commitment's domain separator and
// the nullifier's application id. packages/crypto's general TS API allows those to be different
// strings (deriveCommitment's domainSeparator vs deriveNullifier's applicationId are separate
// parameters); a proof built against this circuit requires the caller to pass the SAME domain
// string to both -- see packages/crypto's deriveMembershipWitness helper, added specifically to
// enforce that and avoid generating a witness the circuit can never satisfy.
template JudgesMembership() {
    // Fixed epoch field element = toField(sha256("default")) -- see packages/crypto/src/nullifier.ts.
    var EPOCH = 3287441947728172013782129861452133600647806307473692417618422066152406542478;

    signal input walletCommitment;
    signal input nullifier;
    signal input applicationIdHash;
    signal input policyHash;

    signal input credentialSecret;
    signal input credentialPublicKeyHash;

    signal output policyHashEcho;

    component commitmentHasher = Poseidon(3);
    commitmentHasher.inputs[0] <== credentialSecret;
    commitmentHasher.inputs[1] <== credentialPublicKeyHash;
    commitmentHasher.inputs[2] <== applicationIdHash;
    walletCommitment === commitmentHasher.out;

    component nullifierHasher = Poseidon(3);
    nullifierHasher.inputs[0] <== credentialSecret;
    nullifierHasher.inputs[1] <== applicationIdHash;
    nullifierHasher.inputs[2] <== EPOCH;
    nullifier === nullifierHasher.out;

    policyHashEcho <== policyHash;
}

component main {public [walletCommitment, nullifier, applicationIdHash, policyHash]} = JudgesMembership();
