const PwayToken = artifacts.require('PwayToken');
const NameRegistry = artifacts.require('NameRegistry');
const PwayAuthority = artifacts.require('PwayAuthority');
const PwayCompany = artifacts.require('PwayCompany');
const DummyProvider = artifacts.require('DummyProvider');
const PwayKYCCrowdsale = artifacts.require('PwayKYCCrowdsale');
const PwayDelayedWithdrawWalletFactory = artifacts.require('PwayDelayedWithdrawWalletFactory');
const PwayGamesStore = artifacts.require('PwayGamesStore');
const PwayGameSeller = artifacts.require('PwayGameSeller');


import { latestTime } from 'openzeppelin-solidity/test/helpers/latestTime';
import { increaseTimeTo, duration } from 'openzeppelin-solidity/test/helpers/increaseTime';
import { ether } from 'openzeppelin-solidity/test/helpers/ether';
import EVMRevert from 'openzeppelin-solidity/test/helpers/EVMRevert';
const helper = require("./testHelper");
const BigNumber = web3.BigNumber;
const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();
  
  contract('PwayGameSeller tests', function (accounts) {
       var data = {};
       const RATE = new BigNumber(400);
       const DECIMAL_TOKEN_DIFFERENCE = new BigNumber(10000000);
   
          beforeEach(async function () {

            data.nameRegistry = await NameRegistry.new();
            var dividendStartTime = await data.nameRegistry.getNow();
            dividendStartTime = dividendStartTime + duration.days(180);

            data.token = await PwayToken.new(data.nameRegistry.address, dividendStartTime);
            data.rateProvider = await DummyProvider.new(data.nameRegistry.address, true);
            data.authority = await PwayAuthority.new(data.nameRegistry.address, RATE);
            data.walletFactory = await PwayDelayedWithdrawWalletFactory.new(data.nameRegistry.address);
            data.company = await PwayCompany.new(data.nameRegistry.address, 1, RATE, accounts[0],accounts[1],accounts[2]);
            data.store = await PwayGamesStore.new(data.nameRegistry.address);

            
            this.openingTime = (await latestTime()) + duration.seconds(5);
            this.closingTime = this.openingTime + duration.years(1);
            this.minInvestment = web3.toWei(1,'finney');
            this.maxInvestment = web3.toWei(2,'ether');
            this.sumInvested = this.maxInvestment ;
            data.crowdsale = await PwayKYCCrowdsale.new(RATE, data.nameRegistry.address,
              this.openingTime,this.closingTime,
              this.minInvestment, this.maxInvestment, accounts[1]);

              await increaseTimeTo(this.openingTime+duration.hours(1));

            await helper.distributeTokens(data, accounts);
            await helper.transferOwnership(data, data.company.address);

           
                
          });
          
          
          describe('PwayGameSeller base test', function () {
            it('changePrice method should not be accessible ', async function () {
                await data.company.addGame(1, 5, 10);
                await data.company.addGame(1, 5, 10, {from:accounts[1]});
                
                var gameAddress = await data.store.gameContracts(1);
                var seller = await PwayGameSeller.at(gameAddress);

                await seller.changePrice(10, {from:accounts[6]}).should.be.rejectedWith(EVMRevert);
               
            });

            it('addLicence method should not be accessible ', async function () {
              await data.company.addGame(1, 5, 10);
              await data.company.addGame(1, 5, 10, {from:accounts[1]});
              
              var gameAddress = await data.store.gameContracts(1);
              var seller = await PwayGameSeller.at(gameAddress);
              await seller.addLicence(10, {from:accounts[6]}).should.be.rejectedWith(EVMRevert);

          });

          it('purchaseGame(address) method should not be accessible ', async function () {
            await data.company.addGame(1, 5, 10);
            await data.company.addGame(1, 5, 10, {from:accounts[1]});
            
            var gameAddress = await data.store.gameContracts(1);
            var seller = await PwayGameSeller.at(gameAddress);
            await seller.purchaseGame(accounts[6], {from:accounts[6]}).should.be.rejectedWith(EVMRevert);
            

        });

        it('purchaseGame method should not be accessible ', async function () {
          await data.company.addGame(1, 5, 10);
          await data.company.addGame(1, 5, 10, {from:accounts[1]});
          
          var gameAddress = await data.store.gameContracts(1);
          var seller = await PwayGameSeller.at(gameAddress);

          await seller.purchaseGame(1,{from:accounts[6]}).should.be.rejectedWith(EVMRevert);

          });
            
      });    
        
  });

 
  
  
  
  
  