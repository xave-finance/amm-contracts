"use strict";
var inquirer = require('inquirer');
var childProcess = require('child_process');
var runNpmCommand = function (command) { return childProcess.execSync(command, { stdio: [0, 1, 2] }); };
var RELAYER_CHOICES = ['deposit'];
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
        name: 'relayer',
        message: 'Specify relayer to deploy',
        choices: RELAYER_CHOICES,
    },
])
    .then(function (answers) {
    var network = answers.network;
    var relayer = answers.relayer;
    console.log("npx hardhat deploy-".concat(relayer, "-relayer --network ").concat(network));
    runNpmCommand("npx hardhat deploy-".concat(relayer, "-relayer --network ").concat(network));
});
