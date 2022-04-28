"use strict";
var inquirer = require('inquirer');
var childProcess = require('child_process');
var haloContractAddresses = require('@halodao/halodao-contract-addresses');
var runNpmCommand = function (command) { return childProcess.execSync(command, { stdio: [0, 1, 2] }); };
var baseTokens = ['fxPHP', 'XSGD', 'EURS'];
inquirer
    .prompt([
    {
        type: 'list',
        name: 'network',
        message: 'Which network to deploy',
        choices: ['kovan', 'rinkeby', 'matic'],
    },
    {
        type: 'list',
        name: 'baseToken',
        message: 'Specify base token',
        choices: baseTokens,
    },
    {
        type: 'confirm',
        name: 'fresh',
        message: 'Deploy a new AssimilatorFactory?',
    },
])
    .then(function (answers) {
    var network = answers.network, baseToken = answers.baseToken, fresh = answers.fresh;
    return runNpmCommand("npx hardhat deploy-fx-pool --to ".concat(network, " --basetoken ").concat(baseToken, " --fresh ").concat(fresh, " --network ").concat(network));
});
