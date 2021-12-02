import { Signer, Wallet, BigNumberish } from 'ethers'
import { TestCustomPool__factory } from '../../typechain/factories/TestCustomPool__factory'
import { CurveMath__factory } from '../../typechain/factories/CurveMath__factory'
import { FakeToken } from '../../typechain/FakeToken'
import { Vault } from '../../typechain/Vault'

import { CustomPoolDeployParams } from '../../scripts/types/CustomPool'
import { sortAddresses } from '../../scripts/utils/sortAddresses'

import { deployMockedProportionalLiquidity } from './deployMockedCurveContracts'

import { fp } from '../common//v2-helpers/numbers'

export async function deployTestCustomPool(
	signer: Signer,
	params: CustomPoolDeployParams,
	options = {
		toSortTokens: true,
		getPoolId: true
	}
) {
	const { proportionalLiquidityContract } = await deployMockedProportionalLiquidity(signer)

	const customPoolDeployer = new TestCustomPool__factory(
		signer
	)

	const { vaultContract, name, symbol, tokens, swapFeePercentage, pauseWindowDuration, bufferPeriodDuration, owner } = params

	/** Deploy Curve Math */
	const CurveMath = new CurveMath__factory(signer)
	const curveMath = await CurveMath.deploy()
	await curveMath.deployed()

	/** Deploy Assimilator Here */
	const baseAssimilator = '0xa99202DD31C78B7A4f5C608ab286f1ac2bc03627' // PHP - USD
	const quoteAssimilator = '0xbe8aD396DCdDB55013499AD11E5de919027C42ee' // USDC - USD
	const PROPORTIONAL_LIQUIDITY = '0xb41B19c72bAc4A61e808890D9F150BC66f6CDa28'

	const assets = [tokens[0], baseAssimilator, tokens[0], baseAssimilator, tokens[0],
	tokens[1], quoteAssimilator, tokens[1], quoteAssimilator, tokens[1]]
	const assetWeights = [fp(0.5), fp(0.5)]

	const poolContract = await customPoolDeployer.deploy(
		vaultContract.address,
		name,
		symbol,
		options.toSortTokens ? sortAddresses(tokens) : tokens,
		assets,
		assetWeights,
		swapFeePercentage,
		pauseWindowDuration,
		bufferPeriodDuration,
		owner.address,
		// proportionalLiquidityContract.address
		curveMath.address,
		PROPORTIONAL_LIQUIDITY,
	)

	if (options.getPoolId) {
		// grab last poolId from last event
		const newPools = vaultContract.filters.PoolRegistered(null, null, null)
		const results = await vaultContract.queryFilter(newPools)
		const poolIds: string[] = results.map((result) => result.args?.poolId)
		const poolId = poolIds[poolIds.length - 1]

		return { poolContract, poolId }
	}

	return { poolContract }
}
