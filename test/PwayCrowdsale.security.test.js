const PwayToken = artifacts.require('PwayToken');
const NameRegistry = artifacts.require('NameRegistry');
const PwayAuthority = artifacts.require('PwayAuthority');
const PwayCompany = artifacts.require('PwayCompany');
const DummyProvider = artifacts.require('DummyProvider');
const PwayKYCCrowdsale = artifacts.require('PwayKYCCrowdsale');
const PwayDelayedWithdrawWalletFactory = artifacts.require('PwayDelayedWithdrawWalletFactory');
import { latestTime } from 'openzeppelin-solidity/test/helpers/latestTime';
import { increaseTimeTo, duration } from 'openzeppelin-solidity/test/helpers/increaseTime';
import { ether } from 'openzeppelin-solidity/test/helpers/ether';
import EVMRevert from 'openzeppelin-solidity/test/helpers/EVMRevert';

import { assertJump }  from 'openzeppelin-solidity/test/helpers/assertJump';
const helper = require("./testHelper");
const BigNumber = web3.BigNumber;
const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();
  
  contract('PwayKYCCrowdsale ICO', function (accounts) {
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
            this.openingTime = (await latestTime()) + duration.seconds(5);
            this.closingTime = this.openingTime + duration.years(1);
            this.minInvestment = web3.toWei(1,'finney');
            this.maxInvestment = web3.toWei(2,'ether');
            this.sumInvested = this.maxInvestment ;
            data.crowdsale = await PwayKYCCrowdsale.new(RATE, data.nameRegistry.address,
              this.openingTime,this.closingTime,
              this.minInvestment, this.maxInvestment, accounts[1]);

            await data.token.transfer(data.crowdsale.address, 200);
            await helper.transferOwnership(data, data.company.address);

            await increaseTimeTo(this.openingTime+2);

        
          });
          
          //TODO
          describe('PwayKYCCrowdsale security test', function () {

            it('Should faild when buying more than contract token balance', async function () {
              var waiValue = ether(1);
              await data.crowdsale.buyTokens(accounts[3], { value:waiValue, from: accounts[3] }).should.be.rejectedWith(EVMRevert);;
            });

            it('Should faild during processKYC by not allowed account', async function () {
              var waiValue = ether(1);
                await data.crowdsale.processKYC(accounts[3], { value:waiValue, from: accounts[3] }).should.be.rejectedWith(EVMRevert);
            });

            it('Should failed ', async function () {
              var waiValue = ether(1);
              await data.crowdsale.buyTokens(accounts[3], { value:waiValue, from: accounts[3] }).should.be.rejectedWith(EVMRevert);;
            });

          });    
        
  });

 
  
  
  
  
  