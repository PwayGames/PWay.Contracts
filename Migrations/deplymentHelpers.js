const path = require('path');
const scriptName = path.basename(__filename);
const logger = require('../utils/logger')(scriptName);
var web3 = undefined;

module.exports = {

    transferEther: function (web3, _from, _to, _value) {
        web3.eth.sendTransaction({
            from: _from,
            to: _to,
            value: web3.toWei(_value, 'ether')
        });
    },

    setWeb3: function (w3) {
        web3 = w3;
    },

    changeOwner: function (Ownable, addressesList, newOwner) {
        return function () {
            var promises = [];
            for (var i = 0; i < addressesList.length; i++) {
                //        logger.info(`Changing owner of  ${addressesList[i]} to ${newOwner}`);
                promises.push(
                    Ownable.at(addressesList[i]).transferOwnership(newOwner)
                );
            }
            return Promise.all(promises).then(function () {
                //      logger.info(`Owners changed`);
                return true;
            });
        }
    },

    waitForTxEnds: function (web3Eth, tx, callback) {
        console.log('tx init =' + tx);
        web3Eth.getTransactionReceipt(tx, function (err, data) {
            if (data !== undefined && data !== null) {
                console.log('tx done =' + tx);
                callback();
            };
        });
    },

    executeMethod : function (comment, contract, method,timout,  ...args) {
        logger.info(`${comment} Executing method with arguments ${args} and timeout ${timout/1000} s`)
        return new Promise(function (res, rej) {
            method.apply(contract, args).then(function (result) {
                logger.info(`${comment} method has been executed. ` + result.tx);
                var txHash = result.tx;
                var interval = setInterval(function () {
                    web3.eth.getTransactionReceipt(txHash, function (e, r) {
                        if (r !== undefined && r !== null) {
                            clearInterval(interval);
                            setTimeout(function () {
                                console.log("Callbback of " + txHash);
                                res(result);
                            }, timout);
                        }
                    });
                }, 1000);
            })
                .catch(function (ex) { 
                   logger.error(`${comment} has been rejected with error : ${ex}`);
                    rej(comment + " has been rejected with error : " + ex); 
                });
        });
    },

    assignEventWatcher : function (contract, data,callback) {
        var events = contract.allEvents();
        events.watch(function (error, log) {
            callback(log);
            data.logs.push(log);
        });

        data.events.push(events);
        return events;
    },

    removeEventWatcher : function (data) {
        logger.info(`Deployment done`);
        for (var i = 0; i < data.events.length; i++)
            data.events[i].stopWatching();
        for (i = 0; i < data.logs.length; i++)
            ;//console.log(data.logs[i]);
    }
}