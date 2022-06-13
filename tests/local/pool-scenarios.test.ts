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
import { depositTestCases, swapTestCases } from '../constants/scenarios'
import { FXPool } from '../../typechain/FXPool'
import { fxPHPUSDCFxPool, XSGDUSDCFxPool } from '../constants/mockPoolList'
import { getFxPoolContract } from '../common/contractGetters'

describe('FXPool Test Cases', () => {
  let testEnv: TestEnv
  let admin: Signer
  let notOwner: Signer
  let adminAddress: string

  let fxPHPAssimilatorAddress: string
  let usdcAssimilatorAddress: string
  let xsgdAssimilatorAddress: string
  let sortedAddressesFXPHP: string[]
  let sortedAddressesXSGD: string[]
  let fxPoolFXPHPAddress: string
  let fxPoolXSGDAddress: string
  let fxPoolFXPHPPoolId: string
  let fxPoolXSGDPoolId: string

  let fxPoolFXPHP: FXPool
  let fxPoolXSGD: FXPool

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

    await testEnv.assimilatorFactory.newBaseAssimilator(
      testEnv.XSGD.address,
      parseUnits('1', `${mockToken[1].decimal}`),
      testEnv.XSGDOracle.address
    )

    // 2 - getAssimilators
    fxPHPAssimilatorAddress = await testEnv.assimilatorFactory.getAssimilator(testEnv.fxPHP.address)
    usdcAssimilatorAddress = await testEnv.assimilatorFactory.usdcAssimilator()
    xsgdAssimilatorAddress = await testEnv.assimilatorFactory.getAssimilator(testEnv.XSGD.address)

    // 3 - sortedAddress references
    sortedAddressesFXPHP = sortAddresses([testEnv.fxPHP.address, testEnv.USDC.address])
    sortedAddressesXSGD = sortAddresses([testEnv.XSGD.address, testEnv.USDC.address])

    // 4 - get vault instance
    contract_vault = await testEnv.vault

    // 5 - deploy fxPools
    await testEnv.fxPoolFactory.newFXPool(
      fxPHPUSDCFxPool.name,
      fxPHPUSDCFxPool.symbol,
      fxPHPUSDCFxPool.percentFee,
      contract_vault.address,
      sortedAddressesFXPHP
    )

    await testEnv.fxPoolFactory.newFXPool(
      XSGDUSDCFxPool.name,
      XSGDUSDCFxPool.symbol,
      XSGDUSDCFxPool.percentFee,
      contract_vault.address,
      sortedAddressesXSGD
    )

    // 6 - get fxpool instances
    fxPoolFXPHPAddress = await testEnv.fxPoolFactory.getFxPool(sortedAddressesFXPHP)
    fxPoolXSGDAddress = await testEnv.fxPoolFactory.getFxPool(sortedAddressesXSGD)

    fxPoolFXPHP = await getFxPoolContract(
      fxPoolFXPHPAddress,
      testEnv.proportionalLiquidity.address,
      testEnv.fxSwaps.address
    )
    fxPoolXSGD = await getFxPoolContract(
      fxPoolXSGDAddress,
      testEnv.proportionalLiquidity.address,
      testEnv.fxSwaps.address
    )

    fxPoolFXPHPPoolId = await fxPoolFXPHP.getPoolId()
    fxPoolXSGDPoolId = await fxPoolXSGD.getPoolId()

    // 7 - initialized and set curve params

    await fxPoolFXPHP.initialize(
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

    await fxPoolFXPHP.setParams(ALPHA, BETA, MAX, EPSILON, LAMBDA)

    // Note for XSGD: same params for now, we can make another set of constant params after
    await fxPoolXSGD.initialize(
      [
        testEnv.XSGD.address,
        fxPHPAssimilatorAddress,
        testEnv.XSGD.address,
        fxPHPAssimilatorAddress,
        testEnv.XSGD.address,
        testEnv.USDC.address,
        usdcAssimilatorAddress,
        testEnv.USDC.address,
        usdcAssimilatorAddress,
        testEnv.USDC.address,
      ],
      [baseWeight, quoteWeight]
    )

    await fxPoolXSGD.setParams(ALPHA, BETA, MAX, EPSILON, LAMBDA)

    // addtl mint
    await testEnv.fxPHP.mint(adminAddress, parseUnits('10000000000'))
    await testEnv.XSGD.mint(adminAddress, parseUnits('10000000000'))
    await testEnv.USDC.mint(adminAddress, parseUnits('10000000000', 6))
  })

  it(`Case ${depositTestCases[0].caseNo}: ${depositTestCases[0].description}`, async () => {
    await testEnv.fxPHP.approve(testEnv.vault.address, ethers.constants.MaxUint256)
    await testEnv.USDC.approve(testEnv.vault.address, ethers.constants.MaxUint256)

    let fxPHPAddress = ethers.utils.getAddress(testEnv.fxPHP.address)

    const beforeLpBalance = await fxPoolFXPHP.balanceOf(adminAddress)
    const beforeVaultfxPhpBalance = await testEnv.fxPHP.balanceOf(testEnv.vault.address)
    const beforeVaultUsdcBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)

    //  console.log(`USDC ADMIN:  ${formatUnits(await testEnv.USDC.balanceOf(adminAddress), 6)}`)
    //  console.log(`fxPHP ADMIN:  ${formatUnits(await testEnv.fxPHP.balanceOf(adminAddress))}`)

    const amountsIn = [
      parseUnits(
        depositTestCases[0].inputA.toString(),
        mockToken.filter((token) => {
          return token.symbol === depositTestCases[0].inputACurrency
        })[0].decimal
      ),
      parseUnits(
        depositTestCases[0].inputB.toString(),
        mockToken.filter((token) => {
          return token.symbol === depositTestCases[0].inputBCurrency
        })[0].decimal
      ),
    ]

    //  console.log(amountsIn)
    // Actual deposit `joinPool()` request
    let sortedAmounts: BigNumber[] = sortDataLikeVault(sortedAddressesFXPHP, fxPHPAddress, amountsIn)

    const payload = ethers.utils.defaultAbiCoder.encode(
      ['uint256[]', 'address[]'],
      [[amountsIn[0], amountsIn[1]], sortedAddressesFXPHP]
    )

    console.log('USDC IN: ', amountsIn[0])
    console.log('fxPHP In: ', amountsIn[1])

    const sortedAmountsIn = sortDataLikeVault(sortedAddressesFXPHP, fxPHPAddress, [amountsIn[0], amountsIn[1]])
    const sortedDecimals = sortDataLikeVault(sortedAddressesFXPHP, fxPHPAddress, [fxPHPDecimals, usdcDecimals])

    const maxAmountsIn = [
      parseUnits(sortedAmountsIn[0].toString(), sortedDecimals[0]),
      parseUnits(sortedAmountsIn[1].toString(), sortedDecimals[1]),
    ]

    //  const maxAmountsIn = [ethers.constants.MaxUint256, ethers.constants.MaxUint256]
    // console.log(`Deposit [${i}] joinPool maxAmountsIn: `, maxAmountsIn.toString())

    const joinPoolRequest = {
      assets: sortedAddressesFXPHP,
      maxAmountsIn,
      userData: payload,
      fromInternalBalance: false,
    }

    await expect(testEnv.vault.joinPool(fxPoolFXPHPPoolId, adminAddress, adminAddress, joinPoolRequest)).to.emit(
      fxPoolFXPHP,
      'OnJoinPool'
    )

    const afterVaultfxPhpBalance = await testEnv.fxPHP.balanceOf(testEnv.vault.address)
    const afterVaultUsdcBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)
    console.log('LP: Balance: ', await fxPoolFXPHP.balanceOf(adminAddress))
    console.log('USDC: ', afterVaultUsdcBalance)
    console.log('fxPHP: ', afterVaultfxPhpBalance)
  })

  it(`Case ${depositTestCases[1].caseNo}: ${depositTestCases[1].description}`, async () => {
    await testEnv.fxPHP.approve(testEnv.vault.address, ethers.constants.MaxUint256)
    await testEnv.USDC.approve(testEnv.vault.address, ethers.constants.MaxUint256)

    let fxPHPAddress = ethers.utils.getAddress(testEnv.fxPHP.address)

    const beforeLpBalance = await fxPoolFXPHP.balanceOf(adminAddress)
    const beforeVaultfxPhpBalance = await testEnv.fxPHP.balanceOf(testEnv.vault.address)
    const beforeVaultUsdcBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)

    //  console.log(`USDC ADMIN:  ${formatUnits(await testEnv.USDC.balanceOf(adminAddress), 6)}`)
    //  console.log(`fxPHP ADMIN:  ${formatUnits(await testEnv.fxPHP.balanceOf(adminAddress))}`)

    const amountsIn = [
      parseUnits(
        depositTestCases[1].inputA.toString(),
        mockToken.filter((token) => {
          return token.symbol === depositTestCases[1].inputACurrency
        })[0].decimal
      ),
      parseUnits(
        depositTestCases[1].inputB.toString(),
        mockToken.filter((token) => {
          return token.symbol === depositTestCases[1].inputBCurrency
        })[0].decimal
      ),
    ]

    //  console.log(amountsIn)
    // Actual deposit `joinPool()` request
    let sortedAmounts: BigNumber[] = sortDataLikeVault(sortedAddressesFXPHP, fxPHPAddress, amountsIn)

    const payload = ethers.utils.defaultAbiCoder.encode(
      ['uint256[]', 'address[]'],
      [[amountsIn[0], amountsIn[1]], sortedAddressesFXPHP]
    )

    console.log('USDC IN: ', amountsIn[0])
    console.log('fxPHP: ', amountsIn[1])

    const sortedAmountsIn = sortDataLikeVault(sortedAddressesFXPHP, fxPHPAddress, [amountsIn[0], amountsIn[1]])
    const sortedDecimals = sortDataLikeVault(sortedAddressesFXPHP, fxPHPAddress, [fxPHPDecimals, usdcDecimals])

    const maxAmountsIn = [
      parseUnits(sortedAmountsIn[0].toString(), sortedDecimals[0]),
      parseUnits(sortedAmountsIn[1].toString(), sortedDecimals[1]),
    ]

    //  const maxAmountsIn = [ethers.constants.MaxUint256, ethers.constants.MaxUint256]
    // console.log(`Deposit [${i}] joinPool maxAmountsIn: `, maxAmountsIn.toString())

    const joinPoolRequest = {
      assets: sortedAddressesFXPHP,
      maxAmountsIn,
      userData: payload,
      fromInternalBalance: false,
    }

    await expect(testEnv.vault.joinPool(fxPoolFXPHPPoolId, adminAddress, adminAddress, joinPoolRequest)).to.emit(
      fxPoolFXPHP,
      'OnJoinPool'
    )

    // expect(await testEnv.fxPool.balanceOf(adminAddress)).to.equals(parseUnits('4000'))

    //    .withArgs(poolId, estimatedLptAmount, [estimatedAmountsIn[0], estimatedAmountsIn[1]])
    const afterVaultfxPhpBalance = await testEnv.fxPHP.balanceOf(testEnv.vault.address)
    const afterVaultUsdcBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)
    console.log('LP: Balance: ', await fxPoolFXPHP.balanceOf(adminAddress))
    console.log('USDC: ', afterVaultUsdcBalance)
    console.log('fxPHP: ', afterVaultfxPhpBalance)
  })

  it(`Case ${swapTestCases[0].caseNo}: ${swapTestCases[0].description}`, async () => {
    const fxPHPAmountToSwapInEther = swapTestCases[0].input

    const fxPHPAddress = await testEnv.fxPHP.address
    console.log('fxPHP Address: ', fxPHPAddress)
    const usdcAddress = await testEnv.USDC.address
    console.log('usdc Address: ', usdcAddress)

    const beforeTradeUserUsdcBalance = await testEnv.USDC.balanceOf(adminAddress)
    const beforeTradeUserfxPHPBalance = await testEnv.fxPHP.balanceOf(adminAddress)
    const beforeTradefxPHPPoolBalance = await testEnv.fxPHP.balanceOf(testEnv.vault.address)
    const beforeTradeUSDCPoolBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)

    console.log('beforeTradeUserUsdcBalance: ', beforeTradeUserUsdcBalance)
    console.log('beforeTradeUserfxPHPBalance: ', beforeTradeUserfxPHPBalance)
    console.log('beforeTradefxPHPPoolBalance: ', beforeTradefxPHPPoolBalance)
    console.log('beforeTradeUSDCPoolBalance: ', beforeTradeUSDCPoolBalance)

    await swaps.buildExecute_SingleSwapGivenIn(
      fxPHPAddress, // fxPHP = token in
      usdcAddress, // USDC = token out
      fxPHPAmountToSwapInEther,
      fxPHPDecimals, // specify token in decimals
      adminAddress,
      adminAddress, // the account swapping should get the output tokens
      fxPoolFXPHP,
      testEnv,
      false
    )

    const afterTradeUserUsdcBalance = await testEnv.USDC.balanceOf(adminAddress)
    const afterTradeUserfxPHPBalance = await testEnv.fxPHP.balanceOf(adminAddress)
    const afterTradefxPHPPoolBalance = await testEnv.fxPHP.balanceOf(testEnv.vault.address)
    const afterTradeUSDCPoolBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)

    console.log('afterTradeUserUsdcBalance : ', afterTradeUserUsdcBalance)
    console.log('afterTradeUserfxPHPBalance : ', afterTradeUserfxPHPBalance)
    console.log('afterTradefxPHPPoolBalance : ', afterTradefxPHPPoolBalance)
    console.log('afterTradeUSDCPoolBalance : ', afterTradeUSDCPoolBalance)
  })

  it.skip(`Case ${depositTestCases[2].caseNo}: ${depositTestCases[2].description}`, async () => {
    await testEnv.fxPHP.approve(testEnv.vault.address, ethers.constants.MaxUint256)
    await testEnv.USDC.approve(testEnv.vault.address, ethers.constants.MaxUint256)

    let fxPHPAddress = ethers.utils.getAddress(testEnv.fxPHP.address)

    const beforeLpBalance = await fxPoolFXPHP.balanceOf(adminAddress)
    const beforeVaultfxPhpBalance = await testEnv.fxPHP.balanceOf(testEnv.vault.address)
    const beforeVaultUsdcBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)

    //  console.log(`USDC ADMIN:  ${formatUnits(await testEnv.USDC.balanceOf(adminAddress), 6)}`)
    //  console.log(`fxPHP ADMIN:  ${formatUnits(await testEnv.fxPHP.balanceOf(adminAddress))}`)

    const amountsIn = [
      parseUnits(
        depositTestCases[1].inputA.toString(),
        mockToken.filter((token) => {
          return token.symbol === depositTestCases[2].inputACurrency
        })[0].decimal
      ),
      parseUnits(
        depositTestCases[1].inputB.toString(),
        mockToken.filter((token) => {
          return token.symbol === depositTestCases[2].inputBCurrency
        })[0].decimal
      ),
    ]

    //  console.log(amountsIn)
    // Actual deposit `joinPool()` request
    let sortedAmounts: BigNumber[] = sortDataLikeVault(sortedAddressesFXPHP, fxPHPAddress, amountsIn)

    const payload = ethers.utils.defaultAbiCoder.encode(
      ['uint256[]', 'address[]'],
      [[amountsIn[0], amountsIn[1]], sortedAddressesFXPHP]
    )

    console.log('USDC IN: ', amountsIn[0])
    console.log('fxPHP: ', amountsIn[1])

    const sortedAmountsIn = sortDataLikeVault(sortedAddressesFXPHP, fxPHPAddress, [amountsIn[0], amountsIn[1]])
    const sortedDecimals = sortDataLikeVault(sortedAddressesFXPHP, fxPHPAddress, [fxPHPDecimals, usdcDecimals])

    const maxAmountsIn = [
      parseUnits(sortedAmountsIn[0].toString(), sortedDecimals[0]),
      parseUnits(sortedAmountsIn[1].toString(), sortedDecimals[1]),
    ]

    //  const maxAmountsIn = [ethers.constants.MaxUint256, ethers.constants.MaxUint256]
    // console.log(`Deposit [${i}] joinPool maxAmountsIn: `, maxAmountsIn.toString())

    const joinPoolRequest = {
      assets: sortedAddressesFXPHP,
      maxAmountsIn,
      userData: payload,
      fromInternalBalance: false,
    }

    await expect(testEnv.vault.joinPool(fxPoolFXPHPPoolId, adminAddress, adminAddress, joinPoolRequest)).to.emit(
      fxPoolFXPHP,
      'OnJoinPool'
    )

    // expect(await testEnv.fxPool.balanceOf(adminAddress)).to.equals(parseUnits('4000'))
    //    .withArgs(poolId, estimatedLptAmount, [estimatedAmountsIn[0], estimatedAmountsIn[1]])
    const afterVaultfxPhpBalance = await testEnv.fxPHP.balanceOf(testEnv.vault.address)
    const afterVaultUsdcBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)
    console.log('LP: Balance: ', await fxPoolFXPHP.balanceOf(adminAddress))
    console.log('USDC: ', afterVaultUsdcBalance)
    console.log('fxPHP: ', afterVaultfxPhpBalance)
  })

  it.skip(`Case ${swapTestCases[1].caseNo}: ${swapTestCases[1].description}`, async () => {
    const fxPHPAmountToSwapInEther = swapTestCases[1].input

    const fxPHPAddress = await testEnv.fxPHP.address
    console.log('fxPHP Address: ', fxPHPAddress)
    const usdcAddress = await testEnv.USDC.address
    console.log('usdc Address: ', usdcAddress)

    const beforeTradeUserUsdcBalance = await testEnv.USDC.balanceOf(adminAddress)
    const beforeTradeUserfxPHPBalance = await testEnv.fxPHP.balanceOf(adminAddress)
    const beforeTradefxPHPPoolBalance = await testEnv.fxPHP.balanceOf(testEnv.vault.address)
    const beforeTradeUSDCPoolBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)

    console.log('beforeTradeUserUsdcBalance: ', beforeTradeUserUsdcBalance)
    console.log('beforeTradeUserfxPHPBalance: ', beforeTradeUserfxPHPBalance)
    console.log('beforeTradefxPHPPoolBalance: ', beforeTradefxPHPPoolBalance)
    console.log('beforeTradeUSDCPoolBalance: ', beforeTradeUSDCPoolBalance)

    await swaps.buildExecute_SingleSwapGivenIn(
      fxPHPAddress, // fxPHP = token in
      usdcAddress, // USDC = token out
      fxPHPAmountToSwapInEther,
      fxPHPDecimals, // specify token in decimals
      adminAddress,
      adminAddress, // the account swapping should get the output tokens
      fxPoolFXPHP,
      testEnv,
      false
    )

    const afterTradeUserUsdcBalance = await testEnv.USDC.balanceOf(adminAddress)
    const afterTradeUserfxPHPBalance = await testEnv.fxPHP.balanceOf(adminAddress)
    const afterTradefxPHPPoolBalance = await testEnv.fxPHP.balanceOf(testEnv.vault.address)
    const afterTradeUSDCPoolBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)

    console.log('afterTradeUserUsdcBalance : ', afterTradeUserUsdcBalance)
    console.log('afterTradeUserfxPHPBalance : ', afterTradeUserfxPHPBalance)
    console.log('afterTradefxPHPPoolBalance : ', afterTradefxPHPPoolBalance)
    console.log('afterTradeUSDCPoolBalance : ', afterTradeUSDCPoolBalance)
  })

  it.skip(`Case ${depositTestCases[3].caseNo}: ${depositTestCases[3].description}`, async () => {
    await testEnv.fxPHP.approve(testEnv.vault.address, ethers.constants.MaxUint256)
    await testEnv.USDC.approve(testEnv.vault.address, ethers.constants.MaxUint256)

    let fxPHPAddress = ethers.utils.getAddress(testEnv.fxPHP.address)

    const beforeLpBalance = await fxPoolFXPHP.balanceOf(adminAddress)
    const beforeVaultfxPhpBalance = await testEnv.fxPHP.balanceOf(testEnv.vault.address)
    const beforeVaultUsdcBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)

    //  console.log(`USDC ADMIN:  ${formatUnits(await testEnv.USDC.balanceOf(adminAddress), 6)}`)
    //  console.log(`fxPHP ADMIN:  ${formatUnits(await testEnv.fxPHP.balanceOf(adminAddress))}`)

    const amountsIn = [
      parseUnits(
        depositTestCases[1].inputA.toString(),
        mockToken.filter((token) => {
          return token.symbol === depositTestCases[3].inputACurrency
        })[0].decimal
      ),
      parseUnits(
        depositTestCases[1].inputB.toString(),
        mockToken.filter((token) => {
          return token.symbol === depositTestCases[3].inputBCurrency
        })[0].decimal
      ),
    ]

    //  console.log(amountsIn)
    // Actual deposit `joinPool()` request
    let sortedAmounts: BigNumber[] = sortDataLikeVault(sortedAddressesFXPHP, fxPHPAddress, amountsIn)

    const payload = ethers.utils.defaultAbiCoder.encode(
      ['uint256[]', 'address[]'],
      [[amountsIn[0], amountsIn[1]], sortedAddressesFXPHP]
    )

    console.log('USDC IN: ', amountsIn[0])
    console.log('fxPHP: ', amountsIn[1])

    const sortedAmountsIn = sortDataLikeVault(sortedAddressesFXPHP, fxPHPAddress, [amountsIn[0], amountsIn[1]])
    const sortedDecimals = sortDataLikeVault(sortedAddressesFXPHP, fxPHPAddress, [fxPHPDecimals, usdcDecimals])

    const maxAmountsIn = [
      parseUnits(sortedAmountsIn[0].toString(), sortedDecimals[0]),
      parseUnits(sortedAmountsIn[1].toString(), sortedDecimals[1]),
    ]

    //  const maxAmountsIn = [ethers.constants.MaxUint256, ethers.constants.MaxUint256]
    // console.log(`Deposit [${i}] joinPool maxAmountsIn: `, maxAmountsIn.toString())

    const joinPoolRequest = {
      assets: sortedAddressesFXPHP,
      maxAmountsIn,
      userData: payload,
      fromInternalBalance: false,
    }

    await expect(testEnv.vault.joinPool(fxPoolFXPHPPoolId, adminAddress, adminAddress, joinPoolRequest)).to.emit(
      fxPoolFXPHP,
      'OnJoinPool'
    )

    // expect(await testEnv.fxPool.balanceOf(adminAddress)).to.equals(parseUnits('4000'))
    //    .withArgs(poolId, estimatedLptAmount, [estimatedAmountsIn[0], estimatedAmountsIn[1]])
    const afterVaultfxPhpBalance = await testEnv.fxPHP.balanceOf(testEnv.vault.address)
    const afterVaultUsdcBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)
    console.log('LP: Balance: ', await fxPoolFXPHP.balanceOf(adminAddress))
    console.log('USDC: ', afterVaultUsdcBalance)
    console.log('fxPHP: ', afterVaultfxPhpBalance)
  })

  it.skip(`Case ${swapTestCases[2].caseNo}: ${swapTestCases[2].description}`, async () => {
    const fxPHPAmountToSwapInEther = swapTestCases[2].input

    const fxPHPAddress = await testEnv.fxPHP.address
    console.log('fxPHP Address: ', fxPHPAddress)
    const usdcAddress = await testEnv.USDC.address
    console.log('usdc Address: ', usdcAddress)

    const beforeTradeUserUsdcBalance = await testEnv.USDC.balanceOf(adminAddress)
    const beforeTradeUserfxPHPBalance = await testEnv.fxPHP.balanceOf(adminAddress)
    const beforeTradefxPHPPoolBalance = await testEnv.fxPHP.balanceOf(testEnv.vault.address)
    const beforeTradeUSDCPoolBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)

    console.log('beforeTradeUserUsdcBalance: ', beforeTradeUserUsdcBalance)
    console.log('beforeTradeUserfxPHPBalance: ', beforeTradeUserfxPHPBalance)
    console.log('beforeTradefxPHPPoolBalance: ', beforeTradefxPHPPoolBalance)
    console.log('beforeTradeUSDCPoolBalance: ', beforeTradeUSDCPoolBalance)

    await swaps.buildExecute_SingleSwapGivenIn(
      fxPHPAddress, // fxPHP = token in
      usdcAddress, // USDC = token out
      fxPHPAmountToSwapInEther,
      fxPHPDecimals, // specify token in decimals
      adminAddress,
      adminAddress, // the account swapping should get the output token
      fxPoolFXPHP,
      testEnv,
      false
    )

    const afterTradeUserUsdcBalance = await testEnv.USDC.balanceOf(adminAddress)
    const afterTradeUserfxPHPBalance = await testEnv.fxPHP.balanceOf(adminAddress)
    const afterTradefxPHPPoolBalance = await testEnv.fxPHP.balanceOf(testEnv.vault.address)
    const afterTradeUSDCPoolBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)

    console.log('afterTradeUserUsdcBalance : ', afterTradeUserUsdcBalance)
    console.log('afterTradeUserfxPHPBalance : ', afterTradeUserfxPHPBalance)
    console.log('afterTradefxPHPPoolBalance : ', afterTradefxPHPPoolBalance)
    console.log('afterTradeUSDCPoolBalance : ', afterTradeUSDCPoolBalance)
  })
})
