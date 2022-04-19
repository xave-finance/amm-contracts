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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var hardhat_1 = require("hardhat");
var setupEnvironment_1 = require("../common/setupEnvironment");
var contractGetters_1 = require("../common/contractGetters");
var mockTokenList_1 = require("../constants/mockTokenList");
var calculators_1 = __importDefault(require("../common/helpers/calculators"));
var utils_1 = require("ethers/lib/utils");
var constants_1 = require("../constants");
describe('Assimilators', function () {
    var INPUT_AMOUNT = (0, utils_1.parseEther)('100');
    var testEnv;
    var admin;
    var adminAddress;
    var calc;
    var poolId;
    before('build test env', function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, setupEnvironment_1.setupEnvironment)()];
                case 1:
                    testEnv = _a.sent();
                    return [4 /*yield*/, hardhat_1.ethers.getSigners()];
                case 2:
                    admin = (_a.sent())[0];
                    return [4 /*yield*/, admin.getAddress()];
                case 3:
                    adminAddress = _a.sent();
                    calc = (0, calculators_1.default)(testEnv.mockABDK);
                    return [4 /*yield*/, testEnv.fxPool.getPoolId()];
                case 4:
                    poolId = _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it('Assimilator Factory is deployed properly', function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    (0, chai_1.expect)(testEnv.assimilatorFactory.address, 'Assimilator Factory is not deployed').to.not.equals(hardhat_1.ethers.constants.AddressZero);
                    _a = chai_1.expect;
                    return [4 /*yield*/, testEnv.assimilatorFactory.usdc()];
                case 1:
                    _a.apply(void 0, [_d.sent(), 'USDC not set']).to.be.equals(testEnv.USDC.address);
                    _b = chai_1.expect;
                    return [4 /*yield*/, testEnv.assimilatorFactory.usdcOracle()];
                case 2:
                    _b.apply(void 0, [_d.sent(), 'USDC Oracle not set']).to.be.equals(testEnv.USDCOracle.address);
                    _c = chai_1.expect;
                    return [4 /*yield*/, testEnv.assimilatorFactory.usdcAssimilator()];
                case 3:
                    _c.apply(void 0, [_d.sent(), 'USDC Assimilator not set']).to.not.equals(hardhat_1.ethers.constants.AddressZero);
                    return [2 /*return*/];
            }
        });
    }); });
    it('Deploys XSGD, EURS & fxPHP assimilators from the assimilator factory', function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, chai_1.expect)(testEnv.assimilatorFactory.newBaseAssimilator(testEnv.XSGD.address, (0, utils_1.parseUnits)('1', "".concat(mockTokenList_1.mockToken[1].decimal)), testEnv.XSGDOracle.address), 'XSGD assimilator not created').to.emit(testEnv.assimilatorFactory, 'NewAssimilator')];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, (0, chai_1.expect)(testEnv.assimilatorFactory.newBaseAssimilator(testEnv.EURS.address, (0, utils_1.parseUnits)('1', "".concat(mockTokenList_1.mockToken[2].decimal)), testEnv.EURSOracle.address), 'EURS assimilator not created').to.emit(testEnv.assimilatorFactory, 'NewAssimilator')];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, (0, chai_1.expect)(testEnv.assimilatorFactory.newBaseAssimilator(testEnv.fxPHP.address, (0, utils_1.parseUnits)('1', "".concat(mockTokenList_1.mockToken[3].decimal)), testEnv.fxPHPOracle.address), 'fxPHP assimilator not created').to.emit(testEnv.assimilatorFactory, 'NewAssimilator')];
                case 3:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it('Gets newly deployed XSGD-USD assimilator from the assimilator factory with immutable params set properly', function () { return __awaiter(void 0, void 0, void 0, function () {
        var xsgdAssimilatorAddress, xsgdAssimilatorContract, _a, _b, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0: return [4 /*yield*/, testEnv.assimilatorFactory.getAssimilator(testEnv.XSGD.address)];
                case 1:
                    xsgdAssimilatorAddress = _e.sent();
                    (0, chai_1.expect)(xsgdAssimilatorAddress, 'XSGD-USD assimilator not created and returns zero address').to.not.equals(hardhat_1.ethers.constants.AddressZero);
                    return [4 /*yield*/, (0, contractGetters_1.getAssimilatorContract)(xsgdAssimilatorAddress)];
                case 2:
                    xsgdAssimilatorContract = _e.sent();
                    _a = chai_1.expect;
                    return [4 /*yield*/, xsgdAssimilatorContract.usdc()];
                case 3:
                    _a.apply(void 0, [_e.sent(), 'USDC address incorrect']).to.be.equals(testEnv.USDC.address);
                    _b = chai_1.expect;
                    return [4 /*yield*/, xsgdAssimilatorContract.oracle()];
                case 4:
                    _b.apply(void 0, [_e.sent(), 'XSGD Oracle address incorrect']).to.be.equals(testEnv.XSGDOracle.address);
                    _c = chai_1.expect;
                    return [4 /*yield*/, xsgdAssimilatorContract.baseToken()];
                case 5:
                    _c.apply(void 0, [_e.sent(), 'XSGD address incorrect']).to.be.equals(testEnv.XSGD.address);
                    _d = chai_1.expect;
                    return [4 /*yield*/, xsgdAssimilatorContract.baseDecimals()];
                case 6:
                    _d.apply(void 0, [_e.sent(), 'XSGD decimals incorrect']).to.be.equals((0, utils_1.parseUnits)('1', "".concat(mockTokenList_1.mockToken[1].decimal)));
                    return [2 /*return*/];
            }
        });
    }); });
    it('Gets newly deployed EURS-USD assimilator from the assimilator factory with immutable params set properly', function () { return __awaiter(void 0, void 0, void 0, function () {
        var eursAssimilatorAddress, eursAssimilatorContract, _a, _b, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0: return [4 /*yield*/, testEnv.assimilatorFactory.getAssimilator(testEnv.EURS.address)];
                case 1:
                    eursAssimilatorAddress = _e.sent();
                    (0, chai_1.expect)(eursAssimilatorAddress, 'EURS-USD assimilator not created and returns zero address').to.not.equals(hardhat_1.ethers.constants.AddressZero);
                    return [4 /*yield*/, (0, contractGetters_1.getAssimilatorContract)(eursAssimilatorAddress)];
                case 2:
                    eursAssimilatorContract = _e.sent();
                    _a = chai_1.expect;
                    return [4 /*yield*/, eursAssimilatorContract.usdc()];
                case 3:
                    _a.apply(void 0, [_e.sent(), 'USDC address incorrect']).to.be.equals(testEnv.USDC.address);
                    _b = chai_1.expect;
                    return [4 /*yield*/, eursAssimilatorContract.oracle()];
                case 4:
                    _b.apply(void 0, [_e.sent(), 'EURS Oracle address incorrect']).to.be.equals(testEnv.EURSOracle.address);
                    _c = chai_1.expect;
                    return [4 /*yield*/, eursAssimilatorContract.baseToken()];
                case 5:
                    _c.apply(void 0, [_e.sent(), 'EURS address incorrect']).to.be.equals(testEnv.EURS.address);
                    _d = chai_1.expect;
                    return [4 /*yield*/, eursAssimilatorContract.baseDecimals()];
                case 6:
                    _d.apply(void 0, [_e.sent(), 'EURS decimals incorrect']).to.be.equals((0, utils_1.parseUnits)('1', "".concat(mockTokenList_1.mockToken[2].decimal)));
                    return [2 /*return*/];
            }
        });
    }); });
    it('Gets newly deployed fxPHP-USD assimilator from the assimilator factory with immutable params set properly', function () { return __awaiter(void 0, void 0, void 0, function () {
        var fxPHPAssimilatorAddress, fxPHPAssimilatorContract, _a, _b, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0: return [4 /*yield*/, testEnv.assimilatorFactory.getAssimilator(testEnv.fxPHP.address)];
                case 1:
                    fxPHPAssimilatorAddress = _e.sent();
                    (0, chai_1.expect)(fxPHPAssimilatorAddress, 'fxPHP-USD assimilator not created and returns zero address').to.not.equals(hardhat_1.ethers.constants.AddressZero);
                    return [4 /*yield*/, (0, contractGetters_1.getAssimilatorContract)(fxPHPAssimilatorAddress)];
                case 2:
                    fxPHPAssimilatorContract = _e.sent();
                    _a = chai_1.expect;
                    return [4 /*yield*/, fxPHPAssimilatorContract.usdc()];
                case 3:
                    _a.apply(void 0, [_e.sent(), 'USDC address incorrect']).to.be.equals(testEnv.USDC.address);
                    _b = chai_1.expect;
                    return [4 /*yield*/, fxPHPAssimilatorContract.oracle()];
                case 4:
                    _b.apply(void 0, [_e.sent(), 'fxPHP Oracle address incorrect']).to.be.equals(testEnv.fxPHPOracle.address);
                    _c = chai_1.expect;
                    return [4 /*yield*/, fxPHPAssimilatorContract.baseToken()];
                case 5:
                    _c.apply(void 0, [_e.sent(), 'fxPHP address incorrect']).to.be.equals(testEnv.fxPHP.address);
                    _d = chai_1.expect;
                    return [4 /*yield*/, fxPHPAssimilatorContract.baseDecimals()];
                case 6:
                    _d.apply(void 0, [_e.sent(), 'fxPHP decimals incorrect']).to.be.equals((0, utils_1.parseUnits)('1', "".concat(mockTokenList_1.mockToken[3].decimal)));
                    return [2 /*return*/];
            }
        });
    }); });
    it('XSGD-USD assimilator calculation tests', function () { return __awaiter(void 0, void 0, void 0, function () {
        var mockCurveAddress, xsgdAssimilatorAddress, xsgdAssimilatorContract, xsgdRateFromAssimilator, xsgdAssimilatorDecimals, baseWeight, quoteWeight, usdcBalance, xsgdBalance, _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, amount_, balance_, _p, _q, _r, _s, _t, _u, _v;
        return __generator(this, function (_w) {
            switch (_w.label) {
                case 0:
                    mockCurveAddress = adminAddress // illustrate calculation using current EOA account
                    ;
                    return [4 /*yield*/, testEnv.assimilatorFactory.getAssimilator(testEnv.XSGD.address)];
                case 1:
                    xsgdAssimilatorAddress = _w.sent();
                    return [4 /*yield*/, (0, contractGetters_1.getAssimilatorContract)(xsgdAssimilatorAddress)];
                case 2:
                    xsgdAssimilatorContract = _w.sent();
                    return [4 /*yield*/, xsgdAssimilatorContract.getRate()];
                case 3:
                    xsgdRateFromAssimilator = _w.sent();
                    return [4 /*yield*/, xsgdAssimilatorContract.baseDecimals()];
                case 4:
                    xsgdAssimilatorDecimals = _w.sent();
                    return [4 /*yield*/, testEnv.mockABDK.mulu((0, utils_1.parseUnits)('0.5'), constants_1.ONE_ETHER)]; // from ProportionalLiquidity line 106
                case 5:
                    baseWeight = _w.sent() // from ProportionalLiquidity line 106
                    ;
                    return [4 /*yield*/, testEnv.mockABDK.mulu((0, utils_1.parseUnits)('0.5'), constants_1.ONE_ETHER)]; // from ProportionalLiquidity line 107
                case 6:
                    quoteWeight = _w.sent() // from ProportionalLiquidity line 107
                    ;
                    return [4 /*yield*/, testEnv.USDC.balanceOf(mockCurveAddress)];
                case 7:
                    usdcBalance = _w.sent();
                    return [4 /*yield*/, testEnv.XSGD.balanceOf(mockCurveAddress)];
                case 8:
                    xsgdBalance = _w.sent();
                    (0, chai_1.expect)(xsgdRateFromAssimilator, 'Rate from assimilator is not equal to oracle price').to.equals(mockTokenList_1.mockToken[1].mockOraclePrice);
                    _b = chai_1.expect;
                    return [4 /*yield*/, xsgdAssimilatorContract.viewRawAmount(INPUT_AMOUNT)];
                case 9:
                    _c = (_a = _b.apply(void 0, [_w.sent(), 'View raw amount calculation is incorrect']).to).equals;
                    return [4 /*yield*/, calc.calculateRawAmount(INPUT_AMOUNT, xsgdAssimilatorDecimals, xsgdRateFromAssimilator)];
                case 10:
                    _c.apply(_a, [_w.sent()]);
                    _e = chai_1.expect;
                    return [4 /*yield*/, xsgdAssimilatorContract.viewRawAmountLPRatio(baseWeight, quoteWeight, adminAddress, INPUT_AMOUNT, testEnv.vault.address, poolId)];
                case 11:
                    _f = (_d = _e.apply(void 0, [_w.sent(), 'View raw amount LP ratio calculation is incorrect']).to).equals;
                    return [4 /*yield*/, calc.calculateRawAmountLpRatio(usdcBalance, baseWeight, quoteWeight, xsgdAssimilatorDecimals, xsgdBalance, INPUT_AMOUNT)];
                case 12:
                    _f.apply(_d, [_w.sent()]);
                    _h = chai_1.expect;
                    return [4 /*yield*/, xsgdAssimilatorContract.viewNumeraireAmount(INPUT_AMOUNT)];
                case 13:
                    _j = (_g = _h.apply(void 0, [_w.sent(), 'View numeraire amount calculation is incorrect']).to).equals;
                    return [4 /*yield*/, calc.calculateNumeraireAmount(INPUT_AMOUNT, xsgdRateFromAssimilator, xsgdAssimilatorDecimals)];
                case 14:
                    _j.apply(_g, [_w.sent()]);
                    _l = chai_1.expect;
                    return [4 /*yield*/, xsgdAssimilatorContract.viewNumeraireBalance(/*mockCurveAddress, */ testEnv.vault.address, poolId)];
                case 15:
                    _m = (_k = _l.apply(void 0, [_w.sent(), 'View numeraire balance calculation is incorrect']).to).equals;
                    return [4 /*yield*/, calc.calculateNumeraireBalance(xsgdBalance, xsgdRateFromAssimilator, xsgdAssimilatorDecimals)];
                case 16:
                    _m.apply(_k, [_w.sent()]);
                    return [4 /*yield*/, xsgdAssimilatorContract.viewNumeraireAmountAndBalance(
                        // mockCurveAddress,
                        INPUT_AMOUNT, testEnv.vault.address, poolId)];
                case 17:
                    _o = _w.sent(), amount_ = _o.amount_, balance_ = _o.balance_;
                    _q = (_p = (0, chai_1.expect)(amount_).to.be).equals;
                    return [4 /*yield*/, calc.calculateNumeraireAmount(INPUT_AMOUNT, xsgdRateFromAssimilator, xsgdAssimilatorDecimals)];
                case 18:
                    _q.apply(_p, [_w.sent(), 'amount_ in viewNumeraireAmountAndBalance calculation is incorrect']);
                    _s = (_r = (0, chai_1.expect)(balance_).to.be).equals;
                    return [4 /*yield*/, calc.calculateNumeraireBalance(xsgdBalance, xsgdRateFromAssimilator, xsgdAssimilatorDecimals)];
                case 19:
                    _s.apply(_r, [_w.sent(), 'balance_ in viewNumeraireAmountAndBalance calculation is incorrect']);
                    _u = chai_1.expect;
                    return [4 /*yield*/, xsgdAssimilatorContract.viewNumeraireBalanceLPRatio(baseWeight, quoteWeight, mockCurveAddress, testEnv.vault.address, poolId)];
                case 20:
                    _v = (_t = _u.apply(void 0, [_w.sent(), 'View Numeraire Balance LP Ratio calculation is incorrect']).to).equals;
                    return [4 /*yield*/, calc.calculateNumeraireBalanceLPRatio(usdcBalance, quoteWeight, xsgdBalance, baseWeight)];
                case 21:
                    _v.apply(_t, [_w.sent()]);
                    return [2 /*return*/];
            }
        });
    }); });
    it('EURS-USD assimilator calculation tests', function () { return __awaiter(void 0, void 0, void 0, function () {
        var mockCurveAddress, eursAssimilatorAddress, eursAssimilatorContract, eursRateFromAssimilator, eursAssimilatorDecimals, baseWeight, quoteWeight, usdcBalance, eursBalance, _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, amount_, balance_, _p, _q, _r, _s, _t, _u, _v;
        return __generator(this, function (_w) {
            switch (_w.label) {
                case 0:
                    mockCurveAddress = adminAddress // illustrate calculation using current EOA account
                    ;
                    return [4 /*yield*/, testEnv.assimilatorFactory.getAssimilator(testEnv.EURS.address)];
                case 1:
                    eursAssimilatorAddress = _w.sent();
                    return [4 /*yield*/, (0, contractGetters_1.getAssimilatorContract)(eursAssimilatorAddress)];
                case 2:
                    eursAssimilatorContract = _w.sent();
                    return [4 /*yield*/, eursAssimilatorContract.getRate()];
                case 3:
                    eursRateFromAssimilator = _w.sent();
                    return [4 /*yield*/, eursAssimilatorContract.baseDecimals()];
                case 4:
                    eursAssimilatorDecimals = _w.sent();
                    return [4 /*yield*/, testEnv.mockABDK.mulu((0, utils_1.parseUnits)('0.5'), constants_1.ONE_ETHER)]; // from ProportionalLiquidity line 106
                case 5:
                    baseWeight = _w.sent() // from ProportionalLiquidity line 106
                    ;
                    return [4 /*yield*/, testEnv.mockABDK.mulu((0, utils_1.parseUnits)('0.5'), constants_1.ONE_ETHER)]; // from ProportionalLiquidity line 107
                case 6:
                    quoteWeight = _w.sent() // from ProportionalLiquidity line 107
                    ;
                    return [4 /*yield*/, testEnv.USDC.balanceOf(mockCurveAddress)];
                case 7:
                    usdcBalance = _w.sent();
                    return [4 /*yield*/, testEnv.EURS.balanceOf(mockCurveAddress)];
                case 8:
                    eursBalance = _w.sent();
                    (0, chai_1.expect)(eursRateFromAssimilator, 'Rate from assimilator is not equal to oracle price').to.equals(mockTokenList_1.mockToken[2].mockOraclePrice);
                    _b = chai_1.expect;
                    return [4 /*yield*/, eursAssimilatorContract.viewRawAmount(INPUT_AMOUNT)];
                case 9:
                    _c = (_a = _b.apply(void 0, [_w.sent(), 'View raw amount calculation is incorrect']).to).equals;
                    return [4 /*yield*/, calc.calculateRawAmount(INPUT_AMOUNT, eursAssimilatorDecimals, eursRateFromAssimilator)];
                case 10:
                    _c.apply(_a, [_w.sent()]);
                    _e = chai_1.expect;
                    return [4 /*yield*/, eursAssimilatorContract.viewRawAmountLPRatio(baseWeight, quoteWeight, adminAddress, INPUT_AMOUNT, testEnv.vault.address, poolId)];
                case 11:
                    _f = (_d = _e.apply(void 0, [_w.sent(), 'View raw amount LP ratio calculation is incorrect']).to).equals;
                    return [4 /*yield*/, calc.calculateRawAmountLpRatio(usdcBalance, baseWeight, quoteWeight, eursAssimilatorDecimals, eursBalance, INPUT_AMOUNT)];
                case 12:
                    _f.apply(_d, [_w.sent()]);
                    _h = chai_1.expect;
                    return [4 /*yield*/, eursAssimilatorContract.viewNumeraireAmount(INPUT_AMOUNT)];
                case 13:
                    _j = (_g = _h.apply(void 0, [_w.sent(), 'View numeraire amount calculation is incorrect']).to).equals;
                    return [4 /*yield*/, calc.calculateNumeraireAmount(INPUT_AMOUNT, eursRateFromAssimilator, eursAssimilatorDecimals)];
                case 14:
                    _j.apply(_g, [_w.sent()]);
                    _l = chai_1.expect;
                    return [4 /*yield*/, eursAssimilatorContract.viewNumeraireBalance(/*mockCurveAddress, */ testEnv.vault.address, poolId)];
                case 15:
                    _m = (_k = _l.apply(void 0, [_w.sent(), 'View numeraire balance calculation is incorrect']).to).equals;
                    return [4 /*yield*/, calc.calculateNumeraireBalance(eursBalance, eursRateFromAssimilator, eursAssimilatorDecimals)];
                case 16:
                    _m.apply(_k, [_w.sent()]);
                    return [4 /*yield*/, eursAssimilatorContract.viewNumeraireAmountAndBalance(
                        // mockCurveAddress,
                        INPUT_AMOUNT, testEnv.vault.address, poolId)];
                case 17:
                    _o = _w.sent(), amount_ = _o.amount_, balance_ = _o.balance_;
                    _q = (_p = (0, chai_1.expect)(amount_).to.be).equals;
                    return [4 /*yield*/, calc.calculateNumeraireAmount(INPUT_AMOUNT, eursRateFromAssimilator, eursAssimilatorDecimals)];
                case 18:
                    _q.apply(_p, [_w.sent(), 'amount_ in viewNumeraireAmountAndBalance calculation is incorrect']);
                    _s = (_r = (0, chai_1.expect)(balance_).to.be).equals;
                    return [4 /*yield*/, calc.calculateNumeraireBalance(eursBalance, eursRateFromAssimilator, eursAssimilatorDecimals)];
                case 19:
                    _s.apply(_r, [_w.sent(), 'balance_ in viewNumeraireAmountAndBalance calculation is incorrect']);
                    _u = chai_1.expect;
                    return [4 /*yield*/, eursAssimilatorContract.viewNumeraireBalanceLPRatio(baseWeight, quoteWeight, mockCurveAddress, testEnv.vault.address, poolId)];
                case 20:
                    _v = (_t = _u.apply(void 0, [_w.sent(), 'View Numeraire Balance LP Ratio calculation is incorrect']).to).equals;
                    return [4 /*yield*/, calc.calculateNumeraireBalanceLPRatio(usdcBalance, quoteWeight, eursBalance, baseWeight)];
                case 21:
                    _v.apply(_t, [_w.sent()]);
                    return [2 /*return*/];
            }
        });
    }); });
    it('fxPHP-USD assimilator calculation tests', function () { return __awaiter(void 0, void 0, void 0, function () {
        var mockCurveAddress, fxPHPAssimilatorAddress, fxPHPAssimilatorContract, fxPHPRateFromAssimilator, fxPHPAssimilatorDecimals, baseWeight, quoteWeight, usdcBalance, fxPHPBalance, _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, amount_, balance_, _p, _q, _r, _s, _t, _u, _v;
        return __generator(this, function (_w) {
            switch (_w.label) {
                case 0:
                    mockCurveAddress = adminAddress // illustrate calculation using current EOA account
                    ;
                    return [4 /*yield*/, testEnv.assimilatorFactory.getAssimilator(testEnv.fxPHP.address)];
                case 1:
                    fxPHPAssimilatorAddress = _w.sent();
                    return [4 /*yield*/, (0, contractGetters_1.getAssimilatorContract)(fxPHPAssimilatorAddress)];
                case 2:
                    fxPHPAssimilatorContract = _w.sent();
                    return [4 /*yield*/, fxPHPAssimilatorContract.getRate()];
                case 3:
                    fxPHPRateFromAssimilator = _w.sent();
                    return [4 /*yield*/, fxPHPAssimilatorContract.baseDecimals()];
                case 4:
                    fxPHPAssimilatorDecimals = _w.sent();
                    return [4 /*yield*/, testEnv.mockABDK.mulu((0, utils_1.parseUnits)('0.5'), constants_1.ONE_ETHER)]; // from ProportionalLiquidity line 106
                case 5:
                    baseWeight = _w.sent() // from ProportionalLiquidity line 106
                    ;
                    return [4 /*yield*/, testEnv.mockABDK.mulu((0, utils_1.parseUnits)('0.5'), constants_1.ONE_ETHER)]; // from ProportionalLiquidity line 107
                case 6:
                    quoteWeight = _w.sent() // from ProportionalLiquidity line 107
                    ;
                    return [4 /*yield*/, testEnv.USDC.balanceOf(mockCurveAddress)];
                case 7:
                    usdcBalance = _w.sent();
                    return [4 /*yield*/, testEnv.fxPHP.balanceOf(mockCurveAddress)];
                case 8:
                    fxPHPBalance = _w.sent();
                    (0, chai_1.expect)(fxPHPRateFromAssimilator, 'Rate from assimilator is not equal to oracle price').to.equals(mockTokenList_1.mockToken[3].mockOraclePrice);
                    _b = chai_1.expect;
                    return [4 /*yield*/, fxPHPAssimilatorContract.viewRawAmount(INPUT_AMOUNT)];
                case 9:
                    _c = (_a = _b.apply(void 0, [_w.sent(), 'View raw amount calculation is incorrect']).to).equals;
                    return [4 /*yield*/, calc.calculateRawAmount(INPUT_AMOUNT, fxPHPAssimilatorDecimals, fxPHPRateFromAssimilator)];
                case 10:
                    _c.apply(_a, [_w.sent()]);
                    _e = chai_1.expect;
                    return [4 /*yield*/, fxPHPAssimilatorContract.viewRawAmountLPRatio(baseWeight, quoteWeight, adminAddress, INPUT_AMOUNT, testEnv.vault.address, poolId)];
                case 11:
                    _f = (_d = _e.apply(void 0, [_w.sent(), 'View raw amount LP ratio calculation is incorrect']).to).equals;
                    return [4 /*yield*/, calc.calculateRawAmountLpRatio(usdcBalance, baseWeight, quoteWeight, fxPHPAssimilatorDecimals, fxPHPBalance, INPUT_AMOUNT)];
                case 12:
                    _f.apply(_d, [_w.sent()]);
                    _h = chai_1.expect;
                    return [4 /*yield*/, fxPHPAssimilatorContract.viewNumeraireAmount(INPUT_AMOUNT)];
                case 13:
                    _j = (_g = _h.apply(void 0, [_w.sent(), 'View numeraire amount calculation is incorrect']).to).equals;
                    return [4 /*yield*/, calc.calculateNumeraireAmount(INPUT_AMOUNT, fxPHPRateFromAssimilator, fxPHPAssimilatorDecimals)];
                case 14:
                    _j.apply(_g, [_w.sent()]);
                    _l = chai_1.expect;
                    return [4 /*yield*/, fxPHPAssimilatorContract.viewNumeraireBalance(/*mockCurveAddress, */ testEnv.vault.address, poolId)];
                case 15:
                    _m = (_k = _l.apply(void 0, [_w.sent(), 'View numeraire balance calculation is incorrect']).to).equals;
                    return [4 /*yield*/, calc.calculateNumeraireBalance(fxPHPBalance, fxPHPRateFromAssimilator, fxPHPAssimilatorDecimals)];
                case 16:
                    _m.apply(_k, [_w.sent()]);
                    return [4 /*yield*/, fxPHPAssimilatorContract.viewNumeraireAmountAndBalance(
                        // mockCurveAddress,
                        INPUT_AMOUNT, testEnv.vault.address, poolId)];
                case 17:
                    _o = _w.sent(), amount_ = _o.amount_, balance_ = _o.balance_;
                    _q = (_p = (0, chai_1.expect)(amount_).to.be).equals;
                    return [4 /*yield*/, calc.calculateNumeraireAmount(INPUT_AMOUNT, fxPHPRateFromAssimilator, fxPHPAssimilatorDecimals)];
                case 18:
                    _q.apply(_p, [_w.sent(), 'amount_ in viewNumeraireAmountAndBalance calculation is incorrect']);
                    _s = (_r = (0, chai_1.expect)(balance_).to.be).equals;
                    return [4 /*yield*/, calc.calculateNumeraireBalance(fxPHPBalance, fxPHPRateFromAssimilator, fxPHPAssimilatorDecimals)];
                case 19:
                    _s.apply(_r, [_w.sent(), 'balance_ in viewNumeraireAmountAndBalance calculation is incorrect']);
                    _u = chai_1.expect;
                    return [4 /*yield*/, fxPHPAssimilatorContract.viewNumeraireBalanceLPRatio(baseWeight, quoteWeight, mockCurveAddress, testEnv.vault.address, poolId)];
                case 20:
                    _v = (_t = _u.apply(void 0, [_w.sent(), 'View Numeraire Balance LP Ratio calculation is incorrect']).to).equals;
                    return [4 /*yield*/, calc.calculateNumeraireBalanceLPRatio(usdcBalance, quoteWeight, fxPHPBalance, baseWeight)];
                case 21:
                    _v.apply(_t, [_w.sent()]);
                    return [2 /*return*/];
            }
        });
    }); });
    it('USDC-USD assimilator calculation tests', function () { return __awaiter(void 0, void 0, void 0, function () {
        var mockCurveAddress, USDC_DECIMALS, usdcAssimilatorAddress, usdcAssimilatorContract, usdcRateFromAssimilator, usdcBalance, baseWeight, quoteWeight, _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, amount_, balance_, _p, _q, _r, _s, _t, _u, _v;
        return __generator(this, function (_w) {
            switch (_w.label) {
                case 0:
                    mockCurveAddress = adminAddress // illustrate calculation using current EOA account
                    ;
                    USDC_DECIMALS = constants_1.ONE_TO_THE_SIX // assigning for reference purposes
                    ;
                    return [4 /*yield*/, testEnv.assimilatorFactory.usdcAssimilator()];
                case 1:
                    usdcAssimilatorAddress = _w.sent();
                    return [4 /*yield*/, (0, contractGetters_1.getUSDCAssimilatorContract)(usdcAssimilatorAddress)];
                case 2:
                    usdcAssimilatorContract = _w.sent();
                    return [4 /*yield*/, usdcAssimilatorContract.getRate()];
                case 3:
                    usdcRateFromAssimilator = _w.sent();
                    return [4 /*yield*/, testEnv.USDC.balanceOf(adminAddress)];
                case 4:
                    usdcBalance = _w.sent();
                    return [4 /*yield*/, testEnv.mockABDK.mulu((0, utils_1.parseUnits)('0.5'), constants_1.ONE_ETHER)]; // from ProportionalLiquidity line 106
                case 5:
                    baseWeight = _w.sent() // from ProportionalLiquidity line 106
                    ;
                    return [4 /*yield*/, testEnv.mockABDK.mulu((0, utils_1.parseUnits)('0.5'), constants_1.ONE_ETHER)]; // from ProportionalLiquidity line 107
                case 6:
                    quoteWeight = _w.sent() // from ProportionalLiquidity line 107
                    ;
                    (0, chai_1.expect)(usdcRateFromAssimilator).to.equals(mockTokenList_1.mockToken[0].mockOraclePrice);
                    _b = chai_1.expect;
                    return [4 /*yield*/, usdcAssimilatorContract.viewRawAmount(INPUT_AMOUNT)];
                case 7:
                    _c = (_a = _b.apply(void 0, [_w.sent(), 'View raw amount calculation is incorrect']).to).equals;
                    return [4 /*yield*/, calc.calculateRawAmount(INPUT_AMOUNT, USDC_DECIMALS, usdcRateFromAssimilator)];
                case 8:
                    _c.apply(_a, [_w.sent()]);
                    _e = chai_1.expect;
                    return [4 /*yield*/, usdcAssimilatorContract.viewRawAmountLPRatio(baseWeight, quoteWeight, mockCurveAddress, INPUT_AMOUNT, testEnv.vault.address, poolId)];
                case 9:
                    _f = (_d = _e.apply(void 0, [_w.sent(), 'View raw amount LP ratio calculation is incorrect']).to).equals;
                    return [4 /*yield*/, testEnv.mockABDK.mulu(INPUT_AMOUNT, USDC_DECIMALS)];
                case 10:
                    _f.apply(_d, [_w.sent()]);
                    _h = chai_1.expect;
                    return [4 /*yield*/, usdcAssimilatorContract.viewNumeraireAmount(INPUT_AMOUNT)];
                case 11:
                    _j = (_g = _h.apply(void 0, [_w.sent(), 'View numeraire amount calculation is incorrect']).to).equals;
                    return [4 /*yield*/, calc.calculateNumeraireAmount(INPUT_AMOUNT, usdcRateFromAssimilator, USDC_DECIMALS)];
                case 12:
                    _j.apply(_g, [_w.sent()]);
                    _l = chai_1.expect;
                    return [4 /*yield*/, usdcAssimilatorContract.viewNumeraireBalance(/*mockCurveAddress, */ testEnv.vault.address, poolId)];
                case 13:
                    _m = (_k = _l.apply(void 0, [_w.sent(), 'View numeraire balance calculation is incorrect']).to).equals;
                    return [4 /*yield*/, calc.calculateNumeraireBalance(usdcBalance, usdcRateFromAssimilator, USDC_DECIMALS)];
                case 14:
                    _m.apply(_k, [_w.sent()]);
                    return [4 /*yield*/, usdcAssimilatorContract.viewNumeraireAmountAndBalance(
                        // mockCurveAddress,
                        INPUT_AMOUNT, testEnv.vault.address, poolId)];
                case 15:
                    _o = _w.sent(), amount_ = _o.amount_, balance_ = _o.balance_;
                    _q = (_p = (0, chai_1.expect)(amount_).to.be).equals;
                    return [4 /*yield*/, calc.calculateNumeraireAmount(INPUT_AMOUNT, usdcRateFromAssimilator, USDC_DECIMALS)];
                case 16:
                    _q.apply(_p, [_w.sent(), 'amount_ in viewNumeraireAmountAndBalance calculation is incorrect']);
                    _s = (_r = (0, chai_1.expect)(balance_).to.be).equals;
                    return [4 /*yield*/, calc.calculateNumeraireBalance(usdcBalance, usdcRateFromAssimilator, USDC_DECIMALS)];
                case 17:
                    _s.apply(_r, [_w.sent(), 'balance_ in viewNumeraireAmountAndBalance calculation is incorrect']);
                    _u = chai_1.expect;
                    return [4 /*yield*/, usdcAssimilatorContract.viewNumeraireBalanceLPRatio(baseWeight, quoteWeight, mockCurveAddress, testEnv.vault.address, poolId)];
                case 18:
                    _v = (_t = _u.apply(void 0, [_w.sent(), 'View Numeraire Balance LP Ratio calculation is incorrect']).to).equals;
                    return [4 /*yield*/, calc.calculateNumeraireBalanceLPRatio(usdcBalance, quoteWeight, usdcBalance, baseWeight)];
                case 19:
                    _v.apply(_t, [_w.sent()]);
                    return [2 /*return*/];
            }
        });
    }); });
});
