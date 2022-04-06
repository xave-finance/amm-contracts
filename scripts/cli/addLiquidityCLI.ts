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
      name: 'baseAmount',
      message: 'Base Token Amount in (ETH units)',
    },
    {
      type: 'input',
      name: 'quoteAmount',
      message: 'Quote Token Amount in (ETH units)',
    },
    {
      type: 'confirm',
      name: 'fromInternalBalance',
      message: 'Take from Vault internal balance?',
    },
  ])
  .then(async (answers: any) => {
    const network = answers.network
    const pool = answers.pool as string
    const baseAmount = answers.baseAmount
    const quoteAmount = answers.quoteAmount
    const frominternalbalance = answers.fromInternalBalance

    const key = pool.split(':')[0]
    const selectedPool = pools[key as keyof typeof pools]
    const poolId = selectedPool.poolId
    const baseTokenAddress = selectedPool.baseToken
    const quoteTokenAddress = selectedPool.quoteToken

    console.log(
      `npx hardhat add-liquidity ` +
        `--to ${network} ` +
        `--poolid ${poolId} ` +
        `--basetoken ${baseTokenAddress} ` +
        `--quotetoken ${quoteTokenAddress} ` +
        `--baseamount ${baseAmount} ` +
        `--quoteamount ${quoteAmount} ` +
        `--frominternalbalance ${frominternalbalance} ` +
        `--network ${network}`
    )

    runNpmCommand(
      `npx hardhat add-liquidity ` +
        `--to ${network} ` +
        `--poolid ${poolId} ` +
        `--basetoken ${baseTokenAddress} ` +
        `--quotetoken ${quoteTokenAddress} ` +
        `--baseamount ${baseAmount} ` +
        `--quoteamount ${quoteAmount} ` +
        `--frominternalbalance ${frominternalbalance} ` +
        `--network ${network}`
    )
  })
