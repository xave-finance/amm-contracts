import { ethers } from 'hardhat'
const hre = require('hardhat')
import sleep from './utils/sleep'
import editJson from 'edit-json-file'
import faker from 'faker'

import { FakeToken } from '../typechain/FakeToken'
import Vault from '@balancer-labs/v2-deployments/deployed/kovan/Vault.json'


const file = editJson(`${__dirname}/constants/TOKENS.json`)

const deploy = async (doMint: boolean = true) => {
	const [deployer] = await ethers.getSigners()
	console.log(`Deploying with account: ${deployer.address}`)

	const FakeToken = await ethers.getContractFactory('FakeToken')
  const randomTokenName = faker.finance.currencyName()
  const randomSymbol = faker.address.citySuffix().toUpperCase()
  // const randomSymbol = faker.finance.currencySymbol()

	const fakeToken = await FakeToken.deploy(randomTokenName, randomSymbol) as FakeToken
  console.log('Ongoing deploy hash: ', fakeToken.deployTransaction.hash)
	await fakeToken.deployed()
	console.log(`Fake Token deployed at: ${fakeToken.address}`)

  await file.set(`${randomSymbol}.${process.env.HARDHAT_NETWORK}`, fakeToken.address).save()
  await file.append(`SYMBOLS_LIST`, randomSymbol).save()

  if (doMint) {
    const mintTx = await fakeToken.mint(deployer.address, ethers.utils.parseEther(`100000000000`))
    const mintReceipt = await mintTx.wait()
    console.log(`Minted 100000000000 of ${randomSymbol} to deployer wallet tx hash: ${mintReceipt.transactionHash}`)

    const approveTx = await fakeToken.approve(Vault.address, ethers.utils.parseEther(`100000000000`))
    const approveReceipt = await approveTx.wait()
    console.log(`Approved 100000000000 of ${randomSymbol} use for Vault tx hash: ${approveReceipt.transactionHash}`)
  }

  await sleep(60000)

	// auto verify primary contract
  console.log('verifying Fake Token')
  await hre.run('verify:verify', {
    address: fakeToken.address,
    constructorArguments: [randomTokenName, randomSymbol],
  })
}

deploy()
  .then(() => process.exit(0))
  .catch((error) => console.error(error))