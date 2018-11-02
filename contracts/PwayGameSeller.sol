pragma solidity ^0.4.24;
import './PwayContract.sol';
import './PwayToken.sol';
import './NameRegistry.sol';
import 'openzeppelin-solidity/contracts/math/SafeMath.sol';

contract PwayGameSeller is PwayContract {
	
	event MultilicenseNeeded(uint256 i,uint32 gameId,bytes32 hash,uint32 licenseNumber);

    NameRegistry registry;
    uint public gamePrice ;//GAME Price In USD
    uint32 public licenseCount;
    uint32 public gamesSold;
    uint32 public gameId;

	modifier onlyStore() {
		require(address(registry) != address(0));
		require(msg.sender == registry.getAddress("GamesStore"));
		_;
	}

    /* mapping of user to license Id */
    mapping(address=>uint32[]) public gameOwners;

    constructor(NameRegistry _registry, uint32 _gameId, uint _gamePrice, uint32 _licenseCount) public {
        registry = _registry;
        gameId = _gameId;
        licenseCount = _licenseCount;
        gamesSold = 0;
        gamePrice = _gamePrice;
    }

    function changePrice(uint _gamePrice) public onlyStore {
        gamePrice = _gamePrice;
    }

	function getAccountLicences(address _usr) view public returns (uint32[]) {
		return gameOwners[_usr];
	}

    function addLicence(uint _amount) public onlyStore {
		require (licenseCount + uint32(_amount) > licenseCount);
        licenseCount = licenseCount + uint32(_amount);
    }

    function purchaseGame(address buyer) public onlyStore  returns (uint32){
        require(gamesSold<licenseCount);
		gamesSold = gamesSold+1;
		gameOwners[buyer].push(gamesSold);
		return gamesSold;
    }
}