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
var ethers_1 = require("ethers");
var constants_1 = require("../../constants");
var calculator = function (mockABDK) {
    var calculateRawAmount = function (input, decimals, rate) { return __awaiter(void 0, void 0, void 0, function () {
        var convertedAmount;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, mockABDK.mulu(input, decimals)];
                case 1:
                    convertedAmount = _a.sent();
                    return [2 /*return*/, convertedAmount.mul(constants_1.ONE_TO_THE_EIGHT).div(rate)];
            }
        });
    }); };
    var calculateRawAmountLpRatio = function (usdcBalance, baseWeight, quoteWeight, baseDecimals, baseTokenBal, input) { return __awaiter(void 0, void 0, void 0, function () {
        var _baseTokenBal, _usdcBal, _rate, convertedAmount;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (baseTokenBal.eq(0))
                        return [2 /*return*/, ethers_1.BigNumber.from('0')];
                    _baseTokenBal = baseTokenBal.mul(constants_1.ONE_ETHER).div(baseWeight);
                    _usdcBal = usdcBalance.mul(constants_1.ONE_ETHER).div(quoteWeight);
                    _rate = _usdcBal.mul(baseDecimals).div(_baseTokenBal);
                    return [4 /*yield*/, mockABDK.mulu(input, baseDecimals)];
                case 1:
                    convertedAmount = _a.sent();
                    return [2 /*return*/, convertedAmount.mul(constants_1.ONE_TO_THE_SIX).div(_rate)];
            }
        });
    }); };
    var calculateNumeraireAmount = function (inputAmount, rate, baseDecimals) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, mockABDK.divu(inputAmount.mul(rate).div(constants_1.ONE_TO_THE_EIGHT), baseDecimals)];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    }); };
    var calculateNumeraireBalance = function (numeraireBalance, rate, baseDecimals) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, mockABDK.divu(numeraireBalance.mul(rate).div(constants_1.ONE_TO_THE_EIGHT), baseDecimals)];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    }); };
    var calculateNumeraireBalanceLPRatio = function (usdcBalance, quoteWeight, baseTokenBal, baseWeight) { return __awaiter(void 0, void 0, void 0, function () {
        var _usdcBal, _rate;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (baseTokenBal.eq(0))
                        return [2 /*return*/, ethers_1.BigNumber.from('0')];
                    _usdcBal = usdcBalance.mul(constants_1.ONE_ETHER).div(quoteWeight);
                    _rate = _usdcBal.mul(constants_1.ONE_ETHER).div(baseTokenBal.mul(constants_1.ONE_ETHER).div(baseWeight));
                    return [4 /*yield*/, mockABDK.divu(baseTokenBal.mul(_rate).div(constants_1.ONE_TO_THE_SIX), constants_1.ONE_ETHER)];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    }); };
    return {
        calculateNumeraireAmount: calculateNumeraireAmount,
        calculateNumeraireBalance: calculateNumeraireBalance,
        calculateNumeraireBalanceLPRatio: calculateNumeraireBalanceLPRatio,
        calculateRawAmount: calculateRawAmount,
        calculateRawAmountLpRatio: calculateRawAmountLpRatio,
    };
};
exports.default = calculator;
