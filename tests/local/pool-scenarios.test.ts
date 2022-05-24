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

describe('FXPool Test Cases', () => {
  let testEnv: TestEnv
  let admin: Signer
  let notOwner: Signer
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

    sortedAddresses = sortAddresses([await testEnv.fxPHP.address, await testEnv.USDC.address])

    contract_vault = await ethers.getContractAt('Vault', testEnv.vault.address)
    await testEnv.fxPool.initialize(
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

    await testEnv.fxPool.setParams(ALPHA, BETA, MAX, EPSILON, LAMBDA)
    // addtl mint
    await testEnv.fxPHP.mint(adminAddress, parseUnits('10000000000'))
    await testEnv.USDC.mint(adminAddress, parseUnits('10000000000', 6))
  })

  it(`Case ${depositTestCases[0].caseNo}: ${depositTestCases[0].description}`, async () => {
    await testEnv.fxPHP.approve(testEnv.vault.address, ethers.constants.MaxUint256)
    await testEnv.USDC.approve(testEnv.vault.address, ethers.constants.MaxUint256)

    let fxPHPAddress = ethers.utils.getAddress(testEnv.fxPHP.address)

    const beforeLpBalance = await testEnv.fxPool.balanceOf(adminAddress)
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
    let sortedAmounts: BigNumber[] = sortDataLikeVault(sortedAddresses, fxPHPAddress, amountsIn)

    const payload = ethers.utils.defaultAbiCoder.encode(
      ['uint256[]', 'address[]'],
      [[amountsIn[0], amountsIn[1]], sortedAddresses]
    )

    console.log('USDC IN: ', amountsIn[0])
    console.log('fxPHP In: ', amountsIn[1])

    const sortedAmountsIn = sortDataLikeVault(sortedAddresses, fxPHPAddress, [amountsIn[0], amountsIn[1]])
    const sortedDecimals = sortDataLikeVault(sortedAddresses, fxPHPAddress, [fxPHPDecimals, usdcDecimals])

    const maxAmountsIn = [
      parseUnits(sortedAmountsIn[0].toString(), sortedDecimals[0]),
      parseUnits(sortedAmountsIn[1].toString(), sortedDecimals[1]),
    ]

    //  const maxAmountsIn = [ethers.constants.MaxUint256, ethers.constants.MaxUint256]
    // console.log(`Deposit [${i}] joinPool maxAmountsIn: `, maxAmountsIn.toString())

    const joinPoolRequest = {
      assets: sortedAddresses,
      maxAmountsIn,
      userData: payload,
      fromInternalBalance: false,
    }

    await expect(testEnv.vault.joinPool(poolId, adminAddress, adminAddress, joinPoolRequest)).to.emit(
      testEnv.fxPool,
      'OnJoinPool'
    )

    // expect(await testEnv.fxPool.balanceOf(adminAddress)).to.equals(parseUnits('4000'))

    //    .withArgs(poolId, estimatedLptAmount, [estimatedAmountsIn[0], estimatedAmountsIn[1]])
    const afterVaultfxPhpBalance = await testEnv.fxPHP.balanceOf(testEnv.vault.address)
    const afterVaultUsdcBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)
    console.log('LP: Balance: ', await testEnv.fxPool.balanceOf(adminAddress))
    console.log('USDC: ', afterVaultUsdcBalance)
    console.log('fxPHP: ', afterVaultfxPhpBalance)
  })

  it(`Case ${depositTestCases[1].caseNo}: ${depositTestCases[1].description}`, async () => {
    await testEnv.fxPHP.approve(testEnv.vault.address, ethers.constants.MaxUint256)
    await testEnv.USDC.approve(testEnv.vault.address, ethers.constants.MaxUint256)

    let fxPHPAddress = ethers.utils.getAddress(testEnv.fxPHP.address)

    const beforeLpBalance = await testEnv.fxPool.balanceOf(adminAddress)
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
    let sortedAmounts: BigNumber[] = sortDataLikeVault(sortedAddresses, fxPHPAddress, amountsIn)

    const payload = ethers.utils.defaultAbiCoder.encode(
      ['uint256[]', 'address[]'],
      [[amountsIn[0], amountsIn[1]], sortedAddresses]
    )

    console.log('USDC IN: ', amountsIn[0])
    console.log('fxPHP: ', amountsIn[1])

    const sortedAmountsIn = sortDataLikeVault(sortedAddresses, fxPHPAddress, [amountsIn[0], amountsIn[1]])
    const sortedDecimals = sortDataLikeVault(sortedAddresses, fxPHPAddress, [fxPHPDecimals, usdcDecimals])

    const maxAmountsIn = [
      parseUnits(sortedAmountsIn[0].toString(), sortedDecimals[0]),
      parseUnits(sortedAmountsIn[1].toString(), sortedDecimals[1]),
    ]

    //  const maxAmountsIn = [ethers.constants.MaxUint256, ethers.constants.MaxUint256]
    // console.log(`Deposit [${i}] joinPool maxAmountsIn: `, maxAmountsIn.toString())

    const joinPoolRequest = {
      assets: sortedAddresses,
      maxAmountsIn,
      userData: payload,
      fromInternalBalance: false,
    }

    await expect(testEnv.vault.joinPool(poolId, adminAddress, adminAddress, joinPoolRequest)).to.emit(
      testEnv.fxPool,
      'OnJoinPool'
    )

    // expect(await testEnv.fxPool.balanceOf(adminAddress)).to.equals(parseUnits('4000'))

    //    .withArgs(poolId, estimatedLptAmount, [estimatedAmountsIn[0], estimatedAmountsIn[1]])
    const afterVaultfxPhpBalance = await testEnv.fxPHP.balanceOf(testEnv.vault.address)
    const afterVaultUsdcBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)
    console.log('LP: Balance: ', await testEnv.fxPool.balanceOf(adminAddress))
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

    const beforeLpBalance = await testEnv.fxPool.balanceOf(adminAddress)
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
    let sortedAmounts: BigNumber[] = sortDataLikeVault(sortedAddresses, fxPHPAddress, amountsIn)

    const payload = ethers.utils.defaultAbiCoder.encode(
      ['uint256[]', 'address[]'],
      [[amountsIn[0], amountsIn[1]], sortedAddresses]
    )

    console.log('USDC IN: ', amountsIn[0])
    console.log('fxPHP: ', amountsIn[1])

    const sortedAmountsIn = sortDataLikeVault(sortedAddresses, fxPHPAddress, [amountsIn[0], amountsIn[1]])
    const sortedDecimals = sortDataLikeVault(sortedAddresses, fxPHPAddress, [fxPHPDecimals, usdcDecimals])

    const maxAmountsIn = [
      parseUnits(sortedAmountsIn[0].toString(), sortedDecimals[0]),
      parseUnits(sortedAmountsIn[1].toString(), sortedDecimals[1]),
    ]

    //  const maxAmountsIn = [ethers.constants.MaxUint256, ethers.constants.MaxUint256]
    // console.log(`Deposit [${i}] joinPool maxAmountsIn: `, maxAmountsIn.toString())

    const joinPoolRequest = {
      assets: sortedAddresses,
      maxAmountsIn,
      userData: payload,
      fromInternalBalance: false,
    }

    await expect(testEnv.vault.joinPool(poolId, adminAddress, adminAddress, joinPoolRequest)).to.emit(
      testEnv.fxPool,
      'OnJoinPool'
    )

    // expect(await testEnv.fxPool.balanceOf(adminAddress)).to.equals(parseUnits('4000'))
    //    .withArgs(poolId, estimatedLptAmount, [estimatedAmountsIn[0], estimatedAmountsIn[1]])
    const afterVaultfxPhpBalance = await testEnv.fxPHP.balanceOf(testEnv.vault.address)
    const afterVaultUsdcBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)
    console.log('LP: Balance: ', await testEnv.fxPool.balanceOf(adminAddress))
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

    const beforeLpBalance = await testEnv.fxPool.balanceOf(adminAddress)
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
    let sortedAmounts: BigNumber[] = sortDataLikeVault(sortedAddresses, fxPHPAddress, amountsIn)

    const payload = ethers.utils.defaultAbiCoder.encode(
      ['uint256[]', 'address[]'],
      [[amountsIn[0], amountsIn[1]], sortedAddresses]
    )

    console.log('USDC IN: ', amountsIn[0])
    console.log('fxPHP: ', amountsIn[1])

    const sortedAmountsIn = sortDataLikeVault(sortedAddresses, fxPHPAddress, [amountsIn[0], amountsIn[1]])
    const sortedDecimals = sortDataLikeVault(sortedAddresses, fxPHPAddress, [fxPHPDecimals, usdcDecimals])

    const maxAmountsIn = [
      parseUnits(sortedAmountsIn[0].toString(), sortedDecimals[0]),
      parseUnits(sortedAmountsIn[1].toString(), sortedDecimals[1]),
    ]

    //  const maxAmountsIn = [ethers.constants.MaxUint256, ethers.constants.MaxUint256]
    // console.log(`Deposit [${i}] joinPool maxAmountsIn: `, maxAmountsIn.toString())

    const joinPoolRequest = {
      assets: sortedAddresses,
      maxAmountsIn,
      userData: payload,
      fromInternalBalance: false,
    }

    await expect(testEnv.vault.joinPool(poolId, adminAddress, adminAddress, joinPoolRequest)).to.emit(
      testEnv.fxPool,
      'OnJoinPool'
    )

    // expect(await testEnv.fxPool.balanceOf(adminAddress)).to.equals(parseUnits('4000'))
    //    .withArgs(poolId, estimatedLptAmount, [estimatedAmountsIn[0], estimatedAmountsIn[1]])
    const afterVaultfxPhpBalance = await testEnv.fxPHP.balanceOf(testEnv.vault.address)
    const afterVaultUsdcBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)
    console.log('LP: Balance: ', await testEnv.fxPool.balanceOf(adminAddress))
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
      adminAddress, // the account swapping should get the output tokens
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
