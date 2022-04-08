import { getEnabledPools } from '../utils/addresses'
const inquirer = require('inquirer')
const childProcess = require('child_process')

const runNpmCommand = (command: string) => childProcess.execSync(command, { stdio: [0, 1, 2] })

inquirer
  .prompt([
    {
      type: 'list',
      name: 'network',
      message: 'Which network to test',
      choices: ['kovan', 'matic'],
    },
    {
      type: 'input',
      name: 'poolId',
      message: 'Specify Pool ID',
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
    const poolId = answers.poolId
    const lptAmount = answers.lptAmount
    const tointernalbalance = answers.toInternalBalance

    const pools = await getEnabledPools(network)
    const pool = pools ? pools.find((p) => p.poolId === poolId) : undefined
    if (!pool) {
      console.error(`poolId[${poolId}] not available on ${network}!`)
      return
    }

    const poolAddress = pool.address
    const baseTokenAddress = pool.assets[0]
    const quoteTokenAddress = pool.assets[1]

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
