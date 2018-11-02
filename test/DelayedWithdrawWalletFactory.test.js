const PwayToken = artifacts.require('PwayToken');
const NameRegistry = artifacts.require('NameRegistry');
const PwayDelayedWithdrawWallet = artifacts.require('PwayDelayedWithdrawWallet');
const PwayDelayedWithdrawWalletFactory = artifacts.require('PwayDelayedWithdrawWalletFactory');
import { latestTime } from 'openzeppelin-solidity/test/helpers/latestTime';
import { increaseTimeTo, duration } from 'openzeppelin-solidity/test/helpers/increaseTime';
import { ether } from 'openzeppelin-solidity/test/helpers/ether';
import EVMRevert from 'openzeppelin-solidity/test/helpers/EVMRevert';

const BigNumber = web3.BigNumber;
const should = require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .should();

contract('PwayDelayedWithdrawWalletFactory', function (accounts) {
    var data = {};
    const RATE = new BigNumber(1000);

    beforeEach(async function () {
        data.nameRegistry =await NameRegistry.new();
        var now = (await latestTime());

        data.token = await PwayToken.new(data.nameRegistry.address,now);
        data.DECIMALS = await data.token.decimals();
        data.walletTokenAmount = new BigNumber(10).pow(data.DECIMALS).times(1000);

        data.walletFactory = await PwayDelayedWithdrawWalletFactory.new(data.nameRegistry.address);
        //1000 tokens;
        await data.token.transfer(data.walletFactory.address, data.walletTokenAmount);

    });

    describe('PwayDelayedWithdrawWalletFactory base test', function () {
        it('should log new wallet created', async function () {
            var lockTime =  duration.years(1);
            var tokenAmount = new BigNumber(10).pow(data.DECIMALS).times(100);

            const { logs } = await data.walletFactory.createWallet(accounts[3], lockTime, tokenAmount);
            const event = logs.find(e => e.event === 'WalletCreated');
            should.exist(event);
            should.exist(event.args.walletAddress);
            event.args.beneficiary.should.equal(accounts[3]);
            event.args.lockTime.should.be.bignumber.equal(lockTime);
            event.args.tokenAmount.should.be.bignumber.equal(tokenAmount);

        });

        it('should created new wallet with proper token balance', async function () {
            var lockTime =  duration.years(1);
            var tokenAmount = new BigNumber(10).pow(data.DECIMALS).times(100);

            const { logs } = await data.walletFactory.createWallet(accounts[3], lockTime, tokenAmount);
            const event = logs.find(e => e.event === 'WalletCreated');
            should.exist(event);

            var balance = await data.token.balanceOf(event.args.walletAddress);
            balance.should.be.bignumber.equal(tokenAmount);
        });

        it('factory should reduce token by amount sent to wallet', async function () {
            var lockTime =  duration.years(1);
            var tokenAmount = new BigNumber(10).pow(data.DECIMALS).times(100);

            const { logs } = await data.walletFactory.createWallet(accounts[3], lockTime, tokenAmount);
            const event = logs.find(e => e.event === 'WalletCreated');
            should.exist(event);

            var balance = await data.token.balanceOf(data.walletFactory.address);
            balance.should.be.bignumber.equal(data.walletTokenAmount - tokenAmount);
        });

        it('should return correct withdrawTime', async function () {
            var lockTime =  duration.years(1);
            var tokenAmount = new BigNumber(10).pow(data.DECIMALS).times(100);

            var now = (await latestTime());
            const { logs } = await data.walletFactory.createWallet(accounts[3], lockTime, tokenAmount);
            const event = logs.find(e => e.event === 'WalletCreated');
            should.exist(event);
            var wallet = new PwayDelayedWithdrawWallet(event.args.walletAddress);

            var withdrawTime = await wallet.getWithdrawTime();
            withdrawTime.should.be.bignumber.greaterThan(now + lockTime - 1);
            withdrawTime.should.be.bignumber.lessThan(now + lockTime + 100);
        });

        it('wallet should have owner equal to beneficiary', async function () {
            var lockTime = duration.years(1);
            var tokenAmount = new BigNumber(10).pow(data.DECIMALS).times(100);

            var now = (await latestTime());
            const { logs } = await data.walletFactory.createWallet(accounts[3], lockTime, tokenAmount);
            const event = logs.find(e => e.event === 'WalletCreated');
            should.exist(event);
            var wallet = new PwayDelayedWithdrawWallet(event.args.walletAddress);

            var benef = await wallet.beneficiary();
            var owner = await wallet.owner();

            benef.should.be.equal(accounts[3]);
            owner.should.be.equal(accounts[3]);
        });

        it('wallet should allow change of beneficiary (and owner by that)', async function () {
            var lockTime = duration.years(1);
            var tokenAmount = new BigNumber(10).pow(data.DECIMALS).times(100);

            var now = (await latestTime());
            const { logs } = await data.walletFactory.createWallet(accounts[3], lockTime, tokenAmount);
            const event = logs.find(e => e.event === 'WalletCreated');
            should.exist(event);
            var wallet = new PwayDelayedWithdrawWallet(event.args.walletAddress);
            await wallet.changeBeneficiary(accounts[4], { from: accounts[3] });

            var benef = await wallet.beneficiary();
            var owner = await wallet.owner();

            benef.should.be.equal(accounts[4]);
            owner.should.be.equal(accounts[4]);
        });
        it('should fail when sending ETH to new wallet', async function () {
            var lockTime =  duration.years(1);
            var tokenAmount = new BigNumber(10).pow(data.DECIMALS).times(100);

            const { logs } = await data.walletFactory.createWallet(accounts[3], lockTime, tokenAmount);
            const event = logs.find(e => e.event === 'WalletCreated');
            should.exist(event);
            var wallet = new PwayDelayedWithdrawWallet(event.args.walletAddress);
            await wallet.sendTransaction({value:ether(0.001), from:accounts[3]}).should.be.rejectedWith(EVMRevert)

        });

        it('should fail when withdraw before withdrawTime', async function () {
            var lockTime =  duration.years(1);
            var tokenAmount = new BigNumber(10).pow(data.DECIMALS).times(100);

            var now = await latestTime();
            const { logs } = await data.walletFactory.createWallet(accounts[3], lockTime, tokenAmount);
            const event = logs.find(e => e.event === 'WalletCreated');
            should.exist(event);
            var wallet = new PwayDelayedWithdrawWallet(event.args.walletAddress);
            await wallet.sendTransaction({ from:accounts[3]}).should.be.rejectedWith(EVMRevert)

        });

        it('should success when withdraw after withdrawTime and balanace should match', async function () {
            var lockTime =  duration.years(1);
            var tokenAmount = new BigNumber(10).pow(data.DECIMALS).times(100);

            const { logs } = await data.walletFactory.createWallet(accounts[3], lockTime, tokenAmount);
            const event = logs.find(e => e.event === 'WalletCreated');
            should.exist(event);
            var wallet = new PwayDelayedWithdrawWallet(event.args.walletAddress);
            var latestTimeVal = await (latestTime());
            await increaseTimeTo(latestTimeVal+ duration.years(1) + duration.weeks(1));
            await wallet.sendTransaction({ from: accounts[3] }).should.be.fulfilled;

            var balance = await data.token.balanceOf(event.args.walletAddress);
            balance.should.be.bignumber.equal(0);

            balance = await data.token.balanceOf(accounts[3]);
            balance.should.be.bignumber.equal(tokenAmount);
        });

        it('should get wallet address for beneficiary ', async function () {
            var lockTime =  duration.years(1);
            var tokenAmount = new BigNumber(10).pow(data.DECIMALS).times(100);

            const { logs } = await data.walletFactory.createWallet(accounts[3], lockTime, tokenAmount);
            const event = logs.find(e => e.event === 'WalletCreated');

            var userWallet = await data.walletFactory.wallets(accounts[3]);
            event.args.walletAddress.should.be.equal(userWallet);

        });

    });

});



