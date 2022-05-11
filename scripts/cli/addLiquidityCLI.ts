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
    // {
    //   type: 'input',
    //   name: 'poolId',
    //   message: 'Specify Pool ID',
    // },
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
    // {
    //   type: 'confirm',
    //   name: 'fromInternalBalance',
    //   message: 'Take from Vault internal balance?',
    // },
  ])
  .then(async (answers: any) => {
    const network = answers.network
    //const poolId = answers.poolId as string
    const baseAmount = answers.baseAmount
    const quoteAmount = answers.quoteAmount
    //const frominternalbalance = answers.fromInternalBalance

    // const pools = await getEnabledPools(network)
    // const pool = pools ? pools.find((p) => p.poolId === poolId) : undefined
    // if (!pool) {
    //   console.error(`poolId[${poolId}] not available on ${network}!`)
    //   return
    // }

    // const baseTokenAddress = pool.assets[0]
    // const quoteTokenAddress = pool.assets[1]

    const vaultAddress = '0xBA12222222228d8Ba445958a75a0704d566BF2C8'
    const poolId = '0x5d5aabcac8aa7288895912588a7b8787ab1fba220002000000000000000008ee'
    const baseTokenAddress = '0x07bAB1e2D6DCb965d250F376B811ab8c2373AAE0'
    const quoteTokenAddress = '0x7e6F38922B59545bB5A6dc3A71039b85dFB1B7cE'
    const frominternalbalance = false

    console.log(
      `npx hardhat add-liquidity ` +
        `--to ${network} ` +
        `--vault ${vaultAddress} ` +
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
