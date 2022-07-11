const inquirer = require('inquirer')
const childProcess = require('child_process')
const haloContractAddresses = require('@halodao/xave-contract-addresses')

const runNpmCommand = (command: string) => childProcess.execSync(command, { stdio: [0, 1, 2] })

const baseTokens = ['fxPHP', 'XSGD', 'EURS', 'CHF']

inquirer
  .prompt([
    {
      type: 'list',
      name: 'network',
      message: 'Which network to deploy',
      choices: ['kovan', 'rinkeby', 'matic', 'arb'],
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
      message: 'Fresh deploy?',
    },
  ])
  .then((answers: any) => {
    const { network, baseToken, fresh } = answers

    return runNpmCommand(
      `npx hardhat deploy-fx-pool --to ${network} --basetoken ${baseToken} --fresh ${fresh} --network ${network}`
    )
  })
