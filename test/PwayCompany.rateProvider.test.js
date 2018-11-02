const PwayToken = artifacts.require('PwayToken');
const NameRegistry = artifacts.require('NameRegistry');
const PwayCompany = artifacts.require('PwayCompany');
const PwayKYCCrowdsale = artifacts.require('PwayKYCCrowdsale');
const DummyProvider = artifacts.require('DummyProvider');
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
        data.rateProvider = await DummyProvider.new(data.nameRegistry.address, true);
        await data.rateProvider.setRate(RATE.mul(2));
       
        data.DECIMALS = await data.token.decimals();
        await data.nameRegistry.setAddress("Authority", data.token.address); // just to satisfy construction of whiteList
        await data.nameRegistry.setAddress("GamesStore", data.token.address); // just to satisfy construction of whiteList

        data.company = await PwayCompany.new(data.nameRegistry.address, ether(1), RATE, accounts[0], accounts[2], accounts[3]);
        this.openingTime = (await latestTime()) + duration.seconds(5);
        this.closingTime = this.openingTime + duration.years(1);
        this.minInvestment = web3.toWei(1000, 'finney');
        this.maxInvestment = web3.toWei(10, 'ether');
        data.crowdsale = await PwayKYCCrowdsale.new(RATE, data.nameRegistry.address,
            this.openingTime, this.closingTime,
            this.minInvestment, this.maxInvestment, accounts[1]);

        await helper.distributeTokens(data, accounts);
        await helper.transferOwnership(data, data.company.address);

        data.RATE = await data.company.ethToUsdRate();
    });


    describe('PwayCompany Dummy Provider test', function () {

        //updateEthToUsdRate can be executed by everyone
        xit('should revert updateEthToUsdRate when called by not owner', async function () {
            var oldRate = await data.company.ethToUsdRate();
            oldRate.should.be.bignumber.equal(RATE);

            await data.rateProvider.setRate(RATE.mul(3));
            await data.company.updateEthToUsdRate({ from: accounts[1] }).should.be.rejectedWith(EVMRevert);;
            
            var newRate = await data.company.ethToUsdRate();
            newRate.should.be.bignumber.equal(RATE);
        });

        it('should update rate after updateEthToUsdRate call', async function () {
            var oldRate = await data.company.ethToUsdRate();
            oldRate.should.be.bignumber.equal(RATE);
            await data.rateProvider.setRate(RATE.mul(3));
            await data.company.updateEthToUsdRate();
            oldRate = await data.company.ethToUsdRate();
            oldRate.should.be.bignumber.equal(RATE.mul(3));
        });

        it('should not change rate without updateEthToUsdRate call even if provider rate changed', async function () {
            var oldRate = await data.company.ethToUsdRate();
            oldRate.should.be.bignumber.equal(RATE);
            await data.rateProvider.setRate(RATE.mul(3));
            oldRate = await data.company.ethToUsdRate();
            oldRate.should.be.bignumber.equal(RATE);
        });

        it('should change rate provider implementation', async function () {
            
            await data.rateProvider.setRate(RATE);
          
            data.rateProvider2 = await DummyProvider.new(data.nameRegistry.address, false);//EthRateProvider
            await data.rateProvider2.setRate(RATE*2);

            await data.company.updateProvider(data.rateProvider2.address);
            await data.company.updateProvider(data.rateProvider2.address, {from:accounts[2]});
            await data.company.updateEthToUsdRate();
     
            var newRate = await data.company.ethToUsdRate();
            newRate.should.be.bignumber.equal(RATE*2);


        });

    });

});
