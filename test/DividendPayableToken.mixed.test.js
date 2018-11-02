const PwayToken = artifacts.require('PwayToken');
const NameRegistry = artifacts.require('NameRegistry');
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
    
  
  contract('DividendPayableToken Complex Dividend', function (accounts) {
       var data = {};
 
          beforeEach(async function () {
            
              data.registry = await NameRegistry.new();
              var now = await latestTime(); 

              data.token = await PwayToken.new(data.registry.address, now - duration.days(91));
             
              await data.token.transfer(accounts[1], "10000000" + "00000000000");
              await data.token.transfer(accounts[2], "10000000" + "00000000000");
              await data.token.transfer(accounts[3], "10000000" + "00000000000");
              await data.token.transfer(accounts[4], "30000000" + "00000000000");
              
              var amountToBurn = await data.token.balanceOf(accounts[0]);
              await data.token.burn(amountToBurn, { from: accounts[0] });
            
              var total  = await data.token.totalSupply();
              
          });

          var displayData = function (data, prefix) {
            var description ="";
            for(var i=0;i<data.length;i++) {
                description+= (prefix + i + " : " + data[i].toString()+ " | ");
            }
            console.log(description);
          }

          var getBalance = async function (amount) {
            var balances =[];
            for(var i=0;i<amount;i++) {
                var balance = (await data.token.balanceOf(accounts[i]));
                balances.push(balance);
            }
            return balances;
          }
          
          
          describe('dividend dependencies tests', function () {
            it('should pay proportional dividend after significant burn operation', async function () {
              
                var dividendAmount = new BigNumber("30000000" + "00000000000");
                await data.token.transfer(data.token.address, dividendAmount, { from: accounts[4] });
                await data.token.startNewDividendPeriod();

                var user2Owns = (await data.token.balanceOf(accounts[2]));
                var totalSupply = await data.token.totalSupply();
                var factor = dividendAmount.div(totalSupply.minus(dividendAmount));
                var expectedDividendForAccount2 = user2Owns.mul(factor);
           
                var amountToBurn = await data.token.balanceOf(accounts[1]);
                await data.token.burn(amountToBurn, { from: accounts[1] });

                await data.token.transfer(accounts[2], 0, { from: accounts[1] });
                var user2OwnsAfter = (await data.token.balanceOf(accounts[2]));

                user2OwnsAfter.should.be.bignumber.below(user2Owns.plus(expectedDividendForAccount2).plus(1000));
                user2OwnsAfter.should.be.bignumber.above(user2Owns.plus(expectedDividendForAccount2).minus(1000));
               
            });


            it('should pay proportional dividend for A B C D after A->B->C->D->E->A', async function () {
              
                var dividendAmount = new BigNumber("10000000" + "00000000000");
                await data.token.transfer(data.token.address, dividendAmount, { from: accounts[4] });
                await data.token.startNewDividendPeriod();

                var userOwns = await getBalance(6);
               
                var totalSupply = await data.token.totalSupply();
                var factor = dividendAmount.div(totalSupply.minus(dividendAmount));
                
                var expectedDividendForAccount=[new BigNumber(0)];

                for(var i=1;i<5;i++)
                    expectedDividendForAccount[i] = userOwns[i].mul(factor);

                var transferAmount = new BigNumber("990000" + "00000000000");

                await data.token.transfer(accounts[2], transferAmount, { from: accounts[1] });
                await data.token.transfer(accounts[3], transferAmount, { from: accounts[2] });
                await data.token.transfer(accounts[4], transferAmount, { from: accounts[3] });
                await data.token.transfer(accounts[5], transferAmount, { from: accounts[4] });
                await data.token.transfer(accounts[1], transferAmount, { from: accounts[5] });
                
                var userOwnsAfter = await getBalance(6);

                for(var i=1;i<5;i++) {
                    userOwnsAfter[i].should.be.bignumber.below(userOwns[i].plus(expectedDividendForAccount[i]).plus(1000));
                    userOwnsAfter[i].should.be.bignumber.above(userOwns[i].plus(expectedDividendForAccount[i]).minus(1000));
                }
              
                userOwnsAfter[5].should.be.bignumber.equals(userOwns[5]);
               
            });

            it('should pay proportional dividend for A B C D after A->B->C->token (restart dividend )  C->burn  C->D->B->A', async function () {
              
                var dividendAmount = new BigNumber("10000000" + "00000000000");
                await data.token.transfer(data.token.address, dividendAmount, { from: accounts[4] });
                await data.token.startNewDividendPeriod();

                var userOwns = await getBalance(5);
          
                var totalSupply = await data.token.totalSupply();
                var factor = dividendAmount.div(totalSupply.minus(dividendAmount));

                var expectedDividendForAccount = [];
                for(var i=0;i<5;i++)
                    expectedDividendForAccount[i] = userOwns[i].mul(factor);
                
                var transferAmount = new BigNumber("990000" + "00000000000");

                //A->B->C->token
                await data.token.transfer(accounts[2], transferAmount, { from: accounts[1] });
                await data.token.transfer(accounts[3], transferAmount, { from: accounts[2] });
                await data.token.transfer(data.token.address, transferAmount, { from: accounts[3] });

                var userOwnsAfter = await getBalance(5);

                userOwnsAfter[1].should.be.bignumber.below(userOwns[1].plus(expectedDividendForAccount[1]).plus(1000).minus(transferAmount));
                userOwnsAfter[1].should.be.bignumber.above(userOwns[1].plus(expectedDividendForAccount[1]).minus(1000).minus(transferAmount));
                
                userOwnsAfter[2].should.be.bignumber.below(userOwns[2].plus(expectedDividendForAccount[2]).plus(1000));
                userOwnsAfter[2].should.be.bignumber.above(userOwns[2].plus(expectedDividendForAccount[2]).minus(1000));
           
                userOwnsAfter[3].should.be.bignumber.below(userOwns[3].plus(expectedDividendForAccount[3]).plus(1000));
                userOwnsAfter[3].should.be.bignumber.above(userOwns[3].plus(expectedDividendForAccount[3]).minus(1000));

                //// NEW DIVIDEND PERIOD 
                var increaseTime = (await latestTime()) + duration.days(91);
                await increaseTimeTo(increaseTime);
                
                await data.token.startNewDividendPeriod();
                var currentTokenBalance = await data.token.balanceOf(data.token.address);
                
                totalSupply = await data.token.totalSupply();
                factor = currentTokenBalance.div(totalSupply.minus(currentTokenBalance));
                
                var userOwnsNewPeriod = await getBalance(5);
                var expectedDividendForAccountNewPeriod = [];
                for(var i=0;i<5;i++)
                    expectedDividendForAccountNewPeriod[i] = userOwnsNewPeriod[i].mul(factor);

                //C->burn
                var amountToBurn = new BigNumber("4000000"+ "00000000000");
                await data.token.burn(amountToBurn, { from: accounts[3] });

                var balanceAfterBurn = await data.token.balanceOf(accounts[3]);
                expectedDividendForAccountNewPeriod[3] = balanceAfterBurn.mul(factor);

        
                //C->D->B->A
                await data.token.transfer(accounts[4], transferAmount, { from: accounts[3] });
                await data.token.transfer(accounts[2], transferAmount, { from: accounts[4] });
                await data.token.transfer(accounts[1], transferAmount, { from: accounts[2] });
                
                var userOwnsAfterNewRound = await getBalance(6);

                userOwnsAfterNewRound[1].should.be.bignumber.below(userOwns[1].plus(expectedDividendForAccount[1]).plus(expectedDividendForAccountNewPeriod[1]).plus(1000));
                userOwnsAfterNewRound[1].should.be.bignumber.above(userOwns[1].plus(expectedDividendForAccount[1]).plus(expectedDividendForAccountNewPeriod[1]).minus(1000));
              
                userOwnsAfterNewRound[2].should.be.bignumber.below(userOwns[2].plus(expectedDividendForAccount[2]).plus(expectedDividendForAccountNewPeriod[2]).plus(1000));
                userOwnsAfterNewRound[2].should.be.bignumber.above(userOwns[2].plus(expectedDividendForAccount[2]).plus(expectedDividendForAccountNewPeriod[2]).minus(1000));
               
                userOwnsAfterNewRound[3].should.be.bignumber.below(userOwns[3].minus(amountToBurn).plus(expectedDividendForAccount[3])
                    .plus(expectedDividendForAccountNewPeriod[3]).minus(transferAmount).plus(1000));
                userOwnsAfterNewRound[3].should.be.bignumber.above(userOwns[3].minus(amountToBurn).plus(expectedDividendForAccount[3])
                    .plus(expectedDividendForAccountNewPeriod[3]).minus(transferAmount).minus(1000));
                
                userOwnsAfterNewRound[4].should.be.bignumber.below(userOwns[4].plus(expectedDividendForAccountNewPeriod[4]).plus(1000));
                userOwnsAfterNewRound[4].should.be.bignumber.above(userOwns[4].plus(expectedDividendForAccountNewPeriod[4]).minus(1000));
               
            });

            it('should return valid dividend period time ', async function () {
              
                var dividendAmount = new BigNumber("10000000" + "00000000000");
                await data.token.transfer(data.token.address, dividendAmount, { from: accounts[4] });

                var blockchainTime = await latestTime();

                await data.token.startNewDividendPeriod();
               
                var increaseTime = blockchainTime + duration.days(45);
                await increaseTimeTo(increaseTime);

                var expectedEndTimeLeft =  new BigNumber(duration.days(45));

                var timeToNextDividend = await data.token.timeLeftToNextDividend();
     
                timeToNextDividend.should.be.bignumber.below(expectedEndTimeLeft.plus(duration.minutes(1)));
                timeToNextDividend.should.be.bignumber.above(expectedEndTimeLeft.minus(duration.minutes(1)));
               
                var lastDividendTime = await data.token.lastDividendTime();
                var currentDividendPeriodStartExpected = new BigNumber(blockchainTime);
 
                lastDividendTime.should.be.bignumber.below(currentDividendPeriodStartExpected.plus(duration.minutes(1)));
                lastDividendTime.should.be.bignumber.above(currentDividendPeriodStartExpected.minus(duration.minutes(1)));

            });
            
            
          });    
        
  });
  
  
  
  
  