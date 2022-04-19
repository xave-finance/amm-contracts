"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deployAllMockTokensAndOracles = exports.deployMockWeightedPoolFactory = exports.deployFXPool = exports.deployMockABDKLib = exports.deployAssimilatorFactory = exports.deployMockOracle = exports.deployMockMintableERC20 = exports.deployMockWETH = exports.deployMockBalancerVault = void 0;
var utils_1 = require("ethers/lib/utils");
var hardhat_1 = require("hardhat");
var constants_1 = require("../constants");
var mockTokenList_1 = require("../constants/mockTokenList");
var contract_1 = require("./contract");
var deployMockBalancerVault = function (adminAddress, WETHAddress) { return __awaiter(void 0, void 0, void 0, function () {
    var vault;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, (0, contract_1.deploy)('Vault', {
                    args: [
                        adminAddress,
                        WETHAddress,
                        constants_1.mockBalancerVaultValues.bufferPeriodEndTime,
                        constants_1.mockBalancerVaultValues.pauseWindowEndTime,
                    ],
                })];
            case 1:
                vault = _a.sent();
                return [2 /*return*/, vault];
        }
    });
}); };
exports.deployMockBalancerVault = deployMockBalancerVault;
var deployMockWETH = function () { return __awaiter(void 0, void 0, void 0, function () {
    var MockWETHTokenFactory, WETH;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, hardhat_1.ethers.getContractFactory('MockWETH9')];
            case 1:
                MockWETHTokenFactory = _a.sent();
                return [4 /*yield*/, MockWETHTokenFactory.deploy()];
            case 2:
                WETH = _a.sent();
                return [4 /*yield*/, WETH.deployed()];
            case 3:
                _a.sent();
                return [2 /*return*/, WETH];
        }
    });
}); };
exports.deployMockWETH = deployMockWETH;
var deployMockMintableERC20 = function (name, symbol, decimals) { return __awaiter(void 0, void 0, void 0, function () {
    var MockERC20Factory, mockERC20;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, hardhat_1.ethers.getContractFactory('MockToken')];
            case 1:
                MockERC20Factory = _a.sent();
                return [4 /*yield*/, MockERC20Factory.deploy(name, symbol, decimals)];
            case 2:
                mockERC20 = _a.sent();
                return [4 /*yield*/, mockERC20.deployed()];
            case 3:
                _a.sent();
                return [2 /*return*/, mockERC20];
        }
    });
}); };
exports.deployMockMintableERC20 = deployMockMintableERC20;
var deployMockOracle = function (latestAnswer) { return __awaiter(void 0, void 0, void 0, function () {
    var mockOracleFactory, mockOracle;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, hardhat_1.ethers.getContractFactory('MockAggregator')];
            case 1:
                mockOracleFactory = _a.sent();
                return [4 /*yield*/, mockOracleFactory.deploy()];
            case 2:
                mockOracle = _a.sent();
                return [4 /*yield*/, mockOracle.deployed()];
            case 3:
                _a.sent();
                return [4 /*yield*/, mockOracle.setAnswer(latestAnswer)];
            case 4:
                _a.sent();
                return [2 /*return*/, mockOracle];
        }
    });
}); };
exports.deployMockOracle = deployMockOracle;
var deployAssimilatorFactory = function (usdcOracleAddress, usdcAddress) { return __awaiter(void 0, void 0, void 0, function () {
    var AssimilatorFactoryFactory, assimilatorFactory;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, hardhat_1.ethers.getContractFactory('AssimilatorFactory')];
            case 1:
                AssimilatorFactoryFactory = _a.sent();
                return [4 /*yield*/, AssimilatorFactoryFactory.deploy(usdcOracleAddress, usdcAddress)];
            case 2:
                assimilatorFactory = _a.sent();
                return [4 /*yield*/, assimilatorFactory.deployed()];
            case 3:
                _a.sent();
                return [2 /*return*/, assimilatorFactory];
        }
    });
}); };
exports.deployAssimilatorFactory = deployAssimilatorFactory;
var deployMockABDKLib = function () { return __awaiter(void 0, void 0, void 0, function () {
    var MockABDKLibFactory, mockABDKLib;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, hardhat_1.ethers.getContractFactory('MockABDK')];
            case 1:
                MockABDKLibFactory = _a.sent();
                return [4 /*yield*/, MockABDKLibFactory.deploy()];
            case 2:
                mockABDKLib = _a.sent();
                return [4 /*yield*/, mockABDKLib.deployed()];
            case 3:
                _a.sent();
                return [2 /*return*/, mockABDKLib];
        }
    });
}); };
exports.deployMockABDKLib = deployMockABDKLib;
var deployFXPool = function (assets, expiration, unitSeconds, vaultAddress, percentFee, name, // LP Token name
symbol // LP token symbol
) { return __awaiter(void 0, void 0, void 0, function () {
    var ProportionalLiquidityFactory, proportionalLiquidity, FXPoolFactory, fxPool;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, hardhat_1.ethers.getContractFactory('ProportionalLiquidity')];
            case 1:
                ProportionalLiquidityFactory = _a.sent();
                return [4 /*yield*/, ProportionalLiquidityFactory.deploy()];
            case 2:
                proportionalLiquidity = _a.sent();
                return [4 /*yield*/, proportionalLiquidity.deployed()];
            case 3:
                _a.sent();
                return [4 /*yield*/, hardhat_1.ethers.getContractFactory('FXPool', {
                        libraries: {
                            ProportionalLiquidity: proportionalLiquidity.address,
                        },
                    })];
            case 4:
                FXPoolFactory = _a.sent();
                return [4 /*yield*/, FXPoolFactory.deploy(assets, 
                    //curveParams.baseCurrency,
                    //curveParams.quoteCurrency,
                    //curveParams.baseWeight,
                    //curveParams.quoteWeight,
                    //curveParams.baseAssimilator,
                    //curveParams.quoteAssimilator,
                    expiration, unitSeconds, vaultAddress, percentFee, name, symbol)];
            case 5:
                fxPool = _a.sent();
                return [4 /*yield*/, fxPool.deployed()];
            case 6:
                _a.sent();
                return [2 /*return*/, fxPool];
        }
    });
}); };
exports.deployFXPool = deployFXPool;
var deployMockWeightedPoolFactory = function (vaultAddress) { return __awaiter(void 0, void 0, void 0, function () {
    var MockWeightedPoolFactoryFactory, mockWeightedPoolFactory;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, hardhat_1.ethers.getContractFactory('MockWeightedPoolFactory')];
            case 1:
                MockWeightedPoolFactoryFactory = _a.sent();
                return [4 /*yield*/, MockWeightedPoolFactoryFactory.deploy(vaultAddress)];
            case 2:
                mockWeightedPoolFactory = _a.sent();
                return [4 /*yield*/, mockWeightedPoolFactory.deployed()];
            case 3:
                _a.sent();
                return [2 /*return*/, mockWeightedPoolFactory];
        }
    });
}); };
exports.deployMockWeightedPoolFactory = deployMockWeightedPoolFactory;
var deployAllMockTokensAndOracles = function (to) { return __awaiter(void 0, void 0, void 0, function () {
    var tokens, _i, mockToken_1, token, tokenInstance, oracleInstance;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                tokens = [];
                _i = 0, mockToken_1 = mockTokenList_1.mockToken;
                _a.label = 1;
            case 1:
                if (!(_i < mockToken_1.length)) return [3 /*break*/, 6];
                token = mockToken_1[_i];
                return [4 /*yield*/, (0, exports.deployMockMintableERC20)(token.name, token.symbol, token.decimal)];
            case 2:
                tokenInstance = _a.sent();
                return [4 /*yield*/, tokenInstance.mint(to, (0, utils_1.parseUnits)(constants_1.INTIAL_MINT, token.decimal))];
            case 3:
                _a.sent();
                return [4 /*yield*/, (0, exports.deployMockOracle)(token.mockOraclePrice)];
            case 4:
                oracleInstance = _a.sent();
                tokens.push({ tokenInstance: tokenInstance, oracleInstance: oracleInstance });
                _a.label = 5;
            case 5:
                _i++;
                return [3 /*break*/, 1];
            case 6: return [2 /*return*/, tokens];
        }
    });
}); };
exports.deployAllMockTokensAndOracles = deployAllMockTokensAndOracles;
