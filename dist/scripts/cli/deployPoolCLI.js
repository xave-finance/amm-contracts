"use strict";
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
var network, strategy, force, verify, baseToken, quoteToken, baseAssimilator, quoteAssimilator, proportionalLiquidity, swaps;
var DEPLOYMENT_STRATEGY = [
    'FRESH_CONTRACTS',
    'CONSTANT_CONTRACTS',
    'SPECIFY_CONTRACTS'
];
inquirer.prompt([
    {
        type: 'list',
        name: 'network',
        message: 'Which network to deploy',
        choices: [
            'kovan',
            'matic',
        ],
    },
    {
        type: 'list',
        name: 'strategy',
        message: 'Specify deployment strategy',
        choices: DEPLOYMENT_STRATEGY,
    },
    {
        type: 'confirm',
        name: 'force',
        message: 'Force deploy tx',
        choices: DEPLOYMENT_STRATEGY,
    },
    {
        type: 'confirm',
        name: 'verify',
        message: 'Verify contracts',
        choices: DEPLOYMENT_STRATEGY,
    },
])
    .then(function (answers) {
    network = answers.network;
    strategy = answers.strategy;
    force = answers.force;
    verify = answers.verify;
    if (strategy === DEPLOYMENT_STRATEGY[0] || strategy === DEPLOYMENT_STRATEGY[1]) {
        return runNpmCommand("npx hardhat deploy-pool --to ".concat(network, " --strategy ").concat(strategy, " --force ").concat(force, " --verify ").concat(verify, " --network ").concat(network));
    }
    else if (strategy === DEPLOYMENT_STRATEGY[2]) {
        inquirer.prompt([
            {
                type: 'list',
                name: 'baseToken',
                message: 'Specify Base Token',
                choices: listOfTokens,
            },
            {
                type: 'list',
                name: 'quoteToken',
                message: 'Specify Quote Token',
                choices: listOfTokens,
            },
            {
                type: 'input',
                name: 'baseAssimilator',
                message: 'Specify Base Assimilator Contract address',
            },
            {
                type: 'input',
                name: 'quoteAssimilator',
                message: 'Specify Quote Assimilator Contract address',
            },
            {
                type: 'input',
                name: 'proportionalLiquidity',
                message: 'Specify Proportional Liquidity Contract address',
            },
            {
                type: 'input',
                name: 'swaps',
                message: 'Specify Swaps Contract address',
            },
        ])
            .then(function (answers) {
            baseToken = answers.baseToken;
            quoteToken = answers.quoteToken;
            baseAssimilator = answers.baseAssimilator;
            quoteAssimilator = answers.quoteAssimilator;
            proportionalLiquidity = answers.proportionalLiquidity;
            swaps = answers.swaps;
            return runNpmCommand("npx hardhat deploy-pool --to ".concat(network, " --force ").concat(force, " --verify ").concat(verify, " --basetoken ").concat(baseToken, " --quotetoken ").concat(quoteToken, " --baseassimilator ").concat(baseAssimilator, " --quoteassimilator ").concat(quoteAssimilator, " --proportionalliquidity ").concat(proportionalLiquidity, " --swaps ").concat(swaps, " --network ").concat(network));
        });
    }
});
