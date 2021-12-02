import '@nomiclabs/hardhat-ethers'
import Vault from '@balancer-labs/v2-deployments/deployed/kovan/Vault.json'
import { Vault as VaultInterface } from '../../typechain/Vault'
import editJson from 'edit-json-file'

import { Wallet, utils } from 'ethers'
import open from 'open'

declare const ethers: any

const POOLS_FILE = editJson(`${__dirname}/../constants/POOLS.json`)

export default async (taskArgs: any) => {
  const [deployer] = await ethers.getSigners() as Wallet[]

  console.log('Liquidity Provider Address:', deployer.address)
  console.log(
    'LP Provider balance:',
    ethers.utils.formatEther(await deployer.getBalance())
  )

  const network = taskArgs.to
  const pool = taskArgs.pool
  const kind = taskArgs.kind
  const baseToken = taskArgs.basetoken
  const quoteToken = taskArgs.quotetoken
  const amount = taskArgs.amount
  const fromInternalBalance = (taskArgs.frominternalbalance === 'true')
  const toInternalBalance = (taskArgs.tointernalbalance === 'true')
  const limit =  ethers.utils.parseEther(`${taskArgs.limit}`)
  const deadline = (await ethers.provider.getBlock()).timestamp + taskArgs.deadline

  const poolId = await POOLS_FILE.get(`${pool}.${network}.poolId`)

  const MOCK_ASSIMILATOR_ADDRESS = '0x235A2ac113014F9dcb8aBA6577F20290832dDEFd'
  const payload = ethers.utils.defaultAbiCoder.encode(['address'], [MOCK_ASSIMILATOR_ADDRESS])

  const singleSwapRequest = {
    poolId: poolId,
    kind: kind === 'GIVEN_IN' ? 0 : 1,
    assetIn: baseToken,
    assetOut: quoteToken,
    amount: ethers.utils.parseEther(`${amount}`),
    // userData: payload,
    userData: '0x',
  }

  console.log('singleSwapRequest:', singleSwapRequest)

  const fundManagement = {
    sender: deployer.address,
    fromInternalBalance,
    recipient: deployer.address,
    toInternalBalance,
  }


  const vault = await ethers.getContractAt(Vault.abi, Vault.address) as VaultInterface
  const connectedVault = await vault.connect(deployer)

  const encodedSingleSwapTx = await connectedVault.populateTransaction.swap(singleSwapRequest, fundManagement, limit, deadline)

  const txPayload = {
    chainId: 42,
    data: encodedSingleSwapTx.data as any,
    nonce: await ethers.provider.getTransactionCount(deployer.address),
    value: utils.parseEther('0'),
    gasLimit: utils.parseUnits('0.01', 'gwei'),
    to: Vault.address,
  }

  let singleSwapTxReceipt

  try {
    singleSwapTxReceipt = await deployer.sendTransaction(txPayload as any)

    await singleSwapTxReceipt.wait()
  } catch (Error) {
    // console.error(Error)
  }
  
  console.log(`Transaction Hash:`,
    `https://${network}.etherscan.io/tx/${singleSwapTxReceipt?.hash}`)

  await open(`https://dashboard.tenderly.co/tx/${network}/${singleSwapTxReceipt?.hash}`)

}