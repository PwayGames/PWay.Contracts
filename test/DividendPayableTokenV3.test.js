const DividendPayableTokenMock = artifacts.require('DividendPayableTokenMock');
const NameRegistry = artifacts.require('NameRegistry');

const BigNumber = web3.BigNumber;
const should = require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .should();


  var assertRevert= async function(promise){
      
      try {
        await promise;
        assert.fail('Expected revert not received');
      } catch (error) {
        const revertFound = error.message.search('revert') >= 0;
        assert(revertFound, `Expected "revert", got ${error} instead`);
      }
  }
  
contract('newDiv', async function ([_, recipient1, recipient2]) {
    var data = {};
    beforeEach(async function () {
        data.nameRegistry = await NameRegistry.new();
        data.token = await DividendPayableTokenMock.new(_, recipient1, recipient2, 10000, data.nameRegistry.address);
    });

    describe('token total supply', async function () {
        it('returns the total amount of tokens', async function () {
            var totalSupply = await data.token.totalSupply();
            assert.equal(totalSupply.toNumber(), 1000000);
        });
    });


    describe('token totalSupply', async function () {
        it('user1 has 97%', async function () {
            var supply = await data.token.balanceOf(_);
            assert.equal(supply.toNumber(), 97 * 10000);
        });
        it('user2 has 2%', async function () {
            var supply = await data.token.balanceOf(recipient1);
            assert.equal(supply.toNumber(), 2 * 10000);
        });
        it('user3 has 1%', async function () {
            var supply = await data.token.balanceOf(recipient2);
            assert.equal(supply.toNumber(), 1 * 10000);
        });
        it('do not change on transfer if no dividend', async function () {
            var totalSupply = await data.token.totalSupply();
            data.token.transfer(recipient1, 900);
            var totalSupply2 = await data.token.totalSupply();
            assert.equal(totalSupply.toNumber(), totalSupply2.toNumber());

        });

    });

    var tokenTransferTestCases = async function (_from, _to) {
        it('fails if user try to send more funds that he owns', async function () {
            var userOwns = (await data.token.balanceOf(_from)).toNumber();

            var promise = data.token.transfer(_to(), userOwns + 1, { from: _from });
            assertRevert(promise);
        });
        it('do not fail if user try to send all funds that he owns', async function () {
            var userOwns = (await data.token.balanceOf(_from)).toNumber();

            await data.token.transfer(_to(), userOwns, { from: _from });
        });
        it('do not fail if user try to send some funds that he owns', async function () {
            var userOwns = (await data.token.balanceOf(_from)).toNumber();

            const { logs } = await data.token.transfer(_to(), userOwns / 2, { from: _from });
            const event = logs.find(e => e.event === 'DividendPayed');

            console.log(JSON.stringify(event));
        });

        it('cause sender balance to decrease by send amount', async function () {
            var userOwns = (await data.token.balanceOf(_from)).toNumber();
            var amount = userOwns / 2;
            await data.token.transfer(_to(), amount, { from: _from });
            var userOwnsAfter = (await data.token.balanceOf(_from)).toNumber();
            assert.equal(userOwns, userOwnsAfter + amount);
        });

        it('cause recipient balance to increase by send amount', async function () {
            var userOwns = (await data.token.balanceOf(_to())).toNumber();
            var amount = userOwns / 2;
            await data.token.transfer(_to(), amount, { from: _from });
            var userOwnsAfter = (await data.token.balanceOf(_to())).toNumber();
            assert.equal(userOwns, userOwnsAfter - amount);
        });

    }

    var tokenTransferFromTestCases = async function (_from, _to, _as) {

        it('fails if user try to send more funds that he owns', async function () {
            var userOwns = (await data.token.balanceOf(_as())).toNumber();
            var amount = userOwns + 1;
            await data.token.approve(_from, amount, { from: _as() });

            var promise = data.token.transferFrom(_as(), _to(), amount, { from: _from });
            assertRevert(promise);
        });
        it('do not fail if user try to send all funds that he owns', async function () {
            var userOwns = (await data.token.balanceOf(_as())).toNumber();
            var amount = userOwns;
            await data.token.approve(_from, amount, { from: _as() });
            var promise = await data.token.transferFrom(_as(), _to(), amount, { from: _from });
            assertRevert(promise);
        });
        it('do not fail if user try to send some funds that he owns', async function () {
            var userOwns = (await data.token.balanceOf(_as())).toNumber();
            var amount = userOwns / 2;
            await data.token.approve(_from, amount, { from: _as() });

            await data.token.transferFrom(_as(), _to(), amount, { from: _from });
        });

        it('cause sender balance to decrease by send amount', async function () {

            var userOwns = (await data.token.balanceOf(_as())).toNumber();
            var amount = userOwns / 2;
            await data.token.approve(_from, amount, { from: _as() });

            await data.token.transferFrom(_as(), _to(), amount, { from: _from });

            var userOwnsAfter = (await data.token.balanceOf(_as())).toNumber();
            assert.equal(userOwns, userOwnsAfter + amount);
        });

        it('cause recipient balance to increase by send amount', async function () {
            var userOwns = (await data.token.balanceOf(_to())).toNumber();
            var amount = userOwns / 2;
            await data.token.approve(_from, amount, { from: _as() });

            await data.token.transferFrom(_as(), _to(), amount, { from: _from });

            var userOwnsAfter = (await data.token.balanceOf(_to())).toNumber();
            assert.equal(userOwns, userOwnsAfter - amount);
        });

    }

    describe('token transfer when no dividend to pay', async function () {
        tokenTransferTestCases(_, function () { return recipient1; });
    });

    describe('token transferFrom when no dividend to pay', async function () {
        tokenTransferFromTestCases(_, function () { return recipient1; }, function () { return recipient2; })

    });
    
    describe('token burn function', async function () {
        var testedUser;
        var testedUserStartBalance;
        var totalSupply;

        beforeEach(async function () {
            testedUser = recipient1;
            testedUserStartBalance = await data.token.balanceOf(testedUser);
            totalSupply = await data.token.totalSupply();
        });


        it('it decrease totalSupply by specified amount', async function () {
            var amountToBurn = testedUserStartBalance.div(5);
            var expectedAmountLeft = totalSupply.sub(amountToBurn);
            await data.token.burn(amountToBurn.toString(), { from: testedUser });
            var actualAmountLeft = await data.token.totalSupply();
            expectedAmountLeft.should.be.bignumber.equal(actualAmountLeft);
        });
        it('it decrease balanceOf by specified amount', async function () {
            var amountToBurn = testedUserStartBalance.div(5);
            var expectedAmountLeft = testedUserStartBalance.sub(amountToBurn);
            await data.token.burn(amountToBurn.toString(), { from: testedUser });
            var actualAmountLeft = await data.token.balanceOf(testedUser);
            expectedAmountLeft.should.be.bignumber.equal(actualAmountLeft);
        });
        it('it emits Transfer event to zero address during burn', async function () {

            var amountToBurn = testedUserStartBalance;
            var expectedAmountLeft = testedUserStartBalance.sub(amountToBurn);
            const { logs } = await data.token.burn(amountToBurn.toString(), { from: testedUser });
            var actualAmountLeft = await data.token.balanceOf(testedUser);
            expectedAmountLeft.should.be.bignumber.equal(actualAmountLeft);
            const event = logs.find(e => e.event === 'Transfer');
            event.should.be.not.equal(null);
            event.args.from.should.be.equal(testedUser);
            event.args.value.should.be.bignumber.equal(amountToBurn);
            event.args.to.should.be.equal("0x0000000000000000000000000000000000000000");
        });
        it('it allows to burn all users tokens', async function () {
            var amountToBurn = testedUserStartBalance;
            var expectedAmountLeft = testedUserStartBalance.sub(amountToBurn);
            await data.token.burn(amountToBurn.toString(), { from: testedUser });
            var actualAmountLeft = await data.token.balanceOf(testedUser);
            expectedAmountLeft.should.be.bignumber.equal(actualAmountLeft);
        });
        it('it fails if try to burn more than balance Of', async function () {
            var amountToBurn = testedUserStartBalance.add(1);
            var promise = data.token.burn(amountToBurn.toString(), { from: testedUser });
            assertRevert(promise);
        });
    });

    describe('fallback function', async function () {
        it('it reverts', async function () {
            var promise = data.token.sendTransaction({ from: recipient1, data: "0x" });
            assertRevert(promise);
        });
    });

    describe('token transfer to token contract address', async function () {

        it('increases dividendSum amount by sended amount ', async function () {
            var dividendSumBefore = await data.token.balanceOf(data.token.address);
            var amount = 100;
            await data.token.transfer(data.token.address, amount, { from: _ });
            var dividendSumAfter = await data.token.balanceOf(data.token.address);
            await dividendSumBefore.plus(100).should.be.bignumber.equal(dividendSumAfter);

        });
    });

    describe('token transferFrom to token contract address', async function () {
        tokenTransferFromTestCases(_,
            function () { return data.token.address; },
            function () { return recipient2; })

        xit('increases dividendSum amount by sended amount ', async function () {
            /*nieaktualne po wprowadzeniu FACTOR */
            var dividendSumBefore = (await data.token.totalDividendSum()).toNumber();
            var amount = 100;
            await data.token.approve(_, amount, { from: recipient1 });
            await data.token.transferFrom(recipient1, data.token.address, amount, { from: _ });
            var dividendSumAfter = (await data.token.totalDividendSum()).toNumber();
            assert.equal(dividendSumAfter, dividendSumBefore + amount);
        });
    });

});
  
  
  
  
  