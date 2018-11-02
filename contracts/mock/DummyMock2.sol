pragma solidity ^0.4.24;
import './../NameRegistry.sol';

contract DummyMock2 {

  NameRegistry r;
  string nameToChange;
  constructor(NameRegistry _r, string _n) public {
    r = _r;
    nameToChange = _n;
  }
  
  function ChangeRegistry(address newAddr) public{
      r.setAddress(nameToChange,newAddr);
  }
}
