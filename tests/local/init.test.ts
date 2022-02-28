import { expect } from 'chai'
import { ethers } from 'hardhat'
import { Signer } from 'ethers'

import { mockToken } from '../constants/mockTokenList'
import { parseUnits } from 'ethers/lib/utils'
import { approveMockToken } from '../common/helpers/mockTokenHelpers'
import { INTIAL_MINT } from '../constants'
import { setupEnvironment, TestEnv } from '../common/setupEnvironment'

/**
 * Mocked Entities
 * Vault - test balancer integration
 * Mock Pool - simulate swaps from non HALODAO Pools
 * Mock Oracle - mocked chainlink for assimilators
 * Mock WETH/Tokens - tokens for testing
 */

describe('Scaffold setup ', () => {
  let testEnv: TestEnv
  let admin: Signer

  before('build test env', async () => {
    testEnv = await setupEnvironment()
    ;[admin] = await ethers.getSigners()
  })

  it('Vault and WETH Contracts are deployed', async () => {
    expect(testEnv.WETH.address, 'WETH is not deployed').to.be.properAddress
    expect(testEnv.vault.address, 'Vault is not deployed').to.be.properAddress
  })

  it('Mock Weighted Pool is deployed', async () => {
    const poolId = await testEnv.mockPool.getPoolId()
    expect(testEnv.mockPool.address).to.be.properAddress
    expect(poolId).to.not.be.empty
    expect(await testEnv.mockPool.getVault()).to.be.equals(testEnv.vault.address)
  })

  it('Mock tokens and oracles test', async () => {
    const adminAddress = await admin.getAddress()
    const MOCK_APPROVE_VALUE = '5'

    for (const token of testEnv.mockTokenArray) {
      const tokenDecimals = await token.tokenInstance.decimals()
      const tokenName = await token.tokenInstance.name()
      expect(token.tokenInstance.address, 'MintableERC20 is not deployed').to.be.properAddress
      expect(await token.tokenInstance.balanceOf(adminAddress)).to.equals(parseUnits(INTIAL_MINT, tokenDecimals))
      expect(await token.tokenInstance.allowance(adminAddress, testEnv.vault.address)).to.equals(0)
      await approveMockToken(token.tokenInstance.address, MOCK_APPROVE_VALUE, tokenDecimals, testEnv.vault.address)
      expect(await token.tokenInstance.allowance(adminAddress, testEnv.vault.address)).to.equals(
        parseUnits(MOCK_APPROVE_VALUE, tokenDecimals)
      )

      expect(token.oracleInstance.address).to.be.properAddress

      const MOCK_TOKEN_REFERENCE = mockToken.find((t) => t.name === tokenName)

      expect(await token.oracleInstance.latestAnswer()).to.be.equals(MOCK_TOKEN_REFERENCE!.mockOraclePrice)
    }
  })
})
