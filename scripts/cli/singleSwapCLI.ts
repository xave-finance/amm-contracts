const inquirer = require('inquirer')
const childProcess = require('child_process')


const runNpmCommand = (command: string) => childProcess.execSync(command, { stdio: [0, 1, 2] })

import editJson from 'edit-json-file'
const TOKENS_FILE = editJson(`${__dirname}/../constants/TOKENS.json`)
const listOfTokens = TOKENS_FILE.get('SYMBOLS_LIST')

const POOLS_FILE = editJson(`${__dirname}/../constants/POOLS.json`)
const listOfPools = POOLS_FILE.get('POOLS_LIST')

let network: any, pool: string, kind: any, amount: any,
  fromInternalBalance: any, toInternalBalance: any,
  limit: any, deadline: any, baseToken: any, quoteToken: any

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
    type: 'list',
    name: 'kind',
    message: `The type of swap we want to perform where we know the amount of tokens we're ` +
    `sending to the pool and want to know how many we'll receive or vice versa.`,
    choices: ['GIVEN_IN', 'GIVEN_OUT'],
  },
  {
    type: 'input',
    name: 'amount',
    message: `The meaning of amount (in ETH unit) depends on the value of kind.
    GIVEN_IN: The amount of tokens we are sending to the pool.
    GIVEN_OUT: The amount of tokens we want to receive from the pool.\n`,
  },
  {
    type: 'confirm',
    name: 'fromInternalBalance',
    message: 'Take from Vault internal balance?',
  },
  {
    type: 'confirm',
    name: 'toInternalBalance',
    message: 'Send to Vault internal balance?',
  },
  {
    type: 'input',
    name: 'limit',
    message: `The meaning of limit depends on the value of singleSwap.kind
    GIVEN_IN: The minimum amount of tokens we would accept to receive from the swap.
    GIVEN_OUT: The maximum amount of tokens we would accept having to send for the swap.
    Default value = 100\n`,
  },
  {
    type: 'input',
    name: 'deadline',
    message: `The UNIX timestamp at which our trade must be completed by - if the transaction\
    is confirmed after this time then the transaction will fail.
    Default value = 300\n`,
  },
])
.then((answers: any) => {
  network = answers.network
  pool = answers.pool
  kind = answers.kind
  amount = answers.amount
  fromInternalBalance = answers.fromInternalBalance
  toInternalBalance = answers.toInternalBalance
  limit = answers.limit || 10000000000000
  deadline = answers.deadline || 300
})
.then(() => {
  const tokens = pool.split('-')
  inquirer.prompt([
    {
      type: 'list',
      name: 'base',
      message: 'Swap base token',
      choices: tokens,
    },
    {
      type: 'list',
      name: 'quote',
      message: 'Swap quote token',
      choices: tokens,
    },
  ])
  .then(async (answers: any) => {
    baseToken = answers.base
    quoteToken = answers.quote

    const baseTokenAddress = await TOKENS_FILE.get(`${baseToken}.${network}`)
    const quoteTokenAddress = await TOKENS_FILE.get(`${quoteToken}.${network}`)

    console.log(`npx hardhat single-swap --to ${network} --pool ${pool} --kind ${kind} --basetoken ${baseTokenAddress}\
    --quotetoken ${quoteTokenAddress} --amount ${amount} --frominternalbalance ${fromInternalBalance} --tointernalbalance\
    ${toInternalBalance} --limit ${limit} --deadline ${deadline} --network ${network}`)

    runNpmCommand(`npx hardhat single-swap --to ${network} --pool ${pool} --kind ${kind} --basetoken ${baseTokenAddress}\
      --quotetoken ${quoteTokenAddress} --amount ${amount} --frominternalbalance ${fromInternalBalance} --tointernalbalance\
      ${toInternalBalance} --limit ${limit} --deadline ${deadline} --network ${network}`)
  })
})
