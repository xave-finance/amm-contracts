import '@nomiclabs/hardhat-ethers'
import Vault from '@balancer-labs/v2-deployments/deployed/kovan/Vault.json'
// import { Vault as VaultInterface } from '../../typechain/Vault'
import editJson from 'edit-json-file'
import open from 'open'
import { sortAddresses } from '../utils/sortAddresses'

declare const ethers: any

const POOLS_FILE = editJson(`${__dirname}/../constants/POOLS.json`)

export default async (taskArgs: any) => {
  const [deployer] = await ethers.getSigners()

  console.log('Liquidity Provider Address:', deployer.address)
  console.log(
    'LP Provider balance:',
    ethers.utils.formatEther(await deployer.getBalance())
  )

  const network = taskArgs.to
  const pool = taskArgs.pool
  const baseToken = taskArgs.basetoken
  const quoteToken = taskArgs.quotetoken
  const baseAmount = taskArgs.baseamount
  const quoteAmount = taskArgs.quoteamount
  const toInternalBalance = (taskArgs.tointernalbalance === 'true')

  const poolId = await POOLS_FILE.get(`${pool}.${network}.poolId`)

  const liquidityToRemove = [ethers.utils.parseEther(`${baseAmount}`), ethers.utils.parseEther(`${quoteAmount}`)]
  const payload = ethers.utils.defaultAbiCoder.encode(['uint256[]'], [liquidityToRemove])

  const exitPoolRequest = {
    assets: sortAddresses([baseToken, quoteToken]),
    // assets: [quoteToken, baseToken],
    // assets: [baseToken, quoteToken],
    minAmountsOut: liquidityToRemove,
    userData: payload,
    toInternalBalance
  }

  const vault = await ethers.getContractAt(Vault.abi, Vault.address)
  const connectedVault = await vault.connect(deployer)

  const encodedExitPoolTx = await connectedVault.populateTransaction.exitPool(poolId, deployer.address, deployer.address, exitPoolRequest)

  const txPayload = {
    chainId: 42,
    data: encodedExitPoolTx.data as any,
    nonce: await ethers.provider.getTransactionCount(deployer.address),
    value: ethers.utils.parseEther('0'),
    gasLimit: ethers.utils.parseUnits('0.01', 'gwei'),
    // gasLimit: utils.parseEther('0.00000000001'),
    to: Vault.address,
  }

  console.log('txPayload:', txPayload)

  let exitPoolTxReceipt

  try {
    exitPoolTxReceipt = await deployer.sendTransaction(txPayload as any)

    await exitPoolTxReceipt.wait()
  } catch (Error) {
    console.error(Error)
  }
  
  console.log(`Transaction Hash:`,
    `https://${network}.etherscan.io/tx/${exitPoolTxReceipt?.hash}`)

  // await open(`https://${network}.etherscan.io/tx/${singleSwapTxReceipt?.hash}`)
  await open(`https://dashboard.tenderly.co/tx/${network}/${exitPoolTxReceipt?.hash}`)
}