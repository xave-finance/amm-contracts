pragma solidity ^0.7.1;
pragma experimental ABIEncoderV2;

import '../balancer-core-v2/vault/contracts/interfaces/IVault.sol';

import '../amm-v1/interfaces/IAssimilator.sol';
import '../amm-v1/ProportionalLiquidity.sol';
import '../amm-v1/lib/ABDKMath64x64.sol';

import '../FXPool.sol';

contract DepositRelayer {
	IVault private constant vault = IVault(0xBA12222222228d8Ba445958a75a0704d566BF2C8);
	ProportionalLiquidity proportionalLiquidity;

  int128 private constant ONE = 0x10000000000000000;

	constructor(ProportionalLiquidity _proportionalLiquidity) {
		proportionalLiquidity = _proportionalLiquidity;
	}

	function _deposit(
		bytes32 poolId,
		address sender,
		address recipient,
		uint256 amount
	) internal returns (uint256, uint256[] memory) {
		(IERC20[] memory tokens, uint256[] memory balances, ) = vault.getPoolTokens(poolId);

		(address poolAddress, ) = vault.getPool(poolId);

		FXPool fxPool = FXPool(poolAddress);

		// Get rates by using assimilators of assets
		IAssimilator _baseAssimilator = IAssimilator(fxPool.getAssimilator(address(tokens[0])).addr);
		// IAssimilator _quoteAssimilator = fxPool.getAssimilator(tokens[1]); // USDC

		uint256 baseRate = _baseAssimilator.getRate();

		uint256 baseNumeraire = amount * (baseRate);

		// Get base weight
    int128 baseWeight = fxPool.getWeight(0);

    // uint256 totalNumeraire = baseNumeraire * (ONE / baseWeight);
    uint256 totalNumeraire = baseNumeraire * ABDKMath64x64.toUInt(ONE / baseWeight);
    


		(uint256 lpTokens, uint256[] memory requiredTokens) = proportionalLiquidity
			.viewProportionalDeposit(FXPool(poolAddress), totalNumeraire);

		return (lpTokens, requiredTokens);
	}

	function deposit() external {}

	function viewDeposit() external {}
}
