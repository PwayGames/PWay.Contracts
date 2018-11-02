module.exports = {

    getParms: function (isProd, web3) {
        var now = ((new Date()).getTime() / 1000 + 1000);
        
        return {
            crowdsaleStart: now + 3600 * 24, //TODO is 100 enought for require(now >= openingTime && now <= closingTime); in TimedCrowdsale ? 
            crowdsaleEnd: now + 3600 * 24*3,
            dividendStartDate: now + 3600 * 24*3,
            crowdsaleEthPwayRate: 207,
            crowdsaleMinInvestment: web3.toWei(0.15, 'ether'), //60 USD
            crowdsaleMaxInvestment: web3.toWei(150, 'ether'), //100 000 USD
            companyEthToUsdRate: 200,
            companyWithdrawDailyLimit: web3.toWei(10, 'ether'),
        };
    },

    getAddresses: function (isProd, accounts) {
        if (isProd)
            return this.production(accounts);
        else
            return this.development(accounts);
    },

    development: function (accounts) {
        var data = {
            gamesConfig: [
                { ethId: 1, Usd11DigitPrice: "1599000000000", licenseCount: 50 },
                { ethId: 2, Usd11DigitPrice: "699000000000", licenseCount: 50 },
                { ethId: 3, Usd11DigitPrice: "699000000000", licenseCount: 50 },
                { ethId: 4, Usd11DigitPrice: "1599000000000", licenseCount: 50 },
                { ethId: 5, Usd11DigitPrice: "1599000000000", licenseCount: 50 },
                { ethId: 6, Usd11DigitPrice: "1249000000000", licenseCount: 50 },
                { ethId: 7, Usd11DigitPrice: "1599000000000", licenseCount: 50 },
                { ethId: 8, Usd11DigitPrice: "1599000000000", licenseCount: 50 },
                { ethId: 9, Usd11DigitPrice: "1599000000000", licenseCount: 52 }
            ],
            owner1: accounts[2],
            owner2: accounts[3],
            owner3: accounts[4],
            owner4: accounts[5],
            operator: accounts[0],
            governor1: accounts[0],
            governor2: accounts[1],
            governor3: accounts[2],
            devA: accounts[0],
            devB: accounts[1],
            dev1: "",
            dev2: "",
            dev3: "",
            dev4: "",
            dev5: "",
            dev6: "",
            dev7: "",
            dev8: "",
            dev9: "",
            dev10: "",
            dev11: "",
            dev12: "",
            dev13: "",
        };
        data.getWallets = function () {
                return [
                    {
                        from: data.owner1,
                        amount: "5000000",
                        lockup: 365 * 3600 * 24
                    },
                    {
                        from: data.owner2,
                        amount: "1000000",
                        lockup: 365 * 3600 * 24
                    },
                    {
                        from: data.owner4,
                        amount: "50000",
                        lockup: 365 * 3600 * 24
                    },
                    {
                        from: data.devB,
                        amount: "45000",
                        lockup: 365 * 3600 * 24
                    },
                    {
                        from: data.devA,
                        amount: "45000",
                        lockup: 365 * 3600 * 24
                    },
                    {
                        from: data.devB,
                        amount: "5000",
                        lockup: 365 * 3600 * 24
                    },
                    {
                        from: data.devA,
                        amount: "5000",
                        lockup: 365 * 3600 * 24
                    },
                    {
                        from: data.owner3,
                        amount: "50000",
                        lockup: 365 * 3600 * 24
                    }
                ];
            }
        return data;
    },

    production: function (accounts) {
        var data = { //TODO change
            gamesConfig: [
                { ethId: 1, Usd11DigitPrice: "1599000000000", licenseCount: 50 },
                { ethId: 2, Usd11DigitPrice: "699000000000", licenseCount: 50 },
                { ethId: 3, Usd11DigitPrice: "699000000000", licenseCount: 50 },
                { ethId: 4, Usd11DigitPrice: "1599000000000", licenseCount: 50 },
                { ethId: 5, Usd11DigitPrice: "1599000000000", licenseCount: 50 },
                { ethId: 6, Usd11DigitPrice: "1249000000000", licenseCount: 50 },
                { ethId: 7, Usd11DigitPrice: "1599000000000", licenseCount: 50 },
                { ethId: 8, Usd11DigitPrice: "1599000000000", licenseCount: 50 },
                { ethId: 9, Usd11DigitPrice: "1599000000000", licenseCount: 52 }
            ],
            owner1: "0x58c6dede9e15b9aecb501a5c265e12d49e189d68",
            owner2: "0x58c6dede9e15b9aecb501a5c265e12d49e189d68",
            owner3:"0x501b73b7e60C24B76B92f9074948282cD76a79af",
            owner4: "0x501b73b7e60C24B76B92f9074948282cD76a79af",
            operator: accounts[0],
            governor1: "0x501b73b7e60C24B76B92f9074948282cD76a79af",
            governor2: "0x94da43c587c515ad30ea86a208603a7586d2c25f",//"0x58c6dede9e15b9aecb501a5c265e12d49e189d68",
            governor3: accounts[0], 


            devA: "0x501b73b7e60C24B76B92f9074948282cD76a79af",
            devB: "0x94da43c587c515ad30ea86a208603a7586d2c25f",//"0x58c6dede9e15b9aecb501a5c265e12d49e189d68",
            dev1: "",
            dev2: "",
            dev3: "",
            dev4: "",
            dev5: "",
            dev6: "",
            dev7: "",
            dev8: "",
            dev9: "",
            dev10: "",
            dev11: "",
            dev12: "",
            dev13: ""
        };
        data.getWallets= function () {
                return [
                    {
                        from: data.owner1,
                        amount: "5000000",
                        lockup: 365 * 3600 * 24
                    },
                    {
                        from: data.owner2,
                        amount: "1000000",
                        lockup: 365 * 3600 * 24
                    },
                    {
                        from: data.owner4,
                        amount: "50000",
                        lockup: 365 * 3600 * 24
                    },
                    {
                        from: data.devB,
                        amount: "45000",
                        lockup: 365 * 3600 * 24
                    },
                    {
                        from: data.devA,
                        amount: "45000",
                        lockup: 365 * 3600 * 24
                    },
                    {
                        from: data.devB,
                        amount: "5000",
                        lockup: 365 * 3600 * 24
                    },
                    {
                        from: data.devA,
                        amount: "5000",
                        lockup: 365 * 3600 * 24
                    },
                    {
                        from: data.owner3,
                        amount: "50000",
                        lockup: 365 * 3600 * 24
                    }
                ];
            }
        return data;
    }
}