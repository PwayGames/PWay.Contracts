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
const helper = require("./testHelper");
const BigNumber = web3.BigNumber;
const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
    .should();
var data = {};
  
  contract('PwayKYCCrowdsale ICO', function (accounts) {
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
        data.company = await PwayCompany.new(data.nameRegistry.address, 1, RATE, accounts[0], accounts[1], accounts[2]);
        this.openingTime = (await latestTime()) + duration.seconds(5);
        this.closingTime = this.openingTime + duration.years(1);
        this.minInvestment = web3.toWei(1, 'finney');
        this.maxInvestment = web3.toWei(2, 'ether');
        this.sumInvested = this.maxInvestment;
        data.crowdsale = await PwayKYCCrowdsale.new(RATE, data.nameRegistry.address,
            this.openingTime, this.closingTime,
            this.minInvestment, this.maxInvestment, accounts[1]);

        await helper.distributeTokens(data, accounts);
        await helper.transferOwnership(data, data.company.address);

        var balanceToTransfer = (await data.token.balanceOf(data.crowdsale.address)).toString();

        await increaseTimeTo(this.openingTime + 1);
        
        await data.crowdsale.sendTransaction({ value: web3.toWei(1, 'ether'), from: accounts[1] });
        await data.crowdsale.sendTransaction( { value: web3.toWei(1, 'ether'), from: accounts[2] });
        await data.crowdsale.sendTransaction({ value: web3.toWei(1, 'ether'), from: accounts[3] });
        await data.crowdsale.sendTransaction({ value: web3.toWei(1, 'ether'), from: accounts[4] });
        await increaseTimeTo(this.openingTime + duration.days(1));
        await data.crowdsale.processKYC(accounts[1], true, { from: accounts[1] });
        await data.crowdsale.processKYC(accounts[2], false, { from: accounts[1] });
        await increaseTimeTo(this.closingTime + 1);
        await data.company.finalizeCrowdsale({ from: accounts[0] });

      });
          
          
      describe('PwayKYCCrowdsale after finalize', async function () {
          var balanceBefore = 0;
          beforeEach(async function () {
              balanceBefore = (await data.token.balanceOf(data.crowdsale.address));
          });

          it('should allow accept KYC', async function () {
              await data.crowdsale.processKYC(accounts[3], true, { from: accounts[1] });

          });

          it('should allow reject KYC', async function () {
              await data.crowdsale.processKYC(accounts[4], false, { from: accounts[1] });
          });

          it('should return all ETH after rejectKYC', async function () {
              var amountBefore = await web3.eth.getBalance(accounts[4]);
              await data.crowdsale.processKYC(accounts[4], false, { from: accounts[1] });
              var amountAfter = await web3.eth.getBalance(accounts[4]);
              amountAfter.should.be.bignumber.greaterThan(amountBefore.add(web3.toWei(0.99, 'ether')));
          });

          it('should increase totalAmount of authority on accept KYC', async function () {
              var amountBefore = await data.authority.totalAmount();
              await data.crowdsale.processKYC(accounts[3], true, { from: accounts[1] });
              var amountAfter = await data.authority.totalAmount();

              amountBefore.should.be.bignumber.not.equal(amountAfter);
          });

          it('should burn locked tokens on reject KYC', async function () {
              var lockedAmount = await data.crowdsale.kycLockedTransfers(accounts[4]);
              await data.crowdsale.processKYC(accounts[4], false, { from: accounts[1] });
              var balanceAfter = (await data.token.balanceOf(data.crowdsale.address));
              balanceBefore.sub(lockedAmount.mul(RATE).div(10000000)).should.be.bignumber.equal(balanceAfter);
          });
      });   

      describe('in complex scenario',function () {

          var balanceBefore = 0;
          beforeEach(async function () {
              balanceBefore = (await data.token.balanceOf(data.crowdsale.address));
              await increaseTimeTo(this.closingTime + duration.days(65));
              await data.authority.sendTransaction({ from: accounts[1] });
              await data.authority.withdraw({ from: accounts[1] });
              await increaseTimeTo(this.closingTime + duration.days(121));
              await data.crowdsale.processKYC(accounts[3], true, { from: accounts[1] });
              await data.crowdsale.processKYC(accounts[4], false, { from: accounts[1] });
              await data.authority.withdraw({ from: accounts[3] });
              await data.authority.sendTransaction({ from: accounts[1] });
          });

          it('after 121 days should have 80% of accepted users balance ', async function () {
              var balance = await web3.eth.getBalance(data.authority.address);
              var withdrawPercent = await data.authority.currentWithdrawPercent();
              withdrawPercent.should.be.bignumber.equal(80);
              balance.should.be.bignumber.equal(web3.toWei(2*0.8, 'ether'));
          });
          it('should have zero token balance on KYCCrowdsale', async function () {
              var balance = await data.token.balanceOf(data.crowdsale.address);
              balance.should.be.bignumber.equal(0);
          });
          
          it('should have zero token balance on pwayAuthority', async function () {
              var balance = await data.token.balanceOf(data.authority.address);
              balance.should.be.bignumber.equal(0);
          });
          
          it('should have 0.4 eth balance on pwayCompany', async function () {
              var balance = await web3.eth.getBalance(data.company.address);
              balance.should.be.bignumber.equal(web3.toWei(0.4, 'ether'));
          });

      });
        
  });

 
  
  
  
  
  