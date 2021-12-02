pragma solidity ^0.7.1;
pragma experimental ABIEncoderV2;

import '../CustomPool.sol';

import '../amm-v1/ProportionalLiquidity.sol';

contract TestCustomPool is CustomPool {
	event TestInitializePool(uint256 bptAmountOut, uint256[] amountsIn);
	event TestJoinPool(uint256 bptAmountOut, uint256[] amountsIn, uint256[] dueProtocolFeeAmounts);
	event TestExitPool(uint256 bptAmountIn, uint256[] amountsOut, uint256[] dueProtocolFeeAmounts);
	event TestSwapGivenIn(
		bytes32 poolId,
		address tokenIn,
		address tokenOut,
		uint256 amount,
		address from,
		address to,
		uint256 balanceTokenIn,
		uint256 balanceTokenOut
	);
	event TestSwapGivenOut(
		bytes32 poolId,
		address tokenIn,
		address tokenOut,
		uint256 amount,
		address from,
		address to,
		uint256 balanceTokenIn,
		uint256 balanceTokenOut
	);

	constructor(
		IVault vault,
		string memory name,
		string memory symbol,
		IERC20[] memory tokens,
		address[] memory _assets,
		uint256[] memory _assetWeights,
		uint256 swapFeePercentage,
		uint256 pauseWindowDuration,
		uint256 bufferPeriodDuration,
		address owner,
		ProportionalLiquidity proportionalLiquidity
	)
		CustomPool(
			vault,
			name,
			symbol,
			tokens,
			_assets,
			_assetWeights,
			swapFeePercentage,
			pauseWindowDuration,
			bufferPeriodDuration,
			owner,
			proportionalLiquidity
		)
	{}

	function onInitalizePool(
		bytes32 poolId,
		address sender,
		address recipient,
		uint256[] memory scalingFactors,
		bytes memory userData
	) external returns (uint256 bptAmountOut, uint256[] memory amountsIn) {
		(bptAmountOut, amountsIn) = super._onInitializePool(
			poolId,
			sender,
			recipient,
			scalingFactors,
			userData
		);

		emit TestInitializePool(bptAmountOut, amountsIn);
	}

	function onJoinPool(
		bytes32 poolId,
		address sender,
		address recipient,
		uint256[] memory balances,
		uint256 lastChangeBlock,
		uint256 protocolSwapFeePercentage,
		uint256[] memory scalingFactors,
		bytes memory userData
	)
		external
		returns (
			uint256 bptAmountOut,
			uint256[] memory amountsIn,
			uint256[] memory dueProtocolFeeAmounts
		)
	{
		(bptAmountOut, amountsIn, dueProtocolFeeAmounts) = super._onJoinPool(
			poolId,
			sender,
			recipient,
			balances,
			lastChangeBlock,
			protocolSwapFeePercentage,
			scalingFactors,
			userData
		);

		emit TestJoinPool(bptAmountOut, amountsIn, dueProtocolFeeAmounts);
	}

	function onExitPool(
		bytes32 poolId,
		address sender,
		address recipient,
		uint256[] memory balances,
		uint256 lastChangeBlock,
		uint256 protocolSwapFeePercentage,
		uint256[] memory scalingFactors,
		bytes memory userData
	)
		external
		returns (
			uint256 bptAmountIn,
			uint256[] memory amountsOut,
			uint256[] memory dueProtocolFeeAmounts
		)
	{
		(bptAmountIn, amountsOut, dueProtocolFeeAmounts) = super._onExitPool(
			poolId,
			sender,
			recipient,
			balances,
			lastChangeBlock,
			protocolSwapFeePercentage,
			scalingFactors,
			userData
		);

		emit TestExitPool(bptAmountIn, amountsOut, dueProtocolFeeAmounts);
	}

	function onSwapGivenIn(
		SwapRequest memory swapRequest,
		uint256 balanceTokenIn,
		uint256 balanceTokenOut
	) external returns (uint256 calculatedAmount) {
		(calculatedAmount) = super._onSwapGivenIn(swapRequest, balanceTokenIn, balanceTokenOut);

		emit TestSwapGivenIn(
			swapRequest.poolId,
			address(swapRequest.tokenIn),
			address(swapRequest.tokenOut),
			swapRequest.amount,
			swapRequest.from,
			swapRequest.to,
			balanceTokenIn,
			balanceTokenOut
		);
	}

	function onSwapGivenOut(
		SwapRequest memory swapRequest,
		uint256 balanceTokenIn,
		uint256 balanceTokenOut
	) external returns (uint256 calculatedAmount) {
		(calculatedAmount) = super._onSwapGivenOut(swapRequest, balanceTokenIn, balanceTokenOut);

		emit TestSwapGivenOut(
			swapRequest.poolId,
			address(swapRequest.tokenIn),
			address(swapRequest.tokenOut),
			swapRequest.amount,
			swapRequest.from,
			swapRequest.to,
			balanceTokenIn,
			balanceTokenOut
		);
	}
}
