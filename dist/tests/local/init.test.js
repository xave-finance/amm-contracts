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
var mockTokenList_1 = require("../constants/mockTokenList");
var utils_1 = require("ethers/lib/utils");
var mockTokenHelpers_1 = require("../common/helpers/mockTokenHelpers");
var constants_1 = require("../constants");
var setupEnvironment_1 = require("../common/setupEnvironment");
var utils_2 = require("../common/helpers/utils");
/**
 * Mocked Entities
 * Vault - test balancer integration
 * Mock Pool - simulate swaps from non HALODAO Pools
 * Mock Oracle - mocked chainlink for assimilators
 * Mock WETH/Tokens - tokens for testing
 */
describe('Scaffold setup ', function () {
    var testEnv;
    var admin;
    var adminAddress;
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
                    return [2 /*return*/];
            }
        });
    }); });
    it('Vault and WETH Contracts are deployed', function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            (0, chai_1.expect)(testEnv.WETH.address, 'WETH is not deployed').to.be.properAddress;
            (0, chai_1.expect)(testEnv.vault.address, 'Vault is not deployed').to.be.properAddress;
            return [2 /*return*/];
        });
    }); });
    it('Create MockPool (XSGD/USDC) and register tokens', function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, testEnv.mockWeightedPoolFactory.create('HALO FX', 'HFX', (0, utils_2.sortAddresses)([testEnv.USDC.address, testEnv.XSGD.address]), [(0, utils_1.parseEther)('0.7'), (0, utils_1.parseEther)('0.3')], [adminAddress, adminAddress], (0, utils_1.parseEther)('0.1'), adminAddress)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it('Mock tokens and oracles test', function () { return __awaiter(void 0, void 0, void 0, function () {
        var adminAddress, MOCK_APPROVE_VALUE, _loop_1, _i, _a, token;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, admin.getAddress()];
                case 1:
                    adminAddress = _b.sent();
                    MOCK_APPROVE_VALUE = '5';
                    _loop_1 = function (token) {
                        var tokenDecimals, tokenName, _c, _d, _e, MOCK_TOKEN_REFERENCE, _f;
                        return __generator(this, function (_g) {
                            switch (_g.label) {
                                case 0: return [4 /*yield*/, token.tokenInstance.decimals()];
                                case 1:
                                    tokenDecimals = _g.sent();
                                    return [4 /*yield*/, token.tokenInstance.name()];
                                case 2:
                                    tokenName = _g.sent();
                                    (0, chai_1.expect)(token.tokenInstance.address, 'MintableERC20 is not deployed').to.be.properAddress;
                                    _c = chai_1.expect;
                                    return [4 /*yield*/, token.tokenInstance.balanceOf(adminAddress)];
                                case 3:
                                    _c.apply(void 0, [_g.sent()]).to.equals((0, utils_1.parseUnits)(constants_1.INTIAL_MINT, tokenDecimals));
                                    _d = chai_1.expect;
                                    return [4 /*yield*/, token.tokenInstance.allowance(adminAddress, testEnv.vault.address)];
                                case 4:
                                    _d.apply(void 0, [_g.sent()]).to.equals(0);
                                    return [4 /*yield*/, (0, mockTokenHelpers_1.approveMockToken)(token.tokenInstance.address, MOCK_APPROVE_VALUE, tokenDecimals, testEnv.vault.address)];
                                case 5:
                                    _g.sent();
                                    _e = chai_1.expect;
                                    return [4 /*yield*/, token.tokenInstance.allowance(adminAddress, testEnv.vault.address)];
                                case 6:
                                    _e.apply(void 0, [_g.sent()]).to.equals((0, utils_1.parseUnits)(MOCK_APPROVE_VALUE, tokenDecimals));
                                    (0, chai_1.expect)(token.oracleInstance.address).to.be.properAddress;
                                    MOCK_TOKEN_REFERENCE = mockTokenList_1.mockToken.find(function (t) { return t.name === tokenName; });
                                    _f = chai_1.expect;
                                    return [4 /*yield*/, token.oracleInstance.latestAnswer()];
                                case 7:
                                    _f.apply(void 0, [_g.sent()]).to.be.equals(MOCK_TOKEN_REFERENCE.mockOraclePrice);
                                    return [2 /*return*/];
                            }
                        });
                    };
                    _i = 0, _a = testEnv.mockTokenArray;
                    _b.label = 2;
                case 2:
                    if (!(_i < _a.length)) return [3 /*break*/, 5];
                    token = _a[_i];
                    return [5 /*yield**/, _loop_1(token)];
                case 3:
                    _b.sent();
                    _b.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 2];
                case 5: return [2 /*return*/];
            }
        });
    }); });
});
