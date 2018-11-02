pragma solidity ^0.4.24;

contract SignatureVerifier {
    function recoverAddr(bytes32 msgHash, uint8 v, bytes32 r, bytes32 s) public pure returns (address) {
        return ecrecover(msgHash, v, r, s);
    }

    function isSigned(address _addr, bytes32 msgHash, uint8 v, bytes32 r, bytes32 s) public pure returns (bool) {
        return ecrecover(msgHash, v, r, s) == _addr;
    }
    
    function getHash(string message) public pure returns(bytes32){
        return keccak256(abi.encodePacked(message));
    }
}