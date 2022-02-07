const inquirer = require('inquirer')
const childProcess = require('child_process')


const runNpmCommand = (command: string) => childProcess.execSync(command, { stdio: [0, 1, 2] })

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
])
.then((answers: any) => {
  const network = answers.network

  runNpmCommand(`hardhat run scripts/deployFakeToken.ts --network ${network}`)
})
