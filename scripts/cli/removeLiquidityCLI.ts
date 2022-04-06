const inquirer = require('inquirer')
const childProcess = require('child_process')

const runNpmCommand = (command: string) => childProcess.execSync(command, { stdio: [0, 1, 2] })

import { pools, listOfPools } from '../constants/deployedAddresses'

inquirer
  .prompt([
    {
      type: 'list',
      name: 'network',
      message: 'Which network to test',
      choices: ['kovan', 'matic'],
    },
    {
      type: 'list',
      name: 'pool',
      message: 'Specify Pool',
      choices: listOfPools,
    },
    {
      type: 'input',
      name: 'lptAmount',
      message: 'LPT Amount in (ETH units)',
    },
    {
      type: 'confirm',
      name: 'toInternalBalance',
      message: 'Send to Vault internal balance?',
    },
  ])
  .then(async (answers: any) => {
    const network = answers.network
    const pool = answers.pool
    const lptAmount = answers.lptAmount
    const tointernalbalance = answers.toInternalBalance

    const key = pool.split(':')[0]
    const selectedPool = pools[key as keyof typeof pools]
    const poolAddress = selectedPool.address
    const poolId = selectedPool.poolId
    const baseTokenAddress = selectedPool.baseToken
    const quoteTokenAddress = selectedPool.quoteToken

    console.log(
      `npx hardhat remove-liquidity ` +
        `--to ${network} ` +
        `--pooladdress ${poolAddress} ` +
        `--poolid ${poolId} ` +
        `--basetoken ${baseTokenAddress} ` +
        `--quotetoken ${quoteTokenAddress} ` +
        `--lptamount ${lptAmount} ` +
        `--tointernalbalance ${tointernalbalance} ` +
        `--network ${network}`
    )

    runNpmCommand(
      `npx hardhat remove-liquidity ` +
        `--to ${network} ` +
        `--pooladdress ${poolAddress} ` +
        `--poolid ${poolId} ` +
        `--basetoken ${baseTokenAddress} ` +
        `--quotetoken ${quoteTokenAddress} ` +
        `--lptamount ${lptAmount} ` +
        `--tointernalbalance ${tointernalbalance} ` +
        `--network ${network}`
    )
  })
