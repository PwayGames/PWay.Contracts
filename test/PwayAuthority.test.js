const PwayToken = artifacts.require('PwayToken');
const NameRegistry = artifacts.require('NameRegistry');
const PwayAuthority = artifacts.require('PwayAuthority');
const PwayKYCCrowdsale = artifacts.require('PwayKYCCrowdsale');
const PwayCompany = artifacts.require('PwayCompany');
const PwayGamesStore = artifacts.require('PwayGamesStore');
const OasisDexProvider = artifacts.require('OasisDexProvider');
const OasisDexMock = artifacts.require('OasisDexMock');
const PwayDelayedWithdrawWalletFactory = artifacts.require('PwayDelayedWithdrawWalletFactory');
import { latestTime } from 'openzeppelin-solidity/test/helpers/latestTime';
import { increaseTimeTo, duration } from 'openzeppelin-solidity/test/helpers/increaseTime';
import { ether } from 'openzeppelin-solidity/test/helpers/ether';
import EVMRevert from 'openzeppelin-solidity/test/helpers/EVMRevert';
import { log, isFunction } from 'util';

const helper = require("./testHelper");

const BigNumber = web3.BigNumber;
const should = require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .should();

contract('PwayAuthority', function (accounts) {
    var data = {};
    const RATE = new BigNumber(472);

  

    beforeEach(async function () {
        this.dailyLimit = web3.toWei(1, 'ether');
        data.nameRegistry = await NameRegistry.new();
        
        var dividendStartTime = await data.nameRegistry.getNow();
        dividendStartTime = dividendStartTime + duration.days(180);
        
        data.token = await PwayToken.new(data.nameRegistry.address, dividendStartTime);

        data.oasisMock = await OasisDexMock.new(data.nameRegistry.address);
        data.rateProvider = await OasisDexProvider.new(data.nameRegistry.address, data.oasisMock.address, "0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359", "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2");
        
        data.walletFactory = await PwayDelayedWithdrawWalletFactory.new(data.nameRegistry.address);
        data.authority = await PwayAuthority.new(data.nameRegistry.address, RATE);
        data.company = await PwayCompany.new(data.nameRegistry.address, 1, RATE, accounts[1], accounts[2], accounts[3]);

        //Already opened crowdsale
       
        this.minInvestment = web3.toWei(1000, 'finney');
        this.maxInvestment = web3.toWei(10, 'ether');
        this.sumInvested = this.minInvestment;
        data.sumInvested = new BigNumber(this.sumInvested);
        this.openingTime = (await latestTime()) + duration.seconds(5);
        this.closingTime = this.openingTime + duration.years(1);

        data.crowdsale = await PwayKYCCrowdsale.new(RATE, data.nameRegistry.address,
            this.openingTime, this.closingTime,
            this.minInvestment, this.maxInvestment, accounts[1]);

        data.store = await PwayGamesStore.new(data.nameRegistry.address);

        await helper.distributeTokens(data, accounts);
        await helper.transferOwnership(data, data.company.address);
        
        await increaseTimeTo(this.openingTime + 2);

        await data.crowdsale.sendTransaction({ value: this.sumInvested, from: accounts[5] });
        await data.crowdsale.sendTransaction({ value: this.sumInvested*2, from: accounts[4] });
        await data.crowdsale.processKYC(accounts[5], true, { from: accounts[1] });
        await data.crowdsale.processKYC(accounts[4], true, { from: accounts[1] });
        this.balanceOfAccStart = await web3.eth.getBalance(accounts[5]);

    });
    

    contract('PwayAuthority base test', function () {
        
        it('should fail after send ether form  address not being authorityManager', async function () {
            var waiValue = ether(0.01);
            await increaseTimeTo(this.openingTime + 10);

            const { logs } = await data.authority.deposit(accounts[3], { value: waiValue, from: accounts[3] })
                .should.be.rejectedWith(EVMRevert);
            return true;
        });

        it('should fail after call withdraw before allowed withdraw time', async function () {
            await increaseTimeTo(this.openingTime + 10);
            return await data.authority.withdraw({ from: accounts[3] }).should.be.rejectedWith(EVMRevert);
        });

        it('should fail after call startWithdraw from address not being owner', async function () {
            await increaseTimeTo(this.openingTime + 10);
            return await data.authority.startWithdraw({ from: accounts[3] }).should.be.rejectedWith(EVMRevert);
        });

        it('should fail after call startWithdraw from address not being manager', async function () {
            await increaseTimeTo(this.openingTime + 10);
            await data.authority.startWithdraw({ from: accounts[0] }).should.be.rejectedWith(EVMRevert);
        });

        it('should pass after call startWithdraw from address being owner', async function () {
            await increaseTimeTo(this.openingTime + 10);
            const teamLockTime = (await data.authority.LOCK_TIME()).toNumber();
            await increaseTimeTo(this.closingTime + 10);//after Crowdsale
            //start Withdraw
            await data.crowdsale.finalize();
            var withdrawStartTime = new BigNumber(await data.authority.withdrawStartTime.call());
            await withdrawStartTime.should.be.bignumber.equal(await latestTime());
        });

        it('should fail after send ether to contract by owner and not owner', async function () {
            var waiValue = ether(0.01);
            const teamLockTime = (await data.authority.LOCK_TIME()).toNumber();
            await increaseTimeTo(this.closingTime + 1);//after Crowdsale
            //start Withdraw
            await data.crowdsale.finalize({ from: accounts[0] });
            await increaseTimeTo(this.closingTime + 1 + teamLockTime);//after Crowdsale
            await data.authority.sendTransaction({ value: waiValue, from: accounts[0] })
                .should.be.rejectedWith(EVMRevert);
            return await data.authority.sendTransaction({ value: waiValue, from: accounts[2] })
                .should.be.rejectedWith(EVMRevert);
        });

        it('should fail after owner send transaction to contract before startWithdraw ', async function () {
            var waiValue = ether(0);
            await increaseTimeTo(this.openingTime + 10);
            return await data.authority.sendTransaction({ from: accounts[0] }).should.be.rejectedWith(EVMRevert);
        });
        
        //TODO test periods in loop
        it('should decrease percent after one period by 10 % ', async function () {
            var waiValue = ether(0);
            await increaseTimeTo(this.closingTime + 1);//after Crowdsale
            const teamLockTime = (await data.authority.LOCK_TIME()).toNumber();
            //start Withdraw
            await data.crowdsale.finalize({ from: accounts[0] });
            var amountAvailable = await web3.eth.getBalance(data.authority.address);

            const pre = new BigNumber(await data.authority.currentWithdrawPercent.call());
            const nextPeriod = this.closingTime + teamLockTime + duration.days(32);
            await increaseTimeTo(nextPeriod);

            //force calculation
            const { logs } = await data.authority.sendTransaction({ from: accounts[0] });
            
            const event = logs.find(e => e.event === 'TeamWithdrawn');
            should.exist(event);
            should.exist(event.args.team);
            should.equal(event.args.team, data.company.address);
            should.equal(event.args.amount.toString(), "" + (amountAvailable / 100 * 10));

            const post = new BigNumber(await data.authority.currentWithdrawPercent.call());
            return await pre.minus(post).should.be.bignumber.equal(10);

        });

        
        it('should decrease withdraw by 10 % after each period ', async function () {

            var amountAvailable = await data.token.balanceOf(data.authority.address);
            var waiValue = ether(0);
            await increaseTimeTo(this.closingTime + 1);//after Crowdsale
            //start Withdraw
            await data.crowdsale.finalize({ from: accounts[0] });
            amountAvailable = await web3.eth.getBalance(data.authority.address);
            const span = (await data.authority.DECREASE_PERCENT_INTERVAL()).toNumber();
            const teamLockTime = (await data.authority.LOCK_TIME()).toNumber();

            const pre = new BigNumber(await data.authority.currentWithdrawPercent.call());
            for (var i = 0; i < (100 / 10 + 1); i++) {
                const nextPeriod = this.closingTime + teamLockTime + duration.seconds(i * span + 100);

                await increaseTimeTo(nextPeriod);

                //force calculation
                const { logs } = await data.authority.sendTransaction({ from: accounts[0] });
                if (i !== 0) {
                    const event = logs.find(e => e.event === 'TeamWithdrawn');
                    should.exist(event);
                    should.exist(event.args.team);
                    should.equal(event.args.team, data.company.address);
                    should.equal(event.args.amount.toString(), "" + (amountAvailable / 100 * 10));
                }

                const post = new BigNumber(await data.authority.currentWithdrawPercent.call());
                pre.minus(post).should.be.bignumber.equal(i * 10);

            }


        });
        
        it('should withdraw only 80 percent after 2 periods to the investor', async function () {
            var waiValue = ether(0);
            await increaseTimeTo(this.closingTime + 1);//after Crowdsale
            const teamLockTime = (await data.authority.LOCK_TIME()).toNumber();
            const span = (await data.authority.DECREASE_PERCENT_INTERVAL()).toNumber();
            //start Withdraw
            await data.crowdsale.finalize({ from: accounts[0] });
            const pre = new BigNumber(await data.authority.currentWithdrawPercent.call());
            const nextPeriod = this.closingTime + teamLockTime + span * 2 + 100;
            await increaseTimeTo(nextPeriod);
            //basicaly approve any amount  
            await data.token.approve(data.authority.address, web3.toWei(1000, 'ether'), { from: accounts[5] });
            //withdraw
          //    await data.authority.startWithdraw(); //nie ma potrzeby robi to finalize
            const { logs } = await data.authority.withdraw({ from: accounts[5] });

            const event = logs.find(e => e.event === 'Withdrawn');
            should.exist(event);
            should.exist(event.args.investor);
            should.equal(event.args.investor, accounts[5]);
            should.equal(event.args.ethAmount.toString(), "" + (data.sumInvested / 100 * 80));

            const post = new BigNumber(await data.authority.currentWithdrawPercent.call());
            return await pre.minus(post).should.be.bignumber.equal(20);

        });

        it('should decrease totalSupply same amount as amount tokens withdrawn', async function () {
            var waiValue = ether(0);
            await increaseTimeTo(this.closingTime + 1);//after Crowdsale
            const teamLockTime = (await data.authority.LOCK_TIME()).toNumber();
            const span = (await data.authority.DECREASE_PERCENT_INTERVAL()).toNumber();
            //start Withdraw
            await data.crowdsale.finalize({ from: accounts[0] });
            const pre = new BigNumber(await data.token.balanceOf(accounts[5]));
            const initTotalSupply = new BigNumber(await data.token.totalSupply());
            const nextPeriod = this.closingTime + teamLockTime + span * 2 + 100;
            await increaseTimeTo(nextPeriod);
            //basicaly approve any amount  
            await data.token.approve(data.authority.address, web3.toWei(1000, 'ether'), { from: accounts[5] });
            //withdraw
            const { logs } = await data.authority.withdraw({ from: accounts[5] });
            const post = new BigNumber(await data.token.balanceOf(accounts[5]));
            const finalTotalSupply = new BigNumber(await data.token.totalSupply());
            const totalChange = initTotalSupply.minus(finalTotalSupply).toString();
            const acc5change = pre.minus(post).toString();
            return await totalChange.should.be.equal(acc5change);

        });

        it('should not change amount of tokens of PwayAuthority', async function () {
            var waiValue = ether(0);
            await increaseTimeTo(this.closingTime + 1);//after Crowdsale
            const teamLockTime = (await data.authority.LOCK_TIME()).toNumber();
            const span = (await data.authority.DECREASE_PERCENT_INTERVAL()).toNumber();
            //start Withdraw
            await data.crowdsale.finalize({ from: accounts[0] });
            const pre = new BigNumber(await data.token.balanceOf(data.authority.address));
            const nextPeriod = this.closingTime + teamLockTime + span * 2 + 100;
            await increaseTimeTo(nextPeriod);
            //basicaly approve any amount  
            await data.token.approve(data.authority.address, web3.toWei(1000, 'ether'), { from: accounts[5] });
            //withdraw
            const { logs } = await data.authority.withdraw({ from: accounts[5] });
            const post = new BigNumber(await data.token.balanceOf(data.authority.address));
            const acc5change = pre.minus(post).toString();
            return await acc5change.should.be.equal("0");

        });


        it('should not get money for someone else tokens', async function () {
            var balanceTokenAcc4 = await data.token.balanceOf(accounts[4]);

            await data.token.approve(data.authority.address, web3.toWei(1000, 'ether'), { from: accounts[5] });
            await data.token.transfer(accounts[5], balanceTokenAcc4, { from: accounts[4] });
            
            await increaseTimeTo(this.closingTime + 1);//after Crowdsale
            const teamLockTime = (await data.authority.LOCK_TIME()).toNumber();
            const span = (await data.authority.DECREASE_PERCENT_INTERVAL()).toNumber();
            //start Withdraw
            await data.crowdsale.finalize({ from: accounts[0] });
            const pre = new BigNumber(await data.token.balanceOf(data.authority.address));
            const nextPeriod = this.closingTime + teamLockTime + span * 3 + 1;
            await increaseTimeTo(nextPeriod);
            //basicaly approve any amount  
            //withdraw
            var investedSumAcc5 = await data.authority.investors(accounts[5]);

            var balanceOfAcc5Start = await web3.eth.getBalance(accounts[5]);
            
            await data.authority.withdraw({ from: accounts[5], gasPrice:1 });
      
            var balanceOfAcc5After = await web3.eth.getBalance(accounts[5]);
            
            var returnedETH =balanceOfAcc5After- balanceOfAcc5Start  ;

            var returnedPercentage = returnedETH / this.sumInvested * 100;
            returnedPercentage.should.be.below(71); //rounding
            returnedPercentage.should.be.above(69);
            return balanceOfAcc5After.should.be.bignumber.above(balanceOfAcc5Start);


        });
        
        it('should transfer 30% of payment from PwayAuthority to accounts[5]', async function () {
            await data.token.approve(data.authority.address, web3.toWei(1000, 'ether'), { from: accounts[5] });
            var balanceOfAcc5Before = await web3.eth.getBalance(accounts[5]);
            var balanceOfAuthorityBefore = await web3.eth.getBalance(data.authority.address);

            await increaseTimeTo(this.closingTime + 1);//after Crowdsale
            const teamLockTime = (await data.authority.LOCK_TIME()).toNumber();
            const span = (await data.authority.DECREASE_PERCENT_INTERVAL()).toNumber();
            //start Withdraw
            await data.crowdsale.finalize({ from: accounts[0] });
            const pre = new BigNumber(await data.token.balanceOf(data.authority.address));
            const nextPeriod = this.closingTime + teamLockTime + span * 3 + 100;
            await increaseTimeTo(nextPeriod);
            //basicaly approve any amount  
            //withdraw
            const { logs } = await data.authority.withdraw({ from: accounts[5] ,gasPrice:1});
            const event = logs.find(e => e.event === 'Withdrawn');

            var balanceOfAcc5After = await web3.eth.getBalance(accounts[5]);
            var balanceOfAuthorityAfter = await web3.eth.getBalance(data.authority.address);

            //TODO to nie zadziaala koszty transakajci sa wyzsze niz otrzymuje z PwayAuthority 
            var expected = balanceOfAcc5After.minus(balanceOfAcc5Before);
            var actual = event.args.ethAmount;
            var diff = actual.minus(expected);
            var maxDiff = web3.toWei(2, 'finney');
            maxDiff.should.be.bignumber.above(diff);
            return actual.should.be.bignumber.equal(balanceOfAuthorityBefore.minus(balanceOfAuthorityAfter))

        });
        
    });


});




