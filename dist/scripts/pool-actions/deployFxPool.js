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
var addresses_1 = require("../utils/addresses");
var mockPoolList_1 = require("../../tests/constants/mockPoolList");
exports.default = (function (taskArgs) { return __awaiter(void 0, void 0, void 0, function () {
    var ALPHA, BETA, MAX, EPSILON, LAMBDA, network, baseToken, freshDeploy, baseTokenAddress, ERC20, baseTokenDecimals, baseTokenOracleAddress, quoteTokenAddress, quoteTokenOracleAddress, vaultAddress, assimilatorFactoryAddress, proportionalLiquidityAddress, assimilatorFactory, AssimilatorFactoryFactory, quoteAssimilatorAddress, baseAssimilatorAddress, baseAssimilator, proportionalLiquidity, ProportionalLiquidityFactory, FXPoolFactory, sortedAssets, deadline, fxPool, poolId, baseWeight, quoteWeight, assetsWeights, assets;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                ALPHA = ethers.utils.parseUnits('0.8');
                BETA = ethers.utils.parseUnits('0.5');
                MAX = ethers.utils.parseUnits('0.15');
                EPSILON = ethers.utils.parseUnits('0.0004');
                LAMBDA = ethers.utils.parseUnits('0.3');
                network = taskArgs.to;
                baseToken = taskArgs.basetoken;
                freshDeploy = taskArgs.fresh ? taskArgs.fresh === 'true' : false;
                console.log("Deploying ".concat(baseToken, ":USDC pool to ").concat(network, "..."));
                baseTokenAddress = (0, addresses_1.getTokenAddress)(network, baseToken);
                if (!baseTokenAddress) {
                    console.error("Address for ".concat(baseToken, " not available on ").concat(network, "!"));
                    return [2 /*return*/];
                }
                return [4 /*yield*/, ethers.getContractFactory('MockToken')];
            case 1:
                ERC20 = _a.sent();
                return [4 /*yield*/, ERC20.attach(baseTokenAddress).decimals()
                    /** Step# - get baseToken price feed oracle */
                ];
            case 2:
                baseTokenDecimals = _a.sent();
                baseTokenOracleAddress = (0, addresses_1.getTokenOracleAddress)(network, baseToken);
                if (!baseTokenOracleAddress) {
                    console.error("Oracle for ".concat(baseToken, " not available on ").concat(network, "!"));
                    return [2 /*return*/];
                }
                quoteTokenAddress = (0, addresses_1.getTokenAddress)(network, 'USDC');
                if (!quoteTokenAddress) {
                    console.error("Address for USDC not available on ".concat(network, "!"));
                    return [2 /*return*/];
                }
                quoteTokenOracleAddress = (0, addresses_1.getTokenOracleAddress)(network, 'USDC');
                if (!quoteTokenOracleAddress) {
                    console.error("Oracle for USDC not available on ".concat(network, "!"));
                    return [2 /*return*/];
                }
                vaultAddress = (0, addresses_1.getVaultAddress)(network);
                if (!vaultAddress) {
                    console.error("Address for balancer vault not available on ".concat(network, "!"));
                    return [2 /*return*/];
                }
                if (!freshDeploy) {
                    assimilatorFactoryAddress = (0, addresses_1.getAssimilatorFactoryAddress)(network);
                    if (!assimilatorFactoryAddress) {
                        console.error("Address for AssimilatorFactory not available on ".concat(network, "!"));
                        return [2 /*return*/];
                    }
                    proportionalLiquidityAddress = (0, addresses_1.getProportionalLiquidityAddress)(network);
                    if (!proportionalLiquidityAddress) {
                        console.error("Address for ProportionalLiquidity not available on ".concat(network, "!"));
                        return [2 /*return*/];
                    }
                }
                return [4 /*yield*/, ethers.getContractFactory('AssimilatorFactory')];
            case 3:
                AssimilatorFactoryFactory = _a.sent();
                if (!freshDeploy) return [3 /*break*/, 6];
                console.log("> Deploying AssimilatorFactory...");
                console.table({
                    oracle: quoteTokenOracleAddress,
                    quote: quoteTokenAddress,
                });
                return [4 /*yield*/, AssimilatorFactoryFactory.deploy(quoteTokenOracleAddress, quoteTokenAddress)];
            case 4:
                assimilatorFactory = _a.sent();
                return [4 /*yield*/, assimilatorFactory.deployed()];
            case 5:
                _a.sent();
                console.log("> AssimilatorFactory deployed at: ".concat(assimilatorFactory.address));
                return [3 /*break*/, 7];
            case 6:
                console.log("> Reusing AssimilatorFactory at ", assimilatorFactoryAddress);
                assimilatorFactory = AssimilatorFactoryFactory.attach(assimilatorFactoryAddress);
                _a.label = 7;
            case 7: return [4 /*yield*/, assimilatorFactory.usdcAssimilator()];
            case 8:
                quoteAssimilatorAddress = _a.sent();
                console.log("> USDC assimilator address: ".concat(quoteAssimilatorAddress));
                console.log("> Checking if ".concat(baseToken, " assimilator is already deployed..."));
                return [4 /*yield*/, assimilatorFactory.getAssimilator(baseTokenAddress)];
            case 9:
                baseAssimilator = _a.sent();
                if (!(baseAssimilator !== ethers.constants.AddressZero)) return [3 /*break*/, 10];
                baseAssimilatorAddress = baseAssimilator;
                console.log("> ".concat(baseToken, " assimilator is already deployed at ").concat(baseAssimilator));
                return [3 /*break*/, 13];
            case 10:
                console.log("> Deploying ".concat(baseToken, " assimilator..."));
                console.table({
                    base: baseTokenAddress,
                    baseDecimals: baseTokenDecimals,
                    oracle: baseTokenOracleAddress,
                });
                return [4 /*yield*/, assimilatorFactory.newBaseAssimilator(baseTokenAddress, ethers.utils.parseUnits('1', baseTokenDecimals), baseTokenOracleAddress)];
            case 11:
                _a.sent();
                return [4 /*yield*/, assimilatorFactory.getAssimilator(baseTokenAddress)];
            case 12:
                baseAssimilatorAddress = _a.sent();
                console.log("> ".concat(baseToken, " assimilator deployed at: ").concat(baseAssimilatorAddress));
                _a.label = 13;
            case 13: return [4 /*yield*/, ethers.getContractFactory('ProportionalLiquidity')];
            case 14:
                ProportionalLiquidityFactory = _a.sent();
                if (!freshDeploy) return [3 /*break*/, 17];
                return [4 /*yield*/, ProportionalLiquidityFactory.deploy()];
            case 15:
                proportionalLiquidity = _a.sent();
                return [4 /*yield*/, proportionalLiquidity.deployed()];
            case 16:
                _a.sent();
                console.log('> ProportionalLiquidity deployed at:', proportionalLiquidity.address);
                return [3 /*break*/, 18];
            case 17:
                console.log("> Reusing ProportionalLiquidity at ", proportionalLiquidityAddress);
                proportionalLiquidity = AssimilatorFactoryFactory.attach(proportionalLiquidityAddress);
                _a.label = 18;
            case 18: return [4 /*yield*/, ethers.getContractFactory('FXPool', {
                    libraries: {
                        ProportionalLiquidity: proportionalLiquidity.address,
                    },
                })];
            case 19:
                FXPoolFactory = _a.sent();
                sortedAssets = [baseTokenAddress, quoteTokenAddress].sort();
                deadline = new Date().getTime() + 60 * 5 * 1000 // 5 minutes from now
                ;
                console.log("> Deploying FxPool...");
                console.table({
                    assets: sortedAssets.join(', '),
                    expiration: deadline,
                    unitSeconds: mockPoolList_1.fxPHPUSDCFxPool.unitSeconds,
                    vault: vaultAddress,
                    percentFee: mockPoolList_1.fxPHPUSDCFxPool.percentFee,
                    name: mockPoolList_1.fxPHPUSDCFxPool.name,
                    symbol: mockPoolList_1.fxPHPUSDCFxPool.symbol,
                });
                return [4 /*yield*/, FXPoolFactory.deploy(sortedAssets, deadline, ethers.utils.parseUnits('100'), vaultAddress, ethers.utils.parseUnits('0.01'), "HALO ".concat(baseToken, "USDC FXPool"), "HFX-".concat(baseToken, "USDC"))];
            case 20:
                fxPool = _a.sent();
                return [4 /*yield*/, fxPool.deployed()];
            case 21:
                _a.sent();
                console.log("> FxPool successfully deployed at: ".concat(fxPool.address));
                return [4 /*yield*/, fxPool.getPoolId()];
            case 22:
                poolId = _a.sent();
                console.log("> Balancer vault pool id: ".concat(poolId));
                /**
                 * Step# - initialize pool
                 */
                console.log("> Initializing FxPool...");
                baseWeight = ethers.utils.parseUnits('0.5');
                quoteWeight = ethers.utils.parseUnits('0.5');
                assetsWeights = [baseWeight, quoteWeight];
                assets = [
                    baseTokenAddress,
                    baseAssimilatorAddress,
                    baseTokenAddress,
                    baseAssimilatorAddress,
                    baseTokenAddress,
                    quoteTokenAddress,
                    quoteAssimilatorAddress,
                    quoteTokenAddress,
                    quoteAssimilatorAddress,
                    quoteTokenAddress,
                ];
                console.table({
                    assets: assets.toString(),
                    assetsWeights: assetsWeights.toString(),
                });
                return [4 /*yield*/, fxPool.initialize(assets, assetsWeights)];
            case 23:
                _a.sent();
                console.log("> FxPool initialized!");
                /**
                 * Step# - set pool/curve params
                 **/
                console.log("> Setting FxPool params...");
                return [4 /*yield*/, fxPool.setParams(ALPHA, BETA, MAX, EPSILON, LAMBDA)];
            case 24:
                _a.sent();
                console.log("> FxPool params set!");
                return [2 /*return*/];
        }
    });
}); });
