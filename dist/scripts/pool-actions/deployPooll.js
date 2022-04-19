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
var sleep_1 = __importDefault(require("../utils/sleep"));
var edit_json_file_1 = __importDefault(require("edit-json-file"));
var open_1 = __importDefault(require("open"));
var Vault_json_1 = __importDefault(require("@balancer-labs/v2-deployments/deployed/kovan/Vault.json"));
var numbers_1 = require("../utils/numbers");
var TOKENS_FILE = (0, edit_json_file_1.default)("".concat(__dirname, "/../constants/TOKENS.json"));
var listOfTokens = TOKENS_FILE.get('SYMBOLS_LIST');
var POOLS_FILE = (0, edit_json_file_1.default)("".concat(__dirname, "/../constants/POOLS.json"));
exports.default = (function (taskArgs) { return __awaiter(void 0, void 0, void 0, function () {
    var deployer, baseToken, quoteToken, baseAssimilator, quoteAssimilator, network, force, verify, baseTokenAddress, quoteTokenAddress, baseAssimilator, quoteAssimilator, assimilators, curveMath, proportionalLiquidityContract, swapsContract, PROPORTIONAL_LIQUIDITY, SWAPS, CustomPool, swapFeePercentage, tokens, assets, assetWeights, pauseWindowDuration, bufferPeriodDuration, owner, contractBytecode, encodedDeploy, bytecodePlusEncodedDeploy, txPayload, deployTxReceipt, reciepit, Error_1, customPool, poolId;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0: return [4 /*yield*/, ethers.getSigners()];
            case 1:
                deployer = (_b.sent())[0];
                console.log("Deploying with account: ".concat(deployer.address));
                baseToken = taskArgs.basetoken;
                quoteToken = taskArgs.quotetoken;
                baseAssimilator = taskArgs.baseAssimilator;
                quoteAssimilator = taskArgs.quoteassimilator;
                network = taskArgs.to;
                force = taskArgs.force;
                verify = taskArgs.verify;
                console.log("Deploying on: ".concat(network));
                return [4 /*yield*/, TOKENS_FILE.get("".concat(baseToken, ".").concat(network))];
            case 2:
                baseTokenAddress = _b.sent();
                return [4 /*yield*/, TOKENS_FILE.get("".concat(quoteToken, ".").concat(network))];
            case 3:
                quoteTokenAddress = _b.sent();
                console.log("Base Token address: ".concat(baseTokenAddress));
                console.log("Quote Token address: ".concat(quoteTokenAddress));
                baseAssimilator = '0xF9596c5781ABAA8dC8cf8eFE091fa93e61665a2F' // CHF
                ;
                quoteAssimilator = '0xE6dBa291C1E2c59474c5b92D6e865637C1C0bFaC' // USDC
                ;
                assimilators = { address: '0x15C31d61687981dec710D1EaC307488df60B6751' };
                curveMath = { address: '0x1155bBF23f3c99583Ecd825592df8181f94830f8' };
                proportionalLiquidityContract = { address: '0x3BC220C9ea7BCFbD79B8141bf95d447238E75E1b' };
                swapsContract = { address: '0x51dd683319f8b74ec9ac582b3881c6382093527c' };
                console.log('swapsContract:', swapsContract.address);
                PROPORTIONAL_LIQUIDITY = proportionalLiquidityContract.address;
                SWAPS = swapsContract.address;
                return [4 /*yield*/, ethers.getContractFactory('FXPool', {
                        libraries: {
                            Assimilators: assimilators.address,
                            CurveMath: curveMath.address,
                        }
                    })];
            case 4:
                CustomPool = _b.sent();
                swapFeePercentage = ethers.utils.parseEther('0.000001') // working already 10% fee
                ;
                tokens = [quoteTokenAddress, baseTokenAddress];
                console.log('tokens:', tokens);
                assets = [baseTokenAddress, baseAssimilator, baseTokenAddress, baseAssimilator, baseTokenAddress,
                    quoteTokenAddress, quoteAssimilator, quoteTokenAddress, quoteAssimilator, quoteTokenAddress];
                assetWeights = [ethers.utils.parseEther("0.5"), ethers.utils.parseEther("0.5")];
                pauseWindowDuration = 7776000;
                bufferPeriodDuration = 2592000;
                owner = false ? '0x0000000000000000000000000000000000000000' : deployer.address;
                if (!false) return [3 /*break*/, 13];
                contractBytecode = CustomPool.bytecode;
                return [4 /*yield*/, CustomPool.interface.encodeDeploy([Vault_json_1.default.address,
                        'Custom V2 Pool', "".concat(baseTokenAddress, "-").concat(quoteTokenAddress, " LP"), tokens, assets, assetWeights,
                        swapFeePercentage, pauseWindowDuration, bufferPeriodDuration, PROPORTIONAL_LIQUIDITY, SWAPS])];
            case 5:
                encodedDeploy = _b.sent();
                bytecodePlusEncodedDeploy = ethers.utils.hexConcat([contractBytecode, encodedDeploy]);
                _a = {
                    chainId: 42,
                    data: bytecodePlusEncodedDeploy
                };
                return [4 /*yield*/, ethers.provider.getTransactionCount(deployer.address)];
            case 6:
                txPayload = (_a.nonce = _b.sent(),
                    _a.value = ethers.utils.parseEther('0'),
                    _a.gasLimit = ethers.utils.parseUnits('0.01', 'gwei'),
                    _a);
                deployTxReceipt = void 0;
                _b.label = 7;
            case 7:
                _b.trys.push([7, 10, , 11]);
                return [4 /*yield*/, deployer.sendTransaction(txPayload)];
            case 8:
                deployTxReceipt = _b.sent();
                return [4 /*yield*/, deployTxReceipt.wait()];
            case 9:
                reciepit = _b.sent();
                console.log('reciepit:', reciepit);
                return [3 /*break*/, 11];
            case 10:
                Error_1 = _b.sent();
                return [3 /*break*/, 11];
            case 11:
                console.log("Transaction Hash:", "https://".concat(network, ".etherscan.io/tx/").concat(deployTxReceipt === null || deployTxReceipt === void 0 ? void 0 : deployTxReceipt.hash));
                // await open(`https://${network}.etherscan.io/tx/${deployTxReceipt?.hash}`)
                return [4 /*yield*/, (0, open_1.default)("https://dashboard.tenderly.co/tx/".concat(network, "/").concat(deployTxReceipt === null || deployTxReceipt === void 0 ? void 0 : deployTxReceipt.hash))];
            case 12:
                // await open(`https://${network}.etherscan.io/tx/${deployTxReceipt?.hash}`)
                _b.sent();
                return [3 /*break*/, 25];
            case 13: return [4 /*yield*/, CustomPool.deploy(Vault_json_1.default.address, 'Custom V2 Pool', "".concat(baseTokenAddress, "-").concat(quoteTokenAddress, " LP"), tokens, assets, assetWeights, swapFeePercentage, pauseWindowDuration, bufferPeriodDuration, PROPORTIONAL_LIQUIDITY, SWAPS)];
            case 14:
                customPool = _b.sent();
                return [4 /*yield*/, customPool.deployed()];
            case 15:
                _b.sent();
                console.log("Custom Pool deployed at: ".concat(customPool.address));
                return [4 /*yield*/, customPool.getPoolId()];
            case 16:
                poolId = _b.sent();
                console.log('Custom Pool ID:', poolId);
                return [4 /*yield*/, POOLS_FILE.set("".concat(baseToken, "-").concat(quoteToken, ".").concat(network, ".address"), customPool.address).save()];
            case 17:
                _b.sent();
                return [4 /*yield*/, POOLS_FILE.set("".concat(baseToken, "-").concat(quoteToken, ".").concat(network, ".poolId"), poolId).save()];
            case 18:
                _b.sent();
                return [4 /*yield*/, POOLS_FILE.set("".concat(baseToken, "-").concat(quoteToken, ".").concat(network, ".baseTokenAddress"), baseTokenAddress).save()];
            case 19:
                _b.sent();
                return [4 /*yield*/, POOLS_FILE.set("".concat(baseToken, "-").concat(quoteToken, ".").concat(network, ".quoteTokenAddress"), quoteTokenAddress).save()];
            case 20:
                _b.sent();
                return [4 /*yield*/, POOLS_FILE.append("POOLS_LIST", "".concat(baseToken, "-").concat(quoteToken)).save()];
            case 21:
                _b.sent();
                return [4 /*yield*/, (0, sleep_1.default)(150000)
                    // await hre.run('verify:verify', {
                    // 	address: assimilators.address
                    // })
                    // await hre.run('verify:verify', {
                    // 	address: curveMath.address
                    // })
                    // // await hre.run('verify:verify', {
                    // // 	address: proportionalLiquidityContract.address
                    // // })
                    // await hre.run('verify:verify', {
                    // 	address: swapsContract.address
                    // })
                ];
            case 22:
                _b.sent();
                // await hre.run('verify:verify', {
                // 	address: assimilators.address
                // })
                // await hre.run('verify:verify', {
                // 	address: curveMath.address
                // })
                // // await hre.run('verify:verify', {
                // // 	address: proportionalLiquidityContract.address
                // // })
                // await hre.run('verify:verify', {
                // 	address: swapsContract.address
                // })
                return [4 /*yield*/, customPool.setParams((0, numbers_1.fp)(0.8), (0, numbers_1.fp)(0.48), (0, numbers_1.fp)(0.175), (0, numbers_1.fp)(0.0005), (0, numbers_1.fp)(0.3))];
            case 23:
                // await hre.run('verify:verify', {
                // 	address: assimilators.address
                // })
                // await hre.run('verify:verify', {
                // 	address: curveMath.address
                // })
                // // await hre.run('verify:verify', {
                // // 	address: proportionalLiquidityContract.address
                // // })
                // await hre.run('verify:verify', {
                // 	address: swapsContract.address
                // })
                _b.sent();
                console.log(Vault_json_1.default.address, 'Custom V2 Pool', "".concat(baseTokenAddress, "-").concat(quoteTokenAddress, " LP"), tokens, assets, assetWeights, swapFeePercentage, pauseWindowDuration, bufferPeriodDuration, PROPORTIONAL_LIQUIDITY, SWAPS);
                return [4 /*yield*/, hre.run('verify:verify', {
                        address: customPool.address,
                        constructorArguments: [Vault_json_1.default.address,
                            'Custom V2 Pool', "".concat(baseTokenAddress, "-").concat(quoteTokenAddress, " LP"), tokens, assets, assetWeights,
                            swapFeePercentage, pauseWindowDuration, bufferPeriodDuration, PROPORTIONAL_LIQUIDITY, SWAPS],
                    })];
            case 24:
                _b.sent();
                _b.label = 25;
            case 25: return [2 /*return*/];
        }
    });
}); });
