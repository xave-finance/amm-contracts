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
  console.log('LP Provider balance:', ethers.utils.formatEther(await deployer.getBalance()))

  const network = taskArgs.to
  const pool = taskArgs.pool
  const baseToken = taskArgs.basetoken
  const quoteToken = taskArgs.quotetoken
  const baseAmount = taskArgs.baseamount
  const quoteAmount = taskArgs.quoteamount
  const fromInternalBalance = taskArgs.frominternalbalance === 'true'

  //const poolId = await POOLS_FILE.get(`${pool}.${network}.poolId`)
  const poolId = '0xd2bf123f2f4ffcffc33f28315998c73faa977f460002000000000000000007b5'
  // const poolAddress = await POOLS_FILE.get(`${pool}.${network}.address`)

  const ERC20 = await ethers.getContractFactory('MockToken')

  const baseTokenDecimals = await ERC20.attach(baseToken).decimals()
  const quoteTokenDecimals = await ERC20.attach(quoteToken).decimals()

  // const baseTokenBalance = await ERC20.attach(baseToken).balanceOf(deployer.address)
  // const quoteTokenBalance = await ERC20.attach(quoteToken).balanceOf(deployer.address)

  // // console.log('baseTokenBalance:', baseTokenBalance.toString())

  // if (baseTokenBalance.toString() === '0') {
  //   console.log('Minting base token')
  //   await ERC20.attach(baseToken).functions.mint(deployer.address, ethers.utils.parseEther('10000'))
  //   await ERC20.attach(baseToken).functions.approve(Vault.address, ethers.utils.parseEther('10000'))
  // }

  // if (quoteTokenBalance.toString() === '0') {
  //   console.log('Minting quote token')
  //   await ERC20.attach(quoteToken).functions.mint(deployer.address, ethers.utils.parseEther('10000'))
  //   await ERC20.attach(quoteToken).functions.approve(Vault.address, ethers.utils.parseEther('10000'))
  // }

  // console.log('baseTokenDecimals:', baseTokenDecimals)
  // console.log('quoteTokenDecimals:', quoteTokenDecimals)
  // console.log('ethers.utils.parseUnits(`${baseAmount}`, baseTokenDecimals):', ethers.utils.parseUnits(`${baseAmount}`, baseTokenDecimals).toNumber())
  // console.log('ethers.utils.parseUnits(`${quoteAmount}`, quoteTokenDecimals):', ethers.utils.parseUnits(`${quoteAmount}`, quoteTokenDecimals).toNumber())

  const liquidityToAdd = [ethers.utils.parseEther(`${baseAmount}`), ethers.utils.parseEther(`${quoteAmount}`)]
  // const liquidityToAdd = [ethers.utils.parseUnits(`${baseAmount}`, baseTokenDecimals), ethers.utils.parseUnits(`${quoteAmount}`, quoteTokenDecimals)]
  // const liquidityToAdd = [
  //   ethers.utils.parseUnits(`${quoteAmount}`, quoteTokenDecimals),
  //   ethers.utils.parseUnits(`${baseAmount}`, baseTokenDecimals),
  // ]
  const payload = ethers.utils.defaultAbiCoder.encode(['uint256[]'], [liquidityToAdd])
  console.log('sortAddresses([baseToken, quoteToken]):', sortAddresses([baseToken, quoteToken]))
  const joinPoolRequest = {
    assets: sortAddresses([baseToken, quoteToken]),
    // assets: [quoteToken, baseToken],
    // assets: [baseToken, quoteToken],
    maxAmountsIn: liquidityToAdd,
    userData: payload,
    // userData: '0x',
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
  // console.log('txPayload:', txPayload)

  let singleSwapTxReceipt

  try {
    singleSwapTxReceipt = await deployer.sendTransaction(txPayload as any)

    await singleSwapTxReceipt.wait()
  } catch (Error) {
    console.error(Error)
  }

  console.log(`Transaction Hash:`, `https://${network}.etherscan.io/tx/${singleSwapTxReceipt?.hash}`)

  await open(`https://dashboard.tenderly.co/tx/${network}/${singleSwapTxReceipt?.hash}`)
}
