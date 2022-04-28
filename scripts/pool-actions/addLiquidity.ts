import '@nomiclabs/hardhat-ethers'
import Vault from '@balancer-labs/v2-deployments/deployed/kovan/Vault.json'
import open from 'open'
import { sortAddresses } from '../utils/sortAddresses'
import { BigNumber } from 'ethers'

declare const ethers: any

export default async (taskArgs: any) => {
  const [deployer] = await ethers.getSigners()
  console.log('Liquidity Provider Address:', deployer.address)
  console.log('LP Provider balance:', ethers.utils.formatEther(await deployer.getBalance()))

  const network = taskArgs.to
  const poolId = taskArgs.poolid
  const baseToken = taskArgs.basetoken
  const quoteToken = taskArgs.quotetoken
  const baseAmount = taskArgs.baseamount
  const quoteAmount = taskArgs.quoteamount
  const fromInternalBalance = taskArgs.frominternalbalance === 'true'

  const sortedAddresses = sortAddresses([baseToken, quoteToken])
  console.log('sorted addresses:', sortedAddresses)

  const ERC20 = await ethers.getContractFactory('MockToken')
  const baseTokenDecimals = await ERC20.attach(baseToken).decimals()
  const quoteTokenDecimals = await ERC20.attach(quoteToken).decimals()

  let liquidityToAdd: BigNumber[]
  if (sortedAddresses[0] === baseToken) {
    liquidityToAdd = [
      ethers.utils.parseUnits(`${baseAmount}`, baseTokenDecimals),
      ethers.utils.parseUnits(`${quoteAmount}`, quoteTokenDecimals),
    ]
  } else {
    liquidityToAdd = [
      ethers.utils.parseUnits(`${quoteAmount}`, quoteTokenDecimals),
      ethers.utils.parseUnits(`${baseAmount}`, baseTokenDecimals),
    ]
  }
  console.log('liquidityToAdd:', liquidityToAdd.toString())

  const payload = ethers.utils.defaultAbiCoder.encode(['uint256[]', 'address[]'], [liquidityToAdd, sortedAddresses])

  const joinPoolRequest = {
    assets: sortedAddresses,
    maxAmountsIn: liquidityToAdd,
    userData: payload,
    fromInternalBalance,
  }

  const vault = await ethers.getContractAt(Vault.abi, Vault.address)
  const connectedVault = await vault.connect(deployer)
  const encodedJoinTx = await connectedVault.populateTransaction.joinPool(
    poolId,
    deployer.address,
    deployer.address,
    joinPoolRequest
  )

  const txPayload = {
    chainId: 42,
    data: encodedJoinTx.data as any,
    nonce: await ethers.provider.getTransactionCount(deployer.address),
    value: ethers.utils.parseEther('0'),
    gasLimit: ethers.utils.parseUnits('0.01', 'gwei'),
    to: Vault.address,
  }

  let singleSwapTxReceipt
  try {
    singleSwapTxReceipt = await deployer.sendTransaction(txPayload as any)
    await singleSwapTxReceipt.wait()
  } catch (Error) {
    console.error(Error)
  }

  await open(`https://dashboard.tenderly.co/tx/${network}/${singleSwapTxReceipt?.hash}`)
}
