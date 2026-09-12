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

if [ ! -f build/judges_membership.r1cs ]; then
  echo "build/judges_membership.r1cs not found -- run 'pnpm run build' first." >&2
  exit 1
fi

mkdir -p build/ptau
PTAU_POWER=12 # 2^12 = 4096 constraints >= this circuit's ~1200; bump if the circuit grows.

npx snarkjs powersoftau new bn128 "$PTAU_POWER" build/ptau/pot_0000.ptau -v
npx snarkjs powersoftau contribute build/ptau/pot_0000.ptau build/ptau/pot_0001.ptau \
  --name="Judges hackathon MVP contribution" -v -e="$(node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))')"
npx snarkjs powersoftau beacon build/ptau/pot_0001.ptau build/ptau/pot_beacon.ptau \
  0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f 10 \
  -n="Judges hackathon MVP beacon"
npx snarkjs powersoftau prepare phase2 build/ptau/pot_beacon.ptau build/ptau/pot_final.ptau -v

npx snarkjs groth16 setup build/judges_membership.r1cs build/ptau/pot_final.ptau build/judges_membership_0000.zkey
npx snarkjs zkey contribute build/judges_membership_0000.zkey build/judges_membership_final.zkey \
  --name="Judges hackathon MVP zkey contribution" -v -e="$(node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))')"
npx snarkjs zkey export verificationkey build/judges_membership_final.zkey build/verification_key.json

echo "Trusted setup complete: build/judges_membership_final.zkey, build/verification_key.json"
