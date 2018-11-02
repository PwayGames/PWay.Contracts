pragma solidity ^0.4.24;
import 'openzeppelin-solidity/contracts/math/SafeMath.sol';
import './PwayBaseCrowdsale.sol';

/**
 * @title PwayTimeCrowdsale
 * @notice Restrict crowdsale to given opening and closing time
 */

contract PwayTimeCrowdsale is PwayBaseCrowdsale {
    // Library for math calculations, prvents overflows, uses for uint256 types
    using SafeMath for uint256;
    
    // Crowdsale opening time
    uint256 public openingTime;
    
    // Crowdsale closing time
    uint256 public closingTime;

    /**
   * @dev Constructor, takes crowdsale opening and closing times.
   * @param _openingTime Crowdsale opening time
   * @param _closingTime Crowdsale closing time
   */
    constructor(uint256 _openingTime, uint256 _closingTime) public {
        require(_openingTime >= now );
        require(_closingTime >= _openingTime);

        openingTime = _openingTime;
        closingTime = _closingTime;
    }

    function hasClosed() public view returns (bool) {
        return now > closingTime;
    }

    function _preValidatePurchase(address _beneficiary, uint256 _weiAmount) internal  {
        require(now >= openingTime && now <= closingTime);
        super._preValidatePurchase(_beneficiary, _weiAmount);
    }

    function updateClosingTime(uint256 _closingTime) public onlyOwner {
        closingTime = _closingTime;
    }
}
