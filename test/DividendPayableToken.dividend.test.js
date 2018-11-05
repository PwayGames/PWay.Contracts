import { latestTime } from 'openzeppelin-solidity/test/helpers/latestTime';
import { advanceBlock } from 'openzeppelin-solidity/test/helpers/advanceToBlock';
import { increaseTimeTo, duration } from 'openzeppelin-solidity/test/helpers/increaseTime';
import EVMRevert from 'openzeppelin-solidity/test/helpers/EVMRevert';
const NameRegistry = artifacts.require('NameRegistry');
const PwayToken = artifacts.require('PwayToken');

const BigNumber = web3.BigNumber;
const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

contract('DividendPayableToken Complex Dividend', function (accounts) {
  var data = {};

  var displayBalance = async function () {
    var balance = (await data.token.balanceOf(accounts[0]));
    var balance1 = (await data.token.balanceOf(accounts[1]));
    var balance2 = (await data.token.balanceOf(accounts[2]));
    var balance3 = (await data.token.balanceOf(accounts[3]));

    console.log(`Balacne 0 ${balance.toString()} Balacne 1 ${balance1.toString()} Balacne 2 ${balance2.toString()} Balacne 3 ${balance3.toString()}`);
  }

  beforeEach(async function () {
    data.nameRegistry = await NameRegistry.new();

    var now = await latestTime();

    data.startTime = now + duration.days(1);
    data.token = await PwayToken.new(data.nameRegistry.address, now - duration.days(91));//.new(_, recipient1, recipient2,"100000"+ "00000000000", data.nameRegistry.address);

    await data.token.transfer(accounts[1], "200000" + "00000000000");
    await data.token.transfer(accounts[2], "100000" + "00000000000");

    var accBalance = await data.token.balanceOf(accounts[0]);
    await data.token.burn(accBalance.minus(new BigNumber("9700000" + "00000000000")), { from: accounts[0] });

    var totalSupply = await data.token.totalSupply();
    //console.log(totalSupply.toString());

  });


  describe('dividend Release after DIV_PERIOD passed', function () {
    it('should pay proportional dividend', async function () {

      var dividendAmount = new BigNumber("100000" + "00000000000");
      await data.token.transfer(data.token.address, dividendAmount);
      await data.token.startNewDividendPeriod();

      var user0Owns = (await data.token.balanceOf(accounts[0]));
      var user1Owns = (await data.token.balanceOf(accounts[1]));
      var user2Owns = (await data.token.balanceOf(accounts[2]));

      var totalSupply = await data.token.totalSupply();
      var factor = dividendAmount.div(totalSupply.minus(dividendAmount));

      var expectedDividendForAccount0 = user0Owns.mul(factor);
      var expectedDividendForAccount1 = user1Owns.mul(factor);
      var expectedDividendForAccount2 = user2Owns.mul(factor);

      var increaseTime = (await latestTime()) + duration.days(91);
      await increaseTimeTo(increaseTime);
      await data.token.startNewDividendPeriod();

      await data.token.transfer(accounts[2], 0, { from: accounts[1] });
      await data.token.transfer(accounts[0], 0, { from: accounts[1] });

      var user0OwnsAfter = (await data.token.balanceOf(accounts[0]));
      var user2OwnsAfter = (await data.token.balanceOf(accounts[2]));
      var user1OwnsAfter = (await data.token.balanceOf(accounts[1]));

      //range max 1000 wei
      user0OwnsAfter.should.be.bignumber.below(user0Owns.plus(expectedDividendForAccount0).plus(1000));
      user0OwnsAfter.should.be.bignumber.above(user0Owns.plus(expectedDividendForAccount0).minus(1000));

      user1OwnsAfter.should.be.bignumber.below(user1Owns.plus(expectedDividendForAccount1).plus(1000));
      user1OwnsAfter.should.be.bignumber.above(user1Owns.plus(expectedDividendForAccount1).minus(1000));

      user2OwnsAfter.should.be.bignumber.below(user2Owns.plus(expectedDividendForAccount2).plus(1000));
      user2OwnsAfter.should.be.bignumber.above(user2Owns.plus(expectedDividendForAccount2).minus(1000));

    });

    it('should not allow starting a new dividend period before the 90 days cooldown', async function () {

      await data.token.startNewDividendPeriod();
      var increaseTime = (await latestTime()) + duration.days(89);
      await increaseTimeTo(increaseTime);
      await data.token.startNewDividendPeriod().should.be.rejectedWith(EVMRevert);

    });

    //A-> token / B-> D( empty balance) / D->E (empty balance)
    it('should not calculate dividend twice', async function () {

      await data.token.transfer(data.token.address, "100000" + "00000000000");
      await data.token.startNewDividendPeriod();

      await data.token.transfer(accounts[3], "50000" + "00000000000", { from: accounts[1] });
      await data.token.transfer(accounts[4], "50000" + "00000000000", { from: accounts[3] });

      var user3OwnsAfter = (await data.token.balanceOf(accounts[3]));
      user3OwnsAfter.should.be.bignumber.equals(new BigNumber(0));
    });

    it('should get 2 dividends in first period and in next period and dividend should be different', async function () {

      await data.token.transfer(data.token.address, "100000" + "00000000000");
      await data.token.startNewDividendPeriod();
      var increaseTime = (await latestTime()) + duration.days(91);
      await increaseTimeTo(increaseTime);

      var amountToPayBefore = await data.token.getAmountToPay(accounts[1]);

      await data.token.transfer(accounts[3], "0", { from: accounts[1] });
      await data.token.startNewDividendPeriod();

      var amountToPayAfter = await data.token.getAmountToPay(accounts[1]);
      await data.token.transfer(accounts[3], "200000" + "00000000000", { from: accounts[1] });

      var user1OwnsAfter = (await data.token.balanceOf(accounts[1]));

      user1OwnsAfter.should.be.bignumber.above(new BigNumber(0));

      console.log(amountToPayBefore.toString(), amountToPayAfter.toString());
      amountToPayBefore.should.be.bignumber.above(amountToPayAfter);
    });

    //send to dividend and transfer check
    it('should not include additional dividend and should not calculate dividend when sending to token SC', async function () {
      await data.token.transfer(data.token.address, "100000" + "00000000000");

      await data.token.startNewDividendPeriod();

      var dividendAmount = new BigNumber("200000" + "00000000000");
      var user1Owns = (await data.token.balanceOf(accounts[1]));

      await data.token.transfer(data.token.address, dividendAmount, { from: accounts[1] });

      var user1OwnsAfter = (await data.token.balanceOf(accounts[1]));
      user1OwnsAfter.should.be.bignumber.equals(user1Owns.minus(dividendAmount));

      var totalSupply = await data.token.totalSupply();
      var factor = dividendAmount.div(totalSupply.minus(dividendAmount));
      var expectedDividendForAccount1 = user1OwnsAfter.mul(factor);

      await data.token.transfer(data.token.address, "0", { from: accounts[1] });

      var balanceAfterDividend = (await data.token.balanceOf(accounts[1]));

      //range 1000 wei
      balanceAfterDividend.should.be.bignumber.below(user1OwnsAfter.plus(expectedDividendForAccount1).plus(1000));
      balanceAfterDividend.should.be.bignumber.above(user1OwnsAfter.plus(expectedDividendForAccount1).minus(1000));

    });

    it('should pay proportional dividend when transferFrom case A->(A->A)', async function () {
      var dividendAmount = new BigNumber("100000" + "00000000000");

      await data.token.transfer(data.token.address, dividendAmount);
      await data.token.startNewDividendPeriod();

      var user1Owns = (await data.token.balanceOf(accounts[1]));

      var totalSupply = await data.token.totalSupply();
      var factor = dividendAmount.div(totalSupply.minus(dividendAmount));
      var expectedDividendForAccount1 = user1Owns.mul(factor);

      var allowanceAmount = new BigNumber("9999" + "00000000000");

      await data.token.approve(accounts[1], allowanceAmount, {from:accounts[1]});
      await data.token.transferFrom(accounts[1],accounts[1],  allowanceAmount, { from: accounts[1] });

      //should pay dividend for account 1;
      var user1OwnsAfter = (await data.token.balanceOf(accounts[1]));

       //range 1000 wei
       user1OwnsAfter.should.be.bignumber.below(user1Owns.plus(expectedDividendForAccount1).plus(1000));
       user1OwnsAfter.should.be.bignumber.above(user1Owns.plus(expectedDividendForAccount1).minus(1000));
    });

    it('should not pay dividend when transferFrom case A->(A->token)', async function () {
      var dividendAmount = new BigNumber("100000" + "00000000000");

      await data.token.transfer(data.token.address, dividendAmount);
      await data.token.startNewDividendPeriod();

      var user1Owns = (await data.token.balanceOf(accounts[1]));

      var totalSupply = await data.token.totalSupply();
      var factor = dividendAmount.div(totalSupply.minus(dividendAmount));
      var expectedDividendForAccount1 = user1Owns.mul(factor);

      var allowanceAmount = new BigNumber("9999" + "00000000000");

      await data.token.approve(accounts[1], allowanceAmount, {from:accounts[1]});
      await data.token.transferFrom(accounts[1],data.token.address, allowanceAmount, { from: accounts[1] });

      //should pay dividend for account 1;
      var user1OwnsAfter = (await data.token.balanceOf(accounts[1]));
       user1OwnsAfter.should.be.bignumber.equal(user1Owns.minus(allowanceAmount));

    });

    it('should pay proportional dividend when transferFrom case A->(A->B)', async function () {
      var dividendAmount = new BigNumber("100000" + "00000000000");

      await data.token.transfer(data.token.address, dividendAmount);
      await data.token.startNewDividendPeriod();

      var user1Owns = (await data.token.balanceOf(accounts[1]));
      var user2Owns = (await data.token.balanceOf(accounts[2]));

      var totalSupply = await data.token.totalSupply();
      var factor = dividendAmount.div(totalSupply.minus(dividendAmount));
      var expectedDividendForAccount1 = user1Owns.mul(factor);
      var expectedDividendForAccount2 = user2Owns.mul(factor);

      var allowanceAmount = new BigNumber("9999" + "00000000000");

      await data.token.approve(accounts[1], allowanceAmount, {from:accounts[1]});
      await data.token.transferFrom(accounts[1],accounts[2], allowanceAmount, { from: accounts[1] });
      var user1OwnsAfter = (await data.token.balanceOf(accounts[1]));
      var user2OwnsAfter = (await data.token.balanceOf(accounts[2]));

      //range 1000 wei
      user1OwnsAfter.should.be.bignumber.below(user1Owns.plus(expectedDividendForAccount1).minus(allowanceAmount).plus(1000));
      user1OwnsAfter.should.be.bignumber.above(user1Owns.plus(expectedDividendForAccount1).minus(allowanceAmount).minus(1000));

      //range 1000 wei
      user2OwnsAfter.should.be.bignumber.below(user2Owns.plus(expectedDividendForAccount2).plus(allowanceAmount).plus(1000));
      user2OwnsAfter.should.be.bignumber.above(user2Owns.plus(expectedDividendForAccount2).plus(allowanceAmount).minus(1000));

    });

    it('should pay proportional dividend when transferFrom case A->(B->A)', async function () {
      var dividendAmount = new BigNumber("100000" + "00000000000");

      await data.token.transfer(data.token.address, dividendAmount);
      await data.token.startNewDividendPeriod();

      var user1Owns = (await data.token.balanceOf(accounts[1]));
      var user2Owns = (await data.token.balanceOf(accounts[2]));

      var totalSupply = await data.token.totalSupply();
      var factor = dividendAmount.div(totalSupply.minus(dividendAmount));
      var expectedDividendForAccount1 = user1Owns.mul(factor);
      var expectedDividendForAccount2 = user2Owns.mul(factor);

      var allowanceAmount = new BigNumber("9999" + "00000000000");

      await data.token.approve(accounts[1], allowanceAmount, {from:accounts[2]});
      await data.token.transferFrom(accounts[2],accounts[1], allowanceAmount, { from: accounts[1] });
      var user1OwnsAfter = (await data.token.balanceOf(accounts[1]));
      var user2OwnsAfter = (await data.token.balanceOf(accounts[2]));

      //range 1000 wei
      user1OwnsAfter.should.be.bignumber.below(user1Owns.plus(expectedDividendForAccount1).plus(allowanceAmount).plus(1000));
      user1OwnsAfter.should.be.bignumber.above(user1Owns.plus(expectedDividendForAccount1).plus(allowanceAmount).minus(1000));

      //range 1000 wei
      user2OwnsAfter.should.be.bignumber.below(user2Owns.plus(expectedDividendForAccount2).minus(allowanceAmount).plus(1000));
      user2OwnsAfter.should.be.bignumber.above(user2Owns.plus(expectedDividendForAccount2).minus(allowanceAmount).minus(1000));

    });

    it('should pay proportional dividend when transferFrom case A->(B->B)', async function () {
      var dividendAmount = new BigNumber("100000" + "00000000000");

      await data.token.transfer(data.token.address, dividendAmount);
      await data.token.startNewDividendPeriod();

      var user1Owns = (await data.token.balanceOf(accounts[1]));
      var user2Owns = (await data.token.balanceOf(accounts[2]));

      var totalSupply = await data.token.totalSupply();
      var factor = dividendAmount.div(totalSupply.minus(dividendAmount));
      var expectedDividendForAccount1 = user1Owns.mul(factor);
      var expectedDividendForAccount2 = user2Owns.mul(factor);

      var allowanceAmount = new BigNumber("9999" + "00000000000");

      await data.token.approve(accounts[1], allowanceAmount, {from:accounts[2]});
      await data.token.transferFrom(accounts[2],accounts[2], allowanceAmount, { from: accounts[1] });
      var user1OwnsAfter = (await data.token.balanceOf(accounts[1]));
      var user2OwnsAfter = (await data.token.balanceOf(accounts[2]));

      //range 1000 wei
      user1OwnsAfter.should.be.bignumber.below(user1Owns.plus(expectedDividendForAccount1).plus(1000));
      user1OwnsAfter.should.be.bignumber.above(user1Owns.plus(expectedDividendForAccount1).minus(1000));

      //range 1000 wei
      user2OwnsAfter.should.be.bignumber.below(user2Owns.plus(expectedDividendForAccount2).plus(1000));
      user2OwnsAfter.should.be.bignumber.above(user2Owns.plus(expectedDividendForAccount2).minus(1000));

    });

    it('should not pay dividend when transferFrom case A->(B->token)', async function () {
      var dividendAmount = new BigNumber("100000" + "00000000000");

      await data.token.transfer(data.token.address, dividendAmount);
      await data.token.startNewDividendPeriod();

      var user1Owns = (await data.token.balanceOf(accounts[1]));
      var user2Owns = (await data.token.balanceOf(accounts[2]));

      var totalSupply = await data.token.totalSupply();
      var factor = dividendAmount.div(totalSupply.minus(dividendAmount));
      var expectedDividendForAccount1 = user1Owns.mul(factor);
      var expectedDividendForAccount2 = user2Owns.mul(factor);

      var allowanceAmount = new BigNumber("9999" + "00000000000");

      await data.token.approve(accounts[1], allowanceAmount, {from:accounts[2]});
      await data.token.transferFrom(accounts[2],data.token.address, allowanceAmount, { from: accounts[1] });
      var user1OwnsAfter = (await data.token.balanceOf(accounts[1]));
      var user2OwnsAfter = (await data.token.balanceOf(accounts[2]));

      user1OwnsAfter.should.be.bignumber.equals(user1Owns);
      user2OwnsAfter.should.be.bignumber.equals(user2Owns.minus(allowanceAmount));

    });

    it('should pay proportional dividend when transferFrom case A->(B->C)', async function () {
      var dividendAmount = new BigNumber("100000" + "00000000000");

      await data.token.transfer(data.token.address, dividendAmount);
      await data.token.startNewDividendPeriod();

      var user1Owns = (await data.token.balanceOf(accounts[1]));
      var user2Owns = (await data.token.balanceOf(accounts[2]));
      var user0Owns = (await data.token.balanceOf(accounts[0]));

      var totalSupply = await data.token.totalSupply();
      var factor = dividendAmount.div(totalSupply.minus(dividendAmount));
      var expectedDividendForAccount1 = user1Owns.mul(factor);
      var expectedDividendForAccount2 = user2Owns.mul(factor);
      var expectedDividendForAccount0 = user0Owns.mul(factor);

      var allowanceAmount = new BigNumber("9999" + "00000000000");

      await data.token.approve(accounts[1], allowanceAmount, {from:accounts[2]});
      await data.token.transferFrom(accounts[2],accounts[0], allowanceAmount, { from: accounts[1] });
      var user1OwnsAfter = (await data.token.balanceOf(accounts[1]));
      var user2OwnsAfter = (await data.token.balanceOf(accounts[2]));
      var user0OwnsAfter = (await data.token.balanceOf(accounts[0]));

      //range 1000 wei
      user1OwnsAfter.should.be.bignumber.below(user1Owns.plus(expectedDividendForAccount1).plus(1000));
      user1OwnsAfter.should.be.bignumber.above(user1Owns.plus(expectedDividendForAccount1).minus(1000));

      //range 1000 wei
      user2OwnsAfter.should.be.bignumber.below(user2Owns.plus(expectedDividendForAccount2).minus(allowanceAmount).plus(1000));
      user2OwnsAfter.should.be.bignumber.above(user2Owns.plus(expectedDividendForAccount2).minus(allowanceAmount).minus(1000));

      //range 1000 wei
      user0OwnsAfter.should.be.bignumber.below(user0Owns.plus(expectedDividendForAccount0).plus(allowanceAmount).plus(1000));
      user0OwnsAfter.should.be.bignumber.above(user0Owns.plus(expectedDividendForAccount0).plus(allowanceAmount).minus(1000));

    });

  });

});




