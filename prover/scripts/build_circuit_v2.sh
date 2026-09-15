#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

if ! command -v circom >/dev/null 2>&1; then
  echo "circom not found on PATH. Install it first:" >&2
  echo "  https://docs.circom.io/getting-started/installation/" >&2
  exit 1
fi

mkdir -p build
# circomlib supplies both poseidon.circom and comparators.circom (IsEqual) used by the circuit.
circom circuits/judges_membership_v2.circom \
  --r1cs --wasm --sym \
  -o build \
  -l node_modules/circomlib/circuits

echo "Compiled build/judges_membership_v2.r1cs, build/judges_membership_v2.sym, build/judges_membership_v2_js/judges_membership_v2.wasm"
