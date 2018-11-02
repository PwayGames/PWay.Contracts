const PwayToken = artifacts.require('PwayToken');
const NameRegistry = artifacts.require('NameRegistry');
const PwayAuthority = artifacts.require('PwayAuthority');
const PwayKYCCrowdsale = artifacts.require('PwayKYCCrowdsale');
const PwayCompany = artifacts.require('PwayCompany');
const PwayGamesStore = artifacts.require('PwayGamesStore');
const PwayDelayedWithdrawWalletFactory = artifacts.require('PwayDelayedWithdrawWalletFactory');
import { latestTime } from 'openzeppelin-solidity/test/helpers/latestTime';
import { increaseTimeTo, duration } from 'openzeppelin-solidity/test/helpers/increaseTime';
import { ether } from 'openzeppelin-solidity/test/helpers/ether';
import EVMRevert from 'openzeppelin-solidity/test/helpers/EVMRevert';
import { log, isFunction } from 'util';
import { equal } from 'assert';

const helper = require("./testHelper");


const BigNumber = web3.BigNumber;
const should = require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .should();




contract('DividendPayableToken', function (accounts) {
    var data = {};
    const RATE = new BigNumber(473);

    beforeEach(async function () {
        this.dailyLimit = web3.toWei(1, 'ether');

        data.nameRegistry = await NameRegistry.new();

        var now = await latestTime(); 
        data.token = await PwayToken.new(data.nameRegistry.address, now - duration.days(91));

        await data.token.transfer(accounts[1], "20000000" + "00000000000");
        await data.token.transfer(accounts[2], "20000000" + "00000000000");
        await data.token.transfer(accounts[3], "20000000" + "00000000000");

        //for dividend 
        await data.token.transfer(accounts[4], "5000000" + "00000000000");

        var amountToBurn = (await data.token.balanceOf(accounts[0])).toString();
        await data.token.burn(amountToBurn, { from: accounts[0] });
        await data.token.transfer(data.token.address, "3000000" + "00000000000", { from: accounts[4] });

    });
    
    describe('dividend payment in presence of burn', async function () {

        beforeEach(async function () {
        
            await data.token.transfer(data.token.address, "2000000" + "00000000000", { from: accounts[4] });

            await data.token.burn("10000000"+"00000000000", { from: accounts[2] });
            await data.token.startNewDividendPeriod();

        });

        it('should have total supply of 55 mln', async function () {
            var balance = await data.token.totalSupply();
            balance.should.be.bignumber.equal(new BigNumber("55000000" + "00000000000"));

        });

        it('should have 5 mln on token address', async function () {
            var balance = await data.token.balanceOf(data.token.address);
            balance.should.be.bignumber.equal(new BigNumber("5000000" + "00000000000"));

        });

        it('should have amount to pay for account[1] set to ', async function () {
            var balance = await data.token.getAmountToPay(accounts[1]);
            balance.should.be.bignumber.equal(new BigNumber("200000000000000000"));

        });

        it('should have amount to pay for account[1] set to ', async function () {
            var balance = await data.token.getAmountToPay(accounts[1]);
            balance.should.be.bignumber.equal(new BigNumber("200000000000000000"));

        });

        describe('after transfers to self', async function () {

            beforeEach(async function () {

                await data.token.transfer(accounts[1], "0", { from: accounts[0] });
                await data.token.transfer(accounts[2], "0", { from: accounts[0] });
                await data.token.transfer(accounts[3], "0", { from: accounts[0] });

            });
            it('should pay dividend proportional to balance after burn', async function () {

                var tokenBalance = await data.token.balanceOf(accounts[1]);
                tokenBalance.mul(100).div(new BigNumber("22000000" + "00000000000")).should.be.bignumber.below(101);
                tokenBalance.mul(100).div(new BigNumber("22000000" + "00000000000")).should.be.bignumber.above(99);
                console.log(tokenBalance.toString());
                tokenBalance = await data.token.balanceOf(accounts[2]);
                tokenBalance.mul(100).div(new BigNumber("11000000" + "00000000000")).should.be.bignumber.below(101);
                tokenBalance.mul(100).div(new BigNumber("11000000" + "00000000000")).should.be.bignumber.above(99);
                console.log(tokenBalance.toString());
                tokenBalance = await data.token.balanceOf(accounts[3]);
                tokenBalance.mul(100).div(new BigNumber("22000000" + "00000000000")).should.be.bignumber.below(101);
                tokenBalance.mul(100).div(new BigNumber("22000000" + "00000000000")).should.be.bignumber.above(99);
                console.log(tokenBalance.toString());
            });
        });


    });
    
    it('should have proper balance on token address', async function () {

        var tokenBalance = await data.token.balanceOf(data.token.address);
        tokenBalance.should.be.bignumber.equal(new BigNumber("3000000" + "00000000000"));
        
    });

    describe('PwayToken extended transfers test', function () {

        beforeEach(async function () {


            var amountToBurn = (await data.token.balanceOf(accounts[4])).toString();
            await data.token.burn(amountToBurn, { from: accounts[4] });
            await data.token.startNewDividendPeriod();

            await data.token.transfer(accounts[2], "0", { from: accounts[1] });

        });


        it('should have proper totalSupply', async function () {
            var totalSupply = await data.token.totalSupply();
            totalSupply.should.be.bignumber.equal(new BigNumber("63000000" + "00000000000"));
        });

        it('should have zero amount to pay for reciver and sender', async function () {
            var amountToPay = await data.token.getAmountToPay(accounts[2]);
            amountToPay.should.be.bignumber.equal(new BigNumber("0"));
            amountToPay = await data.token.getAmountToPay(accounts[1]);
            amountToPay.should.be.bignumber.equal(new BigNumber("0"));
        });

        it('should not change amount to pay of unrelated account when making transfer', async function () {
            var amountToPay = await data.token.getAmountToPay(accounts[3]);
            amountToPay.should.be.bignumber.equal(new BigNumber("1000000" + "00000000000"));
        });

        it('should left balance on token equal to unpaid dividend when making transfer', async function () {
            

            var tokenBalance = await data.token.balanceOf(data.token.address);
            tokenBalance.should.be.bignumber.equal(new BigNumber("1000000" + "00000000000"));
        });

        it('should divident be distributed proportionaly to balance', async function () {


            var balanceAfter = await data.token.balanceOf(accounts[2]);
            balanceAfter.should.be.bignumber.equal(new BigNumber("2100000000000000000"));

            balanceAfter = await data.token.balanceOf(accounts[1]);
            balanceAfter.should.be.bignumber.equal(new BigNumber("2100000000000000000"));

            balanceAfter = await data.token.balanceOf(accounts[3]);
            balanceAfter.should.be.bignumber.equal(new BigNumber("2000000000000000000"));
        });

        describe('After second dividend to token', async function () {
            beforeEach(async function () {
                await data.token.transfer(data.token.address, "16000000" + "00000000000", { from: accounts[2] });
                await data.token.transfer(data.token.address, "1000000" + "00000000000", { from: accounts[1] });
                var amountToBurn = (await data.token.balanceOf(accounts[4])).toString();
                await data.token.burn(amountToBurn, { from: accounts[4] });
                await increaseTimeTo((await latestTime() + duration.days(91)));
                await data.token.startNewDividendPeriod();
            });

            it('should divident be distributed proportionaly to balance', async function () {

                var amountToPay = await data.token.getAmountToPay(accounts[3]);
                amountToPay.should.be.bignumber.equal(new BigNumber("800000000000000000"));

                amountToPay = await data.token.getAmountToPay(accounts[1]);
                amountToPay.should.be.bignumber.equal(new BigNumber("800000000000000000"));

                amountToPay = await data.token.getAmountToPay(accounts[2]);
                amountToPay.should.be.bignumber.equal(new BigNumber("200000000000000000"));

            });
            
            it('should have correct balances', async function () {

                var accBalance = await data.token.balanceOf(accounts[1]);
                accBalance.should.be.bignumber.equal(new BigNumber("20000000" + "00000000000"));
                accBalance = await data.token.balanceOf(accounts[2]);
                accBalance.should.be.bignumber.equal(new BigNumber("5000000" + "00000000000"));
                accBalance = await data.token.balanceOf(accounts[3]);
                accBalance.should.be.bignumber.equal(new BigNumber("20000000" + "00000000000"));
            });
            
            it('should have all unpaid dividend in token balance', async function () {

                var tokenBalance = await data.token.balanceOf(data.token.address);
                tokenBalance.should.be.bignumber.equal(new BigNumber("18000000" + "00000000000"));

            });

            describe('after transfer from all accounts to self', async function () {

                beforeEach(async function () {
                    await data.token.transfer(accounts[1], "0", { from: accounts[0] });

                    await data.token.transfer(accounts[2], "0", { from: accounts[0] });

                    await data.token.transfer(accounts[3], "0", { from: accounts[0] });
                });
                
                it('should have 0 amountToPay', async function () {

                    var amountToPay = await data.token.getAmountToPay(accounts[1]);
                    amountToPay.should.be.bignumber.equal(new BigNumber("0"));

                    amountToPay = await data.token.getAmountToPay(accounts[2]);
                    amountToPay.should.be.bignumber.equal(new BigNumber("0"));

                    amountToPay = await data.token.getAmountToPay(accounts[3]);
                    amountToPay.should.be.bignumber.equal(new BigNumber("0"));
                });

                it('should have updated balances', async function () {

                    var accBalance = await data.token.balanceOf(accounts[1]);
                    accBalance.add(5).should.be.bignumber.above(new BigNumber("28000000" + "00000000000"));
                    accBalance.sub(5).should.be.bignumber.below(new BigNumber("28000000" + "00000000000"));
                    console.log(accBalance.toString());
                    accBalance = await data.token.balanceOf(accounts[2]);
                    accBalance.add(5).should.be.bignumber.above(new BigNumber("7000000" + "00000000000"));
                    accBalance.sub(5).should.be.bignumber.below(new BigNumber("7000000" + "00000000000"));
                    console.log(accBalance.toString());
                    accBalance = await data.token.balanceOf(accounts[3]);
                    accBalance.add(5).should.be.bignumber.above(new BigNumber("28000000" + "00000000000"));
                    accBalance.sub(5).should.be.bignumber.below(new BigNumber("28000000" + "00000000000"));
                    console.log(accBalance.toString());

                });
                
                it('should have no funds left on token address', async function () {

                    var accBalance = await data.token.balanceOf(data.token.address);
                    console.log(accBalance.toString());
                    accBalance.should.be.bignumber.below(new BigNumber("10"));
                });

            });
        });

    });

    
});




