pragma solidity ^0.4.24;
import './PwayContract.sol';

contract NameRegistry is PwayContract {

    event EntrySet(string entry,address adr);

    mapping(string => address) names;
  
    function hasAddress(string name) public view returns(bool) {
        return names[name] != address(0);
    }
    
    function getAddress(string name) public view returns(address) {
        require(names[name] != address(0), "Address could not be 0x0");
        return names[name];
    }

    function getNow() public view returns(uint) {
        return now;
    }
    
    function setAddress(string name, address _adr) public {
        require(_adr != address(0), "Address could not be 0x0");

        bytes memory nameBytes = bytes(name);
        require(nameBytes.length > 0, "Name could not be empty");

        bool isEmpty = names[name] == address(0);

        //can be initialized by everyone , but only change by itself
        require(isEmpty || names[name] == msg.sender);

        names[name] = _adr;
        emit EntrySet(name, names[name]);
    } 
  
}
