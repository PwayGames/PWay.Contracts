pragma solidity ^0.4.24;

import './PwayTimeCrowdsale.sol';
import './PwayToken.sol';
import 'openzeppelin-solidity/contracts/math/SafeMath.sol';

/**
 * @title Crowdsale with investros acceptance
 */

contract PwayKYCCrowdsale is PwayTimeCrowdsale {
    using SafeMath for uint256;

    mapping(address=>uint) public kycLockedTransfers; 
    mapping(address=>bool) public whitelist;

    uint256 private lockedTokens = 0; 
    bool public isFinalized = false;

    uint256 public PRIVATE_SALE_MAX_CAP ;
    uint256 public privateSaleAmount = 0;

    event TokenLocked(address indexed beneficiary, uint256 tokens, uint256 weiAmount);
    event TokenPurchase(address indexed beneficiary, uint256 tokens, uint256 weiAmount);
    event TokenReleased(address indexed beneficiary, uint256 value, uint256 amount);
    event Finalized();

    /**
    * @param _rate Number of token units a buyer gets per wei
    */
    constructor(
        uint256 _rate, 
        NameRegistry _nameRegistry, 
        uint256 _openingTime, 
        uint256 _closingTime,
        uint256 _minInvestment, 
        uint256 _maxInvestment, 
        address _operator
      )   PwayTimeCrowdsale(_openingTime,_closingTime) 
        PwayBaseCrowdsale(_rate, 
                    _nameRegistry,
                    _minInvestment,
                    _maxInvestment, 
                    _operator) public {

        registry.setAddress("Crowdsale", address(this));

        PRIVATE_SALE_MAX_CAP = uint256(6000000) * uint256(10)**(token.decimals());

    }

    function buyTokens(address _beneficiary) public payable { //89340 gas cost
        uint256 weiAmount = msg.value;

        _preValidatePurchase(_beneficiary, weiAmount);
        
        uint256 tokens = _getTokenAmount(weiAmount);
        uint256 tokenBalance = token.balanceOf(address(this));

        //revert if no enough tokens in balance
        tokenBalance.sub(lockedTokens).sub(tokens);
        contributions[msg.sender] = contributions[msg.sender].add(weiAmount);

        if (whitelist[_beneficiary]) {
            tranferTokens(_beneficiary, tokens, weiAmount);
        }
        else {
            kycLockedTransfers[_beneficiary] += weiAmount;
            lockedTokens += tokens;
            emit TokenLocked(msg.sender, tokens, weiAmount);
        }
    }

    function privateSale(address _beneficiary, uint _tokenAmount) public onlyOperatorOrOwner {
        require(_beneficiary != address(0), "Beneficiary address 0x0 could not be 0");
        require(PRIVATE_SALE_MAX_CAP >= _tokenAmount + privateSaleAmount, "Private sale reach a cap.");

        uint256 tokenBalance = token.balanceOf(address(this));
        require(tokenBalance >= _tokenAmount, "Not enough tokens");

        token.transfer(_beneficiary, _tokenAmount);
        whitelist[_beneficiary] = true;

        privateSaleAmount += _tokenAmount;

        emit TokenPurchase(_beneficiary, _tokenAmount, 0);
    }

	function processInBulk(address[] _beneficiaries, bool _isAccepted) public onlyOperatorOrOwner{
		uint256 len = _beneficiaries.length;
		for(uint256 idx = 0;idx<len; idx++){
			processKYC(_beneficiaries[idx], _isAccepted);
		}
	}

    function processKYC(address _beneficiary, bool _isAccepted) public onlyOperatorOrOwner { // cost 137147 gas
        uint256 weiToConvert = kycLockedTransfers[_beneficiary];
        require(weiToConvert != 0);
        
        uint256 tokensToRelease = _getTokenAmount(weiToConvert);

        lockedTokens = lockedTokens.sub(tokensToRelease);
        kycLockedTransfers[_beneficiary] = 0;

        if(_isAccepted) {
            whitelist[_beneficiary] = true;
            tranferTokens(_beneficiary, tokensToRelease, weiToConvert);
        }
        else {
            if(hasClosed()){
				token.burn(tokensToRelease);
			}
            contributions[_beneficiary] = contributions[_beneficiary].sub(weiToConvert);
            _beneficiary.transfer(weiToConvert);
            
            emit TokenReleased(_beneficiary, weiToConvert, tokensToRelease);
        }
    }

    function tranferTokens(address _beneficiary, uint256 _tokensToRelease, uint256 _weiAmount) internal {
        PwayAuthority wallet = PwayAuthority(registry.getAddress("Authority"));
		
        require(token.transfer(_beneficiary, _tokensToRelease));
        wallet.deposit.value(_weiAmount)(_beneficiary);
        weiRaised += _weiAmount;
        emit TokenPurchase(_beneficiary, _tokensToRelease, _weiAmount);
    }

    function finalize() public {
        require(hasClosed(), "ICO is not closed");
        require(isFinalized == false, "ICO has been finalized");

        PwayAuthority wallet = PwayAuthority(registry.getAddress("Authority"));
        uint256 balance = token.balanceOf(address(this)).sub(lockedTokens);
        token.burn(balance);
        wallet.startWithdraw();
        
        isFinalized = true;
        emit Finalized();
    }
}
