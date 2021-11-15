const inquirer = require('inquirer')
const childProcess = require('child_process')


const runNpmCommand = (command: string) => childProcess.execSync(command, { stdio: [0, 1, 2] })

import editJson from 'edit-json-file'
const TOKENS_FILE = editJson(`${__dirname}/../constants/TOKENS.json`)
const listOfTokens = TOKENS_FILE.get('SYMBOLS_LIST')

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
    name: 'baseToken',
    message: 'Specify Base Token',
    choices: listOfTokens,
  },
  {
    type: 'list',
    name: 'quoteToken',
    message: 'Specify Quote Token',
    choices: listOfTokens,
  }
])
.then((answers: any) => {
  const network = answers.network
  const baseToken = answers.baseToken
  const quoteToken = answers.quoteToken

  console.log(`npx hardhat deploy-pool --to ${network} --basetoken ${baseToken} --quotetoken ${quoteToken} --network ${network}`)
  runNpmCommand(`npx hardhat deploy-pool --to ${network} --basetoken ${baseToken} --quotetoken ${quoteToken} --network ${network}`)

})
