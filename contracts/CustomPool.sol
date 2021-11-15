pragma solidity ^0.7.1;
pragma experimental ABIEncoderV2;

import './balancer-core-v2/pool-utils/contracts/BaseMinimalSwapInfoPool.sol';
import './dfx-protocol-mock/MockedProportionalLiquidity.sol';

contract CustomPool is BaseMinimalSwapInfoPool {
	using LogExpMath for uint256;
	using FixedPoint for uint256;

	// The Balancer pool data
	// Note we change style to match Balancer's custom getter

	uint256 internal immutable _scalingFactor0;
	uint256 internal immutable _scalingFactor1;

	MockedProportionalLiquidity mockedProportionalLiquidity;

	/// @param vault The balancer vault
	/// @param name The balancer pool token name
	/// @param symbol The balancer pool token symbol
	constructor(
		IVault vault,
		string memory name,
		string memory symbol,
		IERC20[] memory tokens,
		uint256 swapFeePercentage,
		uint256 pauseWindowDuration,
		uint256 bufferPeriodDuration,
		address owner,
		MockedProportionalLiquidity mockedProportionalLiquidty_
	)
		BasePool(
			vault,
			IVault.PoolSpecialization.MINIMAL_SWAP_INFO,
			name,
			symbol,
			tokens,
			new address[](tokens.length),
			swapFeePercentage,
			pauseWindowDuration,
			bufferPeriodDuration,
			owner
		)
	{
		_scalingFactor0 = _computeScalingFactor(tokens[0]);
		_scalingFactor1 = _computeScalingFactor(tokens[1]);

		mockedProportionalLiquidity = mockedProportionalLiquidty_;
	}

	function _getTotalTokens() internal view override returns (uint256) {
		return 2;
	}

	function _getMaxTokens() internal pure override returns (uint256) {
		return 2;
	}

	function _scalingFactor(IERC20 token) internal view override returns (uint256) {
		return _computeScalingFactor(token);
	}

	function _scalingFactors() internal view override returns (uint256[] memory) {
		uint256[] memory scalingFactors = new uint256[](2);

		{
			scalingFactors[0] = _scalingFactor0;
			scalingFactors[1] = _scalingFactor1;
		}

		return scalingFactors;
	}

	function _onInitializePool(
		bytes32 poolId,
		address sender,
		address recipient,
		uint256[] memory scalingFactors,
		bytes memory userData
	) internal override returns (uint256 bptAmountOut, uint256[] memory amountsIn) {
		bptAmountOut = 3000000000000000;

		uint256[] memory maxAmountsIn = abi.decode(userData, (uint256[]));

		require(
			maxAmountsIn.length == _getTotalTokens(),
			'Invalid length of maxAmountsIn payload.'
		);

		amountsIn = new uint256[](2);

		amountsIn[0] = maxAmountsIn[0];
		amountsIn[1] = maxAmountsIn[1];
	}

	function _onJoinPool(
		bytes32 poolId,
		address sender,
		address recipient,
		uint256[] memory balances,
		uint256 lastChangeBlock,
		uint256 protocolSwapFeePercentage,
		uint256[] memory scalingFactors,
		bytes memory userData
	)
		internal
		override
		returns (
			uint256 bptAmountOut,
			uint256[] memory amountsIn,
			uint256[] memory dueProtocolFeeAmounts
		)
	{
		uint256[] memory maxAmountsIn = abi.decode(userData, (uint256[]));
		require(balances.length == 2 && maxAmountsIn.length == 2, 'Invalid format');

		(uint256 curvesMinted, uint256[] memory deposits) = mockedProportionalLiquidity
			.proportionalDeposit(maxAmountsIn[0], maxAmountsIn);

		bptAmountOut = curvesMinted;

		{
			dueProtocolFeeAmounts = new uint256[](2);
			dueProtocolFeeAmounts[0] = 2;
			dueProtocolFeeAmounts[1] = 2;
		}

		{
			amountsIn = deposits;
		}
	}

	function _onExitPool(
		bytes32 poolId,
		address sender,
		address recipient,
		uint256[] memory balances,
		uint256 lastChangeBlock,
		uint256 protocolSwapFeePercentage,
		uint256[] memory scalingFactors,
		bytes memory userData
	)
		internal
		override
		returns (
			uint256 bptAmountIn,
			uint256[] memory amountsOut,
			uint256[] memory dueProtocolFeeAmounts
		)
	{
		uint256[] memory minAmountsOut = abi.decode(userData, (uint256[]));
		require(balances.length == 2 && minAmountsOut.length == 2, 'Invalid format');

		bptAmountIn = 100000000; // amount of BPT token to be burned

		{
			dueProtocolFeeAmounts = new uint256[](2);
			dueProtocolFeeAmounts[0] = 0;
			dueProtocolFeeAmounts[1] = 0;
		}

		{
			amountsOut = new uint256[](2);

			amountsOut[0] = minAmountsOut[0];
			amountsOut[1] = minAmountsOut[1];
		}
	}

	/**
	 * @dev Called when a swap with the Pool occurs, where the amount of tokens entering the Pool is known.
	 *
	 * @return the amount of tokens that will be taken from the Pool in return.
	 */
	function _onSwapGivenIn(
		SwapRequest memory swapRequest,
		uint256 balanceTokenIn,
		uint256 balanceTokenOut
	) internal override returns (uint256) {
		return swapRequest.amount;
	}

	/**
	 * @dev Called when a swap with the Pool occurs, where the amount of tokens exiting the Pool is known.
	 *
	 * @return the amount of tokens that will be granted to the Pool in return.
	 */
	function _onSwapGivenOut(
		SwapRequest memory swapRequest,
		uint256 balanceTokenIn,
		uint256 balanceTokenOut
	) internal override returns (uint256) {
		return swapRequest.amount;
	}

	/**
	 * @dev Called whenever a swap fee is charged. Implementations should call their parents via super, to ensure all
	 * implementations in the inheritance tree are called.
	 *
	 * Callers must call one of the three `_processSwapFeeAmount` functions when swap fees are computed,
	 * and upscale `amount`.
	 */
	function _processSwapFeeAmount(
		uint256 index, /*index*/
		uint256 amount /*amount*/
	) internal override {
		// solhint-disable-previous-line no-empty-blocks
		super._processSwapFeeAmount(index, amount);
	}
}
