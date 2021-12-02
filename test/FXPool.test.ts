import chai, { expect } from 'chai'
import { ethers, waffle } from 'hardhat'
import { solidity } from 'ethereum-waffle'
import { map, includes, kebabCase } from 'lodash'
import Vault from '@balancer-labs/v2-deployments/deployed/kovan/Vault.json'

import { TestCustomPool } from '../typechain/TestCustomPool'
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

	let pool: TestCustomPool

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
		const poolParams: CustomPoolDeployParams = {
			vaultContract: Vault as any,
			name: 'Test Custom Pool',
			symbol: 'TCP',
			tokens: [tokenA.address, tokenB.address],
			swapFeePercentage: ethers.utils.parseEther('0.000001'),
			pauseWindowDuration: 7776000,
			bufferPeriodDuration: 2592000,
			owner: halodaoSigner as any,
		}

		;({ poolContract: pool } = await deployTestCustomPool(halodaoSigner, poolParams, {
			getPoolId: false,
			toSortTokens: true,
		}))
	}

	sharedBeforeEach('deploy custom pool', async () => {
		await deployPool()
	})

	describe('Pool Creation', () => {
		describe('Bonding curve initialization', () => {
			it('sets value of alpha', async () => {
				console.log('Alpha:', decimal(await pool.alpha()))
			})

			it('sets value of beta', async () => {
				console.log('Beta:', await pool.beta())
			})

			it('sets value of delta', async () => {
				console.log('Delta:', await pool.delta())
			})

			it('sets value of epsilon', async () => {
				console.log('Epsilon:', await pool.epsilon())
			})

			it('sets value of lambda', async () => {
				console.log('Lambda:', await pool.lambda())
			})

			it('sets values of weights', async () => {
				console.log('Weights:', await pool.weights(0))
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
