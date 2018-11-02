const path = require('path');
const scriptName = path.basename(__filename);
const logger = require('../utils/logger')(scriptName);

const PwayToken = artifacts.require('PwayToken');
const NameRegistry = artifacts.require('NameRegistry');
const PwayAuthority = artifacts.require('PwayAuthority');
const PwayCompany = artifacts.require('PwayCompany');
const PwayGamesStore = artifacts.require('PwayGamesStore');
const PwayGameSeller = artifacts.require('PwayGameSeller');
const DummyProvider = artifacts.require('DummyProvider');

const helper = require("./testHelper");

import { latestTime } from 'openzeppelin-solidity/test/helpers/latestTime';
import { increaseTimeTo, duration } from 'openzeppelin-solidity/test/helpers/increaseTime';
import { ether } from 'openzeppelin-solidity/test/helpers/ether';
import EVMRevert from 'openzeppelin-solidity/test/helpers/EVMRevert';

const BigNumber = web3.BigNumber;
const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();
  
  contract('PwayGameSeller tests', function (accounts) {
       var data = {};
       const RATE = new BigNumber(400);
       const DECIMAL = 10**11;
   
          beforeEach(async function () {
          
            data.nameRegistry = await NameRegistry.new();
            var dividendStartTime = await data.nameRegistry.getNow();
            dividendStartTime = dividendStartTime + duration.days(180);

              data.token = await PwayToken.new(data.nameRegistry.address, dividendStartTime);
              data.rateProvider = await DummyProvider.new(data.nameRegistry.address, true);
              data.authority = await PwayAuthority.new(data.nameRegistry.address, RATE);
              data.store = await PwayGamesStore.new(data.nameRegistry.address);
              data.company = await PwayCompany.new(data.nameRegistry.address, 1, RATE, accounts[0],accounts[1],accounts[2]);
             
              for(var i=1;i<7;i++) 
                await data.token.transfer(accounts[i], 1000*DECIMAL);

              await helper.transferOwnership(data, data.company.address);
            
              await increaseTimeTo(this.openingTime+duration.hours(5));
          });
          
          
          describe('PwayGameSeller base test', function () {
              
            it('game contract should be created', async function () {
              await data.company.addGame(1, 5*DECIMAL, 10);
              await data.company.addGame(1, 5*DECIMAL, 10, {from:accounts[1]});
              
                
                var gameAddress = await data.store.gameContracts(1);
                var seller = await PwayGameSeller.at(gameAddress);

                var code = await web3.eth.getCode(seller.address);
                code.should.not.be.equal("0x0");

                var gameId = await seller.gameId.call();
                gameId.should.be.bignumber.equal(1);

            });

            it('owner should change game price', async function () {
              await data.company.addGame(1, 5*DECIMAL, 10);
              await data.company.addGame(1, 5*DECIMAL, 10, {from:accounts[1]});
              
              
              var gameAddress = await data.store.gameContracts(1);
              var seller = await PwayGameSeller.at(gameAddress);

              await data.company.changeGamePrice(1, 2*DECIMAL);
              var price = await seller.gamePrice.call();
              price.should.be.bignumber.equal(2*DECIMAL);
           
              });
              

            it('owner should change game licences', async function () {
              await data.company.addGame(1, 5*DECIMAL, 10);
              await data.company.addGame(1, 5*DECIMAL, 10, {from:accounts[1]});
              
              var gameAddress = await data.store.gameContracts(1);
              var seller = await PwayGameSeller.at(gameAddress);

              await data.company.addLicence(1, 10);
              var licenseCount = await seller.licenseCount.call();
              licenseCount.should.be.bignumber.equal(20);
            });

            

            it('should return registerd games count', async function () {
              await data.company.addGame(1, 5*DECIMAL, 10);
              await data.company.addGame(1, 5*DECIMAL, 10, {from:accounts[1]});
              
              await data.company.addGame(2, 6*DECIMAL, 10);
              await data.company.addGame(2, 6*DECIMAL, 10, {from:accounts[1]});
              
              await data.company.addGame(3, 6*DECIMAL, 10);
              await data.company.addGame(3, 6*DECIMAL, 10, {from:accounts[1]});
           
              
              var gameCount = await data.store.getRegisteredGameCount();
              gameCount.should.be.bignumber.equal(3);
            });

            it('account could purchase game', async function () {
              await data.company.addGame(1, 5*DECIMAL, 10);
              await data.company.addGame(1, 5*DECIMAL, 10, {from:accounts[1]});
              
              var gameAddress = await data.store.gameContracts(1);
              var seller = await PwayGameSeller.at(gameAddress);
              await data.token.approve(data.store.address, 5*DECIMAL, {from:accounts[6]});
              

              await data.store.buyGame(1, {from:accounts[6]});
              var licences = await seller.getAccountLicences(accounts[6]);
              licences.length.should.be.not.equal(0);
            
            });

            it('should failed when not enought game licences', async function () {
              await data.company.addGame(1, 5*DECIMAL, 1);
              await data.company.addGame(1, 5*DECIMAL, 1, {from:accounts[1]});

              await data.token.approve(data.store.address, 5*DECIMAL, {from:accounts[6]});
              await data.token.approve(data.store.address, 5*DECIMAL, {from:accounts[5]});
              await data.store.buyGame(1, {from:accounts[6]});
              await data.store.buyGame(1, {from:accounts[5]}).should.be.rejectedWith(EVMRevert);
           
            });

            it('store should gains token from purchase', async function () {
               await data.company.addGame(1, 5*DECIMAL, 10);
              await data.company.addGame(1, 5*DECIMAL, 10, {from:accounts[1]});
              
              var gameAddress = await data.store.gameContracts(1);
              var seller = await PwayGameSeller.at(gameAddress);
              await data.token.approve(data.store.address, 5*DECIMAL, {from:accounts[6]});
              
              var storePreBalance = await data.token.balanceOf(data.store.address);

              await data.store.buyGame(1, {from:accounts[6]});

              var storePostBalance = await data.token.balanceOf(data.store.address);
              
              storePostBalance.should.be.bignumber.equal(5*DECIMAL);
            
            });

            it('account can purchase game more than once', async function () {
              await data.company.addGame(1, 5*DECIMAL, 10);
              await data.company.addGame(1, 5*DECIMAL, 10, {from:accounts[1]});
              
              await data.token.approve(data.store.address, 10*DECIMAL, {from:accounts[6]});

              await data.store.buyGame(1, {from:accounts[6]});
              await data.store.buyGame(1, { from: accounts[6] });
                var gameAddress = await data.store.gameContracts(1);
                var seller = await PwayGameSeller.at(gameAddress);
                var gamesSold = await seller.gamesSold();
                gamesSold.should.be.bignumber.equal(2);
            });

            

            it('should withdraw tokens from store to company', async function () {
              await data.company.addGame(1, 5*DECIMAL, 10);
              await data.company.addGame(1, 5*DECIMAL, 10, {from:accounts[1]});
              
              await data.token.approve(data.store.address, 10*DECIMAL, {from:accounts[6]});
              await data.store.buyGame(1, {from:accounts[6]});

              var companyPreBalance = await data.token.balanceOf(data.company.address);
              await data.store.withdraw();

              var companyPostBalance = await data.token.balanceOf(data.company.address);
              companyPostBalance.should.be.bignumber.above(companyPreBalance);

            });

            it('should failed trying to create game with id be not in sequence', async function () {
              await data.company.addGame(1, 5*DECIMAL, 10);
              await data.company.addGame(1, 5*DECIMAL, 10, {from:accounts[1]});

              await data.company.addGame(3, 5*DECIMAL, 10);
              await data.company.addGame(3, 5*DECIMAL, 10, {from:accounts[1]}).should.be.rejectedWith(EVMRevert);

            });

            it('should success trying to create game with id be in sequence', async function () {
              await data.company.addGame(1, 5*DECIMAL, 10);
              await data.company.addGame(1, 5*DECIMAL, 10, {from:accounts[1]});
              
              await data.company.addGame(2, 5*DECIMAL, 10);
              await data.company.addGame(2, 5*DECIMAL, 10, {from:accounts[1]});

              var gameAddress = await data.store.gameContracts(2);
              var seller = await PwayGameSeller.at(gameAddress);

              var code = await web3.eth.getCode(seller.address);
              code.should.not.be.equal("0x0");
            });

            it('should failed during purchase game that do not exists', async function () {
              await data.company.addGame(1, 5*DECIMAL, 10);
              await data.company.addGame(1, 5*DECIMAL, 10, {from:accounts[1]});
              
              var gameAddress = await data.store.gameContracts(1);
              var seller = await PwayGameSeller.at(gameAddress);
              await data.token.approve(data.store.address, 5*DECIMAL, {from:accounts[6]});

              await data.store.buyGame(4, {from:accounts[6]}).should.be.rejectedWith(EVMRevert);

            });

            it('should emits event after new game creation', async function () {
              await data.company.addGame(1, 5*DECIMAL, 10);
              const {logs} = await data.company.addGame(1, 5*DECIMAL, 10, {from:accounts[1]});

              const event = logs.find(e => e.event === 'OperationProcessed');
              //console.log(event);
              should.exist(event);
          
            });

            it('should emits event after game purchase', async function () {
              await data.company.addGame(1, 5*DECIMAL, 10);
              await data.company.addGame(1, 5*DECIMAL, 10, {from:accounts[1]});
              
              await data.token.approve(data.store.address, 10*DECIMAL, {from:accounts[6]});
              const {logs} = await data.store.buyGame(1, {from:accounts[6]});
             
              const event = logs.find(e => e.event === 'GamePurchased');
              //console.log(event);
              should.exist(event);
              should.exist(event.args.gameId);
            });
            
          });    
        
  });

 
  
  
  
  
  