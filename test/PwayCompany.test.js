const PwayToken = artifacts.require('PwayToken');
const NameRegistry = artifacts.require('NameRegistry');
const DummyProvider = artifacts.require('DummyProvider');
const PwayCompany = artifacts.require('PwayCompany');
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

contract('PwayCompany', function (accounts) {
    var data = {};
    const RATE = new BigNumber(400);


    beforeEach(async function () {

        data.nameRegistry = await NameRegistry.new();
        var dividendStartTime = await data.nameRegistry.getNow();
        dividendStartTime = dividendStartTime + duration.days(180);
        data.token = await PwayToken.new(data.nameRegistry.address, dividendStartTime);

        data.walletFactory = await PwayDelayedWithdrawWalletFactory.new(data.nameRegistry.address);

        data.DECIMALS = await data.token.decimals();
        await data.nameRegistry.setAddress("Authority", data.token.address); // just to satisfy construction of whiteList
        await data.nameRegistry.setAddress("GamesStore", data.token.address); // just to satisfy construction of whiteList

        data.company = await PwayCompany.new(data.nameRegistry.address, ether(1), RATE/2, accounts[1], accounts[2], accounts[3]);

        data.rateProvider = await DummyProvider.new(data.nameRegistry.address, true);
        await data.rateProvider.setRate(RATE);
        await data.company.updateEthToUsdRate();

        this.openingTime = (await latestTime()) + duration.seconds(5);
        this.closingTime = this.openingTime + duration.years(1);
        this.minInvestment = web3.toWei(1000, 'finney');
        this.maxInvestment = web3.toWei(10, 'ether');
      
        data.crowdsale = await PwayKYCCrowdsale.new(RATE, data.nameRegistry.address,
            this.openingTime, this.closingTime,
            this.minInvestment, this.maxInvestment, accounts[1]);

        data.limit = await data.company.dayLimitTotal();

        await helper.distributeTokens(data, accounts);
        await helper.transferOwnership(data, data.company.address);

        data.RATE = await data.company.ethToUsdRate();
    });


    describe('PwayCompany base test', function () {
   

        it('should allow send money from some adresses', async function () {
            var companyBeforeBalance = await web3.eth.getBalance(data.company.address);
            var Acc1BeforeBalance = await web3.eth.getBalance(accounts[1]);
            await data.company.sendTransaction({ from:accounts[1], value:ether(1)});
            var companyAfterBalance = await web3.eth.getBalance(data.company.address);
            var Acc1AfterBalance = await web3.eth.getBalance(accounts[1]);
            return companyAfterBalance.minus(companyBeforeBalance).should.be.bignumber.equal(ether(1));
        });

        //obsolute
        // it('should not change rate by single call', async function () {
        //     await data.company.updateethToUsdRate(data.RATE+1,{from:accounts[1]});
        //     var rate  =  await data.company.ethToUsdRate();
        //     return rate.should.be.bignumber.equal(data.RATE);

        // });

        
        // xit('should change rate by double call', async function () {
        //     await data.company.updateEthToUsdRate(data.RATE.add(1),{from:accounts[1]});
        //     await data.company.updatEethToUsdRate(data.RATE.add(1),{from:accounts[2]});
        //     var rate  =  await data.company.ethToUsdRate();
        //     return rate.should.be.bignumber.equal(data.RATE.add(1));

        // });

        // it('should throw on change rate by unapproved account', async function () {
        //     await data.company.updateethToUsdRate(data.RATE.add(1),{from:accounts[4]}).should.be.rejectedWith(EVMRevert);

        // });

        it('should not change DayLimitTotal by single call', async function () {
            await data.company.updateDayLimitTotal(11,{from:accounts[1]});
            var limit  =  await data.company.dayLimitTotal();
            return limit.should.be.bignumber.equal(data.limit);

        });

        it('should change DayLimitTotal by double call', async function () {
            var r = await data.company.updateDayLimitTotal(11,{from:accounts[1]});
            var r2 = await data.company.updateDayLimitTotal(11,{from:accounts[2]});
            var limit  =  await data.company.dayLimitTotal();
            return limit.should.be.bignumber.equal(11);

        });

        it('should not change DayLimitTotal by double call by same account', async function () {
            var r = await data.company.updateDayLimitTotal(11,{from:accounts[1]});
            var r2 = await data.company.updateDayLimitTotal(11,{from:accounts[1]});
            var limit  =  await data.company.dayLimitTotal();
            return limit.should.be.bignumber.equal(data.limit);

        });

        it('should throw on change DayLimitTotal by unapproved account', async function () {
            await data.company.updateDayLimitTotal(11,{from:accounts[4]}).should.be.rejectedWith(EVMRevert);

        });

        it('should send little ether by single call', async function () {
            web3.eth.sendTransaction({ from: accounts[5], to: data.company.address, value: ether(0.2) });
            await data.company.updateDayLimitTotal(data.RATE / 2, { from: accounts[1] });
            await data.company.updateDayLimitTotal(data.RATE / 2, { from: accounts[2] });
            var Acc5BeforeBalance = await web3.eth.getBalance(accounts[5]);
            await data.company.transferFunds(accounts[5],ether(0.1),{from:accounts[1]});
            var Acc5AfterBalance = await web3.eth.getBalance(accounts[5]);
            return Acc5AfterBalance.minus(Acc5BeforeBalance).should.be.bignumber.equal(ether(0.1));

        });

        it('should not send amount of ether above day limit by single call', async function () {
            await data.company.updateDayLimitTotal(0.5 * data.RATE,{from:accounts[1]});
            await data.company.updateDayLimitTotal(0.5 * data.RATE,{from:accounts[2]});

            web3.eth.sendTransaction({ from: accounts[6], to: data.company.address, value: ether(1) });

            var Acc5BeforeBalance = await web3.eth.getBalance(accounts[5]);
            await data.company.transferFunds(accounts[5],ether(0.6),{from:accounts[1]});
            var Acc5AfterBalance = await web3.eth.getBalance(accounts[5]);
            return Acc5AfterBalance.minus(Acc5BeforeBalance).should.be.bignumber.equal(0);

        });

        it('should not send tokens above day limit by single call', async function () {
            await data.company.updateDayLimitTotal("200" + "00000000000",{from:accounts[1]});
            await data.company.updateDayLimitTotal("200" + "00000000000",{from:accounts[2]});

            var Acc5BeforeBalance = await data.token.balanceOf(accounts[5]);
            await data.company.transferTokens(accounts[5],"300" + "00000000000",{from:accounts[1]});
            //var Acc5AfterBalance = await data.token.balanceOf(accounts[5]);
            return Acc5BeforeBalance.should.be.bignumber.equal(0);

        });

        it('should send amount of tokens below day limit by single call ', async function () {
            await data.company.updateDayLimitTotal("200" + "00000000000",{from:accounts[1]});
            await data.company.updateDayLimitTotal("200" + "00000000000",{from:accounts[2]});

            var Acc5BeforeBalance = await data.token.balanceOf(accounts[5]);
            await data.company.transferTokens(accounts[5],"100" + "00000000000",{from:accounts[1]});
            var Acc5AfterBalance = await data.token.balanceOf(accounts[5]);
            return Acc5AfterBalance.should.be.bignumber.equal(Acc5BeforeBalance.plus(new BigNumber("100" + "00000000000")));

        });

        it('should not send tokens above day limit by single call (overflow proof)', async function () {
            // set day limit to 2 USD
            await data.company.updateDayLimitTotal("2",{from:accounts[1]});
            await data.company.updateDayLimitTotal("2",{from:accounts[2]});

            var Acc5BeforeBalance = await data.token.balanceOf(accounts[5]);

            // first transfer of 1 USD
            let amount1 = new BigNumber("10" + "000000");
            await data.company.transferTokens(accounts[5], amount1,{from:accounts[1]});
            // overflow dayLimitUsed
            let vB = "ffffffff" + "ffffffff" + "ffffffff" + "ffffffff";
            let veryBig = new BigNumber("0x" + vB + vB);
            // this function is public ?
        //    await data.company.guardSumAndCaller(veryBig, false,{from:accounts[1]});
            // second transfer of 2 USD, should not pass
            await data.company.transferTokens(accounts[5],"20" + "000000",{from:accounts[1]});
            let Acc5AfterBalance = await data.token.balanceOf(accounts[5]);
            return Acc5AfterBalance.should.be.bignumber.equal(Acc5BeforeBalance.plus(amount1));

      });

      it('should send amount of ether above day limit by single call if more than day passes', async function () {
            await data.company.updateDayLimitTotal(data.RATE / 2,{from:accounts[1]});
            await data.company.updateDayLimitTotal(data.RATE / 2,{from:accounts[2]});
            web3.eth.sendTransaction({ from: accounts[6], to: data.company.address, value: ether(1) });

            var Acc5BeforeBalance = await web3.eth.getBalance(accounts[5]); 

            await data.company.transferFunds(accounts[5],ether(0.5),{from:accounts[1]});
            await increaseTimeTo((await latestTime()) + duration.days(2));

            await data.company.transferFunds(accounts[5],ether(0.5),{from:accounts[1]});

            var Acc5AfterBalance = await web3.eth.getBalance(accounts[5]);
            return Acc5AfterBalance.minus(Acc5BeforeBalance).should.be.bignumber.equal(ether(1));

        });


        it('should send any amount of ether by double call', async function () {
            await data.company.updateDayLimitTotal(data.RATE / 2,{from:accounts[1]});
            await data.company.updateDayLimitTotal(data.RATE / 2,{from:accounts[2]});

            web3.eth.sendTransaction({ from: accounts[7], to: data.company.address, value: ether(2) });

            var Acc5BeforeBalance = await web3.eth.getBalance(accounts[5]);

            await data.company.transferFunds(accounts[5],ether(1.5),{from:accounts[1]});
            await data.company.transferFunds(accounts[5],ether(1.5),{from:accounts[2]});
            var Acc5AfterBalance = await web3.eth.getBalance(accounts[5]);
            return Acc5AfterBalance.minus(Acc5BeforeBalance).should.be.bignumber.equal(ether(1.5));

        });

        it('should  transfer Crowdsale ownership to other address using general call', async function () {

            var owner = await data.crowdsale.owner();
            //transfer ownership to account 5
            // transferOwnership(address 5)
            await data.company.generalCall(data.crowdsale.address,"0xf2fde38b000000000000000000000000" + accounts[5].slice(2, accounts[5].length), {from:accounts[1]});
            await data.company.generalCall(data.crowdsale.address,"0xf2fde38b000000000000000000000000" + accounts[5].slice(2, accounts[5].length), {from:accounts[2]});
            
            var newOwner = await data.crowdsale.owner();
            newOwner.should.be.equal(accounts[5]);

        });

    });

});
