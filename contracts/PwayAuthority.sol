pragma solidity ^0.4.24;
import './PwayContract.sol';
import './PwayToken.sol';
import './NameRegistry.sol';
import 'openzeppelin-solidity/contracts/math/SafeMath.sol';
import 'openzeppelin-solidity/contracts/ownership/Ownable.sol';

contract PwayAuthority is Ownable,PwayContract {
    using SafeMath for uint256;

    event Withdrawn(address investor, uint256 tokenAmount, uint256 ethAmount, uint8 percent);
    event TeamWithdrawn(address team, uint256 amount, uint8 percent);
    event Deposited(address investor, uint256 amount);

    uint32 public totalInvestors = 0;
    uint8 public currentWithdrawPercent = 100;
    uint8 internal lastWithdrawPercent = 100;
    uint public totalAmount = 0 ;//should be named refundBaseSum
    uint256 public saleRate = 0;

    uint256 public DIGITS_MULTIPLAYER ; 
    uint public withdrawStartTime = 0; 

    mapping(address=>uint) public investors;
    
    PwayToken token ; 
    NameRegistry registry;

    uint32 public constant DECREASE_PERCENT_INTERVAL = 3600*24*30 ;// 30 days
    uint32 public constant DECREASE_PERCENT = 10; // 10 percent 
    uint32 public constant LOCK_TIME =  DECREASE_PERCENT_INTERVAL*2; //lock withdraw for 60 days 

    modifier onlyManager() {
        address authorityManager = registry.getAddress("Crowdsale");
        require(authorityManager == msg.sender);
        _;
      
    }

    modifier allowWithdraw() {
        require(withdrawStartTime > 0);
        _;
    }

    constructor(NameRegistry _registry, uint rate) public {
        require(_registry.getAddress("PwayToken")!=address(0));

        registry = _registry;
        token = PwayToken(_registry.getAddress("PwayToken"));
        DIGITS_MULTIPLAYER = uint256(10)**(18-token.decimals());
        saleRate = rate;

        _registry.setAddress("Authority", address(this));
    }
    
    function deposit(address _investor) payable onlyManager public  {
        require(msg.value > 0);
        //we know he invested from his token balance
        if (investors[_investor] == 0) {
            totalInvestors++;
        }

        investors[_investor] = investors[_investor] + msg.value;
        totalAmount =  totalAmount+msg.value;
        emit Deposited(_investor, msg.value);
    }
    /*
        functions that allows participants of ICO to get back their money in exchange for tokens they bought
        directly on ICO
            
    */
    function withdraw() allowWithdraw public {
        
        address _investor = msg.sender;
        require(investors[_investor] > 0);

        calculatePercent();
        
        uint256 tokenAllowance = token.allowance(msg.sender,this);
        uint256 boughtTokens = investors[_investor].mul(saleRate).div(DIGITS_MULTIPLAYER);
        uint256 realTokenBalance = token.balanceOf(_investor);
        
        if(tokenAllowance>boughtTokens){
            tokenAllowance = boughtTokens;
        }
        
        if(tokenAllowance>realTokenBalance){
            tokenAllowance = realTokenBalance;
        }
        //only currentWithdrawPercent of tokens can be refunded
        //rest stays on account of caller
        
        uint256 tokenToTake = tokenAllowance.mul(currentWithdrawPercent).div(100);
        uint256 amountOfEthToReturn = tokenToTake.div(saleRate).mul(DIGITS_MULTIPLAYER);

		_investor.transfer(amountOfEthToReturn);
		totalAmount = totalAmount.sub(amountOfEthToReturn.mul(100).div(currentWithdrawPercent));
			//tokens without coverage in money are burned
		

		token.transferFrom(_investor, address(this), tokenToTake);
		token.burn(tokenToTake);
		
        
        investors[_investor] = investors[_investor] - amountOfEthToReturn;
        emit Withdrawn(_investor, tokenAllowance, amountOfEthToReturn, currentWithdrawPercent);
        
    }
    
    function getNow() public constant returns(uint256){
        return now;
    }

    function() public  {
        require(withdrawStartTime > 0);
        require(withdrawStartTime + LOCK_TIME < getNow());

        calculatePercent();
        require(lastWithdrawPercent >= currentWithdrawPercent);

        lastWithdrawPercent = currentWithdrawPercent;

        uint256 sumThatShouldStay = totalAmount.mul(uint256(currentWithdrawPercent)).div(uint256(100));
        
        if (address(this).balance > sumThatShouldStay ) {
            uint256 withdrawAmount = address(this).balance - sumThatShouldStay;
            
            address pwayCompany = registry.getAddress("PwayCompany");
            pwayCompany.transfer(withdrawAmount);
            emit TeamWithdrawn(pwayCompany, withdrawAmount, currentWithdrawPercent);
        }
    }

    function startWithdraw() public onlyManager {
        withdrawStartTime = getNow();
    } 

    function calculatePercent() internal {
        if (withdrawStartTime + LOCK_TIME < getNow()) {
            uint256 percent = uint256((getNow() - withdrawStartTime - LOCK_TIME).mul(uint256(DECREASE_PERCENT)).div(uint256(DECREASE_PERCENT_INTERVAL)))  ;
            if (percent<100)
                currentWithdrawPercent = 100-uint8(percent);
            else
                currentWithdrawPercent = 0;
        }
        else{
            currentWithdrawPercent = 100;// for first two months we return 100%
        }
    }

    function getBoughtTokensAmount() public view returns(uint) {
        return investors[msg.sender].mul(saleRate);
    }

}