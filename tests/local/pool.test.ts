import { expect } from 'chai'
import { ethers } from 'hardhat'
import { Signer } from 'ethers'
import { setupEnvironment, TestEnv } from '../common/setupEnvironment'
import { parseEther } from 'ethers/lib/utils'
import { toNormalizedWeights } from '@balancer-labs/balancer-js'
import { parse } from 'path'

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
      [testEnv.XSGD.address, testEnv.USDC.address],
      [parseEther('0.5'), parseEther('0.5')],
      [adminAddress, adminAddress],
      parseEther('0.1'),
      adminAddress
    )
  })

  it('Join for MockPool (XSGD/USDC)', async () => {
    //  const poolId = await testEnv.mockPool.getPoolId()

    const liquidityToAdd = [parseEther('1'), parseEther('1')]
    const payload = ethers.utils.defaultAbiCoder.encode(['uint256[]'], [liquidityToAdd])
    const joinPoolRequest = {
      assets: [testEnv.XSGD.address, testEnv.USDC.address],
      maxAmountsIn: [parseEther('1'), parseEther('1')],
      userData: payload,
      fromInternalBalance: true,
    }

    // await testEnv.vault.joinPool(
    //   '0xd4721ce3f2f16c602abed6492fd4d7453a603219000200000000000000000000',
    //   adminAddress,
    //   adminAddress,
    //   joinPoolRequest
    // )
  })
})
