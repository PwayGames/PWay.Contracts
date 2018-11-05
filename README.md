# PWay.Contracts

Set of contracts responsible for operation of:

https://pway.io

to install solution, clone repository and run
`npm install`

to run tests, run ganache-cli 
`ganache-cli --gasLimit 10000000`
and run tests
`truffle test --network testrpc`

to run migration script (not necessary for tests) run
`truffle migrate --reset`

to deploy on Rinkeby network run
`truffle migrate --network rinkeby --reset`

keep in mind that to deploy on rinkeby network You need to have file secret.js properly configured
https://github.com/PwayGames/PWay.Contracts/blob/master/secrets.js
