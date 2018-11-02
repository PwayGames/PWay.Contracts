pragma solidity ^0.4.24;
import "../NameRegistry.sol";
import '../PwayContract.sol';
import './IEthRateProvider.sol';

contract DummyProvider is PwayContract, IEthRateProvider
{

	uint256 public rate;
	NameRegistry reg;

	constructor(NameRegistry _reg, bool register) public{
		if(register)
			_reg.setAddress("EthRateProvider",address(this));
		reg = _reg;
	}

	function setRate(uint256 _rate) public  {
		rate = _rate;
	}
	
	function getETHUSDRate() view public returns(uint256){
		return rate;
	}

	function changeProvider(NameRegistry _reg,address _newProvider) onlyOwner{
		require(IEthRateProvider(_newProvider).getETHUSDRate()!=0);
		_reg.setAddress("EthRateProvider",_newProvider);
	}
}
