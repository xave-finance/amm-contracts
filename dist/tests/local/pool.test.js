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
var chai_1 = require("chai");
var hardhat_1 = require("hardhat");
var ethers_1 = require("ethers");
var setupEnvironment_1 = require("../common/setupEnvironment");
var units_1 = require("@ethersproject/units");
var constants_1 = require("../constants");
var utils_1 = require("../common/helpers/utils");
var mockTokenList_1 = require("../constants/mockTokenList");
var sorter_1 = require("../common/helpers/sorter");
describe('FXPool', function () {
    var testEnv;
    var admin;
    var notOwner;
    var adminAddress;
    var poolId;
    var fxPHPAssimilatorAddress;
    var usdcAssimilatorAddress;
    var sortedAddresses;
    var NEW_CAP = (0, units_1.parseEther)('100000000');
    var NEW_CAP_FAIL = (0, units_1.parseEther)('1000');
    var ALPHA = (0, units_1.parseUnits)('0.8');
    var BETA = (0, units_1.parseUnits)('0.5');
    var MAX = (0, units_1.parseUnits)('0.15');
    var EPSILON = (0, units_1.parseUnits)('0.0004');
    var LAMBDA = (0, units_1.parseUnits)('0.3');
    var baseWeight = (0, units_1.parseUnits)('0.5');
    var quoteWeight = (0, units_1.parseUnits)('0.5');
    before('build test env', function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, (0, setupEnvironment_1.setupEnvironment)()];
                case 1:
                    testEnv = _b.sent();
                    return [4 /*yield*/, hardhat_1.ethers.getSigners()];
                case 2:
                    _a = _b.sent(), admin = _a[0], notOwner = _a[1];
                    return [4 /*yield*/, admin.getAddress()
                        // 1 - deploy assimilators
                    ];
                case 3:
                    adminAddress = _b.sent();
                    // 1 - deploy assimilators
                    return [4 /*yield*/, testEnv.assimilatorFactory.newBaseAssimilator(testEnv.fxPHP.address, (0, units_1.parseUnits)('1', "".concat(mockTokenList_1.mockToken[3].decimal)), testEnv.fxPHPOracle.address)
                        // 2 - get Pool Id
                    ];
                case 4:
                    // 1 - deploy assimilators
                    _b.sent();
                    return [4 /*yield*/, testEnv.fxPool.getPoolId()
                        // 3 - getAssimilators
                    ];
                case 5:
                    // 2 - get Pool Id
                    poolId = _b.sent();
                    return [4 /*yield*/, testEnv.assimilatorFactory.getAssimilator(testEnv.fxPHP.address)];
                case 6:
                    // 3 - getAssimilators
                    fxPHPAssimilatorAddress = _b.sent();
                    return [4 /*yield*/, testEnv.assimilatorFactory.usdcAssimilator()
                        // 4 - sortedAddress references
                    ];
                case 7:
                    usdcAssimilatorAddress = _b.sent();
                    // 4 - sortedAddress references
                    sortedAddresses = (0, utils_1.sortAddresses)([
                        hardhat_1.ethers.utils.getAddress(testEnv.fxPHP.address),
                        hardhat_1.ethers.utils.getAddress(testEnv.USDC.address),
                    ]);
                    return [2 /*return*/];
            }
        });
    }); });
    it('FXPool is registered on the vault', function () { return __awaiter(void 0, void 0, void 0, function () {
        var poolId, poolInfoFromVault, _a, _b, _c, curveDetails;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [4 /*yield*/, testEnv.fxPool.getPoolId()];
                case 1:
                    poolId = _d.sent();
                    return [4 /*yield*/, testEnv.vault.getPool(poolId)];
                case 2:
                    poolInfoFromVault = _d.sent();
                    _b = chai_1.expect;
                    return [4 /*yield*/, testEnv.fxPool.getVault()];
                case 3:
                    _c = (_a = _b.apply(void 0, [_d.sent(), 'Vault in FXPool is different from the test environment vault']).to.be).equals;
                    return [4 /*yield*/, testEnv.vault.address];
                case 4:
                    _c.apply(_a, [_d.sent()]);
                    (0, chai_1.expect)(poolInfoFromVault[0], 'FXpool is not registered in the vault').to.be.equals(testEnv.fxPool.address);
                    return [4 /*yield*/, testEnv.fxPool.curve()];
                case 5:
                    curveDetails = _d.sent();
                    (0, chai_1.expect)(curveDetails.cap).to.be.equals(0);
                    (0, chai_1.expect)(curveDetails.totalSupply).to.be.equals(0);
                    return [2 /*return*/];
            }
        });
    }); });
    it('Initializes the FXPool and set curve parameters', function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, chai_1.expect)(testEnv.fxPool.initialize([
                        testEnv.fxPHP.address,
                        fxPHPAssimilatorAddress,
                        testEnv.fxPHP.address,
                        fxPHPAssimilatorAddress,
                        testEnv.fxPHP.address,
                        testEnv.USDC.address,
                        usdcAssimilatorAddress,
                        testEnv.USDC.address,
                        usdcAssimilatorAddress,
                        testEnv.USDC.address,
                    ], [baseWeight, quoteWeight]))
                        .to.emit(testEnv.fxPool, 'AssetIncluded')
                        .to.emit(testEnv.fxPool, 'AssimilatorIncluded')];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, (0, chai_1.expect)(testEnv.fxPool.setParams(ALPHA, BETA, MAX, EPSILON, LAMBDA)).to.emit(testEnv.fxPool, 'ParametersSet')
                        //  .withArgs(ALPHA, BETA, MAX, EPSILON, LAMBDA) - check delta calculation
                    ];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it('Round 1 - Adds liquidity inside the FXPool calling the vault and triggering onJoin hook', function () { return __awaiter(void 0, void 0, void 0, function () {
        var numeraireAmount, beforeLpBalance, beforeVaultfxPhpBalance, beforeVaultUsdcBalance, viewDeposit, fxPHPAddress, liquidityToAdd, payload, joinPoolRequest, afterLpBalance, afterVaultfxPhpBalance, afterVaultUsdcBalance;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, testEnv.fxPHP.approve(testEnv.vault.address, hardhat_1.ethers.constants.MaxUint256)];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, testEnv.USDC.approve(testEnv.vault.address, hardhat_1.ethers.constants.MaxUint256)
                        // add 10,000 USD or ~250k PHP and ~5k USDC to the pool
                    ];
                case 2:
                    _a.sent();
                    numeraireAmount = (0, units_1.parseEther)('10000');
                    return [4 /*yield*/, testEnv.fxPool.balanceOf(adminAddress)];
                case 3:
                    beforeLpBalance = _a.sent();
                    return [4 /*yield*/, testEnv.fxPHP.balanceOf(testEnv.vault.address)];
                case 4:
                    beforeVaultfxPhpBalance = _a.sent();
                    return [4 /*yield*/, testEnv.USDC.balanceOf(testEnv.vault.address)
                        // call the vault to add liquidity
                    ];
                case 5:
                    beforeVaultUsdcBalance = _a.sent();
                    return [4 /*yield*/, testEnv.fxPool.viewDeposit(numeraireAmount)];
                case 6:
                    viewDeposit = _a.sent();
                    fxPHPAddress = hardhat_1.ethers.utils.getAddress(testEnv.fxPHP.address);
                    liquidityToAdd = (0, sorter_1.sortTokenAddressesLikeVault)(sortedAddresses, fxPHPAddress, {
                        lptAmount: viewDeposit[0],
                        deposits: viewDeposit[1],
                    });
                    payload = hardhat_1.ethers.utils.defaultAbiCoder.encode(['uint256[]', 'address[]'], [liquidityToAdd, sortedAddresses]);
                    joinPoolRequest = {
                        assets: sortedAddresses,
                        // maxAmountsIn: [ethers.utils.parseUnits('10000000'), ethers.utils.parseUnits('10000000')],
                        maxAmountsIn: [liquidityToAdd[0], liquidityToAdd[1]],
                        userData: payload,
                        fromInternalBalance: false,
                    };
                    return [4 /*yield*/, (0, chai_1.expect)(testEnv.vault.joinPool(poolId, adminAddress, adminAddress, joinPoolRequest)).to.not.be.reverted];
                case 7:
                    _a.sent();
                    return [4 /*yield*/, testEnv.fxPool.balanceOf(adminAddress)];
                case 8:
                    afterLpBalance = _a.sent();
                    return [4 /*yield*/, testEnv.fxPHP.balanceOf(testEnv.vault.address)];
                case 9:
                    afterVaultfxPhpBalance = _a.sent();
                    return [4 /*yield*/, testEnv.USDC.balanceOf(testEnv.vault.address)];
                case 10:
                    afterVaultUsdcBalance = _a.sent();
                    (0, chai_1.expect)(afterLpBalance, 'Current LP Balance not expected').to.be.equals(beforeLpBalance.add(viewDeposit[0]));
                    (0, chai_1.expect)(afterVaultfxPhpBalance, 'Current fxPHP Balance not expected').to.be.equals(beforeVaultfxPhpBalance.add(viewDeposit[1][0]));
                    (0, chai_1.expect)(afterVaultUsdcBalance, 'Current USDC Balance not expected').to.be.equals(beforeVaultUsdcBalance.add(viewDeposit[1][1]));
                    return [2 /*return*/];
            }
        });
    }); });
    it('Round 1 - Removes liquidity inside the FXPool calling the vault and triggering onExit hook', function () { return __awaiter(void 0, void 0, void 0, function () {
        var poolId, tokensToBurn, beforeLpBalance, beforeVaultfxPhpBalance, beforeVaultUsdcBalance, withdrawTokensOut, payload, exitPoolRequest, afterLpBalance, afterVaultfxPhpBalance, afterVaultUsdcBalance;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, testEnv.fxPool.getPoolId()];
                case 1:
                    poolId = _a.sent();
                    tokensToBurn = (0, units_1.parseEther)('30');
                    return [4 /*yield*/, testEnv.fxPool.balanceOf(adminAddress)];
                case 2:
                    beforeLpBalance = _a.sent();
                    return [4 /*yield*/, testEnv.fxPHP.balanceOf(testEnv.vault.address)];
                case 3:
                    beforeVaultfxPhpBalance = _a.sent();
                    return [4 /*yield*/, testEnv.USDC.balanceOf(testEnv.vault.address)];
                case 4:
                    beforeVaultUsdcBalance = _a.sent();
                    return [4 /*yield*/, testEnv.fxPool.viewWithdraw(tokensToBurn)];
                case 5:
                    withdrawTokensOut = _a.sent();
                    payload = hardhat_1.ethers.utils.defaultAbiCoder.encode(['uint256', 'address[]'], [(0, units_1.parseUnits)('30'), sortedAddresses]);
                    exitPoolRequest = {
                        assets: sortedAddresses,
                        minAmountsOut: [0, 0],
                        userData: payload,
                        toInternalBalance: false,
                    };
                    return [4 /*yield*/, (0, chai_1.expect)(testEnv.vault.exitPool(poolId, adminAddress, adminAddress, exitPoolRequest)).to.not.be.reverted];
                case 6:
                    _a.sent();
                    return [4 /*yield*/, testEnv.fxPool.balanceOf(adminAddress)];
                case 7:
                    afterLpBalance = _a.sent();
                    return [4 /*yield*/, testEnv.fxPHP.balanceOf(testEnv.vault.address)];
                case 8:
                    afterVaultfxPhpBalance = _a.sent();
                    return [4 /*yield*/, testEnv.USDC.balanceOf(testEnv.vault.address)];
                case 9:
                    afterVaultUsdcBalance = _a.sent();
                    (0, chai_1.expect)(afterLpBalance, 'Current LP Balance not expected').to.be.equals(beforeLpBalance.sub(tokensToBurn));
                    (0, chai_1.expect)(afterVaultfxPhpBalance, 'Current fxPHP Balance not expected').to.be.equals(beforeVaultfxPhpBalance.sub(withdrawTokensOut[0]));
                    (0, chai_1.expect)(afterVaultUsdcBalance, 'Current USDC Balance not expected').to.be.equals(beforeVaultUsdcBalance.sub(withdrawTokensOut[1]));
                    return [2 /*return*/];
            }
        });
    }); });
    it('Round 2 - Adds liquidity inside the FXPool calling the vault and triggering onJoin hook', function () { return __awaiter(void 0, void 0, void 0, function () {
        var numeraireAmount, beforeLpBalance, beforeVaultfxPhpBalance, beforeVaultUsdcBalance, viewDeposit, fxPHPAddress, liquidityToAdd, payload, joinPoolRequest, onJoin2Res, afterLpBalance, afterVaultfxPhpBalance, afterVaultUsdcBalance;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    numeraireAmount = (0, units_1.parseEther)('32');
                    return [4 /*yield*/, testEnv.fxPool.balanceOf(adminAddress)];
                case 1:
                    beforeLpBalance = _a.sent();
                    return [4 /*yield*/, testEnv.fxPHP.balanceOf(testEnv.vault.address)];
                case 2:
                    beforeVaultfxPhpBalance = _a.sent();
                    return [4 /*yield*/, testEnv.USDC.balanceOf(testEnv.vault.address)];
                case 3:
                    beforeVaultUsdcBalance = _a.sent();
                    return [4 /*yield*/, testEnv.fxPool.viewDeposit(numeraireAmount)];
                case 4:
                    viewDeposit = _a.sent();
                    fxPHPAddress = hardhat_1.ethers.utils.getAddress(testEnv.fxPHP.address);
                    liquidityToAdd = (0, sorter_1.sortTokenAddressesLikeVault)(sortedAddresses, fxPHPAddress, {
                        lptAmount: viewDeposit[0],
                        deposits: viewDeposit[1],
                    });
                    console.log('liquidityToAdd result: ', liquidityToAdd);
                    payload = hardhat_1.ethers.utils.defaultAbiCoder.encode(['uint256[]', 'address[]'], [liquidityToAdd, sortedAddresses]);
                    joinPoolRequest = {
                        assets: sortedAddresses,
                        // increase maxAmountsIn? joinPool reverts with balancer err 506 - "Join would cost more than the user-supplied maximum tokens in"
                        // i think we need to pass viewDeposit[1,0] and viewDeposit[1,1] here
                        // maxAmountsIn: [ethers.utils.parseUnits('1000000'), ethers.utils.parseUnits('10000000')],
                        maxAmountsIn: [liquidityToAdd[0], liquidityToAdd[1]],
                        userData: payload,
                        fromInternalBalance: false,
                    };
                    // await expect(testEnv.vault.joinPool(poolId, adminAddress, adminAddress, joinPoolRequest)).to.not.be.reverted
                    console.log('joinPoolRequest packaged');
                    return [4 /*yield*/, testEnv.vault.joinPool(poolId, adminAddress, adminAddress, joinPoolRequest)];
                case 5:
                    onJoin2Res = _a.sent();
                    console.log('onJoin2Res: ', onJoin2Res);
                    return [4 /*yield*/, testEnv.fxPool.balanceOf(adminAddress)];
                case 6:
                    afterLpBalance = _a.sent();
                    return [4 /*yield*/, testEnv.fxPHP.balanceOf(testEnv.vault.address)];
                case 7:
                    afterVaultfxPhpBalance = _a.sent();
                    return [4 /*yield*/, testEnv.USDC.balanceOf(testEnv.vault.address)];
                case 8:
                    afterVaultUsdcBalance = _a.sent();
                    console.log("before:".concat(beforeLpBalance, ", after: ").concat(afterLpBalance, ", diff: ").concat(afterLpBalance.sub(beforeLpBalance), ", deposit: ").concat(viewDeposit[0], " "));
                    (0, chai_1.expect)(afterLpBalance, 'Current LP Balance not expected').to.be.equals(beforeLpBalance.add(viewDeposit[0]));
                    (0, chai_1.expect)(afterVaultfxPhpBalance, 'Current fxPHP Balance not expected').to.be.equals(beforeVaultfxPhpBalance.add(viewDeposit[1][0]));
                    (0, chai_1.expect)(afterVaultUsdcBalance, 'Current USDC Balance not expected').to.be.equals(beforeVaultUsdcBalance.add(viewDeposit[1][1]));
                    return [2 /*return*/];
            }
        });
    }); });
    it.skip('Round 2 - Removes liquidity inside the FXPool calling the vault and triggering onExit hook', function () { return __awaiter(void 0, void 0, void 0, function () {
        var poolId, tokensToBurn, beforeLpBalance, beforeVaultfxPhpBalance, beforeVaultUsdcBalance, withdrawTokensOut, payload, exitPoolRequest, afterLpBalance, afterVaultfxPhpBalance, afterVaultUsdcBalance;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, testEnv.fxPool.getPoolId()];
                case 1:
                    poolId = _a.sent();
                    tokensToBurn = (0, units_1.parseEther)('30');
                    return [4 /*yield*/, testEnv.fxPool.balanceOf(adminAddress)];
                case 2:
                    beforeLpBalance = _a.sent();
                    return [4 /*yield*/, testEnv.fxPHP.balanceOf(testEnv.vault.address)];
                case 3:
                    beforeVaultfxPhpBalance = _a.sent();
                    return [4 /*yield*/, testEnv.USDC.balanceOf(testEnv.vault.address)];
                case 4:
                    beforeVaultUsdcBalance = _a.sent();
                    return [4 /*yield*/, testEnv.fxPool.viewWithdraw(tokensToBurn)];
                case 5:
                    withdrawTokensOut = _a.sent();
                    payload = hardhat_1.ethers.utils.defaultAbiCoder.encode(['uint256', 'address[]'], [(0, units_1.parseUnits)('30'), sortedAddresses]);
                    exitPoolRequest = {
                        assets: sortedAddresses,
                        minAmountsOut: [0, 0],
                        userData: payload,
                        toInternalBalance: false,
                    };
                    console.log('viewWithdraw: ', withdrawTokensOut);
                    return [4 /*yield*/, (0, chai_1.expect)(testEnv.vault.exitPool(poolId, adminAddress, adminAddress, exitPoolRequest)).to.not.be.reverted];
                case 6:
                    _a.sent();
                    return [4 /*yield*/, testEnv.fxPool.balanceOf(adminAddress)];
                case 7:
                    afterLpBalance = _a.sent();
                    return [4 /*yield*/, testEnv.fxPHP.balanceOf(testEnv.vault.address)];
                case 8:
                    afterVaultfxPhpBalance = _a.sent();
                    return [4 /*yield*/, testEnv.USDC.balanceOf(testEnv.vault.address)];
                case 9:
                    afterVaultUsdcBalance = _a.sent();
                    console.log("afterlpbalance: ".concat(afterLpBalance, ", aftervaultbalance: ").concat(afterVaultfxPhpBalance, ", afterVaultUsdcBalance: ").concat(afterVaultUsdcBalance));
                    (0, chai_1.expect)(afterLpBalance, 'Current LP Balance not expected').to.be.equals(beforeLpBalance.sub(tokensToBurn));
                    (0, chai_1.expect)(afterVaultfxPhpBalance, 'Current fxPHP Balance not expected').to.be.equals(beforeVaultfxPhpBalance.sub(withdrawTokensOut[0]));
                    (0, chai_1.expect)(afterVaultUsdcBalance, 'Current USDC Balance not expected').to.be.equals(beforeVaultUsdcBalance.sub(withdrawTokensOut[1]));
                    return [2 /*return*/];
            }
        });
    }); });
    it.skip('Swaps tokan a and token b  calling the vault and triggering onSwap hook', function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, swaps, swapAssets, limits, deadline, funds, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z;
        return __generator(this, function (_0) {
            switch (_0.label) {
                case 0:
                    /// VAULT INDEX: index 0: USDC, index 1: fxPHP
                    _b = (_a = console).log;
                    _c = ['Before USDC: '];
                    return [4 /*yield*/, testEnv.USDC.balanceOf(adminAddress)];
                case 1:
                    /// VAULT INDEX: index 0: USDC, index 1: fxPHP
                    _b.apply(_a, _c.concat([_0.sent()]));
                    _e = (_d = console).log;
                    _f = ['Before fxPHP: '];
                    return [4 /*yield*/, testEnv.fxPHP.balanceOf(adminAddress)];
                case 2:
                    _e.apply(_d, _f.concat([_0.sent()]));
                    _h = (_g = console).log;
                    _j = ['FX PHP Pool amount: '];
                    return [4 /*yield*/, testEnv.fxPHP.balanceOf(testEnv.vault.address)];
                case 3:
                    _h.apply(_g, _j.concat([_0.sent()]));
                    _l = (_k = console).log;
                    _m = ['FX USDC Pool amount: '];
                    return [4 /*yield*/, testEnv.USDC.balanceOf(testEnv.vault.address)];
                case 4:
                    _l.apply(_k, _m.concat([_0.sent()]));
                    swaps = [
                        {
                            poolId: poolId,
                            assetInIndex: ethers_1.BigNumber.from(0),
                            assetOutIndex: ethers_1.BigNumber.from(1),
                            amount: (0, units_1.parseUnits)('30', 6),
                            userData: '0x',
                        },
                    ];
                    swapAssets = sortedAddresses;
                    limits = [(0, units_1.parseUnits)('999999999', 6), (0, units_1.parseUnits)('999999999')];
                    deadline = hardhat_1.ethers.constants.MaxUint256;
                    funds = {
                        sender: hardhat_1.ethers.utils.getAddress(adminAddress),
                        recipient: hardhat_1.ethers.utils.getAddress(adminAddress),
                        fromInternalBalance: false,
                        toInternalBalance: false,
                    };
                    return [4 /*yield*/, testEnv.vault.batchSwap(0, swaps, swapAssets, funds, limits, deadline)];
                case 5:
                    _0.sent();
                    _p = (_o = console).log;
                    _q = ['After USDC: '];
                    return [4 /*yield*/, testEnv.USDC.balanceOf(adminAddress)];
                case 6:
                    _p.apply(_o, _q.concat([_0.sent()]));
                    _s = (_r = console).log;
                    _t = ['After fxPHP: '];
                    return [4 /*yield*/, testEnv.fxPHP.balanceOf(adminAddress)];
                case 7:
                    _s.apply(_r, _t.concat([_0.sent()]));
                    _v = (_u = console).log;
                    _w = ['FX PHP Pool amount: '];
                    return [4 /*yield*/, testEnv.fxPHP.balanceOf(testEnv.vault.address)];
                case 8:
                    _v.apply(_u, _w.concat([_0.sent()]));
                    _y = (_x = console).log;
                    _z = ['FX USDC Pool amount: '];
                    return [4 /*yield*/, testEnv.USDC.balanceOf(testEnv.vault.address)];
                case 9:
                    _y.apply(_x, _z.concat([_0.sent()]));
                    return [2 /*return*/];
            }
        });
    }); });
    it.skip('Previews swap caclculation from the onSwap hook', function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
        return [2 /*return*/];
    }); }); });
    it.skip('Previews swap caclculation when providing single sided liquidity from the onJoin and onExit hook', function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
        return [2 /*return*/];
    }); }); });
    it.skip('can pause pool', function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _a = chai_1.expect;
                    return [4 /*yield*/, testEnv.fxPool.paused()];
                case 1:
                    _a.apply(void 0, [_c.sent()]).to.be.equals(false);
                    return [4 /*yield*/, (0, chai_1.expect)(testEnv.fxPool.setPause(true)).to.emit(testEnv.fxPool, 'Paused').withArgs(adminAddress)];
                case 2:
                    _c.sent();
                    _b = chai_1.expect;
                    return [4 /*yield*/, testEnv.fxPool.paused()];
                case 3:
                    _b.apply(void 0, [_c.sent()]).to.be.equals(true);
                    return [4 /*yield*/, (0, chai_1.expect)(testEnv.fxPool.connect(notOwner).setPause(false)).to.be.revertedWith(constants_1.CONTRACT_REVERT.Ownable)];
                case 4:
                    _c.sent();
                    return [4 /*yield*/, (0, chai_1.expect)(testEnv.fxPool.setPause(false)).to.emit(testEnv.fxPool, 'Unpaused').withArgs(adminAddress)]; // reset for now, test if pool functions can still be used when paused
                case 5:
                    _c.sent(); // reset for now, test if pool functions can still be used when paused
                    return [2 /*return*/];
            }
        });
    }); });
    it.skip('can trigger emergency alarm', function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    _a = chai_1.expect;
                    return [4 /*yield*/, testEnv.fxPool.emergency()];
                case 1:
                    _a.apply(void 0, [_d.sent()]).to.be.equals(false);
                    _b = chai_1.expect;
                    return [4 /*yield*/, testEnv.fxPool.setEmergency(true)];
                case 2:
                    _b.apply(void 0, [_d.sent()])
                        .to.emit(testEnv.fxPool, 'EmergencyAlarm')
                        .withArgs(true);
                    return [4 /*yield*/, (0, chai_1.expect)(testEnv.fxPool.connect(notOwner).setEmergency(false), 'Non owner can call the function').to.be.revertedWith(constants_1.CONTRACT_REVERT.Ownable)];
                case 3:
                    _d.sent();
                    _c = chai_1.expect;
                    return [4 /*yield*/, testEnv.fxPool.setEmergency(false)];
                case 4:
                    _c.apply(void 0, [_d.sent()])
                        .to.emit(testEnv.fxPool, 'EmergencyAlarm')
                        .withArgs(false); // reset for now, test emergency withdraw
                    return [2 /*return*/];
            }
        });
    }); });
    it.skip('can set cap when owner', function () { return __awaiter(void 0, void 0, void 0, function () {
        var curveDetails, newCurveDetails;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, testEnv.fxPool.curve()];
                case 1:
                    curveDetails = _a.sent();
                    (0, chai_1.expect)(curveDetails.cap).to.be.equals(0);
                    return [4 /*yield*/, testEnv.fxPool.setCap(NEW_CAP)];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, testEnv.fxPool.curve()];
                case 3:
                    newCurveDetails = _a.sent();
                    (0, chai_1.expect)(newCurveDetails.cap).to.be.equals(NEW_CAP);
                    return [4 /*yield*/, (0, chai_1.expect)(testEnv.fxPool.connect(notOwner).setCap(NEW_CAP_FAIL), 'Non owner can call the function').to.be.revertedWith(constants_1.CONTRACT_REVERT.Ownable)];
                case 4:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
});
