// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IVerifier} from "./IVerifier.sol";

/// @title LateNightPass
/// @notice Age-gated festival pass: claim only via valid Noir proof. Policy fixed by circuit/contract.
/// @dev current_day derived from block.timestamp by contract; claimer derived from msg.sender; public inputs built by contract.
///      Verification required before recording any state; one pass per address; nullifier replay protected.
contract LateNightPass {
    IVerifier public immutable verifier;
    
    mapping(bytes32 => bool) public nullifierUsed;
    mapping(address => bool) public hasPass;
    
    event PassClaimed(address indexed claimer, bytes32 indexed nullifier);
    
    constructor(address _verifier) {
        verifier = IVerifier(_verifier);
    }
    
    function claim(bytes calldata proof, bytes32 nullifier) external {
        // Revert if nullifier used or hasPass[msg.sender]
        require(!nullifierUsed[nullifier], "Nullifier already used");
        require(!hasPass[msg.sender], "Already has pass");
        
        // Build publicInputs itself: current_day = block.timestamp / 1 days, claimer = uint160(msg.sender), nullifier
        uint32 current_day = uint32(block.timestamp / 1 days);
        bytes32 claimer = bytes32(uint256(uint160(msg.sender)));
        
        bytes32[] memory publicInputs = new bytes32[](3);
        publicInputs[0] = bytes32(uint256(current_day));
        publicInputs[1] = claimer;
        publicInputs[2] = nullifier;
        
        // Call verifier; revert on false BEFORE recording
        bool ok = verifier.verify(proof, publicInputs);
        require(ok, "Invalid proof");
        
        // Record
        nullifierUsed[nullifier] = true;
        hasPass[msg.sender] = true;
        emit PassClaimed(msg.sender, nullifier);
    }
}
// No owner, no other grant path.
