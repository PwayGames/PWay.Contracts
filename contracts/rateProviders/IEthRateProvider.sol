pragma solidity ^0.4.24;
import "./../NameRegistry.sol";
interface IEthRateProvider
{
	
	function getETHUSDRate() view public returns(uint256);
	function changeProvider(NameRegistry _reg,address _newProvider) ;
}
