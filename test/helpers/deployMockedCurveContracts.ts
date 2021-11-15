import { Signer } from 'ethers'
import { MockedProportionalLiquidity__factory } from '../../typechain/factories/MockedProportionalLiquidity__factory'

export async function deployMockedProportionalLiquidity(
  signer: Signer
) {
  const proportionalLiquidityDeployer = new MockedProportionalLiquidity__factory(signer)

  const proportionalLiquidityContract = await proportionalLiquidityDeployer.deploy()

  return { proportionalLiquidityContract }
}