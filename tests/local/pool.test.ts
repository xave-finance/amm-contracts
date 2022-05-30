import { expect } from 'chai'
import { ethers } from 'hardhat'
import { BigNumber, BytesLike, Signer } from 'ethers'
import { setupEnvironment, TestEnv } from '../common/setupEnvironment'
import { formatUnits, parseEther, parseUnits } from '@ethersproject/units'
import { CONTRACT_REVERT } from '../constants'
import { mockToken } from '../constants/mockTokenList'
import { sortDataLikeVault, orderDataLikeFE } from '../common/helpers/sorter'
import { calculateLptOutAndTokensIn, calculateOtherTokenIn } from '../common/helpers/frontend'
import { sortAddresses } from '../../scripts/utils/sortAddresses'
import * as swaps from '../common/helpers/swap'
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

  //const NEW_CAP = parseEther('400000000')
  const NEW_CAP = parseEther('100000000')
  const NEW_CAP_FAIL = parseEther('1000')
  const SET_CAP_FAIL = parseEther('100')
  const CAP_DEPOSIT_FAIL_fxPHP = '50000000000'
  const CAP_DEPOSIT_FAIL_USDC = '250000000'
  const ALPHA = parseUnits('0.8')
  const BETA = parseUnits('0.5')
  const MAX = parseUnits('0.15')
  const EPSILON = parseUnits('0.0004')
  const LAMBDA = parseUnits('0.3')
  const baseWeight = parseUnits('0.5')
  const quoteWeight = parseUnits('0.5')

  const loopCount = 10
  const log = true // do console logging
  const usdcDecimals = mockToken[0].decimal
  const fxPHPDecimals = mockToken[3].decimal

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

    let fxPHPAddress = ethers.utils.getAddress(testEnv.fxPHP.address)

    /**
     * Scenario #1: Base (fxPHP) input
     */
    const baseAmountsIn = [
      '1000',
      '2000',
      '10000',
      '100',
      '5000',
      '100000',
      '500000',
      '1000000',
      '1000',
      '2000',
      '10000',
      '100',
      '5000',
      '100000',
      '500000',
      '1000000',
      '1000',
      '2000',
      '10000',
      '100',
      '5000',
      '100000',
      '500000',
      '1000000',
      '1000',
      '900',
      '800',
      '700',
      '600',
      '500',
      '400',
      '300',
      '200',
      '100',
    ]

    for (var i = 0; i < baseAmountsIn.length; i++) {
      const beforeLpBalance = await testEnv.fxPool.balanceOf(adminAddress)
      const beforeVaultfxPhpBalance = await testEnv.fxPHP.balanceOf(testEnv.vault.address)
      const beforeVaultUsdcBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)

      const amountIn0 = baseAmountsIn[i]

      // Frontend estimation of other token in amount
      const poolTokens = await testEnv.vault.getPoolTokens(poolId)
      const balances = orderDataLikeFE(poolTokens.tokens, fxPHPAddress, poolTokens.balances)
      const otherTokenIn = await calculateOtherTokenIn(
        amountIn0,
        0,
        balances,
        [fxPHPDecimals, usdcDecimals],
        [fxPHPAssimilatorAddress, usdcAssimilatorAddress]
      )
      const amountIn1 = formatUnits(otherTokenIn, usdcDecimals)
      console.log(`Deposit [${i}] amounts in: `, amountIn0, amountIn1)

      // Backend estimation `viewDeposit()` of LPT amount to receive + actual token ins
      const [estimatedLptAmount, estimatedAmountsIn, adjustedAmountsIn] = await calculateLptOutAndTokensIn(
        [amountIn0, amountIn1],
        [fxPHPDecimals, usdcDecimals],
        sortedAddresses,
        fxPHPAddress,
        testEnv.fxPool
      )
      console.log(`Deposit [${i}] estimated lpt amount: `, estimatedLptAmount)
      console.log(
        `Deposit [${i}] estimated amounts in: `,
        formatUnits(estimatedAmountsIn[0], fxPHPDecimals),
        formatUnits(estimatedAmountsIn[1], usdcDecimals)
      )

      // Actual deposit `joinPool()` request
      let sortedAmounts: BigNumber[] = sortDataLikeVault(sortedAddresses, fxPHPAddress, adjustedAmountsIn)

      const payload = ethers.utils.defaultAbiCoder.encode(['uint256[]', 'address[]'], [sortedAmounts, sortedAddresses])
      console.log(`Deposit [${i}] joinPool payload: `, sortedAmounts.toString(), sortedAddresses)

      const sortedAmountsIn = sortDataLikeVault(sortedAddresses, fxPHPAddress, [amountIn0, amountIn1])
      const sortedDecimals = sortDataLikeVault(sortedAddresses, fxPHPAddress, [fxPHPDecimals, usdcDecimals])
      const maxAmountsIn = [
        parseUnits(sortedAmountsIn[0], sortedDecimals[0]),
        parseUnits(sortedAmountsIn[1], sortedDecimals[1]),
      ]
      console.log(`Deposit [${i}] joinPool maxAmountsIn: `, maxAmountsIn.toString())

      const joinPoolRequest = {
        assets: sortedAddresses,
        maxAmountsIn,
        userData: payload,
        fromInternalBalance: false,
      }
      await expect(testEnv.vault.joinPool(poolId, adminAddress, adminAddress, joinPoolRequest))
        .to.emit(testEnv.fxPool, 'OnJoinPool')
        .withArgs(poolId, estimatedLptAmount, [estimatedAmountsIn[0], estimatedAmountsIn[1]])

      const afterLpBalance = await testEnv.fxPool.balanceOf(adminAddress)
      const afterVaultfxPhpBalance = await testEnv.fxPHP.balanceOf(testEnv.vault.address)
      const afterVaultUsdcBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)

      expect(afterLpBalance, 'Current LP Balance not expected').to.be.equals(beforeLpBalance.add(estimatedLptAmount))
      expect(afterVaultfxPhpBalance, 'Current fxPHP Balance not expected').to.be.equals(
        beforeVaultfxPhpBalance.add(estimatedAmountsIn[0])
      )
      expect(afterVaultUsdcBalance, 'Current USDC Balance not expected').to.be.equals(
        beforeVaultUsdcBalance.add(estimatedAmountsIn[1])
      )
    }

    /**
     * Scenario #2: Quote (USDC) input
     */
    const quoteAmountsIn = ['10', '50', '100', '1000', '500', '10000', '50000', '100000', '200000', '500000']

    for (var i = 0; i < quoteAmountsIn.length; i++) {
      const beforeLpBalance = await testEnv.fxPool.balanceOf(adminAddress)
      const beforeVaultfxPhpBalance = await testEnv.fxPHP.balanceOf(testEnv.vault.address)
      const beforeVaultUsdcBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)

      const amountIn1 = quoteAmountsIn[i]

      // Frontend estimation of other token in amount
      const poolTokens = await testEnv.vault.getPoolTokens(poolId)
      const balances = orderDataLikeFE(poolTokens.tokens, fxPHPAddress, poolTokens.balances)
      const otherTokenIn = await calculateOtherTokenIn(
        amountIn1,
        1,
        balances,
        [fxPHPDecimals, usdcDecimals],
        [fxPHPAssimilatorAddress, usdcAssimilatorAddress]
      )
      const amountIn0 = formatUnits(otherTokenIn, fxPHPDecimals)
      console.log(`Deposit [${i}] amounts in: `, amountIn0, amountIn1)

      // Backend estimation `viewDeposit()` of LPT amount to receive + actual token ins
      const [estimatedLptAmount, estimatedAmountsIn, adjustedAmountsIn] = await calculateLptOutAndTokensIn(
        [amountIn0, amountIn1],
        [fxPHPDecimals, usdcDecimals],
        sortedAddresses,
        fxPHPAddress,
        testEnv.fxPool
      )
      console.log(`Deposit [${i}] estimated lpt amount: `, estimatedLptAmount)
      console.log(
        `Deposit [${i}] estimated amounts in: `,
        formatUnits(estimatedAmountsIn[0], fxPHPDecimals),
        formatUnits(estimatedAmountsIn[1], usdcDecimals)
      )

      // Actual deposit `joinPool()` request
      let sortedAmounts: BigNumber[] = sortDataLikeVault(sortedAddresses, fxPHPAddress, adjustedAmountsIn)

      const payload = ethers.utils.defaultAbiCoder.encode(['uint256[]', 'address[]'], [sortedAmounts, sortedAddresses])
      console.log(`Deposit [${i}] joinPool payload: `, sortedAmounts.toString(), sortedAddresses)

      const sortedAmountsIn = sortDataLikeVault(sortedAddresses, fxPHPAddress, [amountIn0, amountIn1])
      const sortedDecimals = sortDataLikeVault(sortedAddresses, fxPHPAddress, [fxPHPDecimals, usdcDecimals])
      const maxAmountsIn = [
        parseUnits(sortedAmountsIn[0], sortedDecimals[0]),
        parseUnits(sortedAmountsIn[1], sortedDecimals[1]),
      ]
      console.log(`Deposit [${i}] joinPool maxAmountsIn: `, maxAmountsIn.toString())

      const joinPoolRequest = {
        assets: sortedAddresses,
        maxAmountsIn,
        userData: payload,
        fromInternalBalance: false,
      }
      await expect(testEnv.vault.joinPool(poolId, adminAddress, adminAddress, joinPoolRequest))
        .to.emit(testEnv.fxPool, 'OnJoinPool')
        .withArgs(poolId, estimatedLptAmount, [estimatedAmountsIn[0], estimatedAmountsIn[1]])

      const afterLpBalance = await testEnv.fxPool.balanceOf(adminAddress)
      const afterVaultfxPhpBalance = await testEnv.fxPHP.balanceOf(testEnv.vault.address)
      const afterVaultUsdcBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)

      expect(afterLpBalance, 'Current LP Balance not expected').to.be.equals(beforeLpBalance.add(estimatedLptAmount))
      expect(afterVaultfxPhpBalance, 'Current fxPHP Balance not expected').to.be.equals(
        beforeVaultfxPhpBalance.add(estimatedAmountsIn[0])
      )
      expect(afterVaultUsdcBalance, 'Current USDC Balance not expected').to.be.equals(
        beforeVaultUsdcBalance.add(estimatedAmountsIn[1])
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
    //  expect(await ethers.utils.formatEther(liquidity)).to.be.equals(EXPECTED_LIQUIDITY)
    // await expect(liquidity, 'unexpected liquidity() result')
    //   .to.be.greaterThan(BigNumber.from(10000))
    //   .lessThan(BigNumber.from(10001))
  })

  it('originSwap: User batch swaps token A (USDC) for token B (fxPHP) calling the vault and triggering the onSwap hook', async () => {
    const usdcAmountToSwapInEther = 1000
    const usdcDecimals = 6

    const fxPHPAddress = await testEnv.fxPHP.address
    console.log('fxPHP Address: ', fxPHPAddress)
    const usdcAddress = await testEnv.USDC.address
    console.log('usdc Address: ', usdcAddress)

    const beforeTradeUserUsdcBalance = await testEnv.USDC.balanceOf(adminAddress)
    const beforeTradeUserfxPHPBalance = await testEnv.fxPHP.balanceOf(adminAddress)
    const beforeTradefxPHPPoolBalance = await testEnv.fxPHP.balanceOf(testEnv.vault.address)
    const beforeTradeUSDCPoolBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)

    await swaps.buildExecute_BatchSwapGivenIn(
      usdcAddress,
      fxPHPAddress,
      usdcAmountToSwapInEther,
      usdcDecimals,
      adminAddress,
      adminAddress, // the account swapping should get the output tokens
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
  it('targetSwap: User batch swaps token A (USDC) for token B (fxPHP) calling the vault and triggering the onSwap hook', async () => {
    const beforeTradeUserUsdcBalance = await testEnv.USDC.balanceOf(adminAddress)
    const beforeTradeUserfxPHPBalance = await testEnv.fxPHP.balanceOf(adminAddress)
    const beforeTradefxPHPPoolBalance = await testEnv.fxPHP.balanceOf(testEnv.vault.address)
    const beforeTradeUSDCPoolBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)

    const fxPHPAmountToSwapInEther = 5000

    const fxPHPAddress = await testEnv.fxPHP.address
    console.log('fxPHP Address: ', fxPHPAddress)
    const usdcAddress = await testEnv.USDC.address
    console.log('usdc Address: ', usdcAddress)

    await swaps.buildExecute_BatchSwapGivenOut(
      usdcAddress,
      fxPHPAddress,
      fxPHPAmountToSwapInEther,
      fxPHPDecimals,
      adminAddress,
      adminAddress, // the account swapping should get the output tokens
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

  it('originSwap: User batch swaps token A (fxPHP) for token B (USDC) calling the vault and triggering the onSwap hook', async () => {
    const fxPHPAmountToSwapInEther = 1000

    const fxPHPAddress = await testEnv.fxPHP.address
    console.log('fxPHP Address: ', fxPHPAddress)
    const usdcAddress = await testEnv.USDC.address
    console.log('usdc Address: ', usdcAddress)

    const beforeTradeUserUsdcBalance = await testEnv.USDC.balanceOf(adminAddress)
    const beforeTradeUserfxPHPBalance = await testEnv.fxPHP.balanceOf(adminAddress)
    const beforeTradefxPHPPoolBalance = await testEnv.fxPHP.balanceOf(testEnv.vault.address)
    const beforeTradeUSDCPoolBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)

    await swaps.buildExecute_BatchSwapGivenIn(
      fxPHPAddress,
      usdcAddress,
      fxPHPAmountToSwapInEther,
      fxPHPDecimals,
      adminAddress,
      adminAddress, // the account swapping should get the output tokens
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
  it('originSwap: User single swaps token A (USDC) for token B (fxPHP) calling the vault and triggering onSwap hook', async () => {
    const beforeTradeUserUsdcBalance = await testEnv.USDC.balanceOf(adminAddress)
    const beforeTradeUserfxPHPBalance = await testEnv.fxPHP.balanceOf(adminAddress)
    const beforeTradefxPHPPoolBalance = await testEnv.fxPHP.balanceOf(testEnv.vault.address)
    const beforeTradeUSDCPoolBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)

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

  // it('Previews swap caclculation from the onSwap hook using queryBatchSwap() ', async () => {})
  // it('Previews swap caclculation when providing single sided liquidity from the onJoin and onExit hook', async () => {})

  it('can pause pool', async () => {
    expect(await testEnv.fxPool.paused()).to.be.equals(false)

    await expect(testEnv.fxPool.setPause()).to.emit(testEnv.fxPool, 'Paused').withArgs(adminAddress)
    // TODO: test deposit
  })

  it('can unpause pool', async () => {
    expect(await testEnv.fxPool.paused()).to.be.equals(true)

    await expect(testEnv.fxPool.connect(notOwner).setPause()).to.be.revertedWith(CONTRACT_REVERT.Ownable)

    // reset for now, test if pool functions can still be used when paused
    await expect(testEnv.fxPool.setPause()).to.emit(testEnv.fxPool, 'Unpaused').withArgs(adminAddress)
    // TODO: test deposit
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

    // todo: add emergency withdraw case from calcualted test cases
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

  it('cannot set cap when desired cap value is less than total liquidity', async () => {
    await expect(testEnv.fxPool.setCap(SET_CAP_FAIL)).to.be.revertedWith(CONTRACT_REVERT.CapLessThanLiquidity)
  })

  it.skip('reverts when numeraire value is greater than cap limit given base input (fxPHP)', async () => {
    const baseAmountsIn = [CAP_DEPOSIT_FAIL_fxPHP]

    let fxPHPAddress = ethers.utils.getAddress(testEnv.fxPHP.address)
    for (var i = 0; i < baseAmountsIn.length; i++) {
      const amountIn0 = baseAmountsIn[i]

      // Frontend estimation of other token in amount
      const poolTokens = await testEnv.vault.getPoolTokens(poolId)
      const balances = orderDataLikeFE(poolTokens.tokens, fxPHPAddress, poolTokens.balances)
      const otherTokenIn = await calculateOtherTokenIn(
        amountIn0,
        0,
        balances,
        [fxPHPDecimals, usdcDecimals],
        [fxPHPAssimilatorAddress, usdcAssimilatorAddress]
      )
      const amountIn1 = formatUnits(otherTokenIn, usdcDecimals)

      // Backend estimation `viewDeposit()` of LPT amount to receive + actual token ins
      const [estimatedLptAmount, estimatedAmountsIn, adjustedAmountsIn] = await calculateLptOutAndTokensIn(
        [amountIn0, amountIn1],
        [fxPHPDecimals, usdcDecimals],
        sortedAddresses,
        fxPHPAddress,
        testEnv.fxPool
      )

      // Actual deposit `joinPool()` request
      let sortedAmounts: BigNumber[] = sortDataLikeVault(sortedAddresses, fxPHPAddress, adjustedAmountsIn)

      const payload = ethers.utils.defaultAbiCoder.encode(['uint256[]', 'address[]'], [sortedAmounts, sortedAddresses])

      const sortedAmountsIn = sortDataLikeVault(sortedAddresses, fxPHPAddress, [amountIn0, amountIn1])
      const sortedDecimals = sortDataLikeVault(sortedAddresses, fxPHPAddress, [fxPHPDecimals, usdcDecimals])
      const maxAmountsIn = [
        parseUnits(sortedAmountsIn[0], sortedDecimals[0]),
        parseUnits(sortedAmountsIn[1], sortedDecimals[1]),
      ]

      const joinPoolRequest = {
        assets: sortedAddresses,
        maxAmountsIn,
        userData: payload,
        fromInternalBalance: false,
      }
      await expect(testEnv.vault.joinPool(poolId, adminAddress, adminAddress, joinPoolRequest)).to.be.revertedWith(
        CONTRACT_REVERT.CapLimit
      )
    }
  })

  it.skip('reverts when numeraire value is greater than cap limit given quote input (USDC)', async () => {
    let fxPHPAddress = ethers.utils.getAddress(testEnv.fxPHP.address)
    const quoteAmountsIn = [CAP_DEPOSIT_FAIL_USDC]

    for (var i = 0; i < quoteAmountsIn.length; i++) {
      const amountIn1 = quoteAmountsIn[i]

      // Frontend estimation of other token in amount
      const poolTokens = await testEnv.vault.getPoolTokens(poolId)
      const balances = orderDataLikeFE(poolTokens.tokens, fxPHPAddress, poolTokens.balances)
      const otherTokenIn = await calculateOtherTokenIn(
        amountIn1,
        1,
        balances,
        [fxPHPDecimals, usdcDecimals],
        [fxPHPAssimilatorAddress, usdcAssimilatorAddress]
      )
      const amountIn0 = formatUnits(otherTokenIn, fxPHPDecimals)

      // Backend estimation `viewDeposit()` of LPT amount to receive + actual token ins
      const [estimatedLptAmount, estimatedAmountsIn, adjustedAmountsIn] = await calculateLptOutAndTokensIn(
        [amountIn0, amountIn1],
        [fxPHPDecimals, usdcDecimals],
        sortedAddresses,
        fxPHPAddress,
        testEnv.fxPool
      )

      // Actual deposit `joinPool()` request
      let sortedAmounts: BigNumber[] = sortDataLikeVault(sortedAddresses, fxPHPAddress, adjustedAmountsIn)
      const payload = ethers.utils.defaultAbiCoder.encode(['uint256[]', 'address[]'], [sortedAmounts, sortedAddresses])
      const sortedAmountsIn = sortDataLikeVault(sortedAddresses, fxPHPAddress, [amountIn0, amountIn1])
      const sortedDecimals = sortDataLikeVault(sortedAddresses, fxPHPAddress, [fxPHPDecimals, usdcDecimals])
      const maxAmountsIn = [
        parseUnits(sortedAmountsIn[0], sortedDecimals[0]),
        parseUnits(sortedAmountsIn[1], sortedDecimals[1]),
      ]

      const joinPoolRequest = {
        assets: sortedAddresses,
        maxAmountsIn,
        userData: payload,
        fromInternalBalance: false,
      }
      await expect(testEnv.vault.joinPool(poolId, adminAddress, adminAddress, joinPoolRequest)).to.be.revertedWith(
        CONTRACT_REVERT.CapLimit
      )
    }
  })
})
