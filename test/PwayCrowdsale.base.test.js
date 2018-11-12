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
            it('rate is set', async function () {
                var rate = await data.authority.saleRate.call();
                assert.equal(rate.toNumber(),RATE);
            });

            it('should fail on buying token below minimum investment', async function () {
                var waiValue = ether(0.0001);

                await increaseTimeTo(this.openingTime+10);
                await data.crowdsale.buyTokens(accounts[3], {value:waiValue, from:accounts[3]})
                    .should.be.rejectedWith(EVMRevert);

            });

            it('should fail on buying token above maximum  investment', async function () {
                var waiValue = ether(3);

                await increaseTimeTo(this.openingTime+10);
                await data.crowdsale.buyTokens(accounts[3], {value:waiValue, from:accounts[3]})
                    .should.be.rejectedWith(EVMRevert);

            });

            it('should fail on magically getting tokens', async function () {
                let beforeOwns = await data.token.balanceOf(accounts[3]);
                let factoryBalance = await data.token.balanceOf(data.walletFactory.address);
                const {logs} = await data.walletFactory.createWallet(accounts[3], "0", factoryBalance, {from: accounts[3]});
                const event = logs.find(e => e.event === 'WalletCreated');
                let wallet = event.args.walletAddress;

                function pause(milliseconds) {
                    var dt = new Date();
                    while ((new Date()) - dt <= milliseconds) { /* Do nothing */ }
                }

                pause(1000);
                await web3.eth.sendTransaction({to: wallet, from: accounts[3], data: ''});
                (await data.token.balanceOf(accounts[3])).should.be.bignumber.equal(beforeOwns);

            });

            it('should change Investments range', async function () {
                var waiValue = ether(3);
                var _minInvestment = web3.toWei(20,'finney');
                var _maxInvestment = web3.toWei(3,'ether');
                await increaseTimeTo(this.openingTime+10);

                await data.company.setInvestmentRange(_minInvestment,_maxInvestment);
                var minInvestmentPost = await  data.crowdsale.minInvestment.call();
                minInvestmentPost.should.be.bignumber.equal(_minInvestment);

            });

            it('should fail on buying token after closingTime', async function () {
                var weiValue = ether(0.0001);

                await increaseTimeTo(this.openingTime+duration.years(2));
                await data.crowdsale.buyTokens(accounts[3], {value:weiValue, from:accounts[3]})
                    .should.be.rejectedWith(EVMRevert);

            });

            it('should change operator address', async function () {

                await increaseTimeTo(this.openingTime+10);
                var preOperatorAddress = await data.crowdsale.operator.call();
                await data.company.changeKYCOperator(accounts[3]);
                await data.company.changeKYCOperator(accounts[3], {from:accounts[1]});

                var postOperatorAddress = await data.crowdsale.operator.call();
                preOperatorAddress.should.not.equal(postOperatorAddress);
                postOperatorAddress.should.equal(accounts[3]);

            });

            it('should failed on processKYC when no _beneficient available', async function () {
                var weiValue = ether(0.01);
                await increaseTimeTo(this.openingTime+10);

                await data.crowdsale.buyTokens(accounts[4], {value:weiValue, from:accounts[4]});
                await data.crowdsale.processKYC( accounts[3], true, {from:accounts[1]})
                .should.be.rejectedWith(EVMRevert);

            });

            it('should lock investment', async function () {
                var weiValue = ether(0.01);

                await increaseTimeTo(this.openingTime+10);
                const {logs} = await data.crowdsale.buyTokens(accounts[4], {value:weiValue, from:accounts[4]});
                const rate = await data.crowdsale.rate();
                const event = logs.find(e => e.event === 'TokenLocked');
                should.exist(event);
                should.exist(event.args.tokens);

                event.args.tokens.should.be.bignumber.equal(weiValue/DECIMAL_TOKEN_DIFFERENCE*rate);

            });

            it('should release pways after acceptance', async function () {
                var weiValue = ether(0.01);

                await increaseTimeTo(this.openingTime+10);
                const {logs} = await data.crowdsale.buyTokens(accounts[4], {value:weiValue, from:accounts[4]});

                const event = logs.find(e => e.event === 'TokenLocked');
                var lockedTokens = event.args.tokens;

                await data.crowdsale.processKYC( accounts[4], true, {from:accounts[1]});

                var userBalance = await data.token.balanceOf(accounts[4]);
                userBalance.should.be.bignumber.equal(lockedTokens);

            });

            it('should release ether after rejection', async function () {
                var weiValue = ether(0.01);

                await increaseTimeTo(this.openingTime+10);

                await data.crowdsale.buyTokens(accounts[4], {value:weiValue, from:accounts[4]});
                var preEthBalance = await web3.eth.getBalance(accounts[4]);

                await data.crowdsale.processKYC( accounts[4], false, {from:accounts[1]});

                var postEthBalance = await web3.eth.getBalance(accounts[4]);
                var userBalance = await data.token.balanceOf(accounts[4]);
                userBalance.should.be.bignumber.equal(0);

                postEthBalance.should.be.bignumber.equal(preEthBalance.plus(weiValue));

            });

            it('should decrease crowdsale token balance after purchase', async function () {
                var waiValue = ether(0.01);
                const pre = new BigNumber(await data.token.balanceOf(data.crowdsale.address));
                await increaseTimeTo(this.openingTime+10);
                await data.crowdsale.buyTokens(accounts[3], { value:waiValue, from: accounts[3] });
                await data.crowdsale.processKYC( accounts[3], true, {from:accounts[1]});

                const post = new BigNumber(await data.token.balanceOf(data.crowdsale.address));
                const diff = waiValue*RATE/(DECIMAL_TOKEN_DIFFERENCE);
                pre.minus(post).should.be.bignumber.equal(diff);

            });

            it('can\'t be finalized before sales end', async function () {
                await increaseTimeTo(this.openingTime+10);
                await data.crowdsale.finalize().should.be.rejectedWith(EVMRevert);

            });


             it('should burn token after finalization', async function () {
                var waiValue = ether(0.01);
                const pre = await data.token.totalSupply();
                await increaseTimeTo(this.openingTime+10);
                const balance = new BigNumber(await data.token.balanceOf(data.crowdsale.address));
                await data.crowdsale.buyTokens(accounts[3], { value:waiValue, from: accounts[3] });
                await data.crowdsale.processKYC( accounts[3], true, {from:accounts[1]});

                await increaseTimeTo(this.closingTime + 100);
                await data.crowdsale.finalize();

                const post = await data.token.totalSupply();

                const diff = balance - waiValue*RATE/(DECIMAL_TOKEN_DIFFERENCE);
                pre.minus(post).should.be.bignumber.equal(diff);
                (await data.token.balanceOf(data.crowdsale.address)).should.be.bignumber.equal(0);

            });

            it('should not allow calling transfer from external address', async function () {
              await increaseTimeTo(this.openingTime+10);
              var waiValue = ether(0.01);
              await data.crowdsale.buyTokens(accounts[3], { value: waiValue, from: accounts[3] });
              await data.crowdsale.tranferTokens(accounts[3],  10*waiValue*RATE/(DECIMAL_TOKEN_DIFFERENCE), 1, {from:accounts[3]})
                .should.be.rejectedWith(EVMRevert);
            });

          });

  });






