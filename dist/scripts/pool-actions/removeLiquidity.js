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
require("@nomiclabs/hardhat-ethers");
var Vault_json_1 = __importDefault(require("@balancer-labs/v2-deployments/deployed/kovan/Vault.json"));
var open_1 = __importDefault(require("open"));
var sortAddresses_1 = require("../utils/sortAddresses");
var addresses_1 = require("../utils/addresses");
exports.default = (function (taskArgs) { return __awaiter(void 0, void 0, void 0, function () {
    var deployer, _a, _b, _c, _d, _e, network, poolAddress, poolId, baseToken, quoteToken, lptAmount, toInternalBalance, proportionalLiquidityAddress, lptAmountBN, FXPool, viewWithdrawResponse, baseAmountBN, quoteAmountBN, sortedAddresses, liquidityToRemove, payload, exitPoolRequest, vault, connectedVault, encodedExitPoolTx, txPayload, exitPoolTxReceipt, Error_1;
    var _f;
    return __generator(this, function (_g) {
        switch (_g.label) {
            case 0: return [4 /*yield*/, ethers.getSigners()];
            case 1:
                deployer = (_g.sent())[0];
                console.log('Liquidity Provider Address:', deployer.address);
                _b = (_a = console).log;
                _c = ['LP Provider balance:'];
                _e = (_d = ethers.utils).formatEther;
                return [4 /*yield*/, deployer.getBalance()];
            case 2:
                _b.apply(_a, _c.concat([_e.apply(_d, [_g.sent()])]));
                network = taskArgs.to;
                poolAddress = taskArgs.pooladdress;
                poolId = taskArgs.poolid;
                baseToken = taskArgs.basetoken;
                quoteToken = taskArgs.quotetoken;
                lptAmount = taskArgs.lptamount;
                toInternalBalance = taskArgs.tointernalbalance === 'true';
                proportionalLiquidityAddress = (0, addresses_1.getProportionalLiquidityAddress)(network);
                if (!proportionalLiquidityAddress) {
                    console.error("Address for ProportionalLiquidity not available on ".concat(network, "!"));
                    return [2 /*return*/];
                }
                lptAmountBN = ethers.utils.parseEther("".concat(lptAmount));
                console.log('lptAmountBN:', lptAmountBN.toString());
                return [4 /*yield*/, ethers.getContractFactory('FXPool', {
                        libraries: {
                            ProportionalLiquidity: proportionalLiquidityAddress,
                        },
                    })];
            case 3:
                FXPool = _g.sent();
                return [4 /*yield*/, FXPool.attach(poolAddress).viewWithdraw(lptAmountBN)];
            case 4:
                viewWithdrawResponse = _g.sent();
                console.log('viewWithdrawResponse:', viewWithdrawResponse.toString());
                baseAmountBN = viewWithdrawResponse[0];
                quoteAmountBN = viewWithdrawResponse[1];
                sortedAddresses = (0, sortAddresses_1.sortAddresses)([baseToken, quoteToken]);
                console.log('sorted addresses:', sortedAddresses);
                if (sortedAddresses[0] === baseToken) {
                    liquidityToRemove = [baseAmountBN, quoteAmountBN];
                }
                else {
                    liquidityToRemove = [quoteAmountBN, baseAmountBN];
                }
                console.log('liquidityToRemove:', liquidityToRemove.toString());
                payload = ethers.utils.defaultAbiCoder.encode(['uint256', 'address[]'], [lptAmountBN, sortedAddresses]);
                exitPoolRequest = {
                    assets: sortedAddresses,
                    minAmountsOut: liquidityToRemove,
                    userData: payload,
                    toInternalBalance: toInternalBalance,
                };
                return [4 /*yield*/, ethers.getContractAt(Vault_json_1.default.abi, Vault_json_1.default.address)];
            case 5:
                vault = _g.sent();
                return [4 /*yield*/, vault.connect(deployer)];
            case 6:
                connectedVault = _g.sent();
                return [4 /*yield*/, connectedVault.populateTransaction.exitPool(poolId, deployer.address, deployer.address, exitPoolRequest)];
            case 7:
                encodedExitPoolTx = _g.sent();
                _f = {
                    chainId: 42,
                    data: encodedExitPoolTx.data
                };
                return [4 /*yield*/, ethers.provider.getTransactionCount(deployer.address)];
            case 8:
                txPayload = (_f.nonce = _g.sent(),
                    _f.value = ethers.utils.parseEther('0'),
                    _f.gasLimit = ethers.utils.parseUnits('0.01', 'gwei'),
                    _f.to = Vault_json_1.default.address,
                    _f);
                _g.label = 9;
            case 9:
                _g.trys.push([9, 12, , 13]);
                return [4 /*yield*/, deployer.sendTransaction(txPayload)];
            case 10:
                exitPoolTxReceipt = _g.sent();
                return [4 /*yield*/, exitPoolTxReceipt.wait()];
            case 11:
                _g.sent();
                return [3 /*break*/, 13];
            case 12:
                Error_1 = _g.sent();
                console.error(Error_1);
                return [3 /*break*/, 13];
            case 13: return [4 /*yield*/, (0, open_1.default)("https://dashboard.tenderly.co/tx/".concat(network, "/").concat(exitPoolTxReceipt === null || exitPoolTxReceipt === void 0 ? void 0 : exitPoolTxReceipt.hash))];
            case 14:
                _g.sent();
                return [2 /*return*/];
        }
    });
}); });
