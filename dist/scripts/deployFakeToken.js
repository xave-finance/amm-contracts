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
var hardhat_1 = require("hardhat");
var hre = require('hardhat');
var sleep_1 = __importDefault(require("./utils/sleep"));
var edit_json_file_1 = __importDefault(require("edit-json-file"));
var faker_1 = __importDefault(require("faker"));
var Vault_json_1 = __importDefault(require("@balancer-labs/v2-deployments/deployed/kovan/Vault.json"));
var file = (0, edit_json_file_1.default)("".concat(__dirname, "/constants/TOKENS.json"));
var deploy = function (doMint) {
    if (doMint === void 0) { doMint = true; }
    return __awaiter(void 0, void 0, void 0, function () {
        var deployer, FakeToken, randomTokenName, randomSymbol, fakeToken, mintTx, mintReceipt, approveTx, approveReceipt;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, hardhat_1.ethers.getSigners()];
                case 1:
                    deployer = (_a.sent())[0];
                    console.log("Deploying with account: ".concat(deployer.address));
                    return [4 /*yield*/, hardhat_1.ethers.getContractFactory('FakeToken')];
                case 2:
                    FakeToken = _a.sent();
                    randomTokenName = faker_1.default.finance.currencyName();
                    randomSymbol = faker_1.default.address.citySuffix().toUpperCase();
                    return [4 /*yield*/, FakeToken.deploy(randomTokenName, randomSymbol)];
                case 3:
                    fakeToken = _a.sent();
                    console.log('Ongoing deploy hash: ', fakeToken.deployTransaction.hash);
                    return [4 /*yield*/, fakeToken.deployed()];
                case 4:
                    _a.sent();
                    console.log("Fake Token deployed at: ".concat(fakeToken.address));
                    return [4 /*yield*/, file.set("".concat(randomSymbol, ".").concat(process.env.HARDHAT_NETWORK), fakeToken.address).save()];
                case 5:
                    _a.sent();
                    return [4 /*yield*/, file.append("SYMBOLS_LIST", randomSymbol).save()];
                case 6:
                    _a.sent();
                    if (!doMint) return [3 /*break*/, 11];
                    return [4 /*yield*/, fakeToken.mint(deployer.address, hardhat_1.ethers.utils.parseEther("100000000000"))];
                case 7:
                    mintTx = _a.sent();
                    return [4 /*yield*/, mintTx.wait()];
                case 8:
                    mintReceipt = _a.sent();
                    console.log("Minted 100000000000 of ".concat(randomSymbol, " to deployer wallet tx hash: ").concat(mintReceipt.transactionHash));
                    return [4 /*yield*/, fakeToken.approve(Vault_json_1.default.address, hardhat_1.ethers.utils.parseEther("100000000000"))];
                case 9:
                    approveTx = _a.sent();
                    return [4 /*yield*/, approveTx.wait()];
                case 10:
                    approveReceipt = _a.sent();
                    console.log("Approved 100000000000 of ".concat(randomSymbol, " use for Vault tx hash: ").concat(approveReceipt.transactionHash));
                    _a.label = 11;
                case 11: return [4 /*yield*/, (0, sleep_1.default)(60000)
                    // auto verify primary contract
                ];
                case 12:
                    _a.sent();
                    // auto verify primary contract
                    console.log('verifying Fake Token');
                    return [4 /*yield*/, hre.run('verify:verify', {
                            address: fakeToken.address,
                            constructorArguments: [randomTokenName, randomSymbol],
                        })];
                case 13:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
};
deploy()
    .then(function () { return process.exit(0); })
    .catch(function (error) { return console.error(error); });
