const inquirer = require('inquirer')
const childProcess = require('child_process')

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
      type: 'input',
      name: 'name',
      message: 'LP token name',
    },
    {
      type: 'input',
      name: 'symbol',
      message: 'LP token symbol',
    },
    {
      type: 'input',
      name: 'fee',
      message: 'Protocol fee',
    },
    {
      type: 'confirm',
      name: 'fresh',
      message: 'Fresh deploy?',
    },
  ])
  .then((answers: any) => {
    const { network, baseToken, name, symbol, fee, fresh } = answers

    return runNpmCommand(
      `npx hardhat deploy-fx-pool ` +
        `--to ${network} ` +
        `--basetoken ${baseToken} ` +
        `--name ${name} ` +
        `--symbol ${symbol} ` +
        `--fee ${fee} ` +
        `--fresh ${fresh} ` +
        `--network ${network}`
    )
  })
