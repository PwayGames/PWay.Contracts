const path = require('path');
const scriptName = path.basename(__filename);
const logger = require('../utils/logger')(scriptName);
var NameRegistry = artifacts.require("./NameRegistry.sol");
var PwayToken = artifacts.require("./PwayToken.sol");
var PwayKYCCrowdsale = artifacts.require("./PwayKYCCrowdsale.sol");
var PwayCompany = artifacts.require("./PwayCompany.sol");
var DummyProvider = artifacts.require("./DummyProvider.sol");
var OasisDexProvider = artifacts.require("./OasisDexProvider.sol");
var Ownable = artifacts.require("./Ownable.sol");
var PwayAuthority = artifacts.require("./PwayAuthority.sol");
var PwayDelayedWithdrawWalletFactory = artifacts.require("./PwayDelayedWithdrawWalletFactory.sol");
var PwayGamesStore = artifacts.require("./PwayGamesStore.sol");
const config = require("./config");
const helper = require("./deplymentHelpers");

const IS_PRODUCTION = true;
const oasisDexAddress = "0x14FBCA95be7e99C15Cc2996c6C9d841e54B79425"
const daiAddress = "0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359";
const wethAddress = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";

var methodTimeout = 300;// infura servers delay

module.exports = function (deployer, network, accounts) {

    const addr = config.getAddresses(IS_PRODUCTION, accounts);
    const parms = config.getParms(IS_PRODUCTION, web3);
    helper.setWeb3(web3);

    var data = {};
    data.events = [];
    data.logs = [];
    logger.info(`'Deployment started for network: ${network} with owner: ${accounts[0]}`);

    if (network === "rinkeby") {
        addr.operator = "0x26AC5691d1d91e7eC0e526169978B3Ebd77dfdda";
    }
    else if (network === "local" || network === "testrpc") {
        return;
    }
    else if (network === "development") {
        logger.info(`Send some money`);

        helper.transferEther(web3, accounts[0], addr.devAdam, 2);
        helper.transferEther(web3, accounts[0], addr.devLukas, 2);
    }

    var gameConfig = addr.gamesConfig;

    var licences = [];
    var prices = [];
    for (var i = 0; i < gameConfig.length; i++) {
        licences.push(gameConfig[i].licenseCount);
        prices.push(gameConfig[i].Usd11DigitPrice);
    }

    //  logger.info(`'Deployment started for network: ${network} with owner: ${accounts[0]}`);

    var contractFactory = function (contract, contractNameVariable, ...args) {
        // logger.info(`Deploying ${contractNameVariable} with args ${args}`);

        return new Promise(function (resolve, reject) {
            deployer.deploy(contract, ...args)
                .then(function () {
                    contract.deployed()
                        .then(function (instance) {
                            helper.assignEventWatcher(instance, data, function (ev) {
                                if (ev.event === 'WalletCreated') {
                                    console.log('Wallet ! ' + ev.args.walletAddress + ' beneficiary=' + ev.args.beneficiary);
                                    console.log(JSON.stringify(ev.args));
                                }
                            });
                            Object.defineProperty(data, contractNameVariable, { value: instance, writable: false });
                            logger.info(`${contractNameVariable} deployed at  ${contract.address}`);

                            setTimeout(function () {
                                resolve(contract);
                            }, methodTimeout);
                        })
                        .catch(function (err) { reject(err) });
                })
                .catch(function (err) {
                    logger.error(`Error during  ${contractNameVariable} deployment. Args : ${args} Raw error: ${err}`);
                    reject('Error during ' + contractNameVariable + ' deployment. Args : ' + args + ' Raw error: ' + err);
                });
        });
    };

    var transferTokens = function () {
        return new Promise(function (res, rej) {

            return helper.executeMethod("Transfer tokens walletFactory", data.PwayToken, data.PwayToken.transfer, methodTimeout, data.DelayedWalletFactory.address, "10440000" + "00000000000").then(() => {
                return helper.executeMethod("Transfer tokens pwayCompany", data.PwayToken, data.PwayToken.transfer, methodTimeout, data.PwayCompany.address, "34600000" + "00000000000").then(() => {
                    return true;
                })
                    .then(function () { return data.PwayToken.balanceOf(accounts[0]); })
                    .then(function (_totBalance) { return helper.executeMethod("Transfer tokens crowdsale", data.PwayToken, data.PwayToken.transfer, methodTimeout, data.Crowdsale.address, _totBalance) })
                    .then(function (result) {
                        console.log(" tokenTransfers done");
                        res(result);
                    })
                    .catch(function (err) {
                        console.log(" tokenTransfers done");
                        rej(err);
                    });

            });

        });
    };

    var changeOwner = function (comment, instance, ownerAddress) {
        return new Promise(function (res, rej) {
            helper.executeMethod("Change owner of " + comment, instance, instance.transferOwnership, methodTimeout, ownerAddress).then(function () {
                console.log("tx to wait for", arguments[0].tx);
                helper.waitForTxEnds(web3.eth, arguments[0].tx, function () {
                    res(true);
                });
            }).catch((err) => {
                console.log("change owner", err);
                rej(false);
            });
        });
    };

    var setupWallets = function (_data) {
        console.log('setupWallets');
        return function () {
            console.log('run setupWallets');
            return new Promise(function (res, rej) {

                console.log('run setupWallets promise');
                var year = 3600 * 24 * 365;
                var walletsToAdd = addr.getWallets();
                var promises = [];
                for (var i = 0; i < walletsToAdd.length; i++) {
                    promises.push(function (rs, rj) {
                        console.log('run inner setupWallets promise');
                        helper.executeMethod("Create Wallet", _data.DelayedWalletFactory, _data.DelayedWalletFactory.createWallet, methodTimeout, this.from, this.lockup, this.amount + "00000000000").then(
                            function () {
                                console.log("Wallet created");
                                rs(true);
                            }).catch(function (err) {
                                console.log("Wallet error " + err);
                                rj(err);
                            });
                    }.bind(walletsToAdd[i]));
                }
                console.log(' iterate promises ');
                var start = new Promise(promises[0]);
                for (var j = 1; j < promises.length; j++) {
                    console.log(' iterate promises ' + j);
                    start = start.then(function () {
                        return new Promise(this);
                    }.bind(promises[j]));
                };

                start.then(() => {
                    console.log("All Wallets created");
                    res(true);
                });
            });

        };
    };

    var scriptToRun = new Promise((res, rej) => {
        contractFactory(NameRegistry, 'reg')
            .then(function () { return contractFactory(PwayToken, 'PwayToken', data.reg.address, parms.dividendStartDate); })
            .then(function () { return contractFactory(OasisDexProvider, 'OasisDexProvider', data.reg.address, oasisDexAddress, daiAddress, wethAddress); })
            .then(function () { return contractFactory(PwayAuthority, 'Authority', data.reg.address, parms.crowdsaleEthPwayRate); })
            .then(function () { return contractFactory(PwayGamesStore, 'GamesStore', data.reg.address); })
            .then(function () {
                return contractFactory(PwayCompany, 'PwayCompany', data.reg.address, parms.companyWithdrawDailyLimit, parms.companyEthToUsdRate,
                    addr.governor1, addr.governor2, addr.governor3)
            })
            .then(function () { return contractFactory(PwayDelayedWithdrawWalletFactory, 'DelayedWalletFactory', data.reg.address) })
            .then(function () {
                return contractFactory(PwayKYCCrowdsale, 'Crowdsale', parms.crowdsaleEthPwayRate, data.reg.address, parms.crowdsaleStart,
                    parms.crowdsaleEnd, parms.crowdsaleMinInvestment, parms.crowdsaleMaxInvestment, addr.operator);
            })
            .then(transferTokens)
            .then(function () { return helper.executeMethod("Create games", data.GamesStore, data.GamesStore.createGames, methodTimeout, prices.slice(0, 5), licences.slice(0, 5)); })
            .then(function () { return helper.executeMethod("Create games", data.GamesStore, data.GamesStore.createGames, methodTimeout, prices.slice(5, 9), licences.slice(5, 9)); })
            .then(function () { return changeOwner("Game store", data.GamesStore, data.PwayCompany.address); })
            .then(function () { return changeOwner("Pway Company", data.PwayCompany, data.PwayCompany.address); })
            .then(function () { return changeOwner("Pway Token",data.PwayToken, data.PwayCompany.address); })
            .then(function () { return changeOwner("Crowdsale", data.Crowdsale, data.PwayCompany.address); })
            .then(function () { return changeOwner("OasisDexProvider", data.OasisDexProvider, data.PwayCompany.address); })
            .then(setupWallets(data))
            .then(function () {
                console.log('clean recivers');
                helper.removeEventWatcher(data);
                res(true);
            })
            .catch(function (error) {
                helper.removeEventWatcher(data);
                logger.error(`Finished with fail ${error}`);
                rej('Deployment failed');
            });
    });

    deployer.then(function () {
        return scriptToRun;
    });
};
