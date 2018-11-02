pragma solidity ^0.4.24;

import './PwayToken.sol';
import './NameRegistry.sol';

contract PwayDelayedWithdrawWalletFactory is PwayContract {

    NameRegistry internal registry;
    mapping(address=>address) public wallets;

    event WalletCreated(address walletAddress, address beneficiary, uint lockTime, uint tokenAmount );

    constructor(address _registry) public {
        registry = NameRegistry(_registry);
        registry.setAddress("DelayedWalletFactory", address(this));
    }

    function createWallet(address _beneficiary, uint _lockTime, uint _tokenAmount) public {
    
        require(_beneficiary!=address(0));
        PwayToken token = PwayToken(registry.getAddress("PwayToken"));
       
        require(token.balanceOf(this) >= _tokenAmount);
    
        PwayDelayedWithdrawWallet wallet = new PwayDelayedWithdrawWallet(_beneficiary, _lockTime, registry);
        wallets[_beneficiary] = address(wallet);
        
        token.transfer(wallet, _tokenAmount);

        emit WalletCreated(address(wallet), _beneficiary, _lockTime, _tokenAmount);
    }
}

contract PwayDelayedWithdrawWallet is PwayContract {
 
    NameRegistry internal registry ;
    uint256 internal withdrawTime; 

    address public beneficiary;

    function getNow() public view returns(uint256){
        return now;
    }
    
    function getWithdrawTime() public view returns(uint256){
        return withdrawTime;
    }

	function changeBeneficiary(address _ard) public onlyOwner {
        beneficiary = _ard;
		transferOwnership(beneficiary);
	}

    constructor(address _beneficiary, uint256 _lockTime,  address _registry) public {
        require(_beneficiary!=address(0));
        registry = NameRegistry(_registry);
        beneficiary = _beneficiary;
        withdrawTime = getNow() + _lockTime;
		transferOwnership(_beneficiary);
    }

    function () public {
        if (getNow()>withdrawTime ) {
            PwayToken token = PwayToken(registry.getAddress("PwayToken"));
            token.transfer(beneficiary, token.balanceOf(this));
        } else {
            revert();
        }
    }
}