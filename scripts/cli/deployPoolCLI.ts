const inquirer = require('inquirer')
const childProcess = require('child_process')


const runNpmCommand = (command: string) => childProcess.execSync(command, { stdio: [0, 1, 2] })

import editJson from 'edit-json-file'
const TOKENS_FILE = editJson(`${__dirname}/../constants/TOKENS.json`)
const listOfTokens = TOKENS_FILE.get('SYMBOLS_LIST')

let network: string, strategy: string, force: string, verify: string,
  baseToken: string, quoteToken: string, baseAssimilator: string,
  quoteAssimilator: string, proportionalLiquidity: string, swaps: string

const DEPLOYMENT_STRATEGY = [
  'FRESH_CONTRACTS',
  'CONSTANT_CONTRACTS',
  'SPECIFY_CONTRACTS'
]

inquirer.prompt([
  {
    type: 'list',
    name: 'network',
    message: 'Which network to deploy',
    choices: [
      'kovan',
      'matic',
    ],
  },
  {
    type: 'list',
    name: 'strategy',
    message: 'Specify deployment strategy',
    choices: DEPLOYMENT_STRATEGY,
  },
  {
    type: 'confirm',
    name: 'force',
    message: 'Force deploy tx',
    choices: DEPLOYMENT_STRATEGY,
  },
  {
    type: 'confirm',
    name: 'verify',
    message: 'Verify contracts',
    choices: DEPLOYMENT_STRATEGY,
  },
])
.then((answers: any) => {
  network = answers.network
  strategy = answers.strategy
  force = answers.force
  verify = answers.verify

  if (strategy === DEPLOYMENT_STRATEGY[0] || strategy === DEPLOYMENT_STRATEGY[1]) {
    return runNpmCommand(`npx hardhat deploy-pool --to ${network} --strategy ${strategy} --force ${force} --verify ${verify} --network ${network}`)
  } else if (strategy === DEPLOYMENT_STRATEGY[2]) {
    inquirer.prompt([
      {
        type: 'list',
        name: 'baseToken',
        message: 'Specify Base Token',
        choices: listOfTokens,
      },
      {
        type: 'list',
        name: 'quoteToken',
        message: 'Specify Quote Token',
        choices: listOfTokens,
      },
      {
        type: 'input',
        name: 'baseAssimilator',
        message: 'Specify Base Assimilator Contract address',
      },
      {
        type: 'input',
        name: 'quoteAssimilator',
        message: 'Specify Quote Assimilator Contract address',
      },
      {
        type: 'input',
        name: 'proportionalLiquidity',
        message: 'Specify Proportional Liquidity Contract address',
      },
      {
        type: 'input',
        name: 'swaps',
        message: 'Specify Swaps Contract address',
      },
    ])
      .then((answers: any) => {
        baseToken = answers.baseToken
        quoteToken = answers.quoteToken
        baseAssimilator = answers.baseAssimilator
        quoteAssimilator = answers.quoteAssimilator
        proportionalLiquidity = answers.proportionalLiquidity
        swaps = answers.swaps

        return runNpmCommand(`npx hardhat deploy-pool --to ${network} --force ${force} --verify ${verify} --basetoken ${baseToken} --quotetoken ${quoteToken} --baseassimilator ${baseAssimilator} --quoteassimilator ${quoteAssimilator} --proportionalliquidity ${proportionalLiquidity} --swaps ${swaps} --network ${network}`)
      })
  }

})
