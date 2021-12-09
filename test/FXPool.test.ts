import chai, { expect } from 'chai'
import { ethers, waffle } from 'hardhat'
import { solidity } from 'ethereum-waffle'
import { map, includes, kebabCase } from 'lodash'
import Vault from '@balancer-labs/v2-deployments/deployed/kovan/Vault.json'

import { TestFXPool } from '../typechain/TestFXPool'
import { FakeToken__factory } from '../typechain/factories/FakeToken__factory'

import { deployTestCustomPool } from './helpers/deployTestCustomPool'
import { decimal, fp, addBNArrays } from './common/v2-helpers/numbers'
import { incurPoolFee } from './helpers/feeCalculator'

import { FakeToken } from '../typechain/FakeToken'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

import { CustomPoolDeployParams } from '../scripts/types/CustomPool'

describe('FX Pool', () => {
	let halodaoSigner: SignerWithAddress
	let tokenSigner: SignerWithAddress
	let beneficiarySigner: SignerWithAddress

	let tokenA: FakeToken
	let tokenB: FakeToken

	let pool: TestFXPool

	before('setup signers', async () => {
		;[halodaoSigner, tokenSigner, beneficiarySigner] = await ethers.getSigners()
	})

	sharedBeforeEach('deploy tokens', async () => {
		const MockERC20Deployer = new FakeToken__factory(tokenSigner)

		tokenA = await MockERC20Deployer.deploy('Token A', 'A')
		tokenB = await MockERC20Deployer.deploy('Token B', 'B')

		await tokenA.deployed()
		await tokenB.deployed()
	})

	async function deployPool() {
		const baseAssimilator = '0xa99202DD31C78B7A4f5C608ab286f1ac2bc03627' // PHP - USD
		const quoteAssimilator = '0xbe8aD396DCdDB55013499AD11E5de919027C42ee' // USDC - USD

		const assets = [tokenA.address, baseAssimilator, tokenA.address, baseAssimilator, tokenA.address,
		tokenB.address, quoteAssimilator, tokenB.address, quoteAssimilator, tokenB.address]
		const assetWeights = [fp(0.5), fp(0.5)]
		const swapFeePercentage = ethers.utils.parseEther('0.000001')
		const pauseWindowDuration = 7776000
		const bufferPeriodDuration = 2592000

		const poolParams: CustomPoolDeployParams = {
			vaultContract: Vault as any,
			name: 'TEST AB',
			symbol: 'TAB',
			tokens: [tokenA.address, tokenB.address],
			assets,
			assetWeights,
			swapFeePercentage,
			pauseWindowDuration,
			bufferPeriodDuration,
			// curveMath.address,
			// proportionalLiquidity.address
		}

		;({ poolContract: pool } = await deployTestCustomPool(halodaoSigner, poolParams, {
			getPoolId: false,
			toSortTokens: true,
		}))
		
	}

	sharedBeforeEach('deploy custom pool', async () => {
		await deployPool()
	})

	describe('setParams', () => {
		context('when provided with valid bonding curve parameters', () => {
			it('sets value of alpha, beta, delta, epsilon, lambda', async () => {
				// console.log('pool.setParams:', pool.setParams)
				await pool.connect(halodaoSigner).setParams(
					fp(0.8),
					fp(0.48),
					fp(0.175),
					fp(0.0005),
					fp(0.3),
				)

				console.log('Alpha:', decimal(await pool.alpha()))
				console.log('Beta:', decimal(await pool.beta()))
				console.log('Delta:', decimal(await pool.delta()))
				console.log('Epsilon:', decimal(await pool.epsilon()))
				console.log('Lambda:', decimal(await pool.lambda()))
			})

		})
	})

	describe('initialize', () => {
		context('when triggered during pool creation', () => {
			it('sets the assimilators', async () => {
				// const baseAssimilator = '0xa99202DD31C78B7A4f5C608ab286f1ac2bc03627' // PHP - USD
				// const quoteAssimilator = '0xbe8aD396DCdDB55013499AD11E5de919027C42ee' // USDC - USD

				// const addedBaseAssim = await pool.getAssimilator(baseAssimilator)
				// const addedQuoteAssim = await pool.getAssimilator(quoteAssimilator)

				const addedBaseAssim = await pool.getAssimilator(tokenA.address)
				const addedQuoteAssim = await pool.getAssimilator(tokenB.address)

				console.log('addedBaseAssim:', addedBaseAssim)
				console.log('addedQuoteAssim:', addedQuoteAssim)
			})

			it('sets the assets', async () => {

			})

			it('sets the weights', async () => {

			})

			it('sets the numeraires', async () => {
				
			})

			it('sets the derivatives', async () => {
				
			})

			it('sets the reserves', async () => {
				
			})
		})
	})

	describe('onInitializePool', () => {
		context('when provided with invalid parameters', () => {
			it('reverts when not provided with user data payload', async () => {
				const payload = '0x'

				await expect(
					pool
						.connect(halodaoSigner)
						.onInitalizePool(
							await pool.getPoolId(),
							halodaoSigner.address,
							beneficiarySigner.address,
							[ethers.utils.parseEther(`1`), ethers.utils.parseEther(`1`)],
							payload
						)
				).to.be.reverted
			})

			it('reverts when provided with missing encoded uint256[] maxAmountsIn userData payload', async () => {
				const randomPayload = fp(1)
				const payload = ethers.utils.defaultAbiCoder.encode(['uint256'], [randomPayload])

				await expect(
					pool
						.connect(halodaoSigner)
						.onInitalizePool(
							await pool.getPoolId(),
							halodaoSigner.address,
							beneficiarySigner.address,
							[ethers.utils.parseEther(`1`), ethers.utils.parseEther(`1`)],
							payload
						)
				).to.be.reverted
			})

			it('reverts when provided with short length of encoded uint256[] maxAmountsIn userData payload', async () => {
				const liquidityToAdd = [fp(100)]
				const payload = ethers.utils.defaultAbiCoder.encode(['uint256[]'], [liquidityToAdd])

				await expect(
					pool
						.connect(halodaoSigner)
						.onInitalizePool(
							await pool.getPoolId(),
							halodaoSigner.address,
							beneficiarySigner.address,
							[ethers.utils.parseEther(`1`), ethers.utils.parseEther(`1`)],
							payload
						)
				).to.be.reverted
			})

			it('reverts when provided with exceeding length of encoded uint256[] maxAmountsIn userData payload', async () => {
				const liquidityToAdd = [fp(100), fp(100), fp(100)]
				const payload = ethers.utils.defaultAbiCoder.encode(['uint256[]'], [liquidityToAdd])

				await expect(
					pool
						.connect(halodaoSigner)
						.onInitalizePool(
							await pool.getPoolId(),
							halodaoSigner.address,
							beneficiarySigner.address,
							[ethers.utils.parseEther(`1`), ethers.utils.parseEther(`1`)],
							payload
						)
				).to.be.reverted
			})
		})

		context('when provided with valid parameters', () => {
			it('decodes passed userData payload and relays to vault calculated values of bptAmountOut, amountsIn, dueProtocolFeeAmounts', async () => {
				const liquidityToAdd = [fp(100), fp(100)]
				const payload = ethers.utils.defaultAbiCoder.encode(['uint256[]'], [liquidityToAdd])

				await expect(
					pool
						.connect(halodaoSigner)
						.onInitalizePool(
							await pool.getPoolId(),
							halodaoSigner.address,
							beneficiarySigner.address,
							[ethers.utils.parseEther(`1`), ethers.utils.parseEther(`1`)],
							payload
						)
				)
					.to.emit(pool, 'TestInitializePool')
					.withArgs(3000000000000000, [fp(100), fp(100)])
			})
		})
	})

	describe('onJoinPool', () => {
		context('when provided with invalid parameters', () => {
			it('reverts when provided with empty userData payload', async () => {
				const payload = '0x'

				await expect(
					pool
						.connect(halodaoSigner)
						['onJoinPool(bytes32,address,address,uint256[],uint256,uint256,uint256[],bytes)'](
							await pool.getPoolId(),
							halodaoSigner.address,
							beneficiarySigner.address,
							[fp(100), fp(100)],
							1,
							fp(1),
							[fp(1), fp(1)],
							payload
						)
				).to.be.reverted
			})

			it('reverts when provided with missing encoded uint256[] maxAmountsIn userData payload', async () => {
				const randomPayload = fp(1)
				const payload = ethers.utils.defaultAbiCoder.encode(['uint256'], [randomPayload])

				await expect(
					pool
						.connect(halodaoSigner)
						['onJoinPool(bytes32,address,address,uint256[],uint256,uint256,uint256[],bytes)'](
							await pool.getPoolId(),
							halodaoSigner.address,
							beneficiarySigner.address,
							[fp(100), fp(100)],
							1,
							fp(1),
							[fp(1), fp(1)],
							payload
						)
				).to.be.reverted
			})

			it('reverts when provided with short length of encoded uint256[] maxAmountsIn userData payload', async () => {
				const liquidityToAdd = [fp(100)]
				const payload = ethers.utils.defaultAbiCoder.encode(['uint256[]'], [liquidityToAdd])

				await expect(
					pool
						.connect(halodaoSigner)
						['onJoinPool(bytes32,address,address,uint256[],uint256,uint256,uint256[],bytes)'](
							await pool.getPoolId(),
							halodaoSigner.address,
							beneficiarySigner.address,
							[fp(100), fp(100)],
							1,
							fp(1),
							[fp(1), fp(1)],
							payload
						)
				).to.be.reverted
			})

			it('reverts when provided with exceeding length of encoded uint256[] maxAmountsIn userData payload', async () => {
				const liquidityToAdd = [fp(100), fp(100), fp(100)]
				const payload = ethers.utils.defaultAbiCoder.encode(['uint256[]'], [liquidityToAdd])

				await expect(
					pool
						.connect(halodaoSigner)
						['onJoinPool(bytes32,address,address,uint256[],uint256,uint256,uint256[],bytes)'](
							await pool.getPoolId(),
							halodaoSigner.address,
							beneficiarySigner.address,
							[fp(100), fp(100)],
							1,
							fp(1),
							[fp(1), fp(1)],
							payload
						)
				).to.be.reverted
			})
		})

		context('when provided with valid parameters', () => {
			sharedBeforeEach('adding initial liquidity to pool', async () => {
				const liquidityToAdd = [fp(100), fp(100)]
				const payload = ethers.utils.defaultAbiCoder.encode(['uint256[]'], [liquidityToAdd])

				await expect(
					pool
						.connect(halodaoSigner)
						.onInitalizePool(
							await pool.getPoolId(),
							halodaoSigner.address,
							beneficiarySigner.address,
							[fp(1), fp(1)],
							payload
						)
				)
					.to.emit(pool, 'TestInitializePool')
					.withArgs(3000000000000000, [fp(100), fp(100)])
			})

			it('adds joinPool amount to pool liquidity after deducting balancer fees. LP is compensated with BPT tokens.', async () => {
				const liquidityToAdd = [fp(100), fp(100)]
				const payload = ethers.utils.defaultAbiCoder.encode(['uint256[]'], [liquidityToAdd])

				await expect(
					pool
						.connect(halodaoSigner)
						['onJoinPool(bytes32,address,address,uint256[],uint256,uint256,uint256[],bytes)'](
							await pool.getPoolId(),
							halodaoSigner.address,
							beneficiarySigner.address,
							[fp(100), fp(100)],
							1,
							fp(1),
							[fp(18), fp(18)],
							payload
						)
				)
					.to.emit(pool, 'TestJoinPool')
					.withArgs(fp(100), [fp(100), fp(100)], [2, 2])
			})
		})
	})

	describe('onExitPool', () => {
		context('when provided with invalid parameters', () => {
			it('reverts when not provided with user data payload', async () => {
				const payload = '0x'

				await expect(
					pool
						.connect(halodaoSigner)
						['onExitPool(bytes32,address,address,uint256[],uint256,uint256,uint256[],bytes)'](
							await pool.getPoolId(),
							halodaoSigner.address,
							beneficiarySigner.address,
							[fp(100), fp(100)],
							1,
							fp(1),
							[fp(18), fp(18)],
							payload
						)
				).to.be.reverted
			})

			it('reverts when provided with missing encoded uint256[] minAmountsOut userData payload', async () => {
				const randomData = 'foo'
				const payload = ethers.utils.defaultAbiCoder.encode(['string'], [randomData])

				await expect(
					pool
						.connect(halodaoSigner)
						['onExitPool(bytes32,address,address,uint256[],uint256,uint256,uint256[],bytes)'](
							await pool.getPoolId(),
							halodaoSigner.address,
							beneficiarySigner.address,
							[fp(100), fp(100)],
							1,
							fp(1),
							[fp(18), fp(18)],
							payload
						)
				).to.be.reverted
			})

			it('reverts when provided with short length of encoded uint256[] minAmountsOut userData payload', async () => {
				const liquidityToRemove = [fp(10)]
				const payload = ethers.utils.defaultAbiCoder.encode(['uint256[]'], [liquidityToRemove])

				await expect(
					pool
						.connect(halodaoSigner)
						['onExitPool(bytes32,address,address,uint256[],uint256,uint256,uint256[],bytes)'](
							await pool.getPoolId(),
							halodaoSigner.address,
							beneficiarySigner.address,
							[fp(100), fp(100)],
							1,
							fp(1),
							[fp(18), fp(18)],
							payload
						)
				).to.be.reverted
			})

			it('reverts when provided with exceeding length of encoded uint256[] minAmountsOut userData payload', async () => {
				const liquidityToRemove = [fp(10), fp(10), fp(10)]
				const payload = ethers.utils.defaultAbiCoder.encode(['uint256[]'], [liquidityToRemove])

				await expect(
					pool
						.connect(halodaoSigner)
						['onExitPool(bytes32,address,address,uint256[],uint256,uint256,uint256[],bytes)'](
							await pool.getPoolId(),
							halodaoSigner.address,
							beneficiarySigner.address,
							[fp(100), fp(100)],
							1,
							fp(1),
							[fp(18), fp(18)],
							payload
						)
				).to.be.reverted
			})
		})

		context('when provided with valid parameters', () => {
			it('decodes passed userData payload and relays to vault calculated values of bptAmountIn, amountsOut, dueProtocolFeeAmounts', async () => {
				const liquidityToRemove = [fp(10), fp(10)]
				const payload = ethers.utils.defaultAbiCoder.encode(['uint256[]'], [liquidityToRemove])

				await expect(
					pool
						.connect(halodaoSigner)
						['onExitPool(bytes32,address,address,uint256[],uint256,uint256,uint256[],bytes)'](
							await pool.getPoolId(),
							halodaoSigner.address,
							beneficiarySigner.address,
							[fp(100), fp(100)],
							1,
							fp(1),
							[fp(18), fp(18)],
							payload
						)
				)
					.to.emit(pool, 'TestExitPool')
					.withArgs(100000000, [fp(10), fp(10)], [0, 0])
			})
		})
	})

	describe('onSwapGivenIn', () => {
		context('when provided with invalid parameters', () => {
			it('reverts when provided with an empty swap request payload', async () => {
				const swapRequest = {}

				await expect(pool.onSwapGivenIn(swapRequest as any, fp(100), fp(100))).to.be.reverted
			})

			it('reverts when provided with an invalid swap request payload', async () => {
				const swapRequest = {
					amount: fp(100),
				}

				await expect(pool.onSwapGivenIn(swapRequest as any, fp(100), fp(100))).to.be.reverted
			})
		})

		context('when provided with valid parameters', () => {
			it('emits TestSwapGivenIn when hook execution is successful', async () => {
				const swapRequest = {
					kind: 0,
					tokenIn: tokenA.address,
					tokenOut: tokenB.address,
					amount: fp(100),
					poolId: await pool.getPoolId(),
					lastChangeBlock: 0,
					from: halodaoSigner.address,
					to: beneficiarySigner.address,
					userData: '0x',
				}

				await expect(pool.onSwapGivenIn(swapRequest as any, fp(100), fp(100)))
					.to.emit(pool, 'TestSwapGivenIn')
					.withArgs(
						await pool.getPoolId(),
						tokenA.address,
						tokenB.address,
						fp(100),
						halodaoSigner.address,
						beneficiarySigner.address,
						fp(100),
						fp(100)
					)
			})
		})
	})

	describe('onSwapGivenOut', () => {
		context('when provided with invalid parameters', () => {
			it('reverts when provided with an empty swap request payload', async () => {
				const swapRequest = {}

				await expect(pool.onSwapGivenOut(swapRequest as any, fp(100), fp(100))).to.be.reverted
			})

			it('reverts when provided with an invalid swap request payload', async () => {
				const swapRequest = {
					amount: fp(100),
				}

				await expect(pool.onSwapGivenOut(swapRequest as any, fp(100), fp(100))).to.be.reverted
			})
		})

		context('when provided with valid parameters', () => {
			it('emits TestSwapGivenOut when hook execution is successful', async () => {
				const swapRequest = {
					kind: 0,
					tokenIn: tokenA.address,
					tokenOut: tokenB.address,
					amount: fp(100),
					poolId: await pool.getPoolId(),
					lastChangeBlock: 0,
					from: halodaoSigner.address,
					to: beneficiarySigner.address,
					userData: '0x',
				}

				await expect(pool.onSwapGivenOut(swapRequest as any, fp(100), fp(100)))
					.to.emit(pool, 'TestSwapGivenOut')
					.withArgs(
						await pool.getPoolId(),
						tokenA.address,
						tokenB.address,
						fp(100),
						halodaoSigner.address,
						beneficiarySigner.address,
						fp(100),
						fp(100)
					)
			})
		})
	})
})
