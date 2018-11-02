const DummyMock = artifacts.require('DummyMock');
const DummyMock2 = artifacts.require('DummyMock2');
const NameRegistry = artifacts.require('NameRegistry');
import EVMRevert from 'openzeppelin-solidity/test/helpers/EVMRevert';

const should = require('chai')
  .use(require('chai-as-promised'))
  .should();
  
  contract('NameRegistry', function ([_, recipient1, recipient2]) {
       var data = {};
 
          const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
          beforeEach(async function () {
              data.registry = await NameRegistry.new();
              data.adr1 = (await DummyMock.new()).address;
              data.adr1Name = "adr1";
              data.dummyMock2 = (await DummyMock2.new(data.registry.address,"adr2"));
              data.adr2 =  data.dummyMock2.address;
              data.adr2Name = "adr2";
              data.adr2Updated = (await DummyMock.new()).address;
              data.notExistingAddress = (await DummyMock.new()).address;
          });
                      
          describe('setAddress', function () {
            it('should success if called by not owner', async function () {
                await data.registry.setAddress(data.adr1Name,data.adr1,{from:recipient1}).should.be.fulfilled;
            });
       
            it('should fail called twice even if called by owner', async function () {
                await  data.registry.setAddress(data.adr2Name,data.adr2,{from:_});
                await data.registry.setAddress(data.adr2Name,data.adr2Updated,{from:_}).should.be.rejectedWith(EVMRevert);
            });
          });
           
          describe('getAddress', function () {
            
            it('should fail if search for not existing address', async function () {
                await data.registry.getAddress(data.notExistingAddress,{from:recipient1}).should.be.rejectedWith(EVMRevert);;
            });
            it('should return value set before if called by anyone ', async function () {
                await data.registry.setAddress(data.adr1Name,data.adr1,{from:_});
                var adr = await data.registry.getAddress(data.adr1Name,{from:recipient1});
                assert.equal(adr,data.adr1);
            });
            it('should return correct value after update from prev contract', async function () {

                await data.registry.setAddress(data.adr2Name,data.adr2,{from:_});
                await data.dummyMock2.ChangeRegistry(data.adr2Updated,{from:_});
               
                var adr = await data.registry.getAddress(data.adr2Name,{from:recipient1});
                assert.equal(adr,data.adr2Updated);
                
            });
            
          });
        
  });