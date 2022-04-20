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

  const loopCount = 10

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
    const depositAmountInEther = '1000'
    const depositAmountInWei = parseEther(depositAmountInEther)

    let fxPHPAddress = ethers.utils.getAddress(testEnv.fxPHP.address)

    for (var i = 0; i < loopCount; i++) {
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
    const hlpTokenAmountInEther = '1000'
    const hlpTokensToBurninWei = parseEther(hlpTokenAmountInEther)

    /**
     * why loopCount - 2?
     * on loop # loop-2, withdraw gets liquidity invariant violation
     * suspect is viewDeposit takes numeraire directly unlike onJoinPool that converts base token amounts to numeraire
     * same behavior if you set loopCount to 5 -> withdraw #3 gets liquidity invariant violation possibly due to pool getting too small, thus withdrawals affecting invariant...?
     */
    for (var i = 0; i < loopCount - 2; i++) {
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
