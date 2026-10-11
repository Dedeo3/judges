#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

cat >&2 <<'EOF'
=====================================================================
 WARNING: this generates a SINGLE-CONTRIBUTOR, LOCAL trusted setup.
 It is fine for a hackathon MVP -- it is NOT safe for production or
 mainnet use. A real deployment needs a proper multi-party ceremony
 (e.g. Perpetual Powers of Tau, or a fresh circuit-specific ceremony
 with multiple independent contributors) before the verifying key is
 trusted with real funds/identities. See README.md in this directory.
=====================================================================
EOF

if [ ! -f build/judges_membership_v2.r1cs ]; then
  echo "build/judges_membership_v2.r1cs not found -- run 'pnpm run build:v2' first." >&2
  exit 1
fi

mkdir -p build/ptau
# 2^14 = 16384 >= the v2 circuit's ~11.4k constraints (README task 2 measurement). Bump if it grows.
PTAU_POWER=14

npx snarkjs powersoftau new bn128 "$PTAU_POWER" build/ptau/pot_v2_0000.ptau -v
npx snarkjs powersoftau contribute build/ptau/pot_v2_0000.ptau build/ptau/pot_v2_0001.ptau \
  --name="Judges hackathon MVP v2 contribution" -v -e="$(node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))')"
npx snarkjs powersoftau beacon build/ptau/pot_v2_0001.ptau build/ptau/pot_v2_beacon.ptau \
  0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f 10 \
  -n="Judges hackathon MVP v2 beacon"
npx snarkjs powersoftau prepare phase2 build/ptau/pot_v2_beacon.ptau build/ptau/pot_v2_final.ptau -v

npx snarkjs groth16 setup build/judges_membership_v2.r1cs build/ptau/pot_v2_final.ptau build/judges_membership_v2_0000.zkey
npx snarkjs zkey contribute build/judges_membership_v2_0000.zkey build/judges_membership_v2_final.zkey \
  --name="Judges hackathon MVP v2 zkey contribution" -v -e="$(node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))')"
npx snarkjs zkey export verificationkey build/judges_membership_v2_final.zkey build/verification_key_v2.json

echo "Trusted setup complete: build/judges_membership_v2_final.zkey, build/verification_key_v2.json"
echo "Next: re-export the on-chain verifier and the fixture:"
echo "  npx snarkjs zkey export solidityverifier build/judges_membership_v2_final.zkey ../contracts/src/JudgesGroth16Verifier.sol"
echo "  pnpm exec tsx scripts/export_verifier_fixture_v2.ts"
