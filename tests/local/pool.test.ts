import { expect } from 'chai'
import { ethers } from 'hardhat'
import { Signer } from 'ethers'
import { setupEnvironment, TestEnv } from '../common/setupEnvironment'

describe('FXPool', () => {
  let testEnv: TestEnv
  let admin: Signer
  let adminAddress: string

  before('build test env', async () => {
    testEnv = await setupEnvironment()
    ;[admin] = await ethers.getSigners()
    adminAddress = await admin.getAddress()
  })

  it('FXPool is registered on the vault', async () => {
    const poolId = await testEnv.fxPool.getPoolId()
    const poolInfoFromVault = await testEnv.vault.getPool(poolId)

    expect(
      await testEnv.fxPool.getVault(),
      'Vault in FXPool is different from the test environment vault'
    ).to.be.equals(await testEnv.vault.address)

    expect(poolInfoFromVault[0], 'FXpool is not registered in the vault').to.be.equals(testEnv.fxPool.address)
  })

  it('Adds liquidity inside the FXPool calling the vault and triggering onJoin hook', async () => {})
  it('Removes liquidity inside the FXPool calling the vault and triggering onExit hook', async () => {})
  it('Swaps tokan a and token b  calling the vault and triggering onSwap hook', async () => {})
  it('Previews swap caclculation from the onSwap hook', async () => {})
  it('Previews swap caclculation when providing single sided liquiditu from the onJoin and onExit hook', async () => {})

  it('can pause pool', async () => {
    expect(await testEnv.fxPool.paused()).to.be.equals(false)
    await testEnv.fxPool.pause(true)
    expect(await testEnv.fxPool.paused()).to.be.equals(true)
    await testEnv.fxPool.pause(false) // reset for now, test if pool functions can still be used when paused
  })

  it('can trigger emergency alarm', async () => {
    expect(await testEnv.fxPool.emergency()).to.be.equals(false)
    expect(await testEnv.fxPool.setEmergency(true))
      .to.emit(testEnv.fxPool, 'EmergencyAlarm')
      .withArgs(true)

    expect(await testEnv.fxPool.setEmergency(false))
      .to.emit(testEnv.fxPool, 'EmergencyAlarm')
      .withArgs(false) // reset for now, test emergency withdraw
  })
})
