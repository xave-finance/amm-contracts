import chai, { expect } from 'chai'
// import chaiAlmost from 'chai-almost'
import { ethers, waffle } from 'hardhat'
import { solidity } from 'ethereum-waffle'
import { map, includes, findIndex } from 'lodash'

import { CustomPoolDeployParams } from '../scripts/types/CustomPool'

import { TestCustomPool } from '../typechain/TestCustomPool'
import { FakeToken__factory } from '../typechain/factories/FakeToken__factory'
import exp from 'constants'
import { createSnapshot, restoreSnapshot } from './helpers/snapshots'
import { deployBalancerVault } from './helpers/deployBalancerVault'
import { deployTestCustomPool } from './helpers/deployTestCustomPool'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { getCurrentTimestamp } from './helpers/time'
import { FakeToken } from '../typechain/FakeToken'
import { Vault } from '../typechain/Vault'

import { decimal, fp, addBNArrays } from './common/v2-helpers/numbers'
import { sortAddresses } from '../scripts/utils/sortAddresses'
import { incurPoolFee } from './helpers/feeCalculator'
import { BigNumberish } from 'ethers'

const { provider } = waffle

chai.use(solidity)

const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
const swapFeePercentage = ethers.utils.parseEther('0.000001')
const pauseWindowDuration = 7776000
const bufferPeriodDuration = 2592000

describe('Vault Integration', () => {
	let balancerSigner: SignerWithAddress
	let halodaoSigner: SignerWithAddress
	let tokenSigner: SignerWithAddress
	let beneficiarySigner: SignerWithAddress
	let tokenA: FakeToken
	let tokenB: FakeToken
	let balancerVaultContract: Vault

	before('setup signers', async () => {
		;[balancerSigner, halodaoSigner, tokenSigner, beneficiarySigner] = await ethers.getSigners()
	})

	sharedBeforeEach('deploy tokens', async () => {
		const MockERC20Deployer = new FakeToken__factory(tokenSigner)

		tokenA = await MockERC20Deployer.deploy('Token A', 'A')
		tokenB = await MockERC20Deployer.deploy('Token B', 'B')

		await tokenA.deployed()
		await tokenB.deployed()
	})

	sharedBeforeEach('instantiate balancer vault contract', async () => {
		balancerVaultContract = await deployBalancerVault(balancerSigner, WETH_ADDRESS)

		await balancerVaultContract.setRelayerApproval(
			balancerSigner.address,
			halodaoSigner.address,
			true
		)
	})

	context('integration tested with custom pool inheriting from BaseMinimalSwapInfoPool', () => {
		it('when provided with good deploy pool parameters', async () => {
			const goodDeployParams: CustomPoolDeployParams = {
				vaultContract: balancerVaultContract,
				name: 'Test Custom Pool',
				symbol: 'TCP',
				tokens: [tokenA.address, tokenB.address],
				swapFeePercentage,
				pauseWindowDuration,
				bufferPeriodDuration,
				owner: halodaoSigner as any,
			}

			await testVaultIntegrationWithPool(goodDeployParams, deployTestCustomPool)
		})
	})

	function testVaultIntegrationWithPool(params: CustomPoolDeployParams, deployPoolFunction: any) {
		let pool: TestCustomPool

		const deployOptions = {
			toSortTokens: true,
			getPoolId: true,
		}

		async function deployPool(poolParams = params, options = deployOptions): Promise<void> {
			;({ poolContract: pool } = await deployPoolFunction(halodaoSigner, poolParams, options))
		}

		async function addInitialLiquidity(
			poolId: string,
			liquidityToAdd = [fp(100), fp(100)]
		): Promise<void> {
			const payload = ethers.utils.defaultAbiCoder.encode(['uint256[]'], [liquidityToAdd])
			const lpAddress = halodaoSigner.address

			const joinPoolRequest = {
				// assets: params.tokens,
				assets: sortAddresses(params.tokens),
				maxAmountsIn: liquidityToAdd,
				userData: payload,
				fromInternalBalance: false,
			}

			await balancerVaultContract
				.connect(halodaoSigner)
				.joinPool(poolId, halodaoSigner.address, lpAddress, joinPoolRequest)
		}

		describe('pool creation', () => {
			context('provided with valid deployment pool parameters', () => {
				sharedBeforeEach('deploy custom pool', async () => {
					await deployPool()
				})

				it('sets the vault contract', async () => {
					expect(await pool.getVault()).to.equal(params.vaultContract.address)
				})

				it('uses minimal swap info pool specialization', async () => {})

				it('register passed tokens in the vault', async () => {
					const { tokens, balances } = await balancerVaultContract.getPoolTokens(
						await pool.getPoolId()
					)
					const balancesInNumber = map(balances, (e) => e.toNumber())

					expect(tokens).to.include(params.tokens[0])
					expect(tokens).to.include(params.tokens[1])

					expect(balancesInNumber).to.deep.equal([0, 0])
				})

				it('starts with 0 BPT supply', async () => {
					expect(await pool.totalSupply()).to.be.equal(0)
				})

				it('sets passed swap fee', async () => {
					expect(await pool.getSwapFeePercentage()).to.equal(params.swapFeePercentage)
				})

				it('sets passed pool name', async () => {
					expect(await pool.name()).to.equal(params.name)
				})

				it('sets passed pool symbol', async () => {
					expect(await pool.symbol()).to.equal(params.symbol)
				})

				it('sets pool LP token decimals', async () => {
					expect(await pool.decimals()).to.equal(18)
				})

				it('sets swap percentage fee', async () => {
					expect(await pool.getSwapFeePercentage()).to.be.deep.equal(swapFeePercentage)
				})
			})

			context('provided with invalid deployment pool parameters', () => {
				it('reverts if passed pool tokens are unsorted', async () => {
					const badSortedTokens = params.tokens.reverse()

					await expect(
						deployPool(
							{ ...params, tokens: badSortedTokens },
							{ toSortTokens: false, getPoolId: true }
						)
					).to.be.revertedWith('BAL#101') // UNSORTED_ARRAY
				})

				it('reverts if passed swap percentage fee is too high', async () => {
					const badPercentageFeePercentage = fp(0.1).add(1)

					await expect(
						deployPool({ ...params, swapFeePercentage: badPercentageFeePercentage })
					).to.be.revertedWith('BAL#202') // MAX_SWAP_FEE_PERCENTAGE
				})

				it('reverts if passed swap percentage fee is too low', async () => {
					const badPercentageFeePercentage = fp(0.00000000000001)

					await expect(
						deployPool({ ...params, swapFeePercentage: badPercentageFeePercentage })
					).to.be.revertedWith('BAL#203') // MIN_SWAP_FEE_PERCENTAGE
				})
			})
		})

		describe('onJoinPool', () => {
			sharedBeforeEach('deploy pool', async () => {
				await deployPool()
			})

			sharedBeforeEach('mint pool tokens to LP', async () => {
				await tokenA.connect(tokenSigner).mint(halodaoSigner.address, fp(1000))
				await tokenB.connect(tokenSigner).mint(halodaoSigner.address, fp(1000))

				await tokenA.connect(halodaoSigner).approve(balancerVaultContract.address, fp(1000))
				await tokenB.connect(halodaoSigner).approve(balancerVaultContract.address, fp(1000))
			})

			context('externally called', () => {
				it('reverts if caller is not vault contract', async () => {
					await expect(
						pool
							.connect(halodaoSigner)
							['onJoinPool(bytes32,address,address,uint256[],uint256,uint256,uint256[],bytes)'](
								await pool.getPoolId(),
								halodaoSigner.address,
								beneficiarySigner.address,
								[0, 0],
								0,
								0,
								[1, 1],
								'0x'
							)
					).to.be.reverted
				})
			})

			context('when invalid join pool request is provided', () => {
				it('reverts if no payload passed in user data', async () => {
					const badUserData = '0x'

					const liquidityToAdd = [ethers.utils.parseEther(`1`), ethers.utils.parseEther(`1`)]

					const joinPoolRequest = {
						assets: params.tokens,
						maxAmountsIn: liquidityToAdd,
						userData: badUserData,
						fromInternalBalance: false,
					}

					await expect(
						balancerVaultContract
							.connect(halodaoSigner)
							.joinPool(
								await pool.getPoolId(),
								halodaoSigner.address,
								beneficiarySigner.address,
								joinPoolRequest
							)
					).to.be.reverted
				})

				it('reverts when invalid length of liquidityToAdd is passed', async () => {
					const liquidityToAdd = [ethers.utils.parseEther(`100`)]
					const payload = ethers.utils.defaultAbiCoder.encode(['uint256[]'], [liquidityToAdd])

					const joinPoolRequest = {
						assets: params.tokens,
						maxAmountsIn: liquidityToAdd,
						userData: payload,
						fromInternalBalance: false,
					}

					expect(await pool.totalSupply()).to.equal(0)

					await expect(
						balancerVaultContract
							.connect(halodaoSigner)
							.joinPool(
								await pool.getPoolId(),
								halodaoSigner.address,
								beneficiarySigner.address,
								joinPoolRequest
							)
					).to.be.revertedWith('BAL#103') // INPUT_LENGTH_MISMATCH
				})
			})

			context('pool liquidity initialization', () => {
				it('grants initial BPT amount of BPT tokens and no fee is charged on added liquidity when joinPool request is valid', async () => {
					const liquidityToAdd = [fp(100), fp(100)]
					const payload = ethers.utils.defaultAbiCoder.encode(['uint256[]'], [liquidityToAdd])

					const joinPoolRequest = {
						assets: params.tokens,
						maxAmountsIn: liquidityToAdd,
						userData: payload,
						fromInternalBalance: false,
					}

					expect(await pool.totalSupply()).to.equal(0)

					await expect(
						balancerVaultContract
							.connect(halodaoSigner)
							.joinPool(
								await pool.getPoolId(),
								halodaoSigner.address,
								beneficiarySigner.address,
								joinPoolRequest
							)
					).to.be.not.reverted

					const bptTokensSentTo0x = 1000000 // set as constant in `BasePool` which Custom pool inherits from
					const calculatedBptTokensGrantedToLP = 3000000000000000 - bptTokensSentTo0x

					const updatedBalances = liquidityToAdd // no fee is charged during onInitializePool handling

					const { tokens, balances: newBalances } = await balancerVaultContract.getPoolTokens(
						await pool.getPoolId()
					)

					expect(await pool.balanceOf(beneficiarySigner.address)).to.be.deep.equal(
						calculatedBptTokensGrantedToLP
					)

					expect(tokens, 'Invalid tokens.').to.be.deep.equal(params.tokens)

					expect(
						updatedBalances,
						'Updated pool liquidity does not match with asserted figure.'
					).to.be.deep.equal(newBalances)
				})
			})

			context('once pool has been funded with initial liquidity', () => {
				sharedBeforeEach('deploy and add initial liquidity on pool', async () => {
					const liquidityToAdd = [fp(100), fp(100)]
					const payload = ethers.utils.defaultAbiCoder.encode(['uint256[]'], [liquidityToAdd])
					const lpAddress = beneficiarySigner.address

					const joinPoolRequest = {
						assets: params.tokens,
						maxAmountsIn: liquidityToAdd,
						userData: payload,
						fromInternalBalance: false,
					}

					await balancerVaultContract
						.connect(halodaoSigner)
						.joinPool(await pool.getPoolId(), halodaoSigner.address, lpAddress, joinPoolRequest)
				})

				// context('when taking deposit balance from liquidity provider internal balance', () => {
				// 	it('reverts if lp has no internal vault balance', async () => {
				// 		const liquidityToAdd = [fp(100), fp(100)]
				// 		const payload = ethers.utils.defaultAbiCoder.encode(['uint256[]'], [liquidityToAdd])

				// 		const joinPoolRequest = {
				// 			assets: params.tokens,
				// 			maxAmountsIn: liquidityToAdd,
				// 			userData: payload,
				// 			fromInternalBalance: true,
				// 		}

				// 		await expect(
				// 			balancerVaultContract
				// 				.connect(halodaoSigner)
				// 				.joinPool(await pool.getPoolId(), halodaoSigner.address, halodaoSigner.address, joinPoolRequest),
				// 			'Adding liquidity failed.'
				// 		).to.be.revertedWith('asdasdasd')
				// 	})

				// })

				it('increases pool liquidity by amount sent by LP provider after fees and LP is rewarded with BPT allocation', async () => {
					const liquidityToAdd = [fp(100), fp(100)]
					const payload = ethers.utils.defaultAbiCoder.encode(['uint256[]'], [liquidityToAdd])
					const lpAddress = beneficiarySigner.address

					const joinPoolRequest = {
						assets: params.tokens,
						maxAmountsIn: liquidityToAdd,
						userData: payload,
						fromInternalBalance: false,
					}

					const { tokens, balances: oldBalances } = await balancerVaultContract.getPoolTokens(
						await pool.getPoolId()
					)
					const oldLpBptBalance = await pool.balanceOf(lpAddress)

					await expect(
						balancerVaultContract
							.connect(halodaoSigner)
							.joinPool(await pool.getPoolId(), halodaoSigner.address, lpAddress, joinPoolRequest),
						'Adding liquidity failed.'
					).to.be.not.reverted

					const testSwapFeePercentage = fp(0.000000000000000002) // due protocol amounts
					const afterFeeAmount = map(liquidityToAdd, (l) => incurPoolFee(l, testSwapFeePercentage))

					const calculatedLpBptBalance = oldLpBptBalance.add(liquidityToAdd[0])

					const updatedLpBptBalance = await pool.balanceOf(lpAddress)

					const { balances: newBalances } = await balancerVaultContract.getPoolTokens(
						await pool.getPoolId()
					)

					const updatedBalances = addBNArrays(oldBalances, afterFeeAmount as any)

					expect(tokens, 'Invalid tokens.').to.be.deep.equal(params.tokens)

					expect(calculatedLpBptBalance).to.be.deep.equal(updatedLpBptBalance)

					expect(
						updatedBalances,
						'Updated pool liquidity does not match with asserted figure.'
					).to.be.deep.equal(newBalances)
				})
			})
		})

		describe('onExitPool', () => {
			sharedBeforeEach('deploy pool', async () => {
				await deployPool()
			})

			sharedBeforeEach('mint pool tokens to LP', async () => {
				await tokenA.connect(tokenSigner).mint(halodaoSigner.address, fp(1000))
				await tokenB.connect(tokenSigner).mint(halodaoSigner.address, fp(1000))

				await tokenA.connect(halodaoSigner).approve(balancerVaultContract.address, fp(1000))
				await tokenB.connect(halodaoSigner).approve(balancerVaultContract.address, fp(1000))
			})

			context('externally called', () => {
				it('reverts if caller is not vault contract', async () => {
					await expect(
						pool
							.connect(halodaoSigner)
							['onExitPool(bytes32,address,address,uint256[],uint256,uint256,uint256[],bytes)'](
								await pool.getPoolId(),
								halodaoSigner.address,
								beneficiarySigner.address,
								[0, 0],
								0,
								0,
								[1, 1],
								'0x'
							)
					).to.be.reverted
				})
			})

			context('when invalid exit pool request is provided', () => {
				it('reverts when exit pool request has no userData payload', async () => {
					const liquidityToRemove = [fp(50), fp(50)]
					const payload = '0x'

					const exitPoolRequest = {
						assets: params.tokens,
						minAmountsOut: liquidityToRemove,
						userData: payload,
						toInternalBalance: false,
					}

					await expect(
						balancerVaultContract
							.connect(halodaoSigner)
							.exitPool(
								await pool.getPoolId(),
								halodaoSigner.address,
								beneficiarySigner.address,
								exitPoolRequest
							)
					).to.be.reverted
				})

				it('reverts when provided with invalid length of liquidity to remove payload', async () => {
					const liquidityToRemove = [fp(50)]
					const payload = ethers.utils.defaultAbiCoder.encode(['uint256[]'], [liquidityToRemove])

					const exitPoolRequest = {
						assets: params.tokens,
						minAmountsOut: liquidityToRemove,
						userData: payload,
						toInternalBalance: false,
					}

					await expect(
						balancerVaultContract
							.connect(halodaoSigner)
							.exitPool(
								await pool.getPoolId(),
								halodaoSigner.address,
								halodaoSigner.address,
								exitPoolRequest
							)
					).to.be.revertedWith('BAL#103') // INPUT_LENGTH_MISMATCH
				})
			})

			context('when no initial pool liquidity has been added', () => {
				it('reverts with error when attempting to exit when pool has no liquidity', async () => {
					const liquidityToRemove = [fp(50), fp(50)]
					const payload = ethers.utils.defaultAbiCoder.encode(['uint256[]'], [liquidityToRemove])

					const exitPoolRequest = {
						assets: params.tokens,
						minAmountsOut: liquidityToRemove,
						userData: payload,
						toInternalBalance: false,
					}

					await expect(
						balancerVaultContract
							.connect(halodaoSigner)
							.exitPool(
								await pool.getPoolId(),
								halodaoSigner.address,
								beneficiarySigner.address,
								exitPoolRequest
							)
					).to.be.revertedWith('BAL#417') // ERC20_BURN_EXCEEDS_ALLOWANCE
				})
			})

			context('when pool has been funded with initial liquidity', () => {
				sharedBeforeEach('add initial liquidity on pool', async () => {
					const liquidityToAdd = [fp(100), fp(100)]
					const payload = ethers.utils.defaultAbiCoder.encode(['uint256[]'], [liquidityToAdd])
					const lpAddress = halodaoSigner.address

					const joinPoolRequest = {
						assets: params.tokens,
						maxAmountsIn: liquidityToAdd,
						userData: payload,
						fromInternalBalance: false,
					}

					await balancerVaultContract
						.connect(halodaoSigner)
						.joinPool(await pool.getPoolId(), halodaoSigner.address, lpAddress, joinPoolRequest)

					await balancerVaultContract
						.connect(halodaoSigner)
						.joinPool(await pool.getPoolId(), halodaoSigner.address, lpAddress, joinPoolRequest)
				})

				it('reverts when pool has insufficient pool liquidity to cover liquidity to be removed', async () => {
					const liquidityToRemove = [fp(250), fp(250)]
					const payload = ethers.utils.defaultAbiCoder.encode(['uint256[]'], [liquidityToRemove])

					const exitPoolRequest = {
						assets: params.tokens,
						minAmountsOut: liquidityToRemove,
						userData: payload,
						toInternalBalance: false,
					}

					await expect(
						balancerVaultContract
							.connect(halodaoSigner)
							.exitPool(
								await pool.getPoolId(),
								halodaoSigner.address,
								halodaoSigner.address,
								exitPoolRequest
							)
					).to.be.revertedWith('BAL#001') // Not documented in BalancerErrors.sol
				})

				it('reverts when caller does not have sufficient BPT balance to cover liquidity to remove', async () => {
					const liquidityToRemove = [fp(150), fp(150)]
					const exitPoolPayload = ethers.utils.defaultAbiCoder.encode(
						['uint256[]'],
						[liquidityToRemove]
					)

					const exitPoolRequest = {
						assets: params.tokens,
						minAmountsOut: liquidityToRemove,
						userData: exitPoolPayload,
						toInternalBalance: false,
					}

					await expect(
						balancerVaultContract
							.connect(beneficiarySigner)
							.exitPool(
								await pool.getPoolId(),
								beneficiarySigner.address,
								halodaoSigner.address,
								exitPoolRequest
							)
					).to.be.revertedWith('BAL#417') // ERC20_BURN_EXCEEDS_ALLOWANCE
				})

				it('can exit pool successfully when LP has sufficient BPT balance and pool has sufficient pool liquidity to cover liquidity to be removed', async () => {
					const liquidityToRemove = [fp(70), fp(70)]
					const exitPoolPayload = ethers.utils.defaultAbiCoder.encode(
						['uint256[]'],
						[liquidityToRemove]
					)

					await pool.connect(halodaoSigner).approve(pool.address, fp(10000))
					await pool.connect(halodaoSigner).approve(balancerVaultContract.address, fp(10000))

					const exitPoolRequest = {
						assets: params.tokens,
						minAmountsOut: liquidityToRemove,
						userData: exitPoolPayload,
						toInternalBalance: false,
					}

					const oldTokenABalance = await tokenA.balanceOf(halodaoSigner.address)
					const oldTokenBBalance = await tokenB.balanceOf(halodaoSigner.address)

					await expect(
						balancerVaultContract
							.connect(halodaoSigner)
							.exitPool(
								await pool.getPoolId(),
								halodaoSigner.address,
								halodaoSigner.address,
								exitPoolRequest
							)
					).to.be.not.reverted

					const calculatedTokenABalance = oldTokenABalance.add(fp(70))
					const calculatedTokenBBalance = oldTokenBBalance.add(fp(70))

					expect(await tokenA.balanceOf(halodaoSigner.address)).to.be.deep.equal(
						calculatedTokenABalance
					)
					expect(await tokenB.balanceOf(halodaoSigner.address)).to.be.deep.equal(
						calculatedTokenBBalance
					)
				})

				it('sends tokens to LP internal vault balance when toInternalBalance choice is set to true', async () => {
					const liquidityToRemove = [fp(70), fp(70)]
					const exitPoolPayload = ethers.utils.defaultAbiCoder.encode(
						['uint256[]'],
						[liquidityToRemove]
					)

					await pool.connect(halodaoSigner).approve(pool.address, fp(10000))
					await pool.connect(halodaoSigner).approve(balancerVaultContract.address, fp(10000))

					const exitPoolRequest = {
						assets: params.tokens,
						minAmountsOut: liquidityToRemove,
						userData: exitPoolPayload,
						toInternalBalance: true,
					}

					await expect(
						balancerVaultContract
							.connect(halodaoSigner)
							.exitPool(
								await pool.getPoolId(),
								halodaoSigner.address,
								halodaoSigner.address,
								exitPoolRequest
							)
					).to.be.not.reverted

					expect(
						await balancerVaultContract.getInternalBalance(halodaoSigner.address, [
							tokenA.address,
							tokenB.address,
						])
					).to.be.deep.equal(liquidityToRemove)
				})
			})
		})

		describe('onSwap', () => {
			sharedBeforeEach('deploy pool', async () => {
				await deployPool()
			})

			sharedBeforeEach('mint pool tokens to LP', async () => {
				await tokenA.connect(tokenSigner).mint(halodaoSigner.address, fp(1000))
				await tokenB.connect(tokenSigner).mint(halodaoSigner.address, fp(1000))

				await tokenA.connect(halodaoSigner).approve(balancerVaultContract.address, fp(1000))
				await tokenB.connect(halodaoSigner).approve(balancerVaultContract.address, fp(1000))
			})

			async function testSingleSwapStimulation(swapKind: number) {
				context('when pool has no initial liquidity for all tokens', () => {
					it('reverts swap request as there is no liquidity', async () => {
						const swapRequest = {
							poolId: await pool.getPoolId(),
							kind: swapKind,
							assetIn: tokenA.address,
							assetOut: tokenB.address,
							amount: fp(100),
							userData: '0x',
						}

						const fundManagement = {
							sender: halodaoSigner.address,
							fromInternalBalance: false,
							recipient: halodaoSigner.address,
							toInternalBalance: false,
						}

						const limit = 10
						const deadline = (await ethers.provider.getBlock(28132012)).timestamp + 10000

						await expect(
							balancerVaultContract
								.connect(halodaoSigner)
								.swap(swapRequest, fundManagement, limit, deadline)
						).to.be.revertedWith('BAL#001') // error not documented
					})
				})

				context('when pool has 0% token A liquidity and 100% token B liquidity', () => {
					sharedBeforeEach('add initial liquidity', async () => {
						await deployPool()
						await addInitialLiquidity(await pool.getPoolId(), [fp(0), fp(100)])
					})

					it('reverts when base is token B and quote is token A', async () => {
						const swapRequest = {
							poolId: await pool.getPoolId(),
							kind: swapKind,
							assetIn: tokenB.address,
							assetOut: tokenA.address,
							amount: fp(100),
							userData: '0x',
						}

						const fundManagement = {
							sender: halodaoSigner.address,
							fromInternalBalance: false,
							recipient: halodaoSigner.address,
							toInternalBalance: false,
						}

						const limit = 100
						const deadline = (await ethers.provider.getBlock(28132012)).timestamp + 10000

						await expect(
							balancerVaultContract
								.connect(halodaoSigner)
								.swap(swapRequest, fundManagement, limit, deadline)
						).to.be.revertedWith('BAL#001') // error not documented
					})

					if (swapKind === 0) {
						it('swaps when base is token A and quote is token B, and kind = GIVEN_IN', async () => {
							const swapRequest = {
								poolId: await pool.getPoolId(),
								kind: swapKind,
								assetIn: tokenA.address,
								assetOut: tokenB.address,
								amount: fp(10),
								userData: '0x',
							}

							const fundManagement = {
								sender: halodaoSigner.address,
								fromInternalBalance: false,
								recipient: beneficiarySigner.address,
								toInternalBalance: false,
							}

							const deadline = (await ethers.provider.getBlock(28132012)).timestamp + 10000
							const oldBalance = await tokenB.balanceOf(beneficiarySigner.address)

							const limit = 100
							await expect(
								balancerVaultContract
									.connect(halodaoSigner)
									.swap(swapRequest, fundManagement, limit, deadline)
							).to.be.not.reverted

							const minuend = await pool.getSwapFeePercentage()
							const calculatedSwappedAmount = oldBalance.add(fp(10)).sub(minuend.mul(10))
							expect(await tokenB.balanceOf(beneficiarySigner.address)).to.be.deep.equal(
								calculatedSwappedAmount
							)
						})
					}

					if (swapKind === 1) {
						it('reverts when base is token A, quote is token B, and kind = GIVEN_OUT', async () => {
							const swapRequest = {
								poolId: await pool.getPoolId(),
								kind: swapKind,
								assetIn: tokenA.address,
								assetOut: tokenB.address,
								amount: fp(10),
								userData: '0x',
							}

							const fundManagement = {
								sender: halodaoSigner.address,
								fromInternalBalance: false,
								recipient: beneficiarySigner.address,
								toInternalBalance: false,
							}
							const limit = 0

							const deadline = (await ethers.provider.getBlock(28132012)).timestamp + 10000
							await expect(
								balancerVaultContract
									.connect(halodaoSigner)
									.swap(swapRequest, fundManagement, limit, deadline)
							).to.be.revertedWith('BAL#507')
						})
					}
				})

				context('when pool has 50% token A liquidity and 50% token B liquidity', () => {
					let swapRequest: any, fundManagement: any
					sharedBeforeEach('deploy pool', async () => {
						await deployPool()
					})

					sharedBeforeEach('add initial liquidity', async () => {
						await addInitialLiquidity(await pool.getPoolId(), [fp(50), fp(50)])

						swapRequest = {
							poolId: await pool.getPoolId(),
							kind: swapKind,
							assetIn: tokenB.address,
							assetOut: tokenA.address,
							amount: fp(10),
							userData: '0x',
						}

						fundManagement = {
							sender: halodaoSigner.address,
							fromInternalBalance: false,
							recipient: beneficiarySigner.address,
							toInternalBalance: false,
						}
					})

					context('when base and quote token is the same', () => {
						it('reverts with BAL#509 cannot swap same token error', async () => {
							swapRequest.assetIn = tokenA.address
							swapRequest.assetOut = tokenA.address

							const limit = fp(10)
							const deadline = (await ethers.provider.getBlock(28132012)).timestamp + 10000

							await expect(
								balancerVaultContract
									.connect(halodaoSigner)
									.swap(swapRequest, fundManagement, limit, deadline)
							).to.be.revertedWith('BAL#509')
						})
					})

					context('swap limit has been reached', () => {
						if (swapKind === 0) {
							it('reverts when base=tokenA, quote=tokenB, kind=GIVEN_IN', async () => {
								swapRequest.assetIn = tokenA.address
								swapRequest.assetOut = tokenB.address

								const limit = fp(10)
								const deadline = (await ethers.provider.getBlock(28132012)).timestamp + 10000

								await expect(
									balancerVaultContract
										.connect(halodaoSigner)
										.swap(swapRequest, fundManagement, limit, deadline)
								).to.be.revertedWith('BAL#507') // undocumented error message
							})

							it('reverts with swap limit error when base=tokenB, quote=tokenA, kind=GIVEN_IN', async () => {
								swapRequest.assetIn = tokenB.address
								swapRequest.assetOut = tokenA.address

								const limit = fp(10)
								const deadline = (await ethers.provider.getBlock(28132012)).timestamp + 10000

								await expect(
									balancerVaultContract
										.connect(halodaoSigner)
										.swap(swapRequest, fundManagement, limit, deadline)
								).to.be.revertedWith('BAL#507') // SWAP_LIMIT
							})
						} else if (swapKind === 1) {
							it('reverts when base=tokenA, quote=tokenB, kind=GIVEN_OUT', async () => {
								swapRequest.assetIn = tokenA.address
								swapRequest.assetOut = tokenB.address

								const limit = fp(10)
								const deadline = (await ethers.provider.getBlock(28132012)).timestamp + 10000

								await expect(
									balancerVaultContract
										.connect(halodaoSigner)
										.swap(swapRequest, fundManagement, limit, deadline)
								).to.be.revertedWith('BAL#507') // undocumented error message
							})

							it('reverts with swap limit error when base=tokenB, quote=tokenA, kind=GIVEN_OUT', async () => {
								swapRequest.assetIn = tokenB.address
								swapRequest.assetOut = tokenA.address

								const limit = fp(10)
								const deadline = (await ethers.provider.getBlock(28132012)).timestamp + 10000

								await expect(
									balancerVaultContract
										.connect(halodaoSigner)
										.swap(swapRequest, fundManagement, limit, deadline)
								).to.be.revertedWith('BAL#507') // SWAP_LIMIT
							})
						}
					})

					context('when swap limit has not been reached', async () => {
						if (swapKind == 0) {
							it('swaps when base=tokenA, quote=tokenB, and kind = GIVEN_IN', async () => {
								swapRequest.assetIn = tokenA.address
								swapRequest.assetOut = tokenB.address

								const limit = 0
								const deadline = (await ethers.provider.getBlock(28132012)).timestamp + 10000

								const oldBalance = await tokenB.balanceOf(beneficiarySigner.address)

								await expect(
									balancerVaultContract
										.connect(halodaoSigner)
										.swap(swapRequest, fundManagement, limit, deadline)
								).to.be.not.reverted

								const minuend = await pool.getSwapFeePercentage()
								const calculatedSwappedAmount = oldBalance.add(fp(10)).sub(minuend.mul(10))
								expect(await tokenB.balanceOf(beneficiarySigner.address)).to.be.deep.equal(
									calculatedSwappedAmount
								)
							})

							it('swaps when base=tokenB, quote=tokenA, and kind = GIVEN_IN', async () => {
								swapRequest.assetIn = tokenB.address
								swapRequest.assetOut = tokenA.address

								const deadline = (await ethers.provider.getBlock(28132012)).timestamp + 10000

								const oldBalance = await tokenA.balanceOf(beneficiarySigner.address)

								const limit = 0
								await expect(
									balancerVaultContract
										.connect(halodaoSigner)
										.swap(swapRequest, fundManagement, limit, deadline)
								).to.be.not.reverted

								const minuend = await pool.getSwapFeePercentage()
								const calculatedSwappedAmount = oldBalance.add(fp(10)).sub(minuend.mul(10))
								expect(await tokenA.balanceOf(beneficiarySigner.address)).to.be.deep.equal(
									calculatedSwappedAmount
								)
							})
						}

						if (swapKind == 1) {
							it('swaps when base=tokenA, quote=tokenB, and kind = GIVEN_OUT', async () => {
								swapRequest.assetIn = tokenA.address
								swapRequest.assetOut = tokenB.address

								const limit = 0
								const deadline = (await ethers.provider.getBlock(28132012)).timestamp + 10000

								await expect(
									balancerVaultContract
										.connect(halodaoSigner)
										.swap(swapRequest, fundManagement, limit, deadline)
								).to.be.revertedWith('BAL#507') // SWAP_LIMIT
							})

							it('reverts when base=token B, quote=tokenA, and kind = GIVEN_OUT', async () => {
								swapRequest.assetIn = tokenB.address
								swapRequest.assetOut = tokenA.address

								const deadline = (await ethers.provider.getBlock(28132012)).timestamp + 10000
								const limit = 0

								await expect(
									balancerVaultContract
										.connect(halodaoSigner)
										.swap(swapRequest, fundManagement, limit, deadline)
								).to.be.revertedWith('BAL#507') // SWAP_LIMIT
							})
						}
					})

					context('when provided deadline equals', () => {
						const swapRequest = {
							kind: swapKind,
							assetIn: tokenB.address,
							assetOut: tokenA.address,
							amount: fp(10),
							userData: '0x',
						} as any
						const fundManagement = {
							sender: halodaoSigner.address,
							fromInternalBalance: false,
							recipient: beneficiarySigner.address,
							toInternalBalance: false,
						}

						let limit = 0 as any

						it('reverts when it elapsed', async () => {
							swapRequest.poolId = await pool.getPoolId()
							const deadline = (await ethers.provider.getBlock(18132012)).timestamp + 10000
							await expect(
								balancerVaultContract
									.connect(halodaoSigner)
									.swap(swapRequest, fundManagement, limit, deadline)
							).to.be.revertedWith('BAL#508') // SWAP_DEADLINE
						})

						it('swaps when it has not elapsed', async () => {
							if (swapKind === 0) {
								limit = 0
							} else if (swapKind === 1) {
								limit = fp(11)
							}
							swapRequest.poolId = await pool.getPoolId()
							const deadline = (await ethers.provider.getBlock(28132012)).timestamp + 10000
							await expect(
								balancerVaultContract
									.connect(halodaoSigner)
									.swap(swapRequest, fundManagement, limit, deadline)
							).to.be.not.reverted
						})
					})

					context('when base amount is taken from internal vault balance', () => {
						let limit = 0 as any
						let deadline: BigNumberish

						context('when user has existing vault internal balance', () => {
							sharedBeforeEach('Add internal balanace', async () => {
								if (swapKind === 0) {
									limit = 0
								} else if (swapKind === 1) {
									limit = fp(100)
								}
								if (!deadline)
									deadline = (await ethers.provider.getBlock(28132012)).timestamp + 10000
							})

							if (swapKind === 0) {
								it('swap will deduct from vault internal balance', async () => {
									fundManagement.fromInternalBalance = true
									fundManagement.recipient = halodaoSigner.address
									swapRequest.amount = fp(5)
									swapRequest.assetIn = tokenA.address
									swapRequest.assetOut = tokenB.address

									const oldTokenBBalance = await tokenB.balanceOf(halodaoSigner.address)
									const oldInternalBalance = await balancerVaultContract.getInternalBalance(
										halodaoSigner.address,
										[tokenA.address]
									)
									await expect(
										balancerVaultContract
											.connect(halodaoSigner)
											.swap(swapRequest, fundManagement, limit, deadline)
									).to.be.not.reverted

									const swapFee = await (await pool.getSwapFeePercentage()).add(4000000000000)
									const calculatedTokenBBalance = oldTokenBBalance.add(fp(5)).sub(swapFee)
									const calculatedTokenAVaultBalance = oldInternalBalance[0].sub(fp(5))

									expect(await tokenB.balanceOf(halodaoSigner.address)).to.be.deep.equal(
										calculatedTokenBBalance
									)
									const updatedInternalBalance = await balancerVaultContract.getInternalBalance(
										halodaoSigner.address,
										[tokenA.address]
									)
									expect(updatedInternalBalance[0]).to.be.deep.equal(calculatedTokenAVaultBalance)
								})
							}
						})

						context('when user has zero existing vault internal balance', () => {})
					})

					context('when traded amount is credited to vault internal balance', () => {})
				})
			}

			context('called externally by non-vault contract', () => {
				it('reverts', async () => {
					const swapRequest = {
						poolId: await pool.getPoolId(),
						kind: 0,
						tokenIn: tokenA.address,
						tokenOut: tokenB.address,
						amount: fp(100),
						userData: '0x',
						from: halodaoSigner.address,
						to: beneficiarySigner.address,
					} as any

					await expect(pool.onSwap(swapRequest, fp(100), fp(100))).to.be.reverted
				})
			})

			context('called by vault during execution of single swap', () => {
				it('when swap kind=GIVEN_IN meaning the amount of tokens entering the pool is known', async () => {
					await testSingleSwapStimulation(0)
				})

				it('when swap kind=GIVEN_OUT meaning the amount of tokens exiting the pool is known', async () => {
					await testSingleSwapStimulation(1)
				})
			})
		})
	}
})
