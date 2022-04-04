const inquirer = require('inquirer')
const childProcess = require('child_process')
const haloContractAddresses = require('@halodao/halodao-contract-addresses')

const runNpmCommand = (command: string) => childProcess.execSync(command, { stdio: [0, 1, 2] })

const baseTokens = ['fxPHP', 'XSGD', 'EURS']

inquirer
  .prompt([
    {
      type: 'list',
      name: 'network',
      message: 'Which network to deploy',
      choices: ['kovan'],
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
  .then((answers: any) => {
    const { network, baseToken, fresh } = answers

    return runNpmCommand(
      `npx hardhat deploy-fx-pool --to ${network} --basetoken ${baseToken} --fresh ${fresh} --network ${network}`
    )
  })
