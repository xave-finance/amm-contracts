import { expect } from 'chai'
import { ethers } from 'hardhat'
import { BigNumber, Signer } from 'ethers'
import { setupEnvironment, TestEnv } from '../common/setupEnvironment'
import { formatUnits, parseEther, parseUnits } from '@ethersproject/units'
import { CONTRACT_REVERT } from '../constants'
import { mockToken } from '../constants/mockTokenList'
import { sortDataLikeVault, orderDataLikeFE } from '../common/helpers/sorter'
import { calculateOtherTokenIn } from '../common/helpers/frontend'
import { sortAddresses } from '../../scripts/utils/sortAddresses'
import * as swaps from '../common/helpers/swap'
import { FXPool } from '../../typechain/FXPool'
import { fxPHPUSDCFxPool } from '../constants/mockPoolList'
import { getFxPoolContract } from '../common/contractGetters'
import { formatEther } from 'ethers/lib/utils'

describe('FXPool', () => {
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

  let NEW_CAP: BigNumber

  const NEW_CAP_FAIL = parseEther('1000')
  const CAP_DEPOSIT_FAIL_USDC = '2200000'
  const TEST_DEPOSIT_PAUSEABLE = '1000'
  const ALPHA = parseUnits('0.8')
  const BETA = parseUnits('0.5')
  const MAX = parseUnits('0.15')
  const EPSILON = parseUnits('0.0004')
  const LAMBDA = parseUnits('0.3')
  const baseWeight = parseUnits('0.5')
  const quoteWeight = parseUnits('0.5')
  const EXPECTED_POOLS_CREATED = 4

  const loopCount = 10
  const log = true // do console logging
  const usdcDecimals = mockToken[0].decimal
  const fxPHPDecimals = mockToken[3].decimal

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

    // 2 - getAssimilators
    fxPHPAssimilatorAddress = await testEnv.assimilatorFactory.getAssimilator(testEnv.fxPHP.address)
    usdcAssimilatorAddress = await testEnv.assimilatorFactory.usdcAssimilator()

    // 3 - sortedAddress references
    sortedAddresses = sortAddresses([testEnv.fxPHP.address, testEnv.USDC.address])
  })

  it('Creates a new FXPool using the FXPoolFactory', async () => {
    await expect(
      testEnv.fxPoolFactory.newFXPool(
        fxPHPUSDCFxPool.name,
        fxPHPUSDCFxPool.symbol,
        fxPHPUSDCFxPool.percentFee,
        testEnv.vault.address,
        sortedAddresses
      )
    ).to.emit(testEnv.fxPoolFactory, 'NewFXPool') // not withArgs, will assert in another test case

    fxPoolAddress = await testEnv.fxPoolFactory.getActiveFxPool(sortedAddresses)
    expect(fxPoolAddress).to.be.properAddress

    fxPool = await getFxPoolContract(fxPoolAddress, testEnv.proportionalLiquidity.address, testEnv.fxSwaps.address)
    poolId = await fxPool.getPoolId() // get balance poolId
    await expect(fxPool.setCollectorAddress(adminAddress)).to.emit(fxPool, 'ChangeCollectorAddress')
  })

  it('FXPool is registered on the vault', async () => {
    const poolInfoFromVault = await testEnv.vault.getPool(poolId)

    expect(await fxPool.getVault(), 'Vault in FXPool is different from the test environment vault').to.be.equals(
      await testEnv.vault.address
    )

    expect(poolInfoFromVault[0], 'FXpool is not registered in the vault').to.be.equals(fxPool.address)

    const curveDetails = await fxPool.curve()
    expect(curveDetails.cap).to.be.equals(0)
    expect(curveDetails.totalSupply).to.be.equals(0)
  })

  it('Initializes the FXPool and set curve parameters', async () => {
    await expect(
      fxPool.initialize(
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
      .to.emit(fxPool, 'AssetIncluded')
      .to.emit(fxPool, 'AssimilatorIncluded')

    await expect(fxPool.setParams(ALPHA, BETA, MAX, EPSILON, LAMBDA)).to.emit(fxPool, 'ParametersSet')
  })

  it('Adds liquidity to the FXPool via the Vault which triggers the onJoin hook', async () => {
    await testEnv.fxPHP.approve(testEnv.vault.address, ethers.constants.MaxUint256)
    await testEnv.USDC.approve(testEnv.vault.address, ethers.constants.MaxUint256)

    const baseAmountsIn = ['1000', '2000', '10000', '3333333']

    // Numeraire input
    for (var i = 0; i < baseAmountsIn.length; i++) {
      const beforeLpBalance = await fxPool.balanceOf(adminAddress)

      const beforeVaultfxPhpBalance = await testEnv.fxPHP.balanceOf(testEnv.vault.address)
      const beforeVaultUsdcBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)

      const numeraireAmount = baseAmountsIn[i]

      const payload = ethers.utils.defaultAbiCoder.encode(
        ['uint256', 'address[]'],
        [parseEther(numeraireAmount), sortedAddresses]
      )

      const depositDetails = await fxPool.viewDeposit(parseEther(numeraireAmount))

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
    // remove amount per iteration roughly 1,000 USD or ~25k PHP and ~500k USDC
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

  it('Checks liquidity in the FXPool', async () => {
    // const THRESHOLD = BigNumber.from(0.5)
    // expectedLiquidity = prior numeraire balance
    // actualLiquidity = test.env.vault.liquidity()
    const liquidity = (await fxPool.liquidity())[0]
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

    const fxPHPAddress = testEnv.fxPHP.address
    console.log('fxPHP Address: ', fxPHPAddress)
    const usdcAddress = testEnv.USDC.address
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
  it('targetSwap: User batch swaps token A (USDC) for token B (fxPHP) calling the vault and triggering the onSwap hook', async () => {
    const beforeTradeUserUsdcBalance = await testEnv.USDC.balanceOf(adminAddress)
    const beforeTradeUserfxPHPBalance = await testEnv.fxPHP.balanceOf(adminAddress)
    const beforeTradefxPHPPoolBalance = await testEnv.fxPHP.balanceOf(testEnv.vault.address)
    const beforeTradeUSDCPoolBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)

    const fxPHPAmountToSwapInEther = 5000

    const fxPHPAddress = testEnv.fxPHP.address
    console.log('fxPHP Address: ', fxPHPAddress)
    const usdcAddress = testEnv.USDC.address
    console.log('usdc Address: ', usdcAddress)

    await swaps.buildExecute_BatchSwapGivenOut(
      usdcAddress,
      fxPHPAddress,
      fxPHPAmountToSwapInEther,
      fxPHPDecimals,
      adminAddress,
      adminAddress, // the account swapping should get the output tokens
      testEnv,
      fxPool,
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

    const fxPHPAddress = testEnv.fxPHP.address
    console.log('fxPHP Address: ', fxPHPAddress)
    const usdcAddress = testEnv.USDC.address
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
  it('originSwap: User single swaps token A (USDC) for token B (fxPHP) calling the vault and triggering onSwap hook', async () => {
    const beforeTradeUserUsdcBalance = await testEnv.USDC.balanceOf(adminAddress)
    const beforeTradeUserfxPHPBalance = await testEnv.fxPHP.balanceOf(adminAddress)
    const beforeTradefxPHPPoolBalance = await testEnv.fxPHP.balanceOf(testEnv.vault.address)
    const beforeTradeUSDCPoolBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)

    const usdcAmountToSwapInEther = 1000

    const fxPHPAddress = testEnv.fxPHP.address
    console.log('fxPHP Address: ', fxPHPAddress)
    const usdcAddress = testEnv.USDC.address
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

    const fxPHPAmountToSwapInEther = 1000
    const fxPHPDecimals = 18

    const fxPHPAddress = testEnv.fxPHP.address
    console.log('fxPHP Address: ', fxPHPAddress)
    const usdcAddress = testEnv.USDC.address
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

  // it('Previews swap caclculation from the onSwap hook using queryBatchSwap() ', async () => {})
  // it('Previews swap caclculation when providing single sided liquidity from the onJoin and onExit hook', async () => {})
  it('totalUnclaimedFeesInNumeraire must be minted during onJoin or onExit', async () => {
    const previousFeeBalance = await fxPool.totalUnclaimedFeesInNumeraire()
    expect(previousFeeBalance).to.be.not.equals(0)
    console.log('Total unclaimed fees in numeraire before swap: ', formatEther(previousFeeBalance))

    const fxPHPAmountToSwapInEther = 1000
    const fxPHPDecimals = 18
    const fxPHPAddress = testEnv.fxPHP.address
    const usdcAddress = testEnv.USDC.address

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

    const currentFeeBalance = await fxPool.totalUnclaimedFeesInNumeraire()
    console.log(formatEther(currentFeeBalance.sub(previousFeeBalance)))

    expect(currentFeeBalance).is.gt(previousFeeBalance)
  })

  it('can pause pool', async () => {
    expect(await fxPool.paused()).to.be.equals(false)

    await expect(fxPool.setPaused()).to.emit(fxPool, 'Paused').withArgs(adminAddress)

    // test using view deposit, it will fail if the pool is paused
    await expect(fxPool.viewDeposit(parseEther(TEST_DEPOSIT_PAUSEABLE))).to.be.revertedWith(CONTRACT_REVERT.Paused)
  })

  it('can unpause pool', async () => {
    expect(await fxPool.paused()).to.be.equals(true)

    await expect(fxPool.connect(notOwner).setPaused()).to.be.revertedWith(CONTRACT_REVERT.Ownable)

    await expect(fxPool.setPaused()).to.emit(fxPool, 'Unpaused').withArgs(adminAddress)

    // test using view deposit, it will fail if the pool is paused
    await expect(fxPool.viewDeposit(parseEther(TEST_DEPOSIT_PAUSEABLE))).to.not.be.reverted
  })

  it('cannot set new collectorAddress if not owner', async () => {
    await expect(fxPool.connect(notOwner).setCollectorAddress(await notOwner.getAddress())).to.be.revertedWith(
      CONTRACT_REVERT.Ownable
    )
  })

  it('can trigger emergency alarm', async () => {
    expect(await fxPool.emergency()).to.be.equals(false)
    expect(await fxPool.setEmergency(true))
      .to.emit(fxPool, 'EmergencyAlarm')
      .withArgs(true)

    await expect(fxPool.connect(notOwner).setEmergency(false), 'Non owner can call the function').to.be.revertedWith(
      CONTRACT_REVERT.Ownable
    )

    expect(await fxPool.setEmergency(false))
      .to.emit(fxPool, 'EmergencyAlarm')
      .withArgs(false) // reset for now, test emergency withdraw

    // todo: add emergency withdraw case from calcualted test cases
  })

  it('can set cap when owner', async () => {
    const currentLiq = await fxPool.liquidity()
    NEW_CAP = currentLiq.total_.add(parseEther('1'))
    const curveDetails = await fxPool.curve()

    expect(curveDetails.cap).to.be.equals(0)
    await fxPool.setCap(NEW_CAP)
    const newCurveDetails = await fxPool.curve()
    expect(newCurveDetails.cap).to.be.equals(NEW_CAP)

    await expect(fxPool.connect(notOwner).setCap(NEW_CAP_FAIL), 'Non owner can call the function').to.be.revertedWith(
      CONTRACT_REVERT.Ownable
    )
  })

  it('cannot set cap when desired cap value is less than total liquidity', async () => {
    await expect(fxPool.setCap(NEW_CAP_FAIL)).to.be.revertedWith(CONTRACT_REVERT.CapLessThanLiquidity)
  })

  it('reverts when  deposit numeraire + current liquidity value is greater than cap limit given numeraire input', async () => {
    const numeraireAmoutnsIn = [CAP_DEPOSIT_FAIL_USDC]

    for (var i = 0; i < numeraireAmoutnsIn.length; i++) {
      const numeraireAmount = numeraireAmoutnsIn[i]

      const payload = ethers.utils.defaultAbiCoder.encode(
        ['uint256', 'address[]'],
        [parseEther(numeraireAmount), sortedAddresses]
      )

      const maxAmountsIn = [ethers.constants.MaxUint256, ethers.constants.MaxUint256]

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

  it('creates new pools and use the last pool in the array as the active fxpool ', async () => {
    // new pool #1 is the previously created pool

    // new pool #2
    await expect(
      testEnv.fxPoolFactory.newFXPool(
        fxPHPUSDCFxPool.name,
        fxPHPUSDCFxPool.symbol,
        fxPHPUSDCFxPool.percentFee,
        testEnv.vault.address,
        sortedAddresses
      )
    ).to.emit(testEnv.fxPoolFactory, 'NewFXPool')
    // new pool #3
    await expect(
      testEnv.fxPoolFactory.newFXPool(
        fxPHPUSDCFxPool.name,
        fxPHPUSDCFxPool.symbol,
        fxPHPUSDCFxPool.percentFee,
        testEnv.vault.address,
        sortedAddresses
      )
    ).to.emit(testEnv.fxPoolFactory, 'NewFXPool')
    // new pool #4
    await expect(
      testEnv.fxPoolFactory.newFXPool(
        fxPHPUSDCFxPool.name,
        fxPHPUSDCFxPool.symbol,
        fxPHPUSDCFxPool.percentFee,
        testEnv.vault.address,
        sortedAddresses
      )
    ).to.emit(testEnv.fxPoolFactory, 'NewFXPool')

    const fxPhpPoolsArray = await testEnv.fxPoolFactory.getFxPools(sortedAddresses)
    expect(fxPhpPoolsArray.length, 'Pools created must be equal to the expected pools created').to.be.equals(
      EXPECTED_POOLS_CREATED
    ) // 4 created pools until this line

    expect(
      fxPhpPoolsArray[EXPECTED_POOLS_CREATED - 1].poolAddress,
      'Active address is not equal the last element of the array'
    ).to.be.equals(await testEnv.fxPoolFactory.getActiveFxPool(sortedAddresses))

    for await (const fxPoolData of fxPhpPoolsArray) {
      console.log(`Checking if ${fxPoolData.poolAddress} is a fxPool contract`)
      const fxPoolIteration = await getFxPoolContract(
        fxPoolData.poolAddress,
        testEnv.proportionalLiquidity.address,
        testEnv.fxSwaps.address
      )

      expect(
        await fxPoolIteration.getPoolId(),
        'poolId in fxPoolFactory is not equal to poolId in fxPool'
      ).to.be.equals(fxPoolData.poolId)
    }
  })
})
