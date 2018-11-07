pragma solidity ^0.4.24;
import 'openzeppelin-solidity/contracts/token/ERC20/MintableToken.sol';


contract DividendInfoContract is Ownable {
    mapping(address=>bool) public userPaid;
    
    function setDividendPayed(address user) public onlyOwner{
        userPaid[user] = true;
    }

	function isPaid(address user) public returns(bool){
		return  userPaid[user] ;
	}

    function  kill() public onlyOwner{
        selfdestruct(owner);
    } 
}

contract DividendPayableToken is StandardToken, Ownable {

    event ProcessingDiv(uint32 period,uint256 gas);
    event AdditionalDividend(uint256 valueAdded,uint256 totalSum);
    event Debug(uint256 holded,uint256 toBePaid,uint256 totalDivAmount, uint256 totalAmount);
    event DividendPayed(address to,uint256 amount);
    
    DividendInfoContract internal userSums;
    uint256 public lastDividendTime ;
	
	uint256 public constant FACTOR_BASE = 10**20;
	uint256 public FACTOR = 0;

     function internalTransfer(address to,uint256 value) internal returns(bool){
	
        require(balanceOf(address(this))>=value);
    
		balances[address(this)] = balances[address(this)] - value;
        balances[to] = balances[to] + value;
        emit Transfer(address(this),to,value);
		
        return true;
    }

	function timeLeftToNextDividend() public view returns(uint256){
		if(getNow() - lastDividendTime>90 days){
			return 0;
		}else{
			return (90 days)-(getNow() - lastDividendTime);
		}
	}
        
    function getNow() public view returns(uint256){
        return now;
    }
    
    constructor(uint dividendStartDate) public{
        userSums = new DividendInfoContract();
        lastDividendTime = dividendStartDate ;//getNow()+180 days;
    }

	function startNewDividendPeriod() public{
        require(getNow() - lastDividendTime > 90 days);

        uint tokenBalance = balanceOf(address(this)); 
        lastDividendTime = getNow();
        clearDividends();

        FACTOR = FACTOR_BASE*tokenBalance/(totalSupply()-tokenBalance);
	}
    
    function clearDividends() internal{
        userSums.kill();
        userSums = new DividendInfoContract();
        emit AdditionalDividend(balances[address(this)],balances[address(this)]);
    }
    
    function processDividend(address to) internal  {
        if(userSums.isPaid(to) == false){
            uint256 tokensHolded = balanceOf(to);
            uint256 amountToPay = tokensHolded*(FACTOR)/FACTOR_BASE;
            if(amountToPay > 0 && internalTransfer(to,amountToPay)) {
                emit DividendPayed(to,amountToPay);
            }

            userSums.setDividendPayed(to);
		}
    }
    
    function getAmountToPay(address adr) public view returns(uint256) {
        if(userSums.isPaid(adr) == true){
            return 0;
		}
        uint256 tokensHolded = balanceOf(adr);
        uint256 amountToPay = tokensHolded*(FACTOR)/FACTOR_BASE;
        return amountToPay;
    }
        
    function transfer(address to,uint256 _value) public returns(bool){
        if(address(this)!=to){
			processDividend(msg.sender);
			processDividend(to);
        }
        return super.transfer(to,_value);
    }
    
    function transferFrom(address _from, address _to, uint256 _value) public returns (bool) {
    
        if(_to!=address(this)){
			processDividend(msg.sender);
            processDividend(_from);
            processDividend(_to);
        }
        return super.transferFrom(_from, _to, _value);
    }
}