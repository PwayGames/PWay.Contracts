pragma solidity ^0.4.24;
import "./../NameRegistry.sol";
import './../PwayContract.sol';
import './IEthRateProvider.sol';
interface IDex{
	function getBuyAmount(address buy_gem, address pay_gem, uint256 pay_amt) returns (uint256);
}

contract OasisDexProvider is PwayContract, IEthRateProvider
{

	address public dex;//0x14FBCA95be7e99C15Cc2996c6C9d841e54B79425  
	address public dai;//0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359  
	address public weth;//0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2

	
	NameRegistry reg;

	constructor(NameRegistry _reg,address dexAddress,address daiTokenAddress,address wethAddress){
		reg = _reg;	
		_reg.setAddress("EthRateProvider",address(this));
		dex=dexAddress;
		dai=daiTokenAddress;
		weth=wethAddress;
	}
	
	function getETHUSDRate() view public returns(uint256){
		return IDex(dex).getBuyAmount(dai,weth,1);
	}

	function changeProvider(NameRegistry _reg,address _newProvider) onlyOwner{
		require(IEthRateProvider(_newProvider).getETHUSDRate()!=0);
		_reg.setAddress("EthRateProvider",_newProvider);
	}
}
