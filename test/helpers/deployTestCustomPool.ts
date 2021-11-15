import { Signer, Wallet, BigNumberish } from 'ethers'
import { TestCustomPool__factory } from '../../typechain/factories/TestCustomPool__factory'
import { FakeToken } from '../../typechain/FakeToken'
import { Vault } from '../../typechain/Vault'

import { CustomPoolDeployParams } from '../../scripts/types/CustomPool'
import { sortAddresses } from '../../scripts/utils/sortAddresses'

import { deployMockedProportionalLiquidity } from './deployMockedCurveContracts'

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

	const poolContract = await customPoolDeployer.deploy(
		vaultContract.address,
		name,
		symbol,
		options.toSortTokens ? sortAddresses(tokens) : tokens,
		swapFeePercentage,
		pauseWindowDuration,
		bufferPeriodDuration,
		owner.address,
		proportionalLiquidityContract.address
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
