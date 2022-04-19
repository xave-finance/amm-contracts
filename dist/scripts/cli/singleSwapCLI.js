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
var inquirer = require('inquirer');
var childProcess = require('child_process');
var runNpmCommand = function (command) { return childProcess.execSync(command, { stdio: [0, 1, 2] }); };
var edit_json_file_1 = __importDefault(require("edit-json-file"));
var TOKENS_FILE = (0, edit_json_file_1.default)("".concat(__dirname, "/../constants/TOKENS.json"));
var listOfTokens = TOKENS_FILE.get('SYMBOLS_LIST');
var POOLS_FILE = (0, edit_json_file_1.default)("".concat(__dirname, "/../constants/POOLS.json"));
var listOfPools = POOLS_FILE.get('POOLS_LIST');
var network, pool, kind, amount, fromInternalBalance, toInternalBalance, limit, deadline, baseToken, quoteToken;
inquirer.prompt([
    {
        type: 'list',
        name: 'network',
        message: 'Which network to test',
        choices: [
            'kovan',
            'matic',
        ],
    },
    {
        type: 'list',
        name: 'pool',
        message: 'Specify Pool',
        choices: listOfPools,
    },
    {
        type: 'list',
        name: 'kind',
        message: "The type of swap we want to perform where we know the amount of tokens we're " +
            "sending to the pool and want to know how many we'll receive or vice versa.",
        choices: ['GIVEN_IN', 'GIVEN_OUT'],
    },
    {
        type: 'input',
        name: 'amount',
        message: "The meaning of amount (in ETH unit) depends on the value of kind.\n    GIVEN_IN: The amount of tokens we are sending to the pool.\n    GIVEN_OUT: The amount of tokens we want to receive from the pool.\n",
    },
    {
        type: 'confirm',
        name: 'fromInternalBalance',
        message: 'Take from Vault internal balance?',
    },
    {
        type: 'confirm',
        name: 'toInternalBalance',
        message: 'Send to Vault internal balance?',
    },
    {
        type: 'input',
        name: 'limit',
        message: "The meaning of limit depends on the value of singleSwap.kind\n    GIVEN_IN: The minimum amount of tokens we would accept to receive from the swap.\n    GIVEN_OUT: The maximum amount of tokens we would accept having to send for the swap.\n    Default value = 100\n",
    },
    {
        type: 'input',
        name: 'deadline',
        message: "The UNIX timestamp at which our trade must be completed by - if the transaction    is confirmed after this time then the transaction will fail.\n    Default value = 300\n",
    },
])
    .then(function (answers) {
    network = answers.network;
    pool = answers.pool;
    kind = answers.kind;
    amount = answers.amount;
    fromInternalBalance = answers.fromInternalBalance;
    toInternalBalance = answers.toInternalBalance;
    limit = answers.limit || 10000000000000;
    deadline = answers.deadline || 300;
})
    .then(function () {
    var tokens = pool.split('-');
    inquirer.prompt([
        {
            type: 'list',
            name: 'base',
            message: 'Swap base token',
            choices: tokens,
        },
        {
            type: 'list',
            name: 'quote',
            message: 'Swap quote token',
            choices: tokens,
        },
    ])
        .then(function (answers) { return __awaiter(void 0, void 0, void 0, function () {
        var baseTokenAddress, quoteTokenAddress;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    baseToken = answers.base;
                    quoteToken = answers.quote;
                    return [4 /*yield*/, TOKENS_FILE.get("".concat(baseToken, ".").concat(network))];
                case 1:
                    baseTokenAddress = _a.sent();
                    return [4 /*yield*/, TOKENS_FILE.get("".concat(quoteToken, ".").concat(network))];
                case 2:
                    quoteTokenAddress = _a.sent();
                    console.log("npx hardhat single-swap --to ".concat(network, " --pool ").concat(pool, " --kind ").concat(kind, " --basetoken ").concat(baseTokenAddress, "    --quotetoken ").concat(quoteTokenAddress, " --amount ").concat(amount, " --frominternalbalance ").concat(fromInternalBalance, " --tointernalbalance    ").concat(toInternalBalance, " --limit ").concat(limit, " --deadline ").concat(deadline, " --network ").concat(network));
                    runNpmCommand("npx hardhat single-swap --to ".concat(network, " --pool ").concat(pool, " --kind ").concat(kind, " --basetoken ").concat(baseTokenAddress, "      --quotetoken ").concat(quoteTokenAddress, " --amount ").concat(amount, " --frominternalbalance ").concat(fromInternalBalance, " --tointernalbalance      ").concat(toInternalBalance, " --limit ").concat(limit, " --deadline ").concat(deadline, " --network ").concat(network));
                    return [2 /*return*/];
            }
        });
    }); });
});
