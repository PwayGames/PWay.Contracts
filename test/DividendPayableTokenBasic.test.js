const NameRegistry = artifacts.require('NameRegistry');
import { latestTime } from 'openzeppelin-solidity/test/helpers/latestTime';
import { advanceBlock } from 'openzeppelin-solidity/test/helpers/advanceToBlock';
import { increaseTimeTo, duration } from 'openzeppelin-solidity/test/helpers/increaseTime';
const DividendPayableTokenMock = artifacts.require('DividendPayableTokenMock');

  var assertRevert= async function(promise){
      
      try {
        await promise;
        assert.fail('Expected revert not received');
      } catch (error) {
        const revertFound = error.message.search('revert') >= 0;
        assert(revertFound, `Expected "revert", got ${error} instead`);
      }
  }
  
  contract('DividendPayableToken', function ([_, recipient1, recipient2]) {
       var data = {};
          beforeEach(async function () {
                data.nameRegistry =await NameRegistry.new();
              

                data.startTime = (await latestTime()) + duration.days(1);
                data.tokenPromise = DividendPayableTokenMock.new(_,recipient1,recipient2,10000, data.nameRegistry.address);
                data.token = await data.tokenPromise;
                await data.token.setNow(data.startTime);
                await data.token.transfer(_,0);
          });
        
          describe('token total supply', function () {
            it('returns the total amount of tokens', async function () {
                var totalSupply = await data.token.totalSupply();
                 assert.equal(totalSupply.toNumber(), 1000000);
            });
          });    

          
          describe('token totalSupply', function () {
            it('user1 has 97%', async function () {
                var supply = await data.token.balanceOf(_);
                 assert.equal(supply.toNumber(), 97*10000);
            });
            it('user2 has 2%', async function () {
                var supply = await data.token.balanceOf(recipient1);
                 assert.equal(supply.toNumber(), 2*10000);
            });
            it('user3 has 1%', async function () {
                var supply = await data.token.balanceOf(recipient2);
                 assert.equal(supply.toNumber(), 1*10000);
            });
            it('do not change on transfer if no dividend',async function(){
                var totalSupply = await data.token.totalSupply();
                data.token.transfer(recipient1,900);
                var totalSupply2 = await data.token.totalSupply();
                 assert.equal(totalSupply.toNumber(), totalSupply2.toNumber());
                
            });
           
          });
        
          var tokenTransferTestCases = function(_from,_to){
              it('fails if user try to send more funds that he owns',async function(){
                var userOwns = (await data.token.balanceOf(_from)).toNumber();
                
                var promise = data.token.transfer(_to(),userOwns+1,{from:_from});
                assertRevert(promise);
              });
              it('do not fail if user try to send all funds that he owns',async function(){
                var userOwns = (await data.token.balanceOf(_from)).toNumber();
                
                await data.token.transfer(_to(),userOwns,{from:_from});
              });
              it('do not fail if user try to send some funds that he owns',async function(){
                var userOwns = (await data.token.balanceOf(_from)).toNumber();
                
                await data.token.transfer(_to(),userOwns/2,{from:_from});
              });
              
              it('cause sender balance to decrease by send amount',async function(){
                var userOwns = (await data.token.balanceOf(_from)).toNumber();
                var amount = userOwns/2;
                await data.token.transfer(_to(),amount,{from:_from});
                var userOwnsAfter = (await data.token.balanceOf(_from)).toNumber();
                assert.equal(userOwns, userOwnsAfter+amount);
              });
              
              it('cause recipient balance to increase by send amount',async function(){
                var userOwns = (await data.token.balanceOf(_to())).toNumber();
                var amount = userOwns/2;
                await data.token.transfer(_to(),amount,{from:_from});
                var userOwnsAfter = (await data.token.balanceOf(_to())).toNumber();
                 assert.equal(userOwns, userOwnsAfter-amount);
              });  
              
          }
          
          var tokenTransferFromTestCases = function(_from,_to,_as){
            
              it('fails if user try to send more funds that he owns',async function(){
                var userOwns = (await data.token.balanceOf(_as())).toNumber();
                var amount = userOwns+1;
                await data.token.approve(_from,amount,{from:_as()});
                
                var promise = data.token.transferFrom(_as(),_to(),amount,{from:_from});
                assertRevert(promise);
              });
              it('do not fail if user try to send all funds that he owns',async function(){
                var userOwns = (await data.token.balanceOf(_as())).toNumber();
                var amount = userOwns;
                await data.token.approve(_from,amount,{from:_as()});
                
                await data.token.transferFrom(_as(),_to(),amount,{from:_from});
              });
              it('do not fail if user try to send some funds that he owns',async function(){
                var userOwns = (await data.token.balanceOf(_as())).toNumber();
                var amount = userOwns/2;
                await data.token.approve(_from,amount,{from:_as()});
                
                await data.token.transferFrom(_as(),_to(),amount,{from:_from});
              });
              
              it('cause sender balance to decrease by send amount',async function(){
                  
                var userOwns = (await data.token.balanceOf(_as())).toNumber();
                var amount = userOwns/2;
                await data.token.approve(_from,amount,{from:_as()});
                
                await data.token.transferFrom(_as(),_to(),amount,{from:_from});
                
                var userOwnsAfter = (await data.token.balanceOf(_as())).toNumber();
                assert.equal(userOwns, userOwnsAfter+amount);
              });
              
              it('cause recipient balance to increase by send amount',async function(){
                var userOwns = (await data.token.balanceOf(_to())).toNumber();
                var amount = userOwns/2;
                await data.token.approve(_from,amount,{from:_as()});
                
                await data.token.transferFrom(_as(),_to(),amount,{from:_from});
                
                var userOwnsAfter = (await data.token.balanceOf(_to())).toNumber();
                 assert.equal(userOwns, userOwnsAfter-amount);
              });
          
          }
          
          describe('token transfer when no dividend to pay',function() {
            tokenTransferTestCases(_,function(){return recipient1;});
          });
          
          describe('token transferFrom when no dividend to pay',function(){
            tokenTransferFromTestCases(_,function(){return recipient1;},function(){return recipient2;})
              
          });
        
         describe('fallback function', function(){
            it('it reverts',async function(){
               var promise = data.token.sendTransaction({from:recipient1,data:"0x"});
               assertRevert(promise);
            }); 
         });
       
      describe('token transfer to token contract address', function () {

          xit('increases dividendSum amount by sended amount ', async function () {
                  /*Do przerobienia, obecnie nie ma Sumy Dywidendy, jest FACTOR */
                var dividendSumBefore = (await data.token.getDividendSum()).toNumber();
                var amount = 100;
                await data.token.transfer(data.token.address,amount,{from:_});
                var dividendSumAfter = (await data.token.getDividendSum()).toNumber();
                console.log(dividendSumBefore,dividendSumAfter,amount);
                assert.equal(dividendSumAfter, dividendSumBefore+amount);
              });
          });
          
          describe('token transferFrom to token contract address',function() {
             tokenTransferFromTestCases(_,
                    function(){return data.token.address;},
                    function(){return recipient2;})
          
              xit('increases dividendSum amount by sended amount ',async function(){
                var dividendSumBefore = (await data.token.totalDividendSum()).toNumber();
                var amount = 100;
                await data.token.approve(_,amount,{from:recipient1});
                await data.token.transferFrom(recipient1,data.token.address,amount,{from:_});
                var dividendSumAfter = (await data.token.totalDividendSum()).toNumber();
                assert.equal(dividendSumAfter, dividendSumBefore+amount);
              });
          });
          
  });
  
  
  
  
  