import { expect } from 'chai'
import { ethers } from 'hardhat'
import { BigNumber, Signer } from 'ethers'
import { setupEnvironment, TestEnv } from '../common/setupEnvironment'
import { parseEther, parseUnits } from '@ethersproject/units'
import { CONTRACT_REVERT } from '../constants'
import { mockToken } from '../constants/mockTokenList'
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
  let owner2: Signer
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
  const TEST_DEPOSIT_FEES = '9932' // random
  const TEST_WITHDRAW_FEES = '212' // random
  const ALPHA = parseUnits('0.8')
  const BETA = parseUnits('0.5')
  const MAX = parseUnits('0.15')
  const EPSILON = parseUnits('0.0004')
  const LAMBDA = parseUnits('0.3')
  const baseWeight = parseUnits('0.5')
  const quoteWeight = parseUnits('0.5')
  const EXPECTED_POOLS_CREATED = 4
  const protocolPercentFee = BigNumber.from('10') // 10%
  const ONE_HUNDRED = BigNumber.from('100')

  const loopCount = 3
  const log = true // do console logging
  const usdcDecimals = mockToken[0].decimal
  const fxPHPDecimals = mockToken[3].decimal

  before('build test env', async () => {
    testEnv = await setupEnvironment()
    ;[admin, notOwner, owner2] = await ethers.getSigners()
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
        fxPHPUSDCFxPool.protocolPercentFee,
        testEnv.vault.address,
        sortedAddresses
      )
    ).to.emit(testEnv.fxPoolFactory, 'NewFXPool') // not withArgs, will assert in another test case

    fxPoolAddress = await testEnv.fxPoolFactory.getActiveFxPool(sortedAddresses)
    expect(fxPoolAddress).to.be.properAddress

    fxPool = await getFxPoolContract(fxPoolAddress, testEnv.proportionalLiquidity.address, testEnv.fxSwaps.address)
    poolId = await fxPool.getPoolId() // get balance poolId
    await expect(fxPool.setCollectorAddress(adminAddress)).to.emit(fxPool, 'ChangeCollectorAddress')

    console.log('Admin address: ', adminAddress)
    console.log('FxPoolAddress: ', fxPoolAddress)
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

    const baseAmountsIn = ['3550355032000000000000', '887590000000000000000', '1100000000000000000000']

    // Numeraire input
    for (var i = 0; i < baseAmountsIn.length; i++) {
      console.log(`Deposit [${i}]: ${baseAmountsIn[i]}`)
      const beforeLpBalance = await fxPool.balanceOf(adminAddress)
      const beforeVaultfxPhpBalance = await testEnv.fxPHP.balanceOf(testEnv.vault.address)
      const beforeVaultUsdcBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)

      console.log(`
      beforeLpBalance: ${beforeLpBalance},
      beforeVaultfxPhpBalance: ${beforeVaultfxPhpBalance},
      beforeVaultUsdcBalance: ${beforeVaultUsdcBalance}
      `)

      const numeraireAmount = baseAmountsIn[i]

      const payload = ethers.utils.defaultAbiCoder.encode(
        ['uint256', 'address[]'],
        // [parseEther(numeraireAmount), sortedAddresses]
        [numeraireAmount, sortedAddresses]
      )

      // const depositDetails = await fxPool.viewDeposit(parseEther(numeraireAmount))
      const depositDetails = await fxPool.viewDeposit(numeraireAmount)

      console.log(`Deposit [${i}] Details: ${depositDetails}`)

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

      console.log(`
      afterLpBalance: ${afterLpBalance},
      afterVaultfxPhpBalance: ${afterVaultfxPhpBalance},
      afterVaultUsdcBalance: ${afterVaultUsdcBalance}
      `)

      // expect(afterLpBalance, 'Current LP Balance not expected').to.be.equals(beforeLpBalance.add(depositDetails[0]))
      // expect(afterVaultfxPhpBalance, 'Current fxPHP Balance not expected').to.be.equals(
      //   beforeVaultfxPhpBalance.add(depositDetails[1][0])
      // )
      // expect(afterVaultUsdcBalance, 'Current USDC Balance not expected').to.be.equals(
      //   beforeVaultUsdcBalance.add(depositDetails[1][1])
      // )
      console.log(`Deposit [${i}] Done`)
    }
  })

  // it('Removes Liquidity from the FXPool via the Vault which triggers the onExit hook', async () => {
  //   // remove amount per iteration roughly 1,000 USD or ~25k PHP and ~500k USDC
  //   const hlptTokenAmountInNumber = 1000
  //   const hlpTokenAmountInEther = hlptTokenAmountInNumber.toString()
  //   const hlpTokensToBurninWei = parseEther(hlpTokenAmountInEther)

  //   for (var i = 1; i < loopCount + 1; i++) {
  //     console.log('Withdraw #', i, ' with total withdraw amount ', hlptTokenAmountInNumber * i)
  //     const beforeLpBalance = await fxPool.balanceOf(adminAddress)
  //     const beforeVaultfxPhpBalance = await testEnv.fxPHP.balanceOf(testEnv.vault.address)
  //     const beforeVaultUsdcBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)

  //     const withdrawTokensOut = await fxPool.viewWithdraw(hlpTokensToBurninWei)

  //     console.log(`Tokens out [0]: ${withdrawTokensOut[0]}`)
  //     console.log(`Tokens out [1]: ${withdrawTokensOut[1]}`)

  //     const payload = ethers.utils.defaultAbiCoder.encode(
  //       ['uint256', 'address[]'],
  //       [parseUnits(hlpTokenAmountInEther), sortedAddresses]
  //     )
  //     const exitPoolRequest = {
  //       assets: sortedAddresses,
  //       minAmountsOut: [0, 0], // check token out
  //       userData: payload,
  //       toInternalBalance: false,
  //     }

  //     await expect(testEnv.vault.exitPool(poolId, adminAddress, adminAddress, exitPoolRequest))
  //       .to.emit(fxPool, 'OnExitPool')
  //       .withArgs(poolId, hlpTokensToBurninWei, [withdrawTokensOut[0], withdrawTokensOut[1]])

  //     const afterLpBalance = await fxPool.balanceOf(adminAddress)
  //     const afterVaultfxPhpBalance = await testEnv.fxPHP.balanceOf(testEnv.vault.address)
  //     const afterVaultUsdcBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)

  //     expect(afterLpBalance, 'Current LP Balance not expected').to.be.equals(beforeLpBalance.sub(hlpTokensToBurninWei))
  //     expect(afterVaultfxPhpBalance, 'Current fxPHP Balance not expected').to.be.equals(
  //       beforeVaultfxPhpBalance.sub(withdrawTokensOut[0])
  //     )
  //     expect(afterVaultUsdcBalance, 'Current USDC Balance not expected').to.be.equals(
  //       beforeVaultUsdcBalance.sub(withdrawTokensOut[1])
  //     )
  //   }
  // })
})
