import { expect } from 'chai'
import { ethers } from 'hardhat'
import { Signer } from 'ethers'
import { setupEnvironment, TestEnv } from '../common/setupEnvironment'
import { parseEther, parseUnits } from '@ethersproject/units'
import { mockToken } from '../constants/mockTokenList'
import { sortAddresses } from '../../scripts/utils/sortAddresses'
import * as swaps from '../common/helpers/swap'
import { FXPool } from '../../typechain/FXPool'
import { fxPHPUSDCFxPool } from '../constants/mockPoolList'
import { getFxPoolContract } from '../common/contractGetters'

describe('FXPool Tests', () => {
  let testEnv: TestEnv
  let admin: Signer
  let notOwner: Signer
  let fxPool: FXPool
  let fxPoolAddress: string
  let adminAddress: string
  let poolId: string

  let fxPHPAssimilatorAddress: string
  let usdcAssimilatorAddress: string
  let sortedAddresses: string[]

  const ALPHA = parseUnits('0.8')
  const BETA = parseUnits('0.5')
  const MAX = parseUnits('0.15')
  const EPSILON = parseUnits('0.0004')
  const LAMBDA = parseUnits('0.3')
  const baseWeight = parseUnits('0.5')
  const quoteWeight = parseUnits('0.5')

  const log = true // do console logging
  const usdcDecimals = mockToken[0].decimal
  const fxPHPDecimals = mockToken[3].decimal

  before('build test env', async () => {
    testEnv = await setupEnvironment()
    ;[admin, notOwner] = await ethers.getSigners()
    adminAddress = await admin.getAddress()

    // Step 1 - deploy assimilators
    await testEnv.assimilatorFactory.newBaseAssimilator(
      testEnv.fxPHP.address,
      parseUnits('1', `${mockToken[3].decimal}`),
      testEnv.fxPHPOracle.address
    )

    // Step 2 - getAssimilators
    fxPHPAssimilatorAddress = await testEnv.assimilatorFactory.getAssimilator(testEnv.fxPHP.address)
    usdcAssimilatorAddress = await testEnv.assimilatorFactory.usdcAssimilator()

    // Step 3 - sortedAddress references
    sortedAddresses = sortAddresses([testEnv.fxPHP.address, testEnv.USDC.address])

    // Step 4 - create a new pool from the FXPool

    // CREATE POOL START //
    await testEnv.fxPoolFactory.newFXPool(
      fxPHPUSDCFxPool.name, // change
      fxPHPUSDCFxPool.symbol, // change
      fxPHPUSDCFxPool.percentFee, // change
      testEnv.vault.address,
      sortedAddresses
    )

    // make another sorted address for new pools, refer to step 3
    fxPoolAddress = await testEnv.fxPoolFactory.getActiveFxPool(sortedAddresses)

    fxPool = await getFxPoolContract(fxPoolAddress, testEnv.proportionalLiquidity.address, testEnv.fxSwaps.address)
    poolId = await fxPool.getPoolId() // get balance poolId
    await fxPool.setCollectorAddress(adminAddress)

    const poolInfoFromVault = await testEnv.vault.getPool(poolId)

    expect(await fxPool.getVault(), 'Vault in FXPool is different from the test environment vault').to.be.equals(
      await testEnv.vault.address
    )

    expect(poolInfoFromVault[0], 'FXpool is not registered in the vault').to.be.equals(fxPool.address)

    await fxPool.initialize(
      [
        testEnv.fxPHP.address, // change
        fxPHPAssimilatorAddress, // change
        testEnv.fxPHP.address, // change
        fxPHPAssimilatorAddress, // change
        testEnv.fxPHP.address, // change
        testEnv.USDC.address,
        usdcAssimilatorAddress,
        testEnv.USDC.address,
        usdcAssimilatorAddress,
        testEnv.USDC.address,
      ],
      [baseWeight, quoteWeight]
    )

    await expect(fxPool.setParams(ALPHA, BETA, MAX, EPSILON, LAMBDA)).to.emit(fxPool, 'ParametersSet')
    // CREATE POOL STOP //
  })

  it('Adds liquidity to the FXPool via the Vault which triggers the onJoin hook', async () => {
    await testEnv.fxPHP.approve(testEnv.vault.address, ethers.constants.MaxUint256)
    await testEnv.USDC.approve(testEnv.vault.address, ethers.constants.MaxUint256)

    // TODO: Change value for adding liquidity, add more numeraire values
    const baseAmountsIn = ['1000', '2000', '10000', '3333333']

    for (var i = 0; i < baseAmountsIn.length; i++) {
      const beforeLpBalance = await fxPool.balanceOf(adminAddress)

      const beforeVaultfxPhpBalance = await testEnv.fxPHP.balanceOf(testEnv.vault.address)
      const beforeVaultUsdcBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)

      const numeraireAmount = baseAmountsIn[i]

      const payload = ethers.utils.defaultAbiCoder.encode(
        ['uint256', 'address[]'],
        [parseEther(numeraireAmount), sortedAddresses]
      )

      const depositDetails = await fxPool.viewDeposit(payload)

      const maxAmountsIn = [ethers.constants.MaxUint256, ethers.constants.MaxUint256]

      const joinPoolRequest = {
        assets: sortedAddresses,
        maxAmountsIn,
        userData: payload,
        fromInternalBalance: false,
      }
      await expect(testEnv.vault.joinPool(poolId, adminAddress, adminAddress, joinPoolRequest))
        .to.emit(fxPool, 'OnJoinPool')
        .withArgs(poolId, depositDetails[0], [depositDetails[1][0], depositDetails[1][1]])

      const afterLpBalance = await fxPool.balanceOf(adminAddress)
      const afterVaultfxPhpBalance = await testEnv.fxPHP.balanceOf(testEnv.vault.address)
      const afterVaultUsdcBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)

      expect(afterLpBalance, 'Current LP Balance not expected').to.be.equals(beforeLpBalance.add(depositDetails[0]))
      expect(afterVaultfxPhpBalance, 'Current fxPHP Balance not expected').to.be.equals(
        beforeVaultfxPhpBalance.add(depositDetails[1][0])
      )
      expect(afterVaultUsdcBalance, 'Current USDC Balance not expected').to.be.equals(
        beforeVaultUsdcBalance.add(depositDetails[1][1])
      )
    }
  })

  it('Removes Liquidity from the FXPool via the Vault which triggers the onExit hook', async () => {
    // TODO: Change value for removing liquidity, add more token
    const loopCount = 1 // how many loops will trigger the token in amount below
    const hlptTokenAmountInNumber = 1000
    const hlpTokenAmountInEther = hlptTokenAmountInNumber.toString()
    const hlpTokensToBurninWei = parseEther(hlpTokenAmountInEther)

    for (var i = 1; i < loopCount + 1; i++) {
      console.log('Withdraw #', i, ' with total withdraw amount ', hlptTokenAmountInNumber * i)
      const beforeLpBalance = await fxPool.balanceOf(adminAddress)
      const beforeVaultfxPhpBalance = await testEnv.fxPHP.balanceOf(testEnv.vault.address)
      const beforeVaultUsdcBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)

      const withdrawTokensOut = await fxPool.viewWithdraw(hlpTokensToBurninWei)

      console.log(`Tokens out [0]: ${withdrawTokensOut[0]}`)
      console.log(`Tokens out [1]: ${withdrawTokensOut[1]}`)

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
        .to.emit(fxPool, 'OnExitPool')
        .withArgs(poolId, hlpTokensToBurninWei, [withdrawTokensOut[0], withdrawTokensOut[1]])

      const afterLpBalance = await fxPool.balanceOf(adminAddress)
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

  // SINGLE SWAP

  it('originSwap: User single swaps token A (USDC) for token B (fxPHP) calling the vault and triggering onSwap hook', async () => {
    const beforeTradeUserUsdcBalance = await testEnv.USDC.balanceOf(adminAddress)
    const beforeTradeUserfxPHPBalance = await testEnv.fxPHP.balanceOf(adminAddress)
    const beforeTradefxPHPPoolBalance = await testEnv.fxPHP.balanceOf(testEnv.vault.address)
    const beforeTradeUSDCPoolBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)

    // TODO: Change value for swap
    const usdcAmountToSwapInEther = 1000

    const fxPHPAddress = await testEnv.fxPHP.address
    console.log('fxPHP Address: ', fxPHPAddress)
    const usdcAddress = await testEnv.USDC.address
    console.log('usdc Address: ', usdcAddress)

    await swaps.buildExecute_SingleSwapGivenIn(
      usdcAddress,
      fxPHPAddress,
      usdcAmountToSwapInEther,
      usdcDecimals,
      adminAddress,
      adminAddress, // the account swapping should get the output tokens
      fxPool,
      testEnv,
      log
    )

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

  it('originSwap: User single swaps token A (fxPHP) and token B (USDC) calling the vault and triggering onSwap hook', async () => {
    const beforeTradeUserUsdcBalance = await testEnv.USDC.balanceOf(adminAddress)
    const beforeTradeUserfxPHPBalance = await testEnv.fxPHP.balanceOf(adminAddress)
    const beforeTradefxPHPPoolBalance = await testEnv.fxPHP.balanceOf(testEnv.vault.address)
    const beforeTradeUSDCPoolBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)

    // TODO: Change value for swap
    const fxPHPAmountToSwapInEther = 1000
    const fxPHPDecimals = 18

    const fxPHPAddress = await testEnv.fxPHP.address
    console.log('fxPHP Address: ', fxPHPAddress)
    const usdcAddress = await testEnv.USDC.address
    console.log('usdc Address: ', usdcAddress)

    await swaps.buildExecute_SingleSwapGivenIn(
      fxPHPAddress, // fxPHP = token in
      usdcAddress, // USDC = token out
      fxPHPAmountToSwapInEther,
      fxPHPDecimals, // specify token in decimals
      adminAddress,
      adminAddress, // the account swapping should get the output tokens
      fxPool,
      testEnv,
      log
    )

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
})
