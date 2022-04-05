const inquirer = require('inquirer')
const childProcess = require('child_process')

const runNpmCommand = (command: string) => childProcess.execSync(command, { stdio: [0, 1, 2] })

const pools = {
  fxPHP: {
    poolId: '0x5288e69afdd329d677202fe855275a8c7a89f7630002000000000000000007c8',
    baseToken: '0x07bAB1e2D6DCb965d250F376B811ab8c2373AAE0',
    quoteToken: '0x7e6F38922B59545bB5A6dc3A71039b85dFB1B7cE',
  },
}

const listOfPools = Object.keys(pools).map((key) => `${key}:USDC`)

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
    const poolId = pools[key as keyof typeof pools].poolId

    const baseTokenAddress = '0x07bAB1e2D6DCb965d250F376B811ab8c2373AAE0'
    const quoteTokenAddress = '0x7e6F38922B59545bB5A6dc3A71039b85dFB1B7cE'

    console.log(`npx hardhat add-liquidity --to ${network} --poolid ${poolId} --basetoken ${baseTokenAddress} --quotetoken ${quoteTokenAddress}\
  --baseamount ${baseAmount} --quoteamount ${quoteAmount} --frominternalbalance ${frominternalbalance} --network ${network}`)

    runNpmCommand(`npx hardhat add-liquidity --to ${network} --poolid ${poolId} --basetoken ${baseTokenAddress} --quotetoken ${quoteTokenAddress}\
  --baseamount ${baseAmount} --quoteamount ${quoteAmount} --frominternalbalance ${frominternalbalance} --network ${network}`)
  })
