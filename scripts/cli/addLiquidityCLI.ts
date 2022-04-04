const inquirer = require('inquirer')
const childProcess = require('child_process')

const runNpmCommand = (command: string) => childProcess.execSync(command, { stdio: [0, 1, 2] })

import editJson from 'edit-json-file'
const TOKENS_FILE = editJson(`${__dirname}/../constants/TOKENS.json`)

const POOLS_FILE = editJson(`${__dirname}/../constants/POOLS.json`)
const listOfPools = POOLS_FILE.get('POOLS_LIST')

inquirer
  .prompt([
    {
      type: 'list',
      name: 'network',
      message: 'Which network to test',
      choices: ['kovan', 'matic'],
    },
    // {
    //   type: 'list',
    //   name: 'pool',
    //   message: 'Specify Pool',
    //   choices: listOfPools,
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
    {
      type: 'confirm',
      name: 'fromInternalBalance',
      message: 'Take from Vault internal balance?',
    },
  ])
  .then(async (answers: any) => {
    const network = answers.network
    const pool = answers.pool

    const baseAmount = answers.baseAmount
    const quoteAmount = answers.quoteAmount
    const frominternalbalance = answers.fromInternalBalance

    // const baseToken = `${pool.split('-')[0]}`
    // const quoteToken = `${pool.split('-')[1]}`

    // const baseTokenAddress = await TOKENS_FILE.get(`${baseToken}.${network}`)
    // const quoteTokenAddress = await TOKENS_FILE.get(`${quoteToken}.${network}`)
    const baseTokenAddress = '0x07bAB1e2D6DCb965d250F376B811ab8c2373AAE0'
    const quoteTokenAddress = '0x7e6F38922B59545bB5A6dc3A71039b85dFB1B7cE'

    console.log(`npx hardhat add-liquidity --to ${network} --pool ${pool} --basetoken ${baseTokenAddress} --quotetoken ${quoteTokenAddress}\
  --baseamount ${baseAmount} --quoteamount ${quoteAmount} --frominternalbalance ${frominternalbalance} --network ${network}`)

    runNpmCommand(`npx hardhat add-liquidity --to ${network} --pool ${pool} --basetoken ${baseTokenAddress} --quotetoken ${quoteTokenAddress}\
  --baseamount ${baseAmount} --quoteamount ${quoteAmount} --frominternalbalance ${frominternalbalance} --network ${network}`)
  })
