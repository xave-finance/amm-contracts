import '@nomiclabs/hardhat-ethers'
import Vault from '@balancer-labs/v2-deployments/deployed/kovan/Vault.json'
import open from 'open'
import { sortAddresses } from '../utils/sortAddresses'
import { BigNumber } from 'ethers'
import { getProportionalLiquidityAddress } from '../utils/addresses'

declare const ethers: any

export default async (taskArgs: any) => {
  const [deployer] = await ethers.getSigners()
  console.log('Liquidity Provider Address:', deployer.address)
  console.log('LP Provider balance:', ethers.utils.formatEther(await deployer.getBalance()))

  const network = taskArgs.to
  const poolAddress = taskArgs.pooladdress
  const poolId = taskArgs.poolid
  const baseToken = taskArgs.basetoken
  const quoteToken = taskArgs.quotetoken
  const lptAmount = taskArgs.lptamount
  const toInternalBalance = taskArgs.tointernalbalance === 'true'

  const proportionalLiquidityAddress = getProportionalLiquidityAddress(network)
  if (!proportionalLiquidityAddress) {
    console.error(`Address for ProportionalLiquidity not available on ${network}!`)
    return
  }

  const lptAmountBN = ethers.utils.parseEther(`${lptAmount}`)
  console.log('lptAmountBN:', lptAmountBN.toString())

  const FXPool = await ethers.getContractFactory('FXPool', {
    libraries: {
      ProportionalLiquidity: proportionalLiquidityAddress,
    },
  })
  const viewWithdrawResponse = await FXPool.attach(poolAddress).viewWithdraw(lptAmountBN)
  console.log('viewWithdrawResponse:', viewWithdrawResponse.toString())
  const baseAmountBN = viewWithdrawResponse[0]
  const quoteAmountBN = viewWithdrawResponse[1]

  const sortedAddresses = sortAddresses([baseToken, quoteToken])
  console.log('sorted addresses:', sortedAddresses)

  let liquidityToRemove: BigNumber[]
  if (sortedAddresses[0] === baseToken) {
    liquidityToRemove = [baseAmountBN, quoteAmountBN]
  } else {
    liquidityToRemove = [quoteAmountBN, baseAmountBN]
  }

  console.log('liquidityToRemove:', liquidityToRemove.toString())

  const payload = ethers.utils.defaultAbiCoder.encode(['uint256', 'address[]'], [lptAmountBN, sortedAddresses])

  const exitPoolRequest = {
    assets: sortedAddresses,
    minAmountsOut: liquidityToRemove,
    userData: payload,
    toInternalBalance,
  }

  const vault = await ethers.getContractAt(Vault.abi, Vault.address)
  const connectedVault = await vault.connect(deployer)
  const encodedExitPoolTx = await connectedVault.populateTransaction.exitPool(
    poolId,
    deployer.address,
    deployer.address,
    exitPoolRequest
  )

  const txPayload = {
    chainId: 42,
    data: encodedExitPoolTx.data as any,
    nonce: await ethers.provider.getTransactionCount(deployer.address),
    value: ethers.utils.parseEther('0'),
    gasLimit: ethers.utils.parseUnits('0.01', 'gwei'),
    to: Vault.address,
  }

  let exitPoolTxReceipt
  try {
    exitPoolTxReceipt = await deployer.sendTransaction(txPayload as any)
    await exitPoolTxReceipt.wait()
  } catch (Error) {
    console.error(Error)
  }

  await open(`https://dashboard.tenderly.co/tx/${network}/${exitPoolTxReceipt?.hash}`)
}
