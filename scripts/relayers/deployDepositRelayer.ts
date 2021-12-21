// import { ethers } from 'hardhat'
// const hre = require('hardhat')
import sleep from '../utils/sleep'

import { DepositRelayer__factory } from '../../typechain/factories/DepositRelayer__factory'

declare const ethers: any
declare const hre: any

export default async (
  // proportionalLiquidity: string
): Promise<void> => {
  const proportionalLiquidity = '0x3BC220C9ea7BCFbD79B8141bf95d447238E75E1b' // temp

  const [deployer] = await ethers.getSigners()
	console.log(`Deploying with account: ${deployer.address}`)

  const DepositRelayerFactory = new DepositRelayer__factory(deployer)
  const depositRelayer = await DepositRelayerFactory.deploy(proportionalLiquidity)
  await depositRelayer.deployed()

  await hre.run('verify:verify', {
    address: depositRelayer.address,
    constructorArguments: [proportionalLiquidity]
  })

}