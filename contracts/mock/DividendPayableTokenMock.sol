pragma solidity ^0.4.24;

import './../PwayToken.sol';
import "../NameRegistry.sol";

contract DividendPayableTokenMock is PwayToken {

    event NewTime(uint32 time);

	mapping(address=>bool) public excludedAccounts ;
    
    address public a1;

    constructor(address adr1,address adr2, address adr3, uint256 baseAmount, NameRegistry registry) PwayToken(registry, now) public {
     //   
        balances[adr1] = baseAmount*97;
        balances[adr2] =baseAmount*2;
        balances[adr3] = baseAmount;

        totalSupply_ = 100*baseAmount;

        a1=adr1;
    }
 
    
  uint32 public _now ;
  
  function getNow() public constant returns(uint256){
      return uint256(_now);
  }
    
  function setNow(uint32 _n) public{
      _now = _n;
      emit NewTime(_now);
  }
    
  function addToNow(uint32 _n) public{
      _now = _now+_n;
      emit NewTime(_now);
  }
  
  function processDividend(address to) internal{
    super.processDividend(to);
  }
  
  function getDividendSum() public constant returns (uint256) {
    return balanceOf(address(this));
  }

   //to avoid many tiny transfers with significant gas costs
  function getMinimumAmountOfDividend() public constant returns(uint256){
	  return 1;
  }
}
