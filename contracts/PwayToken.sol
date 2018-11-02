pragma solidity ^0.4.24;

import './DividendPayableToken.sol';
import './PwayContract.sol';
import './NameRegistry.sol';
import './PwayDelayedWithdrawWalletFactory.sol';
import 'openzeppelin-solidity/contracts/token/ERC20/ERC20.sol';

contract PwayToken is DividendPayableToken, PwayContract {
	
    string public symbol = "PWAY";
    string public name = "Pway";
    uint8 public decimals = 11;

    constructor(NameRegistry registry, uint dividendStartDate) DividendPayableToken(dividendStartDate) public {
        owner = msg.sender;
        totalSupply_ = (82000000*(uint256(10)**decimals));

        balances[msg.sender] = totalSupply_;

        registry.setAddress("PwayToken", address(this));
    }
  
    function burn(uint256 amount) public {
        require(balanceOf(msg.sender)>=amount);
        totalSupply_ = totalSupply_.sub(amount);
        balances[msg.sender] = balances[msg.sender].sub(amount);
		emit Transfer(msg.sender,address(0),amount);
    }

    function withdrawForeignTokens(address _tokenContract) onlyOwner public returns (bool) {
        require(_tokenContract != address(this));
        
        ERC20 token = ERC20(_tokenContract);
        uint256 amount = token.balanceOf(address(this));
        return token.transfer(owner, amount);
    }
  
}

