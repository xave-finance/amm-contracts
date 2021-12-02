import { Signer } from 'ethers'
import { ProportionalLiquidity__factory } from '../../typechain/factories/ProportionalLiquidity__factory'

export async function deployMockedProportionalLiquidity(
  signer: Signer
) {
  const proportionalLiquidityDeployer = new ProportionalLiquidity__factory(signer)

  const proportionalLiquidityContract = await proportionalLiquidityDeployer.deploy()

  return { proportionalLiquidityContract }
}