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
// by `snarkjs zkey export solidityverifier` from prover/build/judges_membership_v2_final.zkey --
// the Redesign B circuit's MVP-only, single-contributor local trusted setup documented in
// prover/README.md and prover/scripts/trusted_setup_v2.sh. The verification key is baked into
// this contract as constants, so it is committed here (unlike every other prover/build/*
// artifact, which is gitignored and freely regeneratable) -- a different trusted-setup run
// produces a DIFFERENT, INCOMPATIBLE verifier, so regenerating the setup means re-running
// prover's v2 export step and replacing this file, invalidating any previously generated proofs.
// Do not hand-edit the constants or assembly below.
contract Groth16Verifier {
    // Scalar field size
    uint256 constant r    = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    // Base field size
    uint256 constant q   = 21888242871839275222246405745257275088696311157297823662689037894645226208583;

    // Verification Key data
    uint256 constant alphax  = 8393023639612398410126545784010513167682522470139960746162953691658974203709;
    uint256 constant alphay  = 12428211314791108910399634050928359689301574546391228576086922957379452970935;
    uint256 constant betax1  = 6512026570075887175031361955808870213728717914454451040578945065461851153305;
    uint256 constant betax2  = 8776256095142637369696667689282874580497528925781718211096322287066843675098;
    uint256 constant betay1  = 16320528357214535846204264648347182684979598989186331049515370021366241607027;
    uint256 constant betay2  = 15341742940188265393703698139015721301913717479307026601666481116088219894238;
    uint256 constant gammax1 = 11559732032986387107991004021392285783925812861821192530917403151452391805634;
    uint256 constant gammax2 = 10857046999023057135944570762232829481370756359578518086990519993285655852781;
    uint256 constant gammay1 = 4082367875863433681332203403145435568316851327593401208105741076214120093531;
    uint256 constant gammay2 = 8495653923123431417604973247489272438418190587263600148770280649306958101930;
    uint256 constant deltax1 = 882344548472654661414173521520161633659104218263448056875930206598853572455;
    uint256 constant deltax2 = 798671762492731754157342979713172200741186192655752421043827078041331657310;
    uint256 constant deltay1 = 4979083702764069072559639965664964888777158314932536766406071053031444452600;
    uint256 constant deltay2 = 13662756157076728029373655909897967925648640882968603784259340147076253849480;

    
    uint256 constant IC0x = 503573454899333534857672875308709589174428613363095320306662263615658808236;
    uint256 constant IC0y = 12742025485853432409792255934325791323874866657099987744088337556391661452002;
    
    uint256 constant IC1x = 15215234823582898898176413529193722831338461334531873442586012912479115659079;
    uint256 constant IC1y = 19756203395475765906246461724058032086467563520721936238433702237553236921824;
    
    uint256 constant IC2x = 10533193926234572273089787841538158018544827879914285047160992118341473304972;
    uint256 constant IC2y = 7078880203760286635462149514793639478935789787633927740314225430090862579395;
    
    uint256 constant IC3x = 2242820888511778343262186194750328470927740733018791779020155355808161399027;
    uint256 constant IC3y = 11860068729056216829337298817697682453532469165674480288214423037056682571681;
    
    uint256 constant IC4x = 11401108157193532415280999257220886470075494418084359799601272019004618976270;
    uint256 constant IC4y = 313187066892209770503730086805348221495163148167258995426765376246154333769;
    
    uint256 constant IC5x = 3615327946901418661863089974164555148355771261871849828658696966728118744329;
    uint256 constant IC5y = 16761737537161916643428226909931506141872837291240536189158732610267070050796;
    
 
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
