"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockToken = exports.TokenSymbol = void 0;
var hardhat_1 = require("hardhat");
var TokenSymbol;
(function (TokenSymbol) {
    TokenSymbol["USDC"] = "USDC";
    TokenSymbol["XSGD"] = "XSGD";
    TokenSymbol["EURS"] = "EURS";
    TokenSymbol["fxPHP"] = "fxPHP";
})(TokenSymbol = exports.TokenSymbol || (exports.TokenSymbol = {}));
exports.mockToken = [
    {
        name: 'USDC',
        symbol: TokenSymbol.USDC,
        decimal: 6,
        mockOraclePrice: '100000000',
        addressInMainnetFork: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        minterInMainnetFork: '0xfcb19e6a322b27c06842a71e8c725399f049ae3a',
    },
    {
        name: 'Xfers SGD',
        symbol: TokenSymbol.XSGD,
        decimal: 6,
        mockOraclePrice: '74217020',
        addressInMainnetFork: '0x70e8de73ce538da2beed35d14187f6959a8eca96',
        minterInMainnetFork: '0x8c3b0cAeC968b2e640D96Ff0B4c929D233B25982',
    },
    {
        name: 'STASIS EURS Token',
        symbol: TokenSymbol.EURS,
        decimal: 2,
        mockOraclePrice: '111145700',
        addressInMainnetFork: '0xdb25f211ab05b1c97d595516f45794528a807ad8',
        minterInMainnetFork: hardhat_1.ethers.constants.AddressZero,
    },
    {
        name: 'handlePHP',
        symbol: TokenSymbol.fxPHP,
        decimal: 18,
        mockOraclePrice: '1946900',
        addressInMainnetFork: '0x3d147cd9ac957b2a5f968de9d1c6b9d0872286a0',
        minterInMainnetFork: hardhat_1.ethers.constants.AddressZero,
    },
];
