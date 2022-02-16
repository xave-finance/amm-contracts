const inquirer = require('inquirer')
const childProcess = require('child_process')


const runNpmCommand = (command: string) => childProcess.execSync(command, { stdio: [0, 1, 2] })

const RELAYER_CHOICES = ['deposit']

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
    name: 'relayer',
    message: 'Specify relayer to deploy',
    choices: RELAYER_CHOICES,
  },
])
  .then((answers: any) => {
    const network = answers.network
    const relayer = answers.relayer

    console.log(`npx hardhat deploy-${relayer}-relayer --network ${network}`)
    runNpmCommand(`npx hardhat deploy-${relayer}-relayer --network ${network}`)
  })