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
exports.default = (function (taskArgs) { return __awaiter(void 0, void 0, void 0, function () {
    var deployer, _a, _b, _c, _d, _e, network, poolId, baseToken, quoteToken, baseAmount, quoteAmount, fromInternalBalance, sortedAddresses, ERC20, baseTokenDecimals, quoteTokenDecimals, liquidityToAdd, payload, joinPoolRequest, vault, connectedVault, encodedJoinTx, txPayload, singleSwapTxReceipt, Error_1;
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
                poolId = taskArgs.poolid;
                baseToken = taskArgs.basetoken;
                quoteToken = taskArgs.quotetoken;
                baseAmount = taskArgs.baseamount;
                quoteAmount = taskArgs.quoteamount;
                fromInternalBalance = taskArgs.frominternalbalance === 'true';
                sortedAddresses = (0, sortAddresses_1.sortAddresses)([baseToken, quoteToken]);
                console.log('sorted addresses:', sortedAddresses);
                return [4 /*yield*/, ethers.getContractFactory('MockToken')];
            case 3:
                ERC20 = _g.sent();
                return [4 /*yield*/, ERC20.attach(baseToken).decimals()];
            case 4:
                baseTokenDecimals = _g.sent();
                return [4 /*yield*/, ERC20.attach(quoteToken).decimals()];
            case 5:
                quoteTokenDecimals = _g.sent();
                if (sortedAddresses[0] === baseToken) {
                    liquidityToAdd = [
                        ethers.utils.parseUnits("".concat(baseAmount), baseTokenDecimals),
                        ethers.utils.parseUnits("".concat(quoteAmount), quoteTokenDecimals),
                    ];
                }
                else {
                    liquidityToAdd = [
                        ethers.utils.parseUnits("".concat(quoteAmount), quoteTokenDecimals),
                        ethers.utils.parseUnits("".concat(baseAmount), baseTokenDecimals),
                    ];
                }
                console.log('liquidityToAdd:', liquidityToAdd.toString());
                payload = ethers.utils.defaultAbiCoder.encode(['uint256[]', 'address[]'], [liquidityToAdd, sortedAddresses]);
                joinPoolRequest = {
                    assets: sortedAddresses,
                    maxAmountsIn: liquidityToAdd,
                    userData: payload,
                    fromInternalBalance: fromInternalBalance,
                };
                return [4 /*yield*/, ethers.getContractAt(Vault_json_1.default.abi, Vault_json_1.default.address)];
            case 6:
                vault = _g.sent();
                return [4 /*yield*/, vault.connect(deployer)];
            case 7:
                connectedVault = _g.sent();
                return [4 /*yield*/, connectedVault.populateTransaction.joinPool(poolId, deployer.address, deployer.address, joinPoolRequest)];
            case 8:
                encodedJoinTx = _g.sent();
                _f = {
                    chainId: 42,
                    data: encodedJoinTx.data
                };
                return [4 /*yield*/, ethers.provider.getTransactionCount(deployer.address)];
            case 9:
                txPayload = (_f.nonce = _g.sent(),
                    _f.value = ethers.utils.parseEther('0'),
                    _f.gasLimit = ethers.utils.parseUnits('0.01', 'gwei'),
                    _f.to = Vault_json_1.default.address,
                    _f);
                _g.label = 10;
            case 10:
                _g.trys.push([10, 13, , 14]);
                return [4 /*yield*/, deployer.sendTransaction(txPayload)];
            case 11:
                singleSwapTxReceipt = _g.sent();
                return [4 /*yield*/, singleSwapTxReceipt.wait()];
            case 12:
                _g.sent();
                return [3 /*break*/, 14];
            case 13:
                Error_1 = _g.sent();
                console.error(Error_1);
                return [3 /*break*/, 14];
            case 14: return [4 /*yield*/, (0, open_1.default)("https://dashboard.tenderly.co/tx/".concat(network, "/").concat(singleSwapTxReceipt === null || singleSwapTxReceipt === void 0 ? void 0 : singleSwapTxReceipt.hash))];
            case 15:
                _g.sent();
                return [2 /*return*/];
        }
    });
}); });
