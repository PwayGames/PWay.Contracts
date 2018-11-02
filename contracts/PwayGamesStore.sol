pragma solidity ^0.4.24;
import "./PwayContract.sol";
import "./PwayGameSeller.sol";
import "./PwayToken.sol";
import "./NameRegistry.sol";

contract PwayGamesStore is PwayContract {

    event GameCreated(uint32 indexed gameId, uint gamePrice, uint licenseCount);
    event GamePurchased(address indexed buyer, uint32 indexed gameId, uint32 indexed gameLicenseId);

    NameRegistry registry;
    uint public numberOfUSDfor1000PWay = 1000;

    /* mapping of user to license Id */
    mapping(uint32=>address) public gameContracts;
    uint32[] public gameIds;

    constructor(NameRegistry _registry) public {
        owner = msg.sender;
        registry = _registry;

        registry.setAddress("GamesStore", address(this));
    }
    
    /*
        createGameSell contract 
        _gameId - Id from external database identifying a game
        _gamePrice - price of game in Pways
        
    */
    function createGame(uint32 _gameId, uint _gamePrice, uint32 _licenseCount) public onlyOwner {
    //because of limitations in function getAllGamesBoughtByUser(address _user)
        
        require(gameIds.length<255,"Too many games");
        require(gameContracts[_gameId]==address(0),"id is already taken");
        require(gameContracts[_gameId-1]!=address(0) || _gameId==1,"Previous Id is empty");
        
        gameIds.push(_gameId);
        PwayGameSeller seller = new PwayGameSeller(registry, _gameId, _gamePrice,_licenseCount);
        gameContracts[_gameId] = address(seller);

        emit GameCreated(_gameId,_gamePrice, _licenseCount);
    }

    function createGames(uint[] _prices, uint32[] _licenses) public onlyOwner {
        require(_prices.length == _licenses.length);

        for(uint i = 0 ;i<_prices.length; i++) {
            createGame(uint32(gameIds.length+1), _prices[i], _licenses[i]);
        }
    }
    
    function getRegisteredGameCount() public view returns(uint32){
        return uint32(gameIds.length);
    }

    function getAccountLicences(address _account, uint _page) public view returns(uint64[64]) {
        uint64[64] memory data;
        uint index = 0;
        for(uint i = _page*64; i < gameIds.length && (i < _page*64+64) ;i++) {
            uint32[] memory licences = PwayGameSeller(gameContracts[gameIds[i]]).getAccountLicences(_account);
            for(uint j = 0; j < licences.length; j++) {
                uint64 val =  uint64((i+1)*2**32) | uint64(licences[j]);
                data[index] = val;
                index++;
            }
        }

        return data;
    }
    
    function buyGame(uint32 _gameId) public{
        PwayGameSeller seller = PwayGameSeller(gameContracts[_gameId]);
        PwayToken token = PwayToken(registry.getAddress("PwayToken"));

        uint gamePrice = seller.gamePrice()*1000/numberOfUSDfor1000PWay;
        require(token.allowance(msg.sender, address(this)) >= gamePrice);

        uint32 gameLicenseId = seller.purchaseGame(msg.sender);
        require(token.transferFrom(msg.sender, address(this), gamePrice));

        emit GamePurchased(msg.sender,_gameId,gameLicenseId);
    }
    
    function changePwayRate(uint32 _pwayRate) onlyOwner public{
        require(_pwayRate>0);
        numberOfUSDfor1000PWay = _pwayRate;
    }

    function changePrice(uint32 _gameId,uint _price) onlyOwner public{
        PwayGameSeller(gameContracts[_gameId]).changePrice(_price);
    }
    
    function getPrice(uint32 _gameId) view public returns(uint256){
        return (PwayGameSeller(gameContracts[_gameId]).gamePrice()*1000/numberOfUSDfor1000PWay);
    }
	
    function getPriceInUSD(uint32 _gameId) view public returns(uint256){
        return (PwayGameSeller(gameContracts[_gameId]).gamePrice());
    }

    function addLicence(uint32 _gameId,uint _amount) onlyOwner public{
        PwayGameSeller(gameContracts[_gameId]).addLicence(_amount);
    }
	
    function withdraw() public{   
        PwayToken token = PwayToken(registry.getAddress("PwayToken"));
        address company = registry.getAddress("PwayCompany");
        uint balance = token.balanceOf(address(this));

        uint dividend = balance*30/100;
        token.transfer(address(token),dividend);//30% as a dividend
        token.transfer(address(company),balance-dividend);//70% for company
    }
}