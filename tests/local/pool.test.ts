import { expect } from 'chai'
import { ethers } from 'hardhat'
import { BigNumber, BytesLike, Signer } from 'ethers'
import { setupEnvironment, TestEnv } from '../common/setupEnvironment'
import { parseEther, parseUnits } from '@ethersproject/units'
import { CONTRACT_REVERT } from '../constants'
import { sortAddresses } from '../common/helpers/utils'
import { mockToken } from '../constants/mockTokenList'
import { getAssimilatorContract } from '../common/contractGetters'
import { ViewDepositData } from '.././common/types/types'
import { sortTokenAddressesLikeVault } from '../common/helpers/sorter'

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
  })

  it('FXPool is registered on the vault', async () => {
    const poolId = await testEnv.fxPool.getPoolId()
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
  it('Round 1 - Adds liquidity inside the FXPool calling the vault and triggering onJoin hook', async () => {
    await testEnv.fxPHP.approve(testEnv.vault.address, ethers.constants.MaxUint256)
    await testEnv.USDC.approve(testEnv.vault.address, ethers.constants.MaxUint256)

    // add 10,000 USD or ~250k PHP and ~5k USDC to the pool
    const numeraireAmount = parseEther('10000')
    const beforeLpBalance = await testEnv.fxPool.balanceOf(adminAddress)
    const beforeVaultfxPhpBalance = await testEnv.fxPHP.balanceOf(testEnv.vault.address)
    const beforeVaultUsdcBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)

    // call the vault to add liquidity
    const viewDeposit = await testEnv.fxPool.viewDeposit(numeraireAmount)

    let fxPHPAddress = ethers.utils.getAddress(testEnv.fxPHP.address)

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
    await expect(testEnv.vault.joinPool(poolId, adminAddress, adminAddress, joinPoolRequest)).to.not.be.reverted

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
  })
  it('Round 1 - Removes liquidity inside the FXPool calling the vault and triggering onExit hook', async () => {
    const poolId = await testEnv.fxPool.getPoolId()
    const tokensToBurn = parseEther('30')
    const beforeLpBalance = await testEnv.fxPool.balanceOf(adminAddress)
    const beforeVaultfxPhpBalance = await testEnv.fxPHP.balanceOf(testEnv.vault.address)
    const beforeVaultUsdcBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)

    const withdrawTokensOut = await testEnv.fxPool.viewWithdraw(tokensToBurn)

    const payload = ethers.utils.defaultAbiCoder.encode(['uint256', 'address[]'], [parseUnits('30'), sortedAddresses])
    const exitPoolRequest = {
      assets: sortedAddresses,
      minAmountsOut: [0, 0], // check token out
      userData: payload,
      toInternalBalance: false,
    }

    await expect(testEnv.vault.exitPool(poolId, adminAddress, adminAddress, exitPoolRequest)).to.not.be.reverted

    const afterLpBalance = await testEnv.fxPool.balanceOf(adminAddress)
    const afterVaultfxPhpBalance = await testEnv.fxPHP.balanceOf(testEnv.vault.address)
    const afterVaultUsdcBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)

    expect(afterLpBalance, 'Current LP Balance not expected').to.be.equals(beforeLpBalance.sub(tokensToBurn))
    expect(afterVaultfxPhpBalance, 'Current fxPHP Balance not expected').to.be.equals(
      beforeVaultfxPhpBalance.sub(withdrawTokensOut[0])
    )
    expect(afterVaultUsdcBalance, 'Current USDC Balance not expected').to.be.equals(
      beforeVaultUsdcBalance.sub(withdrawTokensOut[1])
    )
  })

  it('Round 2 - Adds liquidity inside the FXPool calling the vault and triggering onJoin hook', async () => {
    const numeraireAmount = parseEther('32')
    const beforeLpBalance = await testEnv.fxPool.balanceOf(adminAddress)
    const beforeVaultfxPhpBalance = await testEnv.fxPHP.balanceOf(testEnv.vault.address)
    const beforeVaultUsdcBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)

    const viewDeposit = await testEnv.fxPool.viewDeposit(numeraireAmount)

    let fxPHPAddress = ethers.utils.getAddress(testEnv.fxPHP.address)

    let liquidityToAdd: BigNumber[] = sortTokenAddressesLikeVault(sortedAddresses, fxPHPAddress, {
      lptAmount: viewDeposit[0],
      deposits: viewDeposit[1],
    })
    console.log('liquidityToAdd result: ', liquidityToAdd)
    const payload = ethers.utils.defaultAbiCoder.encode(['uint256[]', 'address[]'], [liquidityToAdd, sortedAddresses])
    const joinPoolRequest = {
      assets: sortedAddresses,
      // https://dev.balancer.fi/resources/joins-and-exits/pool-joins#maxamountsin
      maxAmountsIn: [ethers.utils.parseUnits('1000000'), ethers.utils.parseUnits('10000000')],
      // maxAmountsIn: [liquidityToAdd[0], liquidityToAdd[1]],
      userData: payload,
      fromInternalBalance: false,
    }
    // await expect(testEnv.vault.joinPool(poolId, adminAddress, adminAddress, joinPoolRequest)).to.not.be.reverted
    console.log('joinPoolRequest packaged')
    const onJoin2Res = await testEnv.vault.joinPool(poolId, adminAddress, adminAddress, joinPoolRequest)
    console.log('onJoin2Res: ', onJoin2Res)

    const afterLpBalance = await testEnv.fxPool.balanceOf(adminAddress)
    const afterVaultfxPhpBalance = await testEnv.fxPHP.balanceOf(testEnv.vault.address)
    const afterVaultUsdcBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)

    console.log(
      `before:${beforeLpBalance}, after: ${afterLpBalance}, diff: ${afterLpBalance.sub(beforeLpBalance)}, deposit: ${
        viewDeposit[0]
      } `
    )

    expect(afterLpBalance, 'Current LP Balance not expected').to.be.equals(beforeLpBalance.add(viewDeposit[0]))
    expect(afterVaultfxPhpBalance, 'Current fxPHP Balance not expected').to.be.equals(
      beforeVaultfxPhpBalance.add(viewDeposit[1][0])
    )
    expect(afterVaultUsdcBalance, 'Current USDC Balance not expected').to.be.equals(
      beforeVaultUsdcBalance.add(viewDeposit[1][1])
    )
  })

  it.skip('Round 2 - Removes liquidity inside the FXPool calling the vault and triggering onExit hook', async () => {
    const poolId = await testEnv.fxPool.getPoolId()
    const tokensToBurn = parseEther('30')
    const beforeLpBalance = await testEnv.fxPool.balanceOf(adminAddress)
    const beforeVaultfxPhpBalance = await testEnv.fxPHP.balanceOf(testEnv.vault.address)
    const beforeVaultUsdcBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)

    const withdrawTokensOut = await testEnv.fxPool.viewWithdraw(tokensToBurn)

    const payload = ethers.utils.defaultAbiCoder.encode(['uint256', 'address[]'], [parseUnits('30'), sortedAddresses])
    const exitPoolRequest = {
      assets: sortedAddresses,
      minAmountsOut: [0, 0], // check token out
      userData: payload,
      toInternalBalance: false,
    }

    console.log('viewWithdraw: ', withdrawTokensOut)

    await expect(testEnv.vault.exitPool(poolId, adminAddress, adminAddress, exitPoolRequest)).to.not.be.reverted

    const afterLpBalance = await testEnv.fxPool.balanceOf(adminAddress)
    const afterVaultfxPhpBalance = await testEnv.fxPHP.balanceOf(testEnv.vault.address)
    const afterVaultUsdcBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)

    console.log(
      `afterlpbalance: ${afterLpBalance}, aftervaultbalance: ${afterVaultfxPhpBalance}, afterVaultUsdcBalance: ${afterVaultUsdcBalance}`
    )
    expect(afterLpBalance, 'Current LP Balance not expected').to.be.equals(beforeLpBalance.sub(tokensToBurn))
    expect(afterVaultfxPhpBalance, 'Current fxPHP Balance not expected').to.be.equals(
      beforeVaultfxPhpBalance.sub(withdrawTokensOut[0])
    )
    expect(afterVaultUsdcBalance, 'Current USDC Balance not expected').to.be.equals(
      beforeVaultUsdcBalance.sub(withdrawTokensOut[1])
    )
  })
  it.skip('Swaps tokan a and token b  calling the vault and triggering onSwap hook', async () => {
    /// VAULT INDEX: index 0: USDC, index 1: fxPHP
    console.log('Before USDC: ', await testEnv.USDC.balanceOf(adminAddress))
    console.log('Before fxPHP: ', await testEnv.fxPHP.balanceOf(adminAddress))
    console.log('FX PHP Pool amount: ', await testEnv.fxPHP.balanceOf(testEnv.vault.address))
    console.log('FX USDC Pool amount: ', await testEnv.USDC.balanceOf(testEnv.vault.address))
    const swaps = [
      {
        poolId: poolId as BytesLike,
        assetInIndex: BigNumber.from(0), // in USDC
        assetOutIndex: BigNumber.from(1), // out fxPHP
        amount: parseUnits('30', 6),
        userData: '0x' as BytesLike,
      },
    ]
    const swapAssets: string[] = sortedAddresses
    const limits = [parseUnits('999999999', 6), parseUnits('999999999')]
    const deadline = ethers.constants.MaxUint256

    const funds = {
      sender: ethers.utils.getAddress(adminAddress),
      recipient: ethers.utils.getAddress(adminAddress),
      fromInternalBalance: false,
      toInternalBalance: false,
    }

    await testEnv.vault.batchSwap(0, swaps, swapAssets, funds, limits, deadline)
    console.log('After USDC: ', await testEnv.USDC.balanceOf(adminAddress))
    console.log('After fxPHP: ', await testEnv.fxPHP.balanceOf(adminAddress))
    console.log('FX PHP Pool amount: ', await testEnv.fxPHP.balanceOf(testEnv.vault.address))
    console.log('FX USDC Pool amount: ', await testEnv.USDC.balanceOf(testEnv.vault.address))
  })
  it.skip('Previews swap caclculation from the onSwap hook', async () => {})
  it.skip('Previews swap caclculation when providing single sided liquidity from the onJoin and onExit hook', async () => {})

  it.skip('can pause pool', async () => {
    expect(await testEnv.fxPool.paused()).to.be.equals(false)

    await expect(testEnv.fxPool.setPause(true)).to.emit(testEnv.fxPool, 'Paused').withArgs(adminAddress)

    expect(await testEnv.fxPool.paused()).to.be.equals(true)

    await expect(testEnv.fxPool.connect(notOwner).setPause(false)).to.be.revertedWith(CONTRACT_REVERT.Ownable)

    await expect(testEnv.fxPool.setPause(false)).to.emit(testEnv.fxPool, 'Unpaused').withArgs(adminAddress) // reset for now, test if pool functions can still be used when paused
  })

  it.skip('can trigger emergency alarm', async () => {
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
  it.skip('can set cap when owner', async () => {
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
