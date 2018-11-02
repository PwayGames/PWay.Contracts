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

            await helper.distributeTokens(data, accounts);
            await helper.transferOwnership(data, data.company.address);

            await increaseTimeTo(this.openingTime+2);
          });
          
          
          describe('PwayKYCCrowdsale base test', function () {

            it('should fail on invest more than maxInvestment per account', async function () {
                var weiValue = ether(1.5);
                await increaseTimeTo(this.openingTime+10);
                await data.crowdsale.buyTokens(accounts[3], {value:weiValue, from:accounts[3]});
                await data.crowdsale.buyTokens(accounts[3], {value:weiValue, from:accounts[3]})
                    .should.be.rejectedWith(EVMRevert);
                
            });

            it('should fail processKYC by not authorized account', async function () {
                var weiValue = ether(0.01);
                await increaseTimeTo(this.openingTime+10);
                await data.crowdsale.buyTokens(accounts[3], {value:weiValue, from:accounts[3]});

                var operator = await data.crowdsale.owner.call();

                await data.crowdsale.processKYC( accounts[3], true, {from:accounts[3]})
                    .should.be.rejectedWith(EVMRevert);
                
            });

            it('should fail processKYC by not authorized account', async function () {
                var weiValue = ether(0.01);
                await increaseTimeTo(this.openingTime+10);
                await data.crowdsale.buyTokens(accounts[3], {value:weiValue, from:accounts[3]});

                var operator = await data.crowdsale.owner.call();

                await data.crowdsale.processKYC( accounts[3], true, {from:accounts[3]})
                    .should.be.rejectedWith(EVMRevert);
                
            });

            it('should sum all transfers and dispach pways after acceptance', async function () {
                var weiValue = ether(0.01);
                await increaseTimeTo(this.openingTime+10);

                await data.crowdsale.sendTransaction({value:weiValue, from:accounts[3]});
                await data.crowdsale.buyTokens(accounts[3], {value:weiValue, from:accounts[3]});
                await data.crowdsale.sendTransaction( {value:weiValue, from:accounts[3]});
              
                await data.crowdsale.processKYC( accounts[3], true, {from:accounts[1]});

                var tokenBalance = await data.token.balanceOf(accounts[3]);
                tokenBalance.should.be.bignumber.equal(weiValue*3*RATE/DECIMAL_TOKEN_DIFFERENCE)
            });

            it('should forward founds to PwayAuthority wallet', async function () {
                var weiValue = ether(0.01);
                const pre = await web3.eth.getBalance(data.authority.address);
               
                await increaseTimeTo(this.openingTime+10);
                await data.crowdsale.buyTokens(accounts[3], { value:weiValue, from: accounts[3] });
                await data.crowdsale.processKYC( accounts[3], true, {from:accounts[1]});
                
                const post = await  web3.eth.getBalance(data.authority.address);
                const postCrowdsaleBalance = (await web3.eth.getBalance(data.crowdsale.address)).toNumber();
                post.minus(pre).should.be.bignumber.equal(weiValue);
                postCrowdsaleBalance.should.be.equal(0);
                
            });

            it('should able to purchase pways after included to whitelist', async function () {
                var weiValue = ether(0.01);
                
                await increaseTimeTo(this.openingTime+10);

                const balance = new BigNumber(await data.token.balanceOf(data.crowdsale.address));
                await data.crowdsale.buyTokens(accounts[6], { value:weiValue, from: accounts[6] });
                await data.crowdsale.processKYC( accounts[6], true, {from:accounts[1]});
                await data.crowdsale.buyTokens(accounts[6], { value:weiValue, from: accounts[6] });

                var postTokenBalance = await data.token.balanceOf(accounts[6]);

                postTokenBalance.should.be.bignumber.equal(weiValue*2*RATE/DECIMAL_TOKEN_DIFFERENCE)
              
            });

            it('should not finalize after ICO finalization', async function () {
                var waiValue = ether(0.01);
                const pre = await data.token.totalSupply();
                await increaseTimeTo(this.openingTime+10);
                const balance = new BigNumber(await data.token.balanceOf(data.crowdsale.address));
                await data.crowdsale.buyTokens(accounts[3], { value:waiValue, from: accounts[3] });

                await increaseTimeTo(this.closingTime + 100);

                await data.crowdsale.finalize();
                await data.crowdsale.finalize().should.be.rejectedWith(EVMRevert);
            });
                        
             it('should enable PwayAuthority withdraw after finalization', async function () {
                var waiValue = ether(0.01);
                const pre = await data.token.totalSupply();
                await increaseTimeTo(this.openingTime+10);
                const balance = new BigNumber(await data.token.balanceOf(data.crowdsale.address));
                await data.crowdsale.buyTokens(accounts[3], { value:waiValue, from: accounts[3] });

                await increaseTimeTo(this.closingTime + 100);
                await data.crowdsale.finalize();

                const post = (await data.authority.withdrawStartTime()).toNumber();
                
                post.should.be.above(0);
            });

                        
           

          });    
        
  });

 
  
  
  
  
  