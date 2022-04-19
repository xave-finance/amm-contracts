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
var edit_json_file_1 = __importDefault(require("edit-json-file"));
var open_1 = __importDefault(require("open"));
var Vault_json_1 = __importDefault(require("@balancer-labs/v2-deployments/deployed/kovan/Vault.json"));
var FakeToken__factory_1 = require("../../typechain/factories/FakeToken__factory");
var BaseToUsdAssimilator__factory_1 = require("../../typechain/factories/BaseToUsdAssimilator__factory");
var UsdcToUsdAssimilator__factory_1 = require("../../typechain/factories/UsdcToUsdAssimilator__factory");
var CurveMath__factory_1 = require("../../typechain/factories/CurveMath__factory");
var Assimilators__factory_1 = require("../../typechain/factories/Assimilators__factory");
var sleep_1 = __importDefault(require("../utils/sleep"));
var numbers_1 = require("../utils/numbers");
var sortAddresses_1 = require("../utils/sortAddresses");
var verify_1 = __importDefault(require("../utils/verify"));
var encodeDeploy_1 = __importDefault(require("../utils/encodeDeploy"));
var DEPLOY_POOL_json_1 = __importDefault(require("../constants/DEPLOY_POOL.json"));
var TOKENS_FILE = (0, edit_json_file_1.default)("".concat(__dirname, "/../constants/TOKENS.json"));
var POOLS_FILE = (0, edit_json_file_1.default)("".concat(__dirname, "/../constants/POOLS.json"));
var DEPLOYMENT_STRATEGY = {
    FRESH_CONTRACTS: 'FRESH_CONTRACTS',
    CONSTANT_CONTRACTS: 'CONSTANT_CONTRACTS',
    SPECIFY_CONTRACTS: 'SPECIFY_CONTRACTS',
};
// const SWAP_FEE_PERCENTAGE = ethers.utils.parseEther('0.000001')
// const ASSET_WEIGHTS = [ethers.utils.parseEther('0.5'), ethers.utils.parseEther('0.5')]
var SWAP_FEE_PERCENTAGE = (0, numbers_1.fp)(0.000001);
var ASSET_WEIGHTS = [(0, numbers_1.fp)(0.5), (0, numbers_1.fp)(0.5)];
var PAUSE_WINDOW_DURATION = 7776000;
var BUFFER_PERIOD_DURATION = 2592000;
exports.default = (function (taskArgs) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        // await hre.compile() // @todo Find way to compile contracts during execution of deploy script
        switch (taskArgs.strategy) {
            case DEPLOYMENT_STRATEGY.FRESH_CONTRACTS:
                return [2 /*return*/, freshContractsDeploy(taskArgs)];
            case DEPLOYMENT_STRATEGY.CONSTANT_CONTRACTS:
                return [2 /*return*/, constantContractsDeploy(taskArgs)];
            case DEPLOYMENT_STRATEGY.SPECIFY_CONTRACTS:
                return [2 /*return*/, specifyContractsDeploy(taskArgs)];
        }
        return [2 /*return*/];
    });
}); });
var _prepareFXPoolConstructor = function (baseTokenAddress, quoteTokenAddress, baseAssimilator, quoteAssimilator) {
    return {
        tokens: (0, sortAddresses_1.sortAddresses)([baseTokenAddress, quoteTokenAddress]),
        assets: [
            baseTokenAddress,
            baseAssimilator,
            baseTokenAddress,
            baseAssimilator,
            baseTokenAddress,
            quoteTokenAddress,
            quoteAssimilator,
            quoteTokenAddress,
            quoteAssimilator,
            quoteTokenAddress,
        ],
    };
};
var _forceDeploy = function (deployer, network, FXPoolFactory, constructorArgs) { return __awaiter(void 0, void 0, void 0, function () {
    var bytecodePlusEncodedDeploy, txPayload, deployTxReceipt, reciept, Error_1;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0: return [4 /*yield*/, (0, encodeDeploy_1.default)(FXPoolFactory, constructorArgs)];
            case 1:
                bytecodePlusEncodedDeploy = _b.sent();
                _a = {
                    chainId: 42,
                    data: bytecodePlusEncodedDeploy
                };
                return [4 /*yield*/, ethers.provider.getTransactionCount(deployer.address)];
            case 2:
                txPayload = (_a.nonce = _b.sent(),
                    _a.value = ethers.utils.parseEther('0'),
                    _a.gasLimit = ethers.utils.parseUnits('0.01', 'gwei'),
                    _a);
                _b.label = 3;
            case 3:
                _b.trys.push([3, 6, , 7]);
                return [4 /*yield*/, deployer.sendTransaction(txPayload)];
            case 4:
                deployTxReceipt = _b.sent();
                return [4 /*yield*/, deployTxReceipt.wait()];
            case 5:
                reciept = _b.sent();
                console.log('reciept:', reciept);
                return [3 /*break*/, 7];
            case 6:
                Error_1 = _b.sent();
                console.error(Error_1);
                return [3 /*break*/, 7];
            case 7:
                console.log("Transaction Hash:", "https://".concat(network, ".etherscan.io/tx/").concat(deployTxReceipt === null || deployTxReceipt === void 0 ? void 0 : deployTxReceipt.hash));
                return [4 /*yield*/, (0, open_1.default)("https://dashboard.tenderly.co/tx/".concat(network, "/").concat(deployTxReceipt === null || deployTxReceipt === void 0 ? void 0 : deployTxReceipt.hash))];
            case 8:
                _b.sent();
                return [2 /*return*/];
        }
    });
}); };
var freshContractsDeploy = function (taskArgs) { return __awaiter(void 0, void 0, void 0, function () {
    var deployer, network, force, verify, FakeTokenFactory, baseToken, _a, _b, _c, _d, _e, _f, quoteToken, _g, _h, _j, _k, _l, _m, BaseToUsdAssimilatorFactory, baseToUsdAssimilator, _o, _p, UsdcToUsdAssimilatorFactory, usdcToUsdAssimilator, AssimilatorsLib, assimilators, CurveMathLib, curveMath, ProportionalLiquidityFactory, proportionalLiquidityContract, SwapsFactory, swapsContract, _q, tokens, assets, _r, _s, FXPoolFactory, _t, _u, _v, constructorArgs, _w, fxPool, poolId, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13, _14, _15, _16, _17, _18, _19, _20, _21, _22, DeployError_1;
    var _23, _24;
    return __generator(this, function (_25) {
        switch (_25.label) {
            case 0: return [4 /*yield*/, ethers.getSigners()];
            case 1:
                deployer = (_25.sent())[0];
                console.log("Deploying with account: ".concat(deployer.address));
                network = taskArgs.to;
                force = taskArgs.force === 'true';
                verify = taskArgs.verify === 'true';
                FakeTokenFactory = new FakeToken__factory_1.FakeToken__factory(deployer);
                return [4 /*yield*/, FakeTokenFactory.deploy('Base Token', 'BASE', 8)]; // MAKE SURE TO MANUALLY CHANGE DECIMALS IN ERC20.sol
            case 2:
                baseToken = _25.sent() // MAKE SURE TO MANUALLY CHANGE DECIMALS IN ERC20.sol
                ;
                return [4 /*yield*/, baseToken.deployed()];
            case 3:
                _25.sent();
                console.log("Base Token: ".concat(baseToken.address));
                _b = (_a = TOKENS_FILE).set;
                _c = "".concat;
                return [4 /*yield*/, baseToken.symbol()];
            case 4: return [4 /*yield*/, _b.apply(_a, [_c.apply("", [_25.sent(), "."]).concat(process.env.HARDHAT_NETWORK), baseToken.address]).save()];
            case 5:
                _25.sent();
                _e = (_d = TOKENS_FILE).append;
                _f = ["SYMBOLS_LIST"];
                return [4 /*yield*/, baseToken.symbol()];
            case 6: return [4 /*yield*/, _e.apply(_d, _f.concat([_25.sent()])).save()
                /** Deploy Quote Token */
            ];
            case 7:
                _25.sent();
                return [4 /*yield*/, FakeTokenFactory.deploy('Quote Token', 'QUOTE', 6)]; // MAKE SURE TO MANUALLY CHANGE DECIMALS IN ERC20.sol
            case 8:
                quoteToken = _25.sent() // MAKE SURE TO MANUALLY CHANGE DECIMALS IN ERC20.sol
                ;
                return [4 /*yield*/, quoteToken.deployed()];
            case 9:
                _25.sent();
                console.log("Quote Token: ".concat(quoteToken.address));
                _h = (_g = TOKENS_FILE).set;
                _j = "".concat;
                return [4 /*yield*/, quoteToken.symbol()];
            case 10: return [4 /*yield*/, _h.apply(_g, [_j.apply("", [_25.sent(), "."]).concat(process.env.HARDHAT_NETWORK), quoteToken.address]).save()];
            case 11:
                _25.sent();
                _l = (_k = TOKENS_FILE).append;
                _m = ["SYMBOLS_LIST"];
                return [4 /*yield*/, quoteToken.symbol()];
            case 12: return [4 /*yield*/, _l.apply(_k, _m.concat([_25.sent()])).save()
                /** Deploy Base Assimilator */
            ];
            case 13:
                _25.sent();
                BaseToUsdAssimilatorFactory = new BaseToUsdAssimilator__factory_1.BaseToUsdAssimilator__factory(deployer);
                _p = (_o = BaseToUsdAssimilatorFactory).deploy;
                return [4 /*yield*/, baseToken.decimals()];
            case 14: return [4 /*yield*/, _p.apply(_o, [_25.sent(), baseToken.address,
                    quoteToken.address,
                    // '<ORACLE_ADDRESS>'
                    '0xed0616BeF04D374969f302a34AE4A63882490A8C'])];
            case 15:
                baseToUsdAssimilator = _25.sent();
                return [4 /*yield*/, baseToUsdAssimilator.deployed()];
            case 16:
                _25.sent();
                console.log("BaseToUSD Assimilator: ".concat(baseToUsdAssimilator.address));
                UsdcToUsdAssimilatorFactory = new UsdcToUsdAssimilator__factory_1.UsdcToUsdAssimilator__factory(deployer);
                return [4 /*yield*/, UsdcToUsdAssimilatorFactory.deploy(
                    // MAKE SURE TO MANUALLY CHANGE DECIMALS IN UsdcToUsdAssimilator.sol
                    // '<ORACLE ADDRESS>',
                    '0x9211c6b3BF41A10F78539810Cf5c64e1BB78Ec60', quoteToken.address)];
            case 17:
                usdcToUsdAssimilator = _25.sent();
                return [4 /*yield*/, usdcToUsdAssimilator.deployed()];
            case 18:
                _25.sent();
                console.log("USDCToUSD Assimilator: ".concat(usdcToUsdAssimilator.address));
                AssimilatorsLib = new Assimilators__factory_1.Assimilators__factory(deployer);
                return [4 /*yield*/, AssimilatorsLib.deploy()];
            case 19:
                assimilators = _25.sent();
                return [4 /*yield*/, assimilators.deployed()];
            case 20:
                _25.sent();
                console.log("Assimilator: ".concat(assimilators.address));
                CurveMathLib = new CurveMath__factory_1.CurveMath__factory(deployer);
                return [4 /*yield*/, CurveMathLib.deploy()];
            case 21:
                curveMath = _25.sent();
                return [4 /*yield*/, curveMath.deployed()];
            case 22:
                _25.sent();
                console.log("Curve Math: ".concat(curveMath.address));
                return [4 /*yield*/, ethers.getContractFactory('ProportionalLiquidity', {
                        libraries: {
                            Assimilators: assimilators.address,
                            CurveMath: curveMath.address,
                        },
                    })];
            case 23:
                ProportionalLiquidityFactory = _25.sent();
                return [4 /*yield*/, ProportionalLiquidityFactory.deploy()];
            case 24:
                proportionalLiquidityContract = _25.sent();
                return [4 /*yield*/, proportionalLiquidityContract.deployed()];
            case 25:
                _25.sent();
                console.log("Proportional Liquidity: ".concat(proportionalLiquidityContract.address));
                return [4 /*yield*/, ethers.getContractFactory('AmmV1Swaps', {
                        libraries: {
                            Assimilators: assimilators.address,
                            // CurveMath: curveMath.address,
                        },
                    })];
            case 26:
                SwapsFactory = _25.sent();
                return [4 /*yield*/, SwapsFactory.deploy()];
            case 27:
                swapsContract = _25.sent();
                return [4 /*yield*/, swapsContract.deployed()];
            case 28:
                _25.sent();
                console.log("Swaps: ".concat(swapsContract.address));
                _r = _prepareFXPoolConstructor;
                return [4 /*yield*/, baseToken.address];
            case 29:
                _s = [_25.sent()];
                return [4 /*yield*/, quoteToken.address];
            case 30:
                _s = _s.concat([_25.sent()]);
                return [4 /*yield*/, baseToUsdAssimilator.address];
            case 31:
                _s = _s.concat([_25.sent()]);
                return [4 /*yield*/, usdcToUsdAssimilator.address];
            case 32:
                _q = _r.apply(void 0, _s.concat([_25.sent()])), tokens = _q.tokens, assets = _q.assets;
                _u = (_t = ethers).getContractFactory;
                _v = ['FXPool'];
                _23 = {};
                _24 = {};
                return [4 /*yield*/, assimilators.address];
            case 33:
                _24.Assimilators = _25.sent();
                return [4 /*yield*/, curveMath.address];
            case 34: return [4 /*yield*/, _u.apply(_t, _v.concat([(_23.libraries = (_24.CurveMath = _25.sent(),
                        _24),
                        _23)]))];
            case 35:
                FXPoolFactory = _25.sent();
                _w = [Vault_json_1.default.address,
                    'FX Pool', "FX-HLP", tokens,
                    assets,
                    ASSET_WEIGHTS,
                    SWAP_FEE_PERCENTAGE,
                    PAUSE_WINDOW_DURATION,
                    BUFFER_PERIOD_DURATION];
                return [4 /*yield*/, proportionalLiquidityContract.address];
            case 36:
                _w = _w.concat([
                    _25.sent()
                ]);
                return [4 /*yield*/, swapsContract.address];
            case 37:
                constructorArgs = _w.concat([
                    _25.sent()
                ]);
                if (!force) return [3 /*break*/, 39];
                return [4 /*yield*/, _forceDeploy(deployer, network, FXPoolFactory, constructorArgs)];
            case 38:
                _25.sent();
                return [3 /*break*/, 59];
            case 39:
                _25.trys.push([39, 58, , 59]);
                return [4 /*yield*/, FXPoolFactory.deploy.apply(FXPoolFactory, constructorArgs)];
            case 40:
                fxPool = _25.sent();
                return [4 /*yield*/, fxPool.deployed()];
            case 41:
                _25.sent();
                console.log("FX Pool: ".concat(fxPool.address));
                return [4 /*yield*/, fxPool.getPoolId()];
            case 42:
                poolId = _25.sent();
                console.log('FX Pool ID:', poolId);
                _y = (_x = POOLS_FILE).set;
                _0 = "".concat;
                return [4 /*yield*/, baseToken.symbol()];
            case 43:
                _1 = (_z = _0.apply("", [_25.sent(), "-"])).concat;
                return [4 /*yield*/, quoteToken.symbol()];
            case 44: return [4 /*yield*/, _y.apply(_x, [_1.apply(_z, [_25.sent(), "."]).concat(network, ".address"), fxPool.address]).save()];
            case 45:
                _25.sent();
                _3 = (_2 = POOLS_FILE).set;
                _5 = "".concat;
                return [4 /*yield*/, baseToken.symbol()];
            case 46:
                _6 = (_4 = _5.apply("", [_25.sent(), "-"])).concat;
                return [4 /*yield*/, quoteToken.symbol()];
            case 47: return [4 /*yield*/, _3.apply(_2, [_6.apply(_4, [_25.sent(), "."]).concat(network, ".poolId"), poolId]).save()];
            case 48:
                _25.sent();
                _8 = (_7 = POOLS_FILE).set;
                _10 = "".concat;
                return [4 /*yield*/, baseToken.symbol()];
            case 49:
                _11 = (_9 = _10.apply("", [_25.sent(), "-"])).concat;
                return [4 /*yield*/, quoteToken.symbol()];
            case 50: return [4 /*yield*/, _8.apply(_7, [_11.apply(_9, [_25.sent(), "."]).concat(network, ".baseTokenAddress"), baseToken.address]).save()];
            case 51:
                _25.sent();
                _13 = (_12 = POOLS_FILE).set;
                _15 = "".concat;
                return [4 /*yield*/, baseToken.symbol()];
            case 52:
                _16 = (_14 = _15.apply("", [_25.sent(), "-"])).concat;
                return [4 /*yield*/, quoteToken.symbol()];
            case 53: return [4 /*yield*/, _13.apply(_12, [_16.apply(_14, [_25.sent(), "."]).concat(network, ".quoteTokenAddress"), quoteToken.address]).save()];
            case 54:
                _25.sent();
                _18 = (_17 = POOLS_FILE).append;
                _19 = ["POOLS_LIST"];
                _21 = "".concat;
                return [4 /*yield*/, baseToken.symbol()];
            case 55:
                _22 = (_20 = _21.apply("", [_25.sent(), "-"])).concat;
                return [4 /*yield*/, quoteToken.symbol()];
            case 56: return [4 /*yield*/, _18.apply(_17, _19.concat([_22.apply(_20, [_25.sent()])])).save()];
            case 57:
                _25.sent();
                return [3 /*break*/, 59];
            case 58:
                DeployError_1 = _25.sent();
                console.error("Deploy FX Pool Error:", DeployError_1);
                return [3 /*break*/, 59];
            case 59:
                if (!verify) return [3 /*break*/, 66];
                console.log('Waiting for 250 seconds before attempting to verify deployed contracts.');
                return [4 /*yield*/, (0, sleep_1.default)(250000)
                    // await verifyContract(hre, baseToken.address, ['Base Token', 'BASE', 8])
                    // await verifyContract(hre, quoteToken.address, ['Quote Token', 'QUOTE', 6])
                    // await verifyContract(hre, baseToUsdAssimilator.address, [
                    // 	await baseToken.decimals(),
                    // 	baseToken.address,
                    // 	quoteToken.address,
                    // 	'0xed0616BeF04D374969f302a34AE4A63882490A8C',
                    // ])
                    // await verifyContract(hre, usdcToUsdAssimilator.address, [
                    // 	'0x9211c6b3BF41A10F78539810Cf5c64e1BB78Ec60',
                    // 	quoteToken.address,
                    // ])
                ];
            case 60:
                _25.sent();
                // await verifyContract(hre, baseToken.address, ['Base Token', 'BASE', 8])
                // await verifyContract(hre, quoteToken.address, ['Quote Token', 'QUOTE', 6])
                // await verifyContract(hre, baseToUsdAssimilator.address, [
                // 	await baseToken.decimals(),
                // 	baseToken.address,
                // 	quoteToken.address,
                // 	'0xed0616BeF04D374969f302a34AE4A63882490A8C',
                // ])
                // await verifyContract(hre, usdcToUsdAssimilator.address, [
                // 	'0x9211c6b3BF41A10F78539810Cf5c64e1BB78Ec60',
                // 	quoteToken.address,
                // ])
                return [4 /*yield*/, (0, verify_1.default)(hre, assimilators.address, [])];
            case 61:
                // await verifyContract(hre, baseToken.address, ['Base Token', 'BASE', 8])
                // await verifyContract(hre, quoteToken.address, ['Quote Token', 'QUOTE', 6])
                // await verifyContract(hre, baseToUsdAssimilator.address, [
                // 	await baseToken.decimals(),
                // 	baseToken.address,
                // 	quoteToken.address,
                // 	'0xed0616BeF04D374969f302a34AE4A63882490A8C',
                // ])
                // await verifyContract(hre, usdcToUsdAssimilator.address, [
                // 	'0x9211c6b3BF41A10F78539810Cf5c64e1BB78Ec60',
                // 	quoteToken.address,
                // ])
                _25.sent();
                return [4 /*yield*/, (0, verify_1.default)(hre, curveMath.address, [])];
            case 62:
                _25.sent();
                return [4 /*yield*/, (0, verify_1.default)(hre, proportionalLiquidityContract.address, [])];
            case 63:
                _25.sent();
                return [4 /*yield*/, (0, verify_1.default)(hre, swapsContract.address, [])];
            case 64:
                _25.sent();
                return [4 /*yield*/, (0, verify_1.default)(hre, fxPool.address, constructorArgs)];
            case 65:
                _25.sent();
                _25.label = 66;
            case 66: return [2 /*return*/];
        }
    });
}); };
var constantContractsDeploy = function (taskArgs) { return __awaiter(void 0, void 0, void 0, function () {
    var deployer, network, force, verify, DEPLOY_PARAMS, _a, assets, tokens, constructorArgs, FXPoolFactory, ERC20, baseToken, quoteToken, fxPool, poolId, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, DeployError_2;
    return __generator(this, function (_3) {
        switch (_3.label) {
            case 0: return [4 /*yield*/, ethers.getSigners()];
            case 1:
                deployer = (_3.sent())[0];
                console.log("Deploying with account: ".concat(deployer.address));
                network = taskArgs.to;
                force = taskArgs.force === 'true';
                verify = taskArgs.verify === 'true';
                DEPLOY_PARAMS = DEPLOY_POOL_json_1.default[network];
                _a = _prepareFXPoolConstructor(
                // DEPLOY_PARAMS.BASE_TOKEN,
                // DEPLOY_PARAMS.QUOTE_TOKEN,
                // DEPLOY_PARAMS.BASE_ASSIMILATOR,
                // DEPLOY_PARAMS.QUOTE_ASSIMILATOR
                '0x008486BF13E7eaf140A0168b7f7cb724a01B2092', '0x7c4e10f2A9e8e23882675e48e8979708349341Ee', '0x9e7A854E962aA8BB0E010Dad13FBB22C94935867', '0xa44f1922A3b2Effc53D3d8AcbAd02d4ABc744384'), assets = _a.assets, tokens = _a.tokens;
                constructorArgs = [
                    Vault_json_1.default.address,
                    'FX Pool',
                    "FX-HLP",
                    tokens,
                    assets,
                    ASSET_WEIGHTS,
                    SWAP_FEE_PERCENTAGE,
                    PAUSE_WINDOW_DURATION,
                    BUFFER_PERIOD_DURATION,
                    DEPLOY_PARAMS.PROPORTIONAL_LIQUIDITY,
                    DEPLOY_PARAMS.SWAPS,
                ];
                return [4 /*yield*/, ethers.getContractFactory('FXPool', {
                        libraries: {
                            Assimilators: DEPLOY_PARAMS.ASSIMILATORS,
                            CurveMath: DEPLOY_PARAMS.CURVE_MATH,
                        },
                    })];
            case 2:
                FXPoolFactory = _3.sent();
                console.log("Using constants:");
                console.table(DEPLOY_PARAMS);
                return [4 /*yield*/, ethers.getContractFactory('@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20')];
            case 3:
                ERC20 = _3.sent();
                return [4 /*yield*/, ERC20.attach(DEPLOY_PARAMS.BASE_TOKEN)];
            case 4:
                baseToken = _3.sent();
                return [4 /*yield*/, ERC20.attach(DEPLOY_PARAMS.QUOTE_TOKEN)];
            case 5:
                quoteToken = _3.sent();
                if (!force) return [3 /*break*/, 7];
                return [4 /*yield*/, _forceDeploy(deployer, network, FXPoolFactory, constructorArgs)];
            case 6:
                _3.sent();
                return [3 /*break*/, 27];
            case 7:
                _3.trys.push([7, 26, , 27]);
                return [4 /*yield*/, FXPoolFactory.deploy.apply(FXPoolFactory, constructorArgs)];
            case 8:
                fxPool = _3.sent();
                return [4 /*yield*/, fxPool.deployed()];
            case 9:
                _3.sent();
                console.log("FX Pool: ".concat(fxPool.address));
                return [4 /*yield*/, fxPool.getPoolId()];
            case 10:
                poolId = _3.sent();
                console.log('FX Pool ID:', poolId);
                _c = (_b = POOLS_FILE).set;
                _e = "".concat;
                return [4 /*yield*/, baseToken.symbol()];
            case 11:
                _f = (_d = _e.apply("", [_3.sent(), "-"])).concat;
                return [4 /*yield*/, quoteToken.symbol()];
            case 12: return [4 /*yield*/, _c.apply(_b, [_f.apply(_d, [_3.sent(), "."]).concat(network, ".address"), fxPool.address]).save()];
            case 13:
                _3.sent();
                _h = (_g = POOLS_FILE).set;
                _k = "".concat;
                return [4 /*yield*/, baseToken.symbol()];
            case 14:
                _l = (_j = _k.apply("", [_3.sent(), "-"])).concat;
                return [4 /*yield*/, quoteToken.symbol()];
            case 15: return [4 /*yield*/, _h.apply(_g, [_l.apply(_j, [_3.sent(), "."]).concat(network, ".poolId"), poolId]).save()];
            case 16:
                _3.sent();
                _o = (_m = POOLS_FILE).set;
                _q = "".concat;
                return [4 /*yield*/, baseToken.symbol()];
            case 17:
                _r = (_p = _q.apply("", [_3.sent(), "-"])).concat;
                return [4 /*yield*/, quoteToken.symbol()];
            case 18: return [4 /*yield*/, _o.apply(_m, [_r.apply(_p, [_3.sent(), "."]).concat(network, ".baseTokenAddress"), baseToken.address]).save()];
            case 19:
                _3.sent();
                _t = (_s = POOLS_FILE).set;
                _v = "".concat;
                return [4 /*yield*/, baseToken.symbol()];
            case 20:
                _w = (_u = _v.apply("", [_3.sent(), "-"])).concat;
                return [4 /*yield*/, quoteToken.symbol()];
            case 21: return [4 /*yield*/, _t.apply(_s, [_w.apply(_u, [_3.sent(), "."]).concat(network, ".quoteTokenAddress"), quoteToken.address]).save()];
            case 22:
                _3.sent();
                _y = (_x = POOLS_FILE).append;
                _z = ["POOLS_LIST"];
                _1 = "".concat;
                return [4 /*yield*/, baseToken.symbol()];
            case 23:
                _2 = (_0 = _1.apply("", [_3.sent(), "-"])).concat;
                return [4 /*yield*/, quoteToken.symbol()];
            case 24: return [4 /*yield*/, _y.apply(_x, _z.concat([_2.apply(_0, [_3.sent()])])).save()];
            case 25:
                _3.sent();
                return [3 /*break*/, 27];
            case 26:
                DeployError_2 = _3.sent();
                console.error("Deploy FX Pool Error:", DeployError_2);
                return [3 /*break*/, 27];
            case 27:
                if (!verify) return [3 /*break*/, 30];
                console.log("Waiting for 150 seconds before attempting to verify.");
                return [4 /*yield*/, (0, sleep_1.default)(150000)];
            case 28:
                _3.sent();
                return [4 /*yield*/, (0, verify_1.default)(hre, fxPool.address, constructorArgs)];
            case 29:
                _3.sent();
                _3.label = 30;
            case 30: return [2 /*return*/];
        }
    });
}); };
var specifyContractsDeploy = function (taskArgs) { return __awaiter(void 0, void 0, void 0, function () {
    var deployer, network, force, verify;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, ethers.getSigners()];
            case 1:
                deployer = (_a.sent())[0];
                console.log("Deploying with account: ".concat(deployer.address));
                network = taskArgs.to;
                force = taskArgs.force;
                verify = taskArgs.verify;
                return [2 /*return*/];
        }
    });
}); };
