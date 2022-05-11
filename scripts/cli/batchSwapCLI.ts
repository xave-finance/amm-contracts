import { getAllTokenAddresses, getVaultAddress } from '../utils/addresses'
const inquirer = require('inquirer')
const childProcess = require('child_process')

const runNpmCommand = (command: string) => childProcess.execSync(command, { stdio: [0, 1, 2] })

const tokens = ['fxPHP', 'USDC', 'EURS']

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
      name: 'tokenIn',
      message: 'Token in',
      choices: tokens,
    },
    {
      type: 'list',
      name: 'tokenOut',
      message: 'Token out',
      choices: tokens,
    },
    {
      type: 'input',
      name: 'amount',
      message: 'Amount to swap (ETH units)',
    },
  ])
  .then(async (answers: any) => {
    const network = answers.network
    const amount = answers.amount

    const tokenAddresses = getAllTokenAddresses(network)
    if (!tokenAddresses) {
      console.error(`No token addresses found on ${network}!`)
      return
    }

    const tokenInAddress = (tokenAddresses as any)[answers.tokenIn]
    const tokenOutAddress = (tokenAddresses as any)[answers.tokenOut]
    if (!tokenInAddress || !tokenOutAddress) {
      console.error(`Token not found on ${network}!`)
      return
    } else if (tokenInAddress === tokenOutAddress) {
      console.error(`Tokens cannot be the same!`)
      return
    }

    const vaultAddress = getVaultAddress(network)
    if (!vaultAddress) {
      console.error(`No vault address found on ${network}!`)
      return
    }

    console.log(
      `npx hardhat batch-swap ` +
        `--to ${network} ` +
        `--vault ${vaultAddress} ` +
        `--tokenin ${tokenInAddress} ` +
        `--tokenout ${tokenOutAddress} ` +
        `--amount ${amount} ` +
        `--network ${network}`
    )

    runNpmCommand(
      `npx hardhat batch-swap ` +
        `--to ${network} ` +
        `--vault ${vaultAddress} ` +
        `--tokenin ${tokenInAddress} ` +
        `--tokenout ${tokenOutAddress} ` +
        `--amount ${amount} ` +
        `--network ${network}`
    )
  })
