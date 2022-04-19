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
var Vault_json_1 = __importDefault(require("@balancer-labs/v2-deployments/deployed/kovan/Vault.json"));
var sortAddresses_1 = require("./utils/sortAddresses");
var verify = function () { return __awaiter(void 0, void 0, void 0, function () {
    var CONTRACT, baseAssimilator, quoteAssimilator, baseTokenAddress, quoteTokenAddress, swapFeePercentage, tokens, assets, assetWeights, pauseWindowDuration, bufferPeriodDuration, PROPORTIONAL_LIQUIDITY, SWAPS, CONSTRUCTOR_ARGS;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                CONTRACT = '0xA342A7f4A9C11fD080d369b74EF1F06ce7B29e8D';
                baseAssimilator = '0xF9596c5781ABAA8dC8cf8eFE091fa93e61665a2F' // W-PESO - W-USDC
                ;
                quoteAssimilator = '0xE6dBa291C1E2c59474c5b92D6e865637C1C0bFaC' // W-USDC - USD
                ;
                baseTokenAddress = '0xaE70265126c20F64A6b011b86F8E7852B0010eCe';
                quoteTokenAddress = '0xa57c092a117C9dE50922A75674dd35ab34d82c4A';
                swapFeePercentage = ethers.utils.parseEther('0.000001') // working already 10% fee
                ;
                tokens = (0, sortAddresses_1.sortAddresses)([baseTokenAddress, quoteTokenAddress]) // need to be sorted
                ;
                assets = [baseTokenAddress, baseAssimilator, baseTokenAddress, baseAssimilator, baseTokenAddress,
                    quoteTokenAddress, quoteAssimilator, quoteTokenAddress, quoteAssimilator, quoteTokenAddress];
                assetWeights = [ethers.utils.parseEther("0.5"), ethers.utils.parseEther("0.5")];
                pauseWindowDuration = 7776000;
                bufferPeriodDuration = 2592000;
                PROPORTIONAL_LIQUIDITY = '0x3BC220C9ea7BCFbD79B8141bf95d447238E75E1b';
                SWAPS = '0x51dd683319f8b74ec9ac582b3881c6382093527c';
                CONSTRUCTOR_ARGS = [Vault_json_1.default.address,
                    'Custom V2 Pool', "".concat(baseTokenAddress, "-").concat(quoteTokenAddress, " LP"), tokens, assets, assetWeights,
                    swapFeePercentage, pauseWindowDuration, bufferPeriodDuration, PROPORTIONAL_LIQUIDITY, SWAPS];
                return [4 /*yield*/, hre.run('verify:verify', {
                        address: CONTRACT,
                        constructorArguments: [Vault_json_1.default.address,
                            'Custom V2 Pool', "".concat(baseTokenAddress, "-").concat(quoteTokenAddress, " LP"), tokens, assets, assetWeights,
                            swapFeePercentage, pauseWindowDuration, bufferPeriodDuration, PROPORTIONAL_LIQUIDITY, SWAPS],
                        // constructorArguments: []
                    })];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); };
verify()
    .then(function () { return process.exit(0); })
    .catch(function (error) { return console.error(error); });
