pragma solidity ^0.4.24;

import './PwayContract.sol';
import './PwayToken.sol';
import './PwayAuthority.sol';
import './NameRegistry.sol';
import 'openzeppelin-solidity/contracts/math/SafeMath.sol';
import 'openzeppelin-solidity/contracts/ownership/Ownable.sol';

/**
 * @title Crowdsale
 * @dev Crowdsale is a base contract for managing a token crowdsale,
 * allowing investors to purchase tokens with ether. This contract implements
 * such functionality in its most fundamental form and can be extended to provide additional
 * functionality and/or custom behavior.
 * The external interface represents the basic interface for purchasing tokens, and conform
 * the base architecture for crowdsales. They are *not* intended to be modified / overriden.
 * The internal interface conforms the extensible and modifiable surface of crowdsales. Override 
 * the methods to add functionality. Consider using 'super' where appropiate to concatenate
 * behavior.
 */

contract PwayBaseCrowdsale is Ownable, PwayContract {
    // Library for math calculations, prvents overflows, uses for uint256 types
    using SafeMath for uint256;

    // The token being sold
    PwayToken public token;

    // The contract provides address to other contracts
    NameRegistry public registry;

    // How many token units a buyer gets per wei
    uint256 public rate;

    // Amount of wei raised
    uint256 public weiRaised;

    // sum of each account contributions in wei
    mapping(address=>uint) public contributions;

    // operator address
    address public operator;

    // minimal investment that can be made from address
    uint256  public minInvestment;

    //maximal investment that can be made from address
    uint256  public maxInvestment;

    // allow access only for owner or operator
    modifier onlyOperatorOrOwner {
        if(msg.sender == operator || msg.sender == owner){
            _;
        }
        else{
            revert();
        }
    }

    /**
    * @param _rate Number of token units a buyer gets per wei
    * @param _nameRegistry provides address to other contracts
    * @param _minInvestment minimal investment that can be made from individual address
    * @param _maxInvestment maximal investment that can be made from individual address
    * @param _operator operator address
    */
    constructor(uint256 _rate, NameRegistry _nameRegistry, uint256 _minInvestment, uint256 _maxInvestment, address _operator) public {
        require(_rate > 0);
        require(_operator != address(0));
        require(_maxInvestment > _minInvestment);

        rate = _rate;
        registry = _nameRegistry;

        token = PwayToken(_nameRegistry.getAddress("PwayToken"));

        minInvestment = _minInvestment;
        maxInvestment = _maxInvestment;
        operator = _operator;
    }

    /**
    * @dev fallback function ***DO NOT OVERRIDE***
    */
    function () external payable {
        buyTokens(msg.sender);
    }

    /**
    * @notice abstract function calling in fallback.
    * @param _beneficiary Address performing the token purchase
    */
    function buyTokens(address _beneficiary) public payable ;
   
    /**
    * @dev Validation of an incoming purchase. Use require statemens to revert state when conditions are not met. Use super to concatenate validations.
    * @param _beneficiary Address performing the token purchase
    * @param _weiAmount Value in wei involved in the purchase
    */
    function _preValidatePurchase(address _beneficiary, uint256 _weiAmount) internal {
        require(_beneficiary != address(0));
        require(_weiAmount >= minInvestment);
        require(contributions[msg.sender].add(_weiAmount) <= maxInvestment);
    }

    /**
    * @dev Override to extend the way in which ether is converted to tokens.
    * @param _weiAmount Value in wei to be converted into tokens
    * @return Number of tokens that can be purchased with the specified _weiAmount
    */
    function _getTokenAmount(uint256 _weiAmount) internal view returns (uint256) {
        return _weiAmount.mul(rate).div(uint256(10)**(18-token.decimals()));
    }

    /**
    * @notice set minimal and maximal investments range, allowed only for operator or contract owner.
    * @param _minInvestment minimal investment that can be made from individual address
    * @param _maxInvestment maximal investment that can be made from individual address
    */
    function setInvestmentRange(uint256 _minInvestment, uint256 _maxInvestment) onlyOperatorOrOwner public  {
        maxInvestment = _maxInvestment;
        minInvestment = _minInvestment;
    }

    /**
    * @notice change the constract operator address allowed only by contract owner.
    * @param _operator operator address
    */
    function changeOperator(address _operator) onlyOwner public {
        require(_operator != address(0x0));
        operator = _operator;
    }

}
