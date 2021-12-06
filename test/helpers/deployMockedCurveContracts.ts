import { ethers } from 'hardhat'
import { Signer } from 'ethers'
import { Assimilators__factory } from '../../typechain/factories/Assimilators__factory'
import { CurveMath__factory } from '../../typechain/factories/CurveMath__factory'

export async function deployMockedProportionalLiquidity(
  signer: Signer
) {
  /** Deploy Assimilators */
	const AssimilatorsLib = new Assimilators__factory(signer)
	const assimilators = await AssimilatorsLib.deploy()
	await assimilators.deployed()

	/** Deploy Curve Math */
	const CurveMathLib = new CurveMath__factory(signer)
	const curveMath = await CurveMathLib.deploy()
	await curveMath.deployed()

  const ProportionalLiquidityFactory = await ethers.getContractFactory('ProportionalLiquidity', {
		libraries: {
			Assimilators: assimilators.address,
			CurveMath: curveMath.address,
		}
	})

  const proportionalLiquidityContract = await ProportionalLiquidityFactory.deploy()
  await proportionalLiquidityContract.deployed()

  return { proportionalLiquidityContract }
}