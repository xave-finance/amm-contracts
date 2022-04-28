"use strict";
var inquirer = require('inquirer');
var childProcess = require('child_process');
var runNpmCommand = function (command) { return childProcess.execSync(command, { stdio: [0, 1, 2] }); };
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
])
    .then(function (answers) {
    var network = answers.network;
    runNpmCommand("hardhat run scripts/deployFakeToken.ts --network ".concat(network));
});
