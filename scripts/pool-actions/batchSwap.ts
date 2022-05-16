import '@nomiclabs/hardhat-ethers'
import Vault from '@balancer-labs/v2-deployments/deployed/kovan/Vault.json'
import open from 'open'
// import { getEnabledPools } from '../utils/addresses'
import { getSwaps, HaloSwapType } from '../utils/frontend'

declare const ethers: any

export default async (taskArgs: any, hre: any) => {
  const [deployer] = await ethers.getSigners()
  console.log('Liquidity Provider Address:', deployer.address)
  console.log('LP Provider balance:', ethers.utils.formatEther(await deployer.getBalance()))

  const network = taskArgs.to
  const vaultAddress = taskArgs.vault
  const tokenIn: string = taskArgs.tokenin
  const tokenOut: string = taskArgs.tokenout
  const amount = taskArgs.amount

  const ERC20 = await ethers.getContractFactory('MockToken')
  const tokenInDecimals = await ERC20.attach(tokenIn).decimals()
  const tokenOutDecimals = await ERC20.attach(tokenOut).decimals()

  // Allow unlimited
  await ERC20.attach(tokenIn).approve(vaultAddress, ethers.constants.MaxUint256)

  // const pools = getEnabledPools(network)
  // if (!pools) {
  //   console.error(`No pools found on network ${network}!`)
  //   return
  // }

  const pools = [
    {
      assets: ['0x07bAB1e2D6DCb965d250F376B811ab8c2373AAE0', '0x7e6F38922B59545bB5A6dc3A71039b85dFB1B7cE'],
      address: '0x5d5aaBCAc8Aa7288895912588A7B8787aB1fbA22',
      poolId: '0x5d5aabcac8aa7288895912588a7b8787ab1fba220002000000000000000008ee',
    },
    // XSGD:USDC
    // {
    //   assets: ['0x4DCE1178D2A368397c09fc6C63e2f82F00a2Ca09', '0x7e6F38922B59545bB5A6dc3A71039b85dFB1B7cE'],
    //   address: '',
    //   poolId: ''
    // }
    // EURS:USDC
    {
      assets: ['0xaA64D57E3c781bcFB2e8B1e1C9936C302Db84bCE', '0x7e6F38922B59545bB5A6dc3A71039b85dFB1B7cE'],
      address: '0x4b7315E3336153D54392dCB3F49800594362597B',
      poolId: '0x4b7315e3336153d54392dcb3f49800594362597b0002000000000000000008f0',
    },
  ]

  const { tokenAddresses, swaps } = await getSwaps(
    amount,
    HaloSwapType.SwapExactIn,
    {
      address: tokenIn,
      decimals: tokenInDecimals,
    },
    {
      address: tokenOut,
      decimals: tokenOutDecimals,
    },
    pools
  )

  const funds = {
    sender: deployer.address,
    recipient: deployer.address,
    fromInternalBalance: false,
    toInternalBalance: false,
  }

  let limits = [
    ethers.utils.parseUnits(amount, tokenInDecimals),
    ethers.utils.parseUnits('999999999', tokenOutDecimals),
  ]
  if (swaps.length > 1) {
    limits = [
      ethers.utils.parseUnits(amount, tokenInDecimals),
      ethers.utils.parseUnits('999999999', 6), // always USDC
      ethers.utils.parseUnits('999999999', tokenOutDecimals),
    ]
  }

  const deadline = 10 * 60 // 10 minutes
  const deadlineBN = ethers.utils.parseUnits(`${new Date().getTime() + deadline * 1000}`)

  const vault = await ethers.getContractAt(Vault.abi, vaultAddress)
  const connectedVault = await vault.connect(deployer)
  const encodedTx = await connectedVault.populateTransaction.batchSwap(
    HaloSwapType.SwapExactIn,
    swaps,
    tokenAddresses,
    funds,
    limits,
    deadlineBN
  )

  const txPayload = {
    chainId: hre.network.config.chainId,
    data: encodedTx.data as any,
    nonce: await ethers.provider.getTransactionCount(deployer.address),
    value: ethers.utils.parseEther('0'),
    gasLimit: ethers.utils.parseUnits('0.01', 'gwei'),
    to: vaultAddress,
  }

  let receipt
  try {
    receipt = await deployer.sendTransaction(txPayload as any)
    await receipt.wait()
    console.log('Batch swap successful!')
  } catch (Error) {
    console.error(Error)
  }

  if (network === 'localhost') {
    console.log('Transaction hash:', receipt.hash)
  } else {
    await open(`https://dashboard.tenderly.co/tx/${network}/${receipt?.hash}`)
  }
}
