const inquirer = require('inquirer')
const childProcess = require('child_process')


const runNpmCommand = (command: string) => childProcess.execSync(command, { stdio: [0, 1, 2] })

import editJson from 'edit-json-file'
const TOKENS_FILE = editJson(`${__dirname}/../constants/TOKENS.json`)

const POOLS_FILE = editJson(`${__dirname}/../constants/POOLS.json`)
const listOfPools = POOLS_FILE.get('POOLS_LIST')

inquirer.prompt([
  {
    type: 'list',
    name: 'network',
    message: 'Which network to test',
    choices: [
      'kovan',
      'matic',
    ],
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
    name: 'toInternalBalance',
    message: 'Send to Vault internal balance?',
  },
])
.then(async (answers: any) => {
  const network = answers.network
  const pool = answers.pool

  const baseAmount = answers.baseAmount
  const quoteAmount = answers.quoteAmount
  const tointernalbalance = answers.toInternalBalance

  const baseToken = `${pool.split('-')[0]}`
  const quoteToken = `${pool.split('-')[1]}`

  const baseTokenAddress = await TOKENS_FILE.get(`${baseToken}.${network}`)
  const quoteTokenAddress = await TOKENS_FILE.get(`${quoteToken}.${network}`)

  console.log(`npx hardhat remove-liquidity --to ${network} --pool ${pool} --basetoken ${baseTokenAddress} --quotetoken ${quoteTokenAddress}\
  --baseamount ${baseAmount} --quoteamount ${quoteAmount} --tointernalbalance ${tointernalbalance} --network ${network}`)

  runNpmCommand(`npx hardhat remove-liquidity --to ${network} --pool ${pool} --basetoken ${baseTokenAddress} --quotetoken ${quoteTokenAddress}\
  --baseamount ${baseAmount} --quoteamount ${quoteAmount} --tointernalbalance ${tointernalbalance} --network ${network}`)
})
