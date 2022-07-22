import '@nomiclabs/hardhat-ethers'
import Vault from '@balancer-labs/v2-deployments/deployed/kovan/Vault.json'
import open from 'open'
import { sortAddresses } from '../utils/sortAddresses'

declare const ethers: any

export default async (taskArgs: any, hre: any) => {
  const [deployer] = await ethers.getSigners()
  console.log('Liquidity Provider Address:', deployer.address)
  console.log('LP Provider balance:', ethers.utils.formatEther(await deployer.getBalance()))

  const network = taskArgs.to
  const poolId = taskArgs.poolid
  const baseToken = taskArgs.basetoken
  const quoteToken = taskArgs.quotetoken
  const numeraireAmount = taskArgs.numeraireamount
  const vaultAddress = taskArgs.vault
  const fromInternalBalance = taskArgs.frominternalbalance === 'true'

  const sortedAddresses = sortAddresses([baseToken, quoteToken])
  console.log('sorted addresses:', sortedAddresses)

  const ERC20 = await ethers.getContractFactory('MockToken')

  // Allow unlimited
  await ERC20.attach(baseToken).approve(vaultAddress, ethers.constants.MaxUint256)
  await ERC20.attach(quoteToken).approve(vaultAddress, ethers.constants.MaxUint256)

  const payload = ethers.utils.defaultAbiCoder.encode(
    ['uint256', 'address[]'],
    [ethers.utils.parseEther(numeraireAmount), sortedAddresses]
  )

  const joinPoolRequest = {
    assets: sortedAddresses,
    maxAmountsIn: [ethers.constants.MaxUint256, ethers.constants.MaxUint256],
    userData: payload,
    fromInternalBalance,
  }

  const vault = await ethers.getContractAt(Vault.abi, vaultAddress)
  const connectedVault = await vault.connect(deployer)
  const encodedJoinTx = await connectedVault.populateTransaction.joinPool(
    poolId,
    deployer.address,
    deployer.address,
    joinPoolRequest
  )

  const txPayload = {
    chainId: hre.network.config.chainId,
    data: encodedJoinTx.data as any,
    nonce: await ethers.provider.getTransactionCount(deployer.address),
    value: ethers.utils.parseEther('0'),
    gasLimit: ethers.utils.parseUnits('0.003', 'gwei'),
    to: vaultAddress,
  }

  let singleSwapTxReceipt
  try {
    singleSwapTxReceipt = await deployer.sendTransaction(txPayload as any)
    await singleSwapTxReceipt.wait()
    console.log('Deposit successful!')
  } catch (Error) {
    console.error(Error)
  }

  if (network === 'localhost') {
    console.log('Transaction hash:', singleSwapTxReceipt.hash)
  } else {
    await open(`https://dashboard.tenderly.co/tx/${network}/${singleSwapTxReceipt?.hash}`)
  }

  const poolTokens = await connectedVault.getPoolTokens(poolId)
  console.log('Vault pool tokens:', poolTokens)
}
