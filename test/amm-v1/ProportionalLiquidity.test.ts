import chai, { expect } from 'chai'
import { ethers, waffle } from 'hardhat'
import Vault from '@balancer-labs/v2-deployments/deployed/kovan/Vault.json'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

import { FakeToken } from '../../typechain/FakeToken'
import { BaseToUsdAssimilator } from '../../typechain/BaseToUsdAssimilator'
import { UsdcToUsdAssimilator } from '../../typechain/UsdcToUsdAssimilator'
import { FakeToken__factory } from '../../typechain/factories/FakeToken__factory'
import { BaseToUsdAssimilator__factory } from '../../typechain/factories/BaseToUsdAssimilator__factory'
import { UsdcToUsdAssimilator__factory } from '../../typechain/factories/UsdcToUsdAssimilator__factory'
import { Assimilators } from '../../typechain/Assimilators'
import { Assimilators__factory } from '../../typechain/factories/Assimilators__factory'
import { CurveMath } from '../../typechain/CurveMath'
import { CurveMath__factory } from '../../typechain/factories/CurveMath__factory'
import { ProportionalLiquidity } from '../../typechain/ProportionalLiquidity'
import { AmmV1Swaps } from '../../typechain/AmmV1Swaps'
import { FXPool } from '../../typechain/FXPool'
import { Vault as VaultType } from '../../typechain/Vault'

import { decimal, fp, toFp } from '../common/v2-helpers/numbers'
import { sortAddresses } from '../../scripts/utils/sortAddresses'
import { deployBalancerVault } from '../helpers/deployBalancerVault'

const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'

describe('Proportional Liquidity', () => {
	let halodaoSigner: SignerWithAddress

	let tokenA: FakeToken
	let tokenB: FakeToken
	let baseToUsdAssimilator: BaseToUsdAssimilator
	let usdcToUsdAssimilator: UsdcToUsdAssimilator
	let assimilators: Assimilators
	let curveMath: CurveMath
	let proportionalLiquidity: any
	let swaps: any
	let fxPool: any
	let balancerVaultContract: VaultType

	before('setup signers', async () => {
		;[halodaoSigner] = await ethers.getSigners()
	})

	sharedBeforeEach('deploy tokens', async () => {
		const MockERC20Deployer = new FakeToken__factory(halodaoSigner)

		tokenA = await MockERC20Deployer.deploy('Token A', 'A', 8)
		tokenB = await MockERC20Deployer.deploy('Token B', 'B', 6)

		await tokenA.deployed()
		await tokenB.deployed()
	})

	sharedBeforeEach('deploy assimilators', async () => {
		const BaseToUsdAssimilatorDeployer = new BaseToUsdAssimilator__factory(halodaoSigner)
		const UsdcToUsdAssimilatorDeployer = new UsdcToUsdAssimilator__factory(halodaoSigner)
		const AssimilatorsDeployer = new Assimilators__factory(halodaoSigner)

		// KOVAN
		// const CHF_TO_USD_ORACLE = '0xed0616BeF04D374969f302a34AE4A63882490A8C'
		// const USDC_TO_USD_ORACLE = '0x9211c6b3BF41A10F78539810Cf5c64e1BB78Ec60'

		// MAINNET
		const XSGD_TO_USD_ORACLE = '0xe25277fF4bbF9081C75Ab0EB13B4A13a721f3E13'
		const USDC_TO_USD_ORACLE = '0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6'

		baseToUsdAssimilator = await BaseToUsdAssimilatorDeployer.deploy(
			8,
			tokenA.address,
			tokenB.address,
			// CHF_TO_USD_ORACLE
			XSGD_TO_USD_ORACLE
		)
		await baseToUsdAssimilator.deployed()

		usdcToUsdAssimilator = await UsdcToUsdAssimilatorDeployer.deploy(
			USDC_TO_USD_ORACLE,
			tokenB.address
		)
		await usdcToUsdAssimilator.deployed()

		assimilators = await AssimilatorsDeployer.deploy()
		await assimilators.deployed()
	})

	sharedBeforeEach('deploy curve math', async () => {
		const CurveMathDeployer = new CurveMath__factory(halodaoSigner)
		curveMath = await CurveMathDeployer.deploy()
		await curveMath.deployed()
	})

	sharedBeforeEach('deploy proportional liquidity', async () => {
		const ProportionalLiquidityFactory = await ethers.getContractFactory('ProportionalLiquidity', {
			libraries: {
				Assimilators: assimilators.address,
				CurveMath: curveMath.address,
			},
		})
		proportionalLiquidity = await ProportionalLiquidityFactory.deploy()
		await proportionalLiquidity.deployed()
	})

	sharedBeforeEach('deploy AMM V1 swaps', async () => {
		const SwapsFactory = await ethers.getContractFactory('AmmV1Swaps', {
			libraries: {
				Assimilators: assimilators.address,
				// CurveMath: curveMath.address,
			},
		})
		swaps = await SwapsFactory.deploy()
		await swaps.deployed()
	})

  // @todo Mock FX Pool to isolate testing in Proportional Liquidity contract
	sharedBeforeEach('deploy test FX Pool', async () => {
		const assets = [
			tokenA.address,
			baseToUsdAssimilator.address,
			tokenA.address,
			baseToUsdAssimilator.address,
			tokenA.address,
			tokenB.address,
			usdcToUsdAssimilator.address,
			tokenB.address,
			usdcToUsdAssimilator.address,
			tokenB.address,
		]
		const assetWeights = [fp(0.5), fp(0.5)]
		const swapFeePercentage = ethers.utils.parseEther('0.000001')
		const pauseWindowDuration = 7776000
		const bufferPeriodDuration = 2592000

		const poolParams = {
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

		const TestFXPoolDeployer = await ethers.getContractFactory('FXPool', {
      libraries: {
        Assimilators: assimilators.address,
        CurveMath: curveMath.address,
      }
    })
		fxPool = (await TestFXPoolDeployer.deploy(
			Vault.address,
			'HLP',
			'HLP',
			sortAddresses([tokenA.address, tokenB.address]),
			assets,
			assetWeights,
			swapFeePercentage,
			pauseWindowDuration,
			bufferPeriodDuration,
			proportionalLiquidity.address,
			swaps.address
		)) as FXPool

		// await fxPool.setParams(fp(0.8), fp(0.48), fp(0.175), fp(0.0005), fp(0.3))
	})

	sharedBeforeEach('instantiate balancer vault contract', async () => {
		balancerVaultContract = await deployBalancerVault(halodaoSigner, WETH_ADDRESS)

		// await balancerVaultContract.setRelayerApproval(
		// 	balancerSigner.address,
		// 	halodaoSigner.address,
		// 	true
		// )
	})

	describe('#viewProportionalDeposit', () => {
		it('reverts', async () => {
      // console.log('fxPool:', fxPool)
      const res = await proportionalLiquidity.viewProportionalDeposit(fxPool.address, fp(1000000))
      // console.log('res:', res)
      // console.log('res[0]:', decimal(res[0]))
      // console.log('res[1][0]:', res[1][0].toNumber())
      // console.log('res[1][1]:', res[1][1].toNumber())
    })

		it('join pool then check', async () => {
			await tokenA.mint(halodaoSigner.address, fp(1000))
			await tokenB.mint(halodaoSigner.address, fp(1000))
			await tokenA.approve(Vault.address, fp(1000))
			await tokenB.approve(Vault.address, fp(1000))

			const liquidityToAdd = [fp(100), fp(100)]
			const payload = ethers.utils.defaultAbiCoder.encode(['uint256[]'], [liquidityToAdd])
			const joinPoolRequest = {
				assets: sortAddresses([tokenA.address, tokenB.address]),
				maxAmountsIn: liquidityToAdd,
				userData: payload,
				fromInternalBalance: false,
			}
			// await balancerVaultContract.joinPool(await fxPool.getPoolId(), halodaoSigner.address, halodaoSigner.address, joinPoolRequest)
			// await balancerVaultContract.joinPool(await fxPool.getPoolId(), halodaoSigner.address, halodaoSigner.address, joinPoolRequest)
			// await balancerVaultContract.joinPool(await fxPool.getPoolId(), halodaoSigner.address, halodaoSigner.address, joinPoolRequest)

      // const res = await proportionalLiquidity.viewProportionalDeposit(fxPool.address, fp(1))
      // console.log('res:', res)
      // console.log('res[0]:', decimal(res[0]))
      // console.log('res[1][0]:', res[1][0].toNumber())
      // console.log('res[1][1]:', res[1][1].toNumber())
    })
	})
})
