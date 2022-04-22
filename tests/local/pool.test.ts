import { expect } from 'chai'
import { ethers } from 'hardhat'
import { BigNumber, BytesLike, Signer } from 'ethers'
import { setupEnvironment, TestEnv } from '../common/setupEnvironment'
import { parseEther, parseUnits } from '@ethersproject/units'
import { CONTRACT_REVERT } from '../constants'
import { sortAddresses } from '../common/helpers/utils'
import { mockToken } from '../constants/mockTokenList'
import { getAssimilatorContract } from '../common/contractGetters'
import * as types from '.././common/types/types'
import { sortTokenAddressesLikeVault } from '../common/helpers/sorter'
import { Contract } from 'ethers'

describe('FXPool', () => {
  let testEnv: TestEnv
  let admin: Signer
  let notOwner: Signer
  let adminAddress: string
  let poolId: string

  let fxPHPAssimilatorAddress: string
  let usdcAssimilatorAddress: string
  let sortedAddresses: string[]

  const NEW_CAP = parseEther('100000000')
  const NEW_CAP_FAIL = parseEther('1000')
  const ALPHA = parseUnits('0.8')
  const BETA = parseUnits('0.5')
  const MAX = parseUnits('0.15')
  const EPSILON = parseUnits('0.0004')
  const LAMBDA = parseUnits('0.3')
  const baseWeight = parseUnits('0.5')
  const quoteWeight = parseUnits('0.5')

  const loopCount = 10

  let contract_vault: Contract

  before('build test env', async () => {
    testEnv = await setupEnvironment()
    ;[admin, notOwner] = await ethers.getSigners()
    adminAddress = await admin.getAddress()

    // 1 - deploy assimilators
    await testEnv.assimilatorFactory.newBaseAssimilator(
      testEnv.fxPHP.address,
      parseUnits('1', `${mockToken[3].decimal}`),
      testEnv.fxPHPOracle.address
    )
    // 2 - get Pool Id
    poolId = await testEnv.fxPool.getPoolId()

    // 3 - getAssimilators
    fxPHPAssimilatorAddress = await testEnv.assimilatorFactory.getAssimilator(testEnv.fxPHP.address)
    usdcAssimilatorAddress = await testEnv.assimilatorFactory.usdcAssimilator()

    // 4 - sortedAddress references
    sortedAddresses = sortAddresses([
      ethers.utils.getAddress(testEnv.fxPHP.address),
      ethers.utils.getAddress(testEnv.USDC.address),
    ])

    contract_vault = await ethers.getContractAt('Vault', testEnv.vault.address)
  })

  it('FXPool is registered on the vault', async () => {
    // const poolId = await testEnv.fxPool.getPoolId()
    const poolInfoFromVault = await testEnv.vault.getPool(poolId)

    expect(
      await testEnv.fxPool.getVault(),
      'Vault in FXPool is different from the test environment vault'
    ).to.be.equals(await testEnv.vault.address)

    expect(poolInfoFromVault[0], 'FXpool is not registered in the vault').to.be.equals(testEnv.fxPool.address)

    const curveDetails = await testEnv.fxPool.curve()
    expect(curveDetails.cap).to.be.equals(0)
    expect(curveDetails.totalSupply).to.be.equals(0)
  })
  it('Initializes the FXPool and set curve parameters', async () => {
    await expect(
      testEnv.fxPool.initialize(
        [
          testEnv.fxPHP.address,
          fxPHPAssimilatorAddress,
          testEnv.fxPHP.address,
          fxPHPAssimilatorAddress,
          testEnv.fxPHP.address,
          testEnv.USDC.address,
          usdcAssimilatorAddress,
          testEnv.USDC.address,
          usdcAssimilatorAddress,
          testEnv.USDC.address,
        ],
        [baseWeight, quoteWeight]
      )
    )
      .to.emit(testEnv.fxPool, 'AssetIncluded')
      .to.emit(testEnv.fxPool, 'AssimilatorIncluded')

    await expect(testEnv.fxPool.setParams(ALPHA, BETA, MAX, EPSILON, LAMBDA)).to.emit(testEnv.fxPool, 'ParametersSet')
    //  .withArgs(ALPHA, BETA, MAX, EPSILON, LAMBDA) - check delta calculation
  })
  it('Adds liquidity to the FXPool via the Vault which triggers the onJoin hook', async () => {
    await testEnv.fxPHP.approve(testEnv.vault.address, ethers.constants.MaxUint256)
    await testEnv.USDC.approve(testEnv.vault.address, ethers.constants.MaxUint256)

    // add per iteration roughly 10,000 USD or ~250k PHP and ~5k USDC to the pool
    const depositAmountInNumber = 2000
    const depositAmountInEther = depositAmountInNumber.toString()
    const depositAmountInWei = parseEther(depositAmountInEther)

    let fxPHPAddress = ethers.utils.getAddress(testEnv.fxPHP.address)

    for (var i = 1; i < loopCount + 1; i++) {
      console.log('Deposit #', i, ' with total deposit amount ', depositAmountInNumber * i)

      const beforeLpBalance = await testEnv.fxPool.balanceOf(adminAddress)
      const beforeVaultfxPhpBalance = await testEnv.fxPHP.balanceOf(testEnv.vault.address)
      const beforeVaultUsdcBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)

      // get estimated tokens
      const viewDeposit = await testEnv.fxPool.viewDeposit(depositAmountInWei.toString())

      let liquidityToAdd: BigNumber[] = sortTokenAddressesLikeVault(sortedAddresses, fxPHPAddress, {
        lptAmount: viewDeposit[0],
        deposits: viewDeposit[1],
      })

      const payload = ethers.utils.defaultAbiCoder.encode(['uint256[]', 'address[]'], [liquidityToAdd, sortedAddresses])

      const joinPoolRequest = {
        assets: sortedAddresses,
        // https://dev.balancer.fi/resources/joins-and-exits/pool-joins#maxamountsin
        // maxAmountsIn: [ethers.utils.parseUnits('10000000'), ethers.utils.parseUnits('10000000')],
        maxAmountsIn: [liquidityToAdd[0], liquidityToAdd[1]],
        userData: payload,
        fromInternalBalance: false,
      }
      await expect(testEnv.vault.joinPool(poolId, adminAddress, adminAddress, joinPoolRequest))
        .to.emit(testEnv.fxPool, 'OnJoinPool')
        .withArgs(poolId, viewDeposit[0], [viewDeposit[1][0], viewDeposit[1][1]])

      const afterLpBalance = await testEnv.fxPool.balanceOf(adminAddress)
      const afterVaultfxPhpBalance = await testEnv.fxPHP.balanceOf(testEnv.vault.address)
      const afterVaultUsdcBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)

      expect(afterLpBalance, 'Current LP Balance not expected').to.be.equals(beforeLpBalance.add(viewDeposit[0]))
      expect(afterVaultfxPhpBalance, 'Current fxPHP Balance not expected').to.be.equals(
        beforeVaultfxPhpBalance.add(viewDeposit[1][0])
      )
      expect(afterVaultUsdcBalance, 'Current USDC Balance not expected').to.be.equals(
        beforeVaultUsdcBalance.add(viewDeposit[1][1])
      )
    }
  })

  it('Removes Liquidity from the FXPool via the Vault which triggers the onExit hook', async () => {
    // remove amount per iteration roughly 1,000 USD or ~25k PHP and ~500k USDC
    const hlptTokenAmountInNumber = 1000
    const hlpTokenAmountInEther = hlptTokenAmountInNumber.toString()
    const hlpTokensToBurninWei = parseEther(hlpTokenAmountInEther)

    for (var i = 1; i < loopCount + 1; i++) {
      console.log('Withdraw #', i, ' with total withdraw amount ', hlptTokenAmountInNumber * i)
      const beforeLpBalance = await testEnv.fxPool.balanceOf(adminAddress)
      const beforeVaultfxPhpBalance = await testEnv.fxPHP.balanceOf(testEnv.vault.address)
      const beforeVaultUsdcBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)

      const withdrawTokensOut = await testEnv.fxPool.viewWithdraw(hlpTokensToBurninWei)

      const payload = ethers.utils.defaultAbiCoder.encode(
        ['uint256', 'address[]'],
        [parseUnits(hlpTokenAmountInEther), sortedAddresses]
      )
      const exitPoolRequest = {
        assets: sortedAddresses,
        minAmountsOut: [0, 0], // check token out
        userData: payload,
        toInternalBalance: false,
      }

      await expect(testEnv.vault.exitPool(poolId, adminAddress, adminAddress, exitPoolRequest))
        .to.emit(testEnv.fxPool, 'OnExitPool')
        .withArgs(poolId, hlpTokensToBurninWei, [withdrawTokensOut[0], withdrawTokensOut[1]])

      const afterLpBalance = await testEnv.fxPool.balanceOf(adminAddress)
      const afterVaultfxPhpBalance = await testEnv.fxPHP.balanceOf(testEnv.vault.address)
      const afterVaultUsdcBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)

      expect(afterLpBalance, 'Current LP Balance not expected').to.be.equals(beforeLpBalance.sub(hlpTokensToBurninWei))
      expect(afterVaultfxPhpBalance, 'Current fxPHP Balance not expected').to.be.equals(
        beforeVaultfxPhpBalance.sub(withdrawTokensOut[0])
      )
      expect(afterVaultUsdcBalance, 'Current USDC Balance not expected').to.be.equals(
        beforeVaultUsdcBalance.sub(withdrawTokensOut[1])
      )
    }
  })

  it('Checks liquidity in the FXPool', async () => {
    // const THRESHOLD = BigNumber.from(0.5)
    // expectedLiquidity = prior numeraire balance
    // actualLiquidity = test.env.vault.liquidity()
    const liquidity = (await testEnv.fxPool.liquidity())[0]
    console.log('liquidity number', await ethers.utils.formatEther(liquidity))
    console.log('liquidity BigNumber', liquidity.toString())
    // await expect(liquidity, 'unexpected liquidity() result')
    //   .to.be.greaterThan(BigNumber.from(10000))
    //   .lessThan(BigNumber.from(10001))
  })

  it('Origin to Target: User batch swaps token A (USDC) for token B (fxPHP) calling the vault and triggering the onSwap hook', async () => {
    // VAULT INDEX: index 0: USDC, index 1: fxPHP, switch this around to reverse the swap
    const ASSET_IN_INDEX = 0
    const ASSET_OUT_INDEX = 1

    // SwapKind is an Enum. This example handles a GIVEN_IN swap.
    // https://github.com/balancer-labs/balancer-v2-monorepo/blob/0328ed575c1b36fb0ad61ab8ce848083543070b9/pkg/vault/contracts/interfaces/IVault.sol#L497
    // 0 = GIVEN_IN, 1 = GIVEN_OUT
    const SWAP_KIND = 0

    const beforeTradeUserUsdcBalance = await testEnv.USDC.balanceOf(adminAddress)
    const beforeTradeUserfxPHPBalance = await testEnv.fxPHP.balanceOf(adminAddress)
    const beforeTradefxPHPPoolBalance = await testEnv.fxPHP.balanceOf(testEnv.vault.address)
    const beforeTradeUSDCPoolBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)

    console.log('beforeTradeUserUsdcBalance: ', beforeTradeUserUsdcBalance)
    console.log('beforeTradeUserfxPHPBalance: ', beforeTradeUserfxPHPBalance)
    console.log('beforeTradefxPHPPoolBalance: ', beforeTradefxPHPPoolBalance)
    console.log('beforeTradeUSDCPoolBalance: ', beforeTradeUSDCPoolBalance)

    const usdcAmountToSwapInEther = 100
    const usdcDecimals = 6

    const fund_settings = {
      sender: ethers.utils.getAddress(adminAddress),
      recipient: ethers.utils.getAddress(adminAddress),
      fromInternalBalance: false,
      toInternalBalance: false,
    }

    const fxPHPAddress = await testEnv.fxPHP.address
    console.log('fxPHP Address: ', fxPHPAddress)
    const usdcAddress = await testEnv.USDC.address
    console.log('usdc Address: ', usdcAddress)

    const fund_struct: types.SwapFundStructForVault = {
      sender: ethers.utils.getAddress(fund_settings['sender']),
      fromInternalBalance: fund_settings['fromInternalBalance'],
      recipient: ethers.utils.getAddress(fund_settings['recipient']),
      toInternalBalance: fund_settings['toInternalBalance'],
    }
    console.log('fund_struct: ', fund_struct)

    const swaps: types.BatchSwapDataForVault[] = [
      {
        poolId: poolId as BytesLike,
        assetInIndex: BigNumber.from(ASSET_IN_INDEX), // assetInIndex must match swapAssets ordering, in this case usdc is origin
        assetOutIndex: BigNumber.from(ASSET_OUT_INDEX), // assetOutIndex must match swapAssets ordering, in this case fxPHP is target
        amount: usdcAmountToSwapInEther,
        userData: '0x' as BytesLike,
      },
    ]
    console.log('swaps: ', swaps)

    // the ordering of this array must match the SwapDataForVault.assetInIndex and SwapDataForVault.assetOutIndex
    const swapAssets: string[] = [usdcAddress, fxPHPAddress]
    console.log('swapAssets: ', swapAssets)
    const limits = [parseUnits('999999999', usdcDecimals), parseUnits('999999999')]
    const deadline = ethers.constants.MaxUint256

    //dev.balancer.fi/guides/swaps/batch-swaps
    await testEnv.vault.batchSwap(SWAP_KIND, swaps, swapAssets, fund_struct, limits, deadline)

    const afterTradeUserUsdcBalance = await testEnv.USDC.balanceOf(adminAddress)
    const afterTradeUserfxPHPBalance = await testEnv.fxPHP.balanceOf(adminAddress)
    const afterTradefxPHPPoolBalance = await testEnv.fxPHP.balanceOf(testEnv.vault.address)
    const afterTradeUSDCPoolBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)

    // initial asserts, to be improved
    expect(beforeTradeUserfxPHPBalance, 'Unexpected fxPHP User Balance').to.be.lt(afterTradeUserfxPHPBalance)
    expect(beforeTradeUserUsdcBalance, 'Unexpected USDC User Balance').to.be.gt(afterTradeUserUsdcBalance)
    expect(beforeTradefxPHPPoolBalance, 'Unexpected fxPHP Vault Balance').to.be.gt(afterTradefxPHPPoolBalance)
    expect(beforeTradeUSDCPoolBalance, 'Unexpected USDC Vault Balance').to.be.lt(afterTradeUSDCPoolBalance)
  })
  it('Target to Origin: User batch swaps token A (USDC) for token B (fxPHP) calling the vault and triggering the onSwap hook', async () => {
    // VAULT INDEX: index 0: USDC, index 1: fxPHP, switch this around to reverse the swap
    const ASSET_IN_INDEX = 0
    const ASSET_OUT_INDEX = 1

    // SwapKind is an Enum. This example handles a GIVEN_IN swap.
    // https://github.com/balancer-labs/balancer-v2-monorepo/blob/0328ed575c1b36fb0ad61ab8ce848083543070b9/pkg/vault/contracts/interfaces/IVault.sol#L497
    // 0 = GIVEN_IN, 1 = GIVEN_OUT
    const SWAP_KIND = 1

    const beforeTradeUserUsdcBalance = await testEnv.USDC.balanceOf(adminAddress)
    const beforeTradeUserfxPHPBalance = await testEnv.fxPHP.balanceOf(adminAddress)
    const beforeTradefxPHPPoolBalance = await testEnv.fxPHP.balanceOf(testEnv.vault.address)
    const beforeTradeUSDCPoolBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)

    console.log('beforeTradeUserUsdcBalance: ', beforeTradeUserUsdcBalance)
    console.log('beforeTradeUserfxPHPBalance: ', beforeTradeUserfxPHPBalance)
    console.log('beforeTradefxPHPPoolBalance: ', beforeTradefxPHPPoolBalance)
    console.log('beforeTradeUSDCPoolBalance: ', beforeTradeUSDCPoolBalance)

    const fxPHPAmountToSwapInEther = 5000
    const fxPHPDecimals = 18

    const fund_settings = {
      sender: ethers.utils.getAddress(adminAddress),
      recipient: ethers.utils.getAddress(adminAddress),
      fromInternalBalance: false,
      toInternalBalance: false,
    }

    const fxPHPAddress = await testEnv.fxPHP.address
    console.log('fxPHP Address: ', fxPHPAddress)
    const usdcAddress = await testEnv.USDC.address
    console.log('usdc Address: ', usdcAddress)

    const fund_struct: types.SwapFundStructForVault = {
      sender: ethers.utils.getAddress(fund_settings['sender']),
      fromInternalBalance: fund_settings['fromInternalBalance'],
      recipient: ethers.utils.getAddress(fund_settings['recipient']),
      toInternalBalance: fund_settings['toInternalBalance'],
    }
    console.log('fund_struct: ', fund_struct)

    const swaps: types.BatchSwapDataForVault[] = [
      {
        poolId: poolId as BytesLike,
        assetInIndex: BigNumber.from(ASSET_IN_INDEX), // assetInIndex must match swapAssets ordering, in this case usdc is origin
        assetOutIndex: BigNumber.from(ASSET_OUT_INDEX), // assetOutIndex must match swapAssets ordering, in this case fxPHP is target
        amount: fxPHPAmountToSwapInEther,
        userData: '0x' as BytesLike,
      },
    ]
    console.log('swaps: ', swaps)

    // the ordering of this array must match the SwapDataForVault.assetInIndex and SwapDataForVault.assetOutIndex
    const swapAssets: string[] = [usdcAddress, fxPHPAddress]
    console.log('swapAssets: ', swapAssets)
    const limits = [parseUnits('999999999', fxPHPDecimals), parseUnits('999999999')]
    const deadline = ethers.constants.MaxUint256

    //dev.balancer.fi/guides/swaps/batch-swaps
    await testEnv.vault.batchSwap(SWAP_KIND, swaps, swapAssets, fund_struct, limits, deadline)

    const afterTradeUserUsdcBalance = await testEnv.USDC.balanceOf(adminAddress)
    const afterTradeUserfxPHPBalance = await testEnv.fxPHP.balanceOf(adminAddress)
    const afterTradefxPHPPoolBalance = await testEnv.fxPHP.balanceOf(testEnv.vault.address)
    const afterTradeUSDCPoolBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)

    // initial asserts, to be improved
    expect(beforeTradeUserfxPHPBalance, 'Unexpected fxPHP User Balance').to.be.lt(afterTradeUserfxPHPBalance)
    expect(beforeTradeUserUsdcBalance, 'Unexpected USDC User Balance').to.be.gt(afterTradeUserUsdcBalance)
    expect(beforeTradefxPHPPoolBalance, 'Unexpected fxPHP Vault Balance').to.be.gt(afterTradefxPHPPoolBalance)
    expect(beforeTradeUSDCPoolBalance, 'Unexpected USDC Vault Balance').to.be.lt(afterTradeUSDCPoolBalance)
  })
  it.skip('Origin to Target: User batch swaps token A (fxPHP) for token B (USDC) calling the vault and triggering the onSwap hook', async () => {
    // VAULT INDEX: index 1: fxPHP, index 0: USDC
    // swap these values if you want to reverse the order of tokens, ie swap USDC for fxPHP instead of the current fxPHP for USDC
    const ASSET_IN_INDEX = 1
    const ASSET_OUT_INDEX = 0

    // SwapKind is an Enum. This example handles a GIVEN_IN swap.
    // https://github.com/balancer-labs/balancer-v2-monorepo/blob/0328ed575c1b36fb0ad61ab8ce848083543070b9/pkg/vault/contracts/interfaces/IVault.sol#L497
    // 0 = GIVEN_IN, 1 = GIVEN_OUT
    const SWAP_KIND = 0

    const beforeTradeUserUsdcBalance = await testEnv.USDC.balanceOf(adminAddress)
    const beforeTradeUserfxPHPBalance = await testEnv.fxPHP.balanceOf(adminAddress)
    const beforeTradefxPHPPoolBalance = await testEnv.fxPHP.balanceOf(testEnv.vault.address)
    const beforeTradeUSDCPoolBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)

    console.log('beforeTradeUserUsdcBalance: ', beforeTradeUserUsdcBalance)
    console.log('beforeTradeUserfxPHPBalance: ', beforeTradeUserfxPHPBalance)
    console.log('beforeTradefxPHPPoolBalance: ', beforeTradefxPHPPoolBalance)
    console.log('beforeTradeUSDCPoolBalance: ', beforeTradeUSDCPoolBalance)

    const fxPHPAmountToSwapInEther = 5000
    const fxPHPDecimals = 18

    const fund_settings = {
      sender: ethers.utils.getAddress(adminAddress),
      recipient: ethers.utils.getAddress(adminAddress),
      fromInternalBalance: false,
      toInternalBalance: false,
    }

    const fxPHPAddress = await testEnv.fxPHP.address
    console.log('fxPHP Address: ', fxPHPAddress)
    const usdcAddress = await testEnv.USDC.address
    console.log('usdc Address: ', usdcAddress)

    const fund_struct: types.SwapFundStructForVault = {
      sender: ethers.utils.getAddress(fund_settings['sender']),
      fromInternalBalance: fund_settings['fromInternalBalance'],
      recipient: ethers.utils.getAddress(fund_settings['recipient']),
      toInternalBalance: fund_settings['toInternalBalance'],
    }
    console.log('fund_struct: ', fund_struct)

    const swaps: types.BatchSwapDataForVault[] = [
      {
        poolId: poolId as BytesLike,
        assetInIndex: BigNumber.from(ASSET_IN_INDEX), // assetInIndex must match swapAssets ordering, in this case usdc is origin
        assetOutIndex: BigNumber.from(ASSET_OUT_INDEX), // assetOutIndex must match swapAssets ordering, in this case fxPHP is target
        amount: fxPHPAmountToSwapInEther,
        userData: '0x' as BytesLike,
      },
    ]
    console.log('swaps: ', swaps)

    // the ordering of this array must match the SwapDataForVault.assetInIndex and SwapDataForVault.assetOutIndex
    const swapAssets: string[] = [usdcAddress, fxPHPAddress]
    console.log('swapAssets: ', swapAssets)
    const limits = [parseUnits('999999999', fxPHPDecimals), parseUnits('999999999')]
    const deadline = ethers.constants.MaxUint256

    //dev.balancer.fi/guides/swaps/batch-swaps
    await testEnv.vault.batchSwap(SWAP_KIND, swaps, swapAssets, fund_struct, limits, deadline)

    const afterTradeUserUsdcBalance = await testEnv.USDC.balanceOf(adminAddress)
    const afterTradeUserfxPHPBalance = await testEnv.fxPHP.balanceOf(adminAddress)
    const afterTradefxPHPPoolBalance = await testEnv.fxPHP.balanceOf(testEnv.vault.address)
    const afterTradeUSDCPoolBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)

    // initial asserts, to be improved
    expect(beforeTradeUserfxPHPBalance, 'Unexpected fxPHP User Balance').to.be.gt(afterTradeUserfxPHPBalance)
    expect(beforeTradeUserUsdcBalance, 'Unexpected USDC User Balance').to.be.lt(afterTradeUserUsdcBalance)
    expect(beforeTradefxPHPPoolBalance, 'Unexpected fxPHP Vault Balance').to.be.lt(afterTradefxPHPPoolBalance)
    expect(beforeTradeUSDCPoolBalance, 'Unexpected USDC Vault Balance').to.be.gt(afterTradeUSDCPoolBalance)
  })
  it('Origin to Target: User single swaps token A (USDC) for token B (fxPHP) calling the vault and triggering onSwap hook', async () => {
    // VAULT INDEX: index 0: USDC, index 1: fxPHP
    const beforeTradeUserUsdcBalance = await testEnv.USDC.balanceOf(adminAddress)
    const beforeTradeUserfxPHPBalance = await testEnv.fxPHP.balanceOf(adminAddress)
    const beforeTradefxPHPPoolBalance = await testEnv.fxPHP.balanceOf(testEnv.vault.address)
    const beforeTradeUSDCPoolBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)
    console.log('beforeTradeUserUsdcBalance: ', beforeTradeUserUsdcBalance)
    console.log('beforeTradeUserfxPHPBalance: ', beforeTradeUserfxPHPBalance)
    console.log('beforeTradefxPHPPoolBalance: ', beforeTradefxPHPPoolBalance)
    console.log('beforeTradeUSDCPoolBalance: ', beforeTradeUSDCPoolBalance)

    const deadline = ethers.constants.MaxUint256

    const usdcAmountToSwapInEther = 1000
    const usdcDecimals = 6
    const usdcAmountToSwapInWei = parseUnits(usdcAmountToSwapInEther.toString(), usdcDecimals)

    const fund_settings = {
      sender: ethers.utils.getAddress(adminAddress),
      recipient: ethers.utils.getAddress(adminAddress),
      fromInternalBalance: false,
      toInternalBalance: false,
    }

    const fxPHPAddress = await testEnv.fxPHP.address
    console.log('fxPHP Address: ', fxPHPAddress)
    const usdcAddress = await testEnv.USDC.address
    console.log('usdc Address: ', usdcAddress)

    // // SwapKind is an Enum. This example handles a GIVEN_IN swap.
    // // https://github.com/balancer-labs/balancer-v2-monorepo/blob/0328ed575c1b36fb0ad61ab8ce848083543070b9/pkg/vault/contracts/interfaces/IVault.sol#L497
    // // 0 = GIVEN_IN, 1 = GIVEN_OUT
    const swap_kind = 0

    const fund_struct: types.SwapFundStructForVault = {
      sender: ethers.utils.getAddress(fund_settings['sender']),
      fromInternalBalance: fund_settings['fromInternalBalance'],
      recipient: ethers.utils.getAddress(fund_settings['recipient']),
      toInternalBalance: fund_settings['toInternalBalance'],
    }
    console.log('fund_struct: ', fund_struct)

    const singleSwap: types.SingleSwapDataForVault[] = [
      {
        poolId: poolId as BytesLike,
        kind: BigNumber.from(swap_kind),
        assetIn: usdcAddress, // assetIn must match swap assets ordering, in this case usdc is origin
        assetOut: fxPHPAddress, // assetOut must match swap assets ordering, in this case fxPHP is target
        amount: usdcAmountToSwapInWei,
        userData: '0x' as BytesLike,
      },
    ]
    console.log('singleSwap: ', singleSwap)

    const limit = parseUnits('999999999', usdcDecimals)
    await testEnv.vault.swap(singleSwap[0], fund_struct, limit, deadline)

    const afterTradeUserUsdcBalance = await testEnv.USDC.balanceOf(adminAddress)
    const afterTradeUserfxPHPBalance = await testEnv.fxPHP.balanceOf(adminAddress)
    const afterTradefxPHPPoolBalance = await testEnv.fxPHP.balanceOf(testEnv.vault.address)
    const afterTradeUSDCPoolBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)
    console.log('afterTradeUserUsdcBalance: ', afterTradeUserUsdcBalance)
    console.log('afterTradeUserfxPHPBalance: ', afterTradeUserfxPHPBalance)
    console.log('afterTradefxPHPPoolBalance: ', afterTradefxPHPPoolBalance)
    console.log('afterTradeUSDCPoolBalance: ', afterTradeUSDCPoolBalance)

    expect(beforeTradeUserfxPHPBalance, 'Unexpected fxPHP User Balance').to.be.lt(afterTradeUserfxPHPBalance)
    expect(beforeTradeUserUsdcBalance, 'Unexpected USDC User Balance').to.be.gt(afterTradeUserUsdcBalance)
    expect(beforeTradefxPHPPoolBalance, 'Unexpected fxPHP Vault Balance').to.be.gt(afterTradefxPHPPoolBalance)
    expect(beforeTradeUSDCPoolBalance, 'Unexpected USDC Vault Balance').to.be.lt(afterTradeUSDCPoolBalance)
  })
  it.skip('Origin to Target: User single swaps token A (fxPHP) and token B (USDC) calling the vault and triggering onSwap hook', async () => {
    // VAULT INDEX: index 1: USDC, index 0: fxPHP
    const beforeTradeUserUsdcBalance = await testEnv.USDC.balanceOf(adminAddress)
    const beforeTradeUserfxPHPBalance = await testEnv.fxPHP.balanceOf(adminAddress)
    const beforeTradefxPHPPoolBalance = await testEnv.fxPHP.balanceOf(testEnv.vault.address)
    const beforeTradeUSDCPoolBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)
    console.log('beforeTradeUserUsdcBalance: ', beforeTradeUserUsdcBalance)
    console.log('beforeTradeUserfxPHPBalance: ', beforeTradeUserfxPHPBalance)
    console.log('beforeTradefxPHPPoolBalance: ', beforeTradefxPHPPoolBalance)
    console.log('beforeTradeUSDCPoolBalance: ', beforeTradeUSDCPoolBalance)

    const deadline = ethers.constants.MaxUint256

    const fxPHPAmountToSwapInEther = 1000
    const fxPHPDecimals = 18
    const fxPHPAmountToSwapInWei = parseUnits(fxPHPAmountToSwapInEther.toString(), fxPHPDecimals)

    const fund_settings = {
      sender: ethers.utils.getAddress(adminAddress),
      recipient: ethers.utils.getAddress(adminAddress),
      fromInternalBalance: false,
      toInternalBalance: false,
    }

    const fxPHPAddress = await testEnv.fxPHP.address
    console.log('fxPHP Address: ', fxPHPAddress)
    const usdcAddress = await testEnv.USDC.address
    console.log('usdc Address: ', usdcAddress)

    // // SwapKind is an Enum. This example handles a GIVEN_IN swap.
    // // https://github.com/balancer-labs/balancer-v2-monorepo/blob/0328ed575c1b36fb0ad61ab8ce848083543070b9/pkg/vault/contracts/interfaces/IVault.sol#L497
    // // 0 = GIVEN_IN, 1 = GIVEN_OUT
    const SWAP_KIND = 0

    const fund_struct: types.SwapFundStructForVault = {
      sender: ethers.utils.getAddress(fund_settings['sender']),
      fromInternalBalance: fund_settings['fromInternalBalance'],
      recipient: ethers.utils.getAddress(fund_settings['recipient']),
      toInternalBalance: fund_settings['toInternalBalance'],
    }
    console.log('fund_struct: ', fund_struct)

    const singleSwap: types.SingleSwapDataForVault[] = [
      {
        poolId: poolId as BytesLike,
        kind: BigNumber.from(SWAP_KIND),
        assetIn: fxPHPAddress, // assetIn must match swap assets ordering, in this case usdc is origin
        assetOut: usdcAddress, // assetOut must match swap assets ordering, in this case fxPHP is target
        amount: fxPHPAmountToSwapInWei,
        userData: '0x' as BytesLike,
      },
    ]
    console.log('singleSwap: ', singleSwap)

    const limit = parseUnits('999999999', fxPHPDecimals)
    await testEnv.vault.swap(singleSwap[0], fund_struct, limit, deadline)

    const afterTradeUserUsdcBalance = await testEnv.USDC.balanceOf(adminAddress)
    const afterTradeUserfxPHPBalance = await testEnv.fxPHP.balanceOf(adminAddress)
    const afterTradefxPHPPoolBalance = await testEnv.fxPHP.balanceOf(testEnv.vault.address)
    const afterTradeUSDCPoolBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)
    console.log('afterTradeUserUsdcBalance: ', afterTradeUserUsdcBalance)
    console.log('afterTradeUserfxPHPBalance: ', afterTradeUserfxPHPBalance)
    console.log('afterTradefxPHPPoolBalance: ', afterTradefxPHPPoolBalance)
    console.log('afterTradeUSDCPoolBalance: ', afterTradeUSDCPoolBalance)

    expect(beforeTradeUserfxPHPBalance, 'Unexpected fxPHP User Balance').to.be.gt(afterTradeUserfxPHPBalance)
    expect(beforeTradeUserUsdcBalance, 'Unexpected USDC User Balance').to.be.lt(afterTradeUserUsdcBalance)
    expect(beforeTradefxPHPPoolBalance, 'Unexpected fxPHP Vault Balance').to.be.lt(afterTradefxPHPPoolBalance)
    expect(beforeTradeUSDCPoolBalance, 'Unexpected USDC Vault Balance').to.be.gt(afterTradeUSDCPoolBalance)
  })

  // it('Previews swap caclculation from the onSwap hook', async () => {})
  // it('Previews swap caclculation when providing single sided liquidity from the onJoin and onExit hook', async () => {})

  it('can pause pool', async () => {
    expect(await testEnv.fxPool.paused()).to.be.equals(false)

    await expect(testEnv.fxPool.setPause(true)).to.emit(testEnv.fxPool, 'Paused').withArgs(adminAddress)

    expect(await testEnv.fxPool.paused()).to.be.equals(true)

    await expect(testEnv.fxPool.connect(notOwner).setPause(false)).to.be.revertedWith(CONTRACT_REVERT.Ownable)

    await expect(testEnv.fxPool.setPause(false)).to.emit(testEnv.fxPool, 'Unpaused').withArgs(adminAddress) // reset for now, test if pool functions can still be used when paused
  })

  it('can trigger emergency alarm', async () => {
    expect(await testEnv.fxPool.emergency()).to.be.equals(false)
    expect(await testEnv.fxPool.setEmergency(true))
      .to.emit(testEnv.fxPool, 'EmergencyAlarm')
      .withArgs(true)

    await expect(
      testEnv.fxPool.connect(notOwner).setEmergency(false),
      'Non owner can call the function'
    ).to.be.revertedWith(CONTRACT_REVERT.Ownable)

    expect(await testEnv.fxPool.setEmergency(false))
      .to.emit(testEnv.fxPool, 'EmergencyAlarm')
      .withArgs(false) // reset for now, test emergency withdraw
  })
  it('can set cap when owner', async () => {
    const curveDetails = await testEnv.fxPool.curve()

    expect(curveDetails.cap).to.be.equals(0)
    await testEnv.fxPool.setCap(NEW_CAP)
    const newCurveDetails = await testEnv.fxPool.curve()
    expect(newCurveDetails.cap).to.be.equals(NEW_CAP)

    await expect(
      testEnv.fxPool.connect(notOwner).setCap(NEW_CAP_FAIL),
      'Non owner can call the function'
    ).to.be.revertedWith(CONTRACT_REVERT.Ownable)
  })
})
