import { expect } from 'chai'
import { ethers } from 'hardhat'
import { Signer } from 'ethers'
import { setupEnvironment, TestEnv } from '../common/setupEnvironment'
import { parseEther } from 'ethers/lib/utils'
import { sortAddresses } from '../common/helpers/utils'

describe('FXPool', () => {
  let testEnv: TestEnv
  let admin: Signer
  let adminAddress: string

  before('build test env', async () => {
    testEnv = await setupEnvironment()
    ;[admin] = await ethers.getSigners()
    adminAddress = await admin.getAddress()
  })

  it('Create MockPool (XSGD/USDC) and register tokens', async () => {
    await testEnv.mockWeightedPoolFactory.create(
      'HALO FX',
      'HFX',
      sortAddresses([testEnv.XSGD.address, testEnv.USDC.address]),
      [parseEther('0.5'), parseEther('0.5')],
      [adminAddress, adminAddress],
      parseEther('0.1'),
      adminAddress
    )
  })

  it('Create FXPool (XSGD/USDC) and register tokens', async () => {
    //console.log(testEnv.fxPool)
  })
})
