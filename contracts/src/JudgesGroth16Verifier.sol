// SPDX-License-Identifier: GPL-3.0
/*
    Copyright 2021 0KIMS association.

    This file is generated with [snarkJS](https://github.com/iden3/snarkjs).

    snarkJS is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    snarkJS is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with snarkJS. If not, see <https://www.gnu.org/licenses/>.
*/

pragma solidity >=0.7.0 <0.9.0;

// Judges note (not part of the snarkJS-generated content above): this file is machine-generated
// by `snarkjs zkey export solidityverifier` from prover/build/judges_membership_final.zkey --
// the MVP-only, single-contributor local trusted setup documented in prover/README.md. The
// verification key is baked into this contract as constants, so it is committed here (unlike
// every other prover/build/* artifact, which is gitignored and freely regeneratable) -- a
// different trusted-setup run produces a DIFFERENT, INCOMPATIBLE verifier, so regenerating the
// setup means re-running `prover`'s export step and replacing this file, invalidating any
// previously generated proofs. Do not hand-edit the constants or assembly below.
//
// Public signal order (from prover/circuits/judges_membership.circom): the circuit declares one
// output (`policyHashEcho`) followed by four public inputs in this order --
// [policyHashEcho, walletCommitment, nullifier, applicationIdHash, policyHash]. The five
// `_pubSignals` slots below correspond to that order positionally.
//
// Uses only standard EVM precompiles (0x06 ecAdd, 0x07 ecMul, 0x08 ecPairing) -- no Monad-specific
// precompile dependency, unlike MonadP256Adapter.sol.

contract Groth16Verifier {
    // Scalar field size
    uint256 constant r    = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    // Base field size
    uint256 constant q   = 21888242871839275222246405745257275088696311157297823662689037894645226208583;

    // Verification Key data
    uint256 constant alphax  = 12970487602049916231594213226561756913101525061638584437468071812687855195890;
    uint256 constant alphay  = 6437178244554043350886684491674970902083296387170187005829714595153032213632;
    uint256 constant betax1  = 2761065587135721916115176645213357468229439061785505498055639899045419271468;
    uint256 constant betax2  = 21159907475466771292429540490848026713647191004749123649300052214440763552098;
    uint256 constant betay1  = 3019433502211835882616835255670243821469498797434647272049653802122139824695;
    uint256 constant betay2  = 5983193806032072521886899336072369078845641266996566564571705866055547221339;
    uint256 constant gammax1 = 11559732032986387107991004021392285783925812861821192530917403151452391805634;
    uint256 constant gammax2 = 10857046999023057135944570762232829481370756359578518086990519993285655852781;
    uint256 constant gammay1 = 4082367875863433681332203403145435568316851327593401208105741076214120093531;
    uint256 constant gammay2 = 8495653923123431417604973247489272438418190587263600148770280649306958101930;
    uint256 constant deltax1 = 4005519466311495445505135727028630259974875456361749960237564788952454656843;
    uint256 constant deltax2 = 10569720439791464935691933981197564690330834681435641910476715456693378430072;
    uint256 constant deltay1 = 2554868579671158795929324664446049292924618982250548995896297595241013211126;
    uint256 constant deltay2 = 6706855270813607379487237239727643501060546757408888690692798305629253449524;

    
    uint256 constant IC0x = 20555207520626464786899803565399743706929775329090740865494972092179166651758;
    uint256 constant IC0y = 16783574877399450033094615197589322181308549757577271082225514550589024340857;
    
    uint256 constant IC1x = 18452672548260879650891688679533770387694786278315398977819459891033547358020;
    uint256 constant IC1y = 17650146576421134034646342647133558733839172452336915253911466564468811076228;
    
    uint256 constant IC2x = 12458625984210065945465752206687331876853536860975299561811310524676114087513;
    uint256 constant IC2y = 14248172786554337307780988371742390702685307947677299109602688443794712280949;
    
    uint256 constant IC3x = 6851273485307668253734516452971204909524955439201157662382160630113902976969;
    uint256 constant IC3y = 12985210608901983652865370862854180799047155001161003797547895177453811052313;
    
    uint256 constant IC4x = 6514950103397159491287344478518160855515435499879700054393025810364341811379;
    uint256 constant IC4y = 7569235941287780614230759273925082190225212742220239463597373960947775754097;
    
    uint256 constant IC5x = 15946006805151637661005976329896114983901096044095772618539582916752961010012;
    uint256 constant IC5y = 5039699514098770994433314788259346060221985892811133057227646797937853926587;
    
 
    // Memory data
    uint16 constant pVk = 0;
    uint16 constant pPairing = 128;

    uint16 constant pLastMem = 896;

    function verifyProof(uint[2] calldata _pA, uint[2][2] calldata _pB, uint[2] calldata _pC, uint[5] calldata _pubSignals) public view returns (bool) {
        assembly {
            function checkField(v) {
                if iszero(lt(v, r)) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }
            
            // G1 function to multiply a G1 value(x,y) to value in an address
            function g1_mulAccC(pR, x, y, s) {
                let success
                let mIn := mload(0x40)
                mstore(mIn, x)
                mstore(add(mIn, 32), y)
                mstore(add(mIn, 64), s)

                success := staticcall(sub(gas(), 2000), 7, mIn, 96, mIn, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0, 0x20)
                }

                mstore(add(mIn, 64), mload(pR))
                mstore(add(mIn, 96), mload(add(pR, 32)))

                success := staticcall(sub(gas(), 2000), 6, mIn, 128, pR, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }

            function checkPairing(pA, pB, pC, pubSignals, pMem) -> isOk {
                let _pPairing := add(pMem, pPairing)
                let _pVk := add(pMem, pVk)

                mstore(_pVk, IC0x)
                mstore(add(_pVk, 32), IC0y)

                // Compute the linear combination vk_x
                
                g1_mulAccC(_pVk, IC1x, IC1y, calldataload(add(pubSignals, 0)))
                
                g1_mulAccC(_pVk, IC2x, IC2y, calldataload(add(pubSignals, 32)))
                
                g1_mulAccC(_pVk, IC3x, IC3y, calldataload(add(pubSignals, 64)))
                
                g1_mulAccC(_pVk, IC4x, IC4y, calldataload(add(pubSignals, 96)))
                
                g1_mulAccC(_pVk, IC5x, IC5y, calldataload(add(pubSignals, 128)))
                

                // -A
                mstore(_pPairing, calldataload(pA))
                mstore(add(_pPairing, 32), mod(sub(q, calldataload(add(pA, 32))), q))

                // B
                mstore(add(_pPairing, 64), calldataload(pB))
                mstore(add(_pPairing, 96), calldataload(add(pB, 32)))
                mstore(add(_pPairing, 128), calldataload(add(pB, 64)))
                mstore(add(_pPairing, 160), calldataload(add(pB, 96)))

                // alpha1
                mstore(add(_pPairing, 192), alphax)
                mstore(add(_pPairing, 224), alphay)

                // beta2
                mstore(add(_pPairing, 256), betax1)
                mstore(add(_pPairing, 288), betax2)
                mstore(add(_pPairing, 320), betay1)
                mstore(add(_pPairing, 352), betay2)

                // vk_x
                mstore(add(_pPairing, 384), mload(add(pMem, pVk)))
                mstore(add(_pPairing, 416), mload(add(pMem, add(pVk, 32))))


                // gamma2
                mstore(add(_pPairing, 448), gammax1)
                mstore(add(_pPairing, 480), gammax2)
                mstore(add(_pPairing, 512), gammay1)
                mstore(add(_pPairing, 544), gammay2)

                // C
                mstore(add(_pPairing, 576), calldataload(pC))
                mstore(add(_pPairing, 608), calldataload(add(pC, 32)))

                // delta2
                mstore(add(_pPairing, 640), deltax1)
                mstore(add(_pPairing, 672), deltax2)
                mstore(add(_pPairing, 704), deltay1)
                mstore(add(_pPairing, 736), deltay2)


                let success := staticcall(sub(gas(), 2000), 8, _pPairing, 768, _pPairing, 0x20)

                isOk := and(success, mload(_pPairing))
            }

            let pMem := mload(0x40)
            mstore(0x40, add(pMem, pLastMem))

            // Validate that all evaluations ∈ F
            
            checkField(calldataload(add(_pubSignals, 0)))
            
            checkField(calldataload(add(_pubSignals, 32)))
            
            checkField(calldataload(add(_pubSignals, 64)))
            
            checkField(calldataload(add(_pubSignals, 96)))
            
            checkField(calldataload(add(_pubSignals, 128)))
            

            // Validate all evaluations
            let isValid := checkPairing(_pA, _pB, _pC, _pubSignals, pMem)

            mstore(0, isValid)
             return(0, 0x20)
         }
     }
 }
