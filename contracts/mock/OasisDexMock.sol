pragma solidity ^0.4.24;
import "./../NameRegistry.sol";
import './../PwayContract.sol';
interface IDex{
	function getBuyAmount(address buy_gem, address pay_gem, uint256 pay_amt) returns (uint256);
}

contract OasisDexMock
{
	uint256 public rate;
	NameRegistry reg;

	constructor(NameRegistry _reg) public{
		reg = _reg;
	}

	function setRate(uint256 _rate) public {
		rate = _rate;
	}
	
	function get1000ETHUSDRate() view public returns(uint256){
		return rate;
	}

	function getBuyAmount(address buy_gem, address pay_gem, uint256 pay_amt) returns (uint256){
		if(buy_gem==address(0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359) && pay_gem==address(0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2))
			return rate;
		else
			return 0;
	}

}
