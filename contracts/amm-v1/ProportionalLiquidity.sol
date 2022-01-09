// SPDX-License-Identifier: MIT

pragma solidity ^0.7.3;
pragma experimental ABIEncoderV2;

import './Assimilators.sol';

import "../FXPool.sol";

import './lib/UnsafeMath64x64.sol';
import './lib/ABDKMath64x64.sol';

import './CurveMath.sol';

contract ProportionalLiquidity {
	using ABDKMath64x64 for uint256;
	using ABDKMath64x64 for int128;
	using UnsafeMath64x64 for int128;

	event Transfer(address indexed from, address indexed to, uint256 value);

	int128 public constant ONE = 0x10000000000000000;
	int128 public constant ONE_WEI = 0x12;

	struct Assimilator {
		address addr;
		uint8 ix;
	}

	function proportionalDeposit(FXPool curve, uint256 _deposit)
		external
		returns (uint256 curves_, uint256[] memory)
	{
		// int128 __deposit = _deposit.divu(1e18);
		uint256 __deposit = _deposit / 1e18;

		uint256 _length = curve.getAssetsLength();

		uint256[] memory deposits_ = new uint256[](_length);

		(uint256 _oGLiq, uint256[] memory _oBals) = getGrossLiquidityAndBalancesForDeposit(curve);

		// Needed to calculate liquidity invariant
		(int128 _oGLiqProp, int128[] memory _oBalsProp) = getGrossLiquidityAndBalances(curve);

		// No liquidity, oracle sets the ratio
		if (_oGLiq == 0) {
			for (uint256 i = 0; i < _length; i++) {
				// Variable here to avoid stack-too-deep errors
				// int128 _d = __deposit.mul(curve.weights(i));
				uint256 _d = __deposit * (curve.weights(i));
				address assimilatorAddress = curve.getAsset(i).addr;
				// deposits_[i] = Assimilators.intakeNumeraire(assimilatorAddress, _d.add(ONE_WEI));
				deposits_[i] = Assimilators.intakeNumeraire(assimilatorAddress, (_d + 1));
			}
		} else {
			// We already have an existing pool ratio
			// which must be respected
			// int128 _multiplier = __deposit.div(_oGLiq);
			uint256 _multiplier = __deposit / _oGLiq;

			uint256 _baseWeight = curve.weights(0) * (1e18);
			uint256 _quoteWeight = curve.weights(1) * (1e18);

			for (uint256 i = 0; i < _length; i++) {
				address assimilatorAddress = curve.getAsset(i).addr;
				int128 oGBal = _oBals[i].mul(_multiplier);
				deposits_[i] = Assimilators.intakeNumeraireLPRatio(
					assimilatorAddress,
					_baseWeight,
					_quoteWeight,
					oGBal.add(ONE_WEI)
				);
			}
		}

		int128 _totalShells = curve.totalSupply().divu(1e18);

		int128 _newShells = __deposit;

		if (_totalShells > 0) {
			_newShells = __deposit.div(_oGLiq);
			_newShells = _newShells.mul(_totalShells);
		}

		requireLiquidityInvariant(curve, _totalShells, _newShells, _oGLiqProp, _oBalsProp);

		// mint(curve, msg.sender, curves_ = _newShells.mulu(1e18));

		return (curves_, deposits_);
	}

	function viewProportionalDeposit(FXPool curve, uint256 _deposit)
		external
		returns (uint256 curves_, uint256[] memory)
	{
		int128 __deposit = _deposit.divu(1e18);

		uint256 _length = curve.getAssetsLength();

		(int128 _oGLiq, int128[] memory _oBals) = getGrossLiquidityAndBalancesForDeposit(curve);

		uint256[] memory deposits_ = new uint256[](_length);

		// No liquidity
		if (_oGLiq == 0) {
			for (uint256 i = 0; i < _length; i++) {
				address assimilatorAddress = curve.getAsset(i).addr;
				int128 deposit = __deposit.mul(curve.weights(i));
				deposits_[i] = Assimilators.viewRawAmount(
					assimilatorAddress,
					deposit.add(ONE_WEI)
				);
			}
		} else {
			// We already have an existing pool ratio
			// this must be respected
			int128 _multiplier = __deposit.div(_oGLiq);

			uint256 _baseWeight = curve.weights(0).mulu(1e18);
			uint256 _quoteWeight = curve.weights(1).mulu(1e18);

			// Deposits into the pool is determined by existing LP ratio
			for (uint256 i = 0; i < _length; i++) {
				address assimilatorAddress = curve.getAsset(i).addr;
				deposits_[i] = Assimilators.viewRawAmountLPRatio(
					assimilatorAddress,
					_baseWeight,
					_quoteWeight,
					_oBals[i].mul(_multiplier).add(ONE_WEI)
				);
			}
		}

		int128 _totalShells = curve.totalSupply().divu(1e18);

		int128 _newShells = __deposit;

		if (_totalShells > 0) {
			_newShells = __deposit.div(_oGLiq);
			_newShells = _newShells.mul(_totalShells);
		}

		curves_ = _newShells.mulu(1e18);

		return (curves_, deposits_);
	}

	function emergencyProportionalWithdraw(FXPool curve, uint256 _withdrawal)
		external
		returns (uint256[] memory)
	{
		uint256 _length = curve.getAssetsLength();

		(, int128[] memory _oBals) = getGrossLiquidityAndBalances(curve);

		uint256[] memory withdrawals_ = new uint256[](_length);

		int128 _totalShells = curve.totalSupply().divu(1e18);
		int128 __withdrawal = _withdrawal.divu(1e18);

		int128 _multiplier = __withdrawal.div(_totalShells);

		for (uint256 i = 0; i < _length; i++) {
			address assimilatorAddress = curve.getAsset(i).addr;
			withdrawals_[i] = Assimilators.outputNumeraire(
				assimilatorAddress,
				msg.sender,
				_oBals[i].mul(_multiplier)
			);
		}

		// burn(curve, msg.sender, _withdrawal);

		return withdrawals_;
	}

	function proportionalWithdraw(FXPool curve, uint256 _withdrawal)
		external
		returns (uint256[] memory)
	{
		uint256 _length = curve.getAssetsLength();

		(int128 _oGLiq, int128[] memory _oBals) = getGrossLiquidityAndBalances(curve);

		uint256[] memory withdrawals_ = new uint256[](_length);

		int128 _totalShells = curve.totalSupply().divu(1e18);
		int128 __withdrawal = _withdrawal.divu(1e18);

		int128 _multiplier = __withdrawal.div(_totalShells);

		for (uint256 i = 0; i < _length; i++) {
			address assimilatorAddress = curve.getAsset(i).addr;
			withdrawals_[i] = Assimilators.outputNumeraire(
				assimilatorAddress,
				msg.sender,
				_oBals[i].mul(_multiplier)
			);
		}

		requireLiquidityInvariant(curve, _totalShells, __withdrawal.neg(), _oGLiq, _oBals);

		// burn(curve, msg.sender, _withdrawal);

		return withdrawals_;
	}

	function viewProportionalWithdraw(FXPool curve, uint256 _withdrawal)
		external
		returns (uint256[] memory)
	{
		uint256 _length = curve.getAssetsLength();

		(, int128[] memory _oBals) = getGrossLiquidityAndBalances(curve);

		uint256[] memory withdrawals_ = new uint256[](_length);

		int128 _multiplier = _withdrawal.divu(1e18).div(curve.totalSupply().divu(1e18));

		for (uint256 i = 0; i < _length; i++) {
			address assimilatorAddress = curve.getAsset(i).addr;
			withdrawals_[i] = Assimilators.viewRawAmount(
				assimilatorAddress,
				_oBals[i].mul(_multiplier)
			);
		}

		return withdrawals_;
	}

	function getGrossLiquidityAndBalancesForDeposit(FXPool curve)
		internal
		returns (uint256 grossLiquidity_, uint256[] memory)
	{
		uint256 _length = curve.getAssetsLength();

		int128[] memory balances_ = new int128[](_length);
		uint256 _baseWeight = curve.weights(0).mulu(1e18);
		uint256 _quoteWeight = curve.weights(1).mulu(1e18);

		for (uint256 i = 0; i < _length; i++) {
			address assimilatorAddress = curve.getAsset(i).addr;
			int128 _bal = Assimilators.viewNumeraireBalanceLPRatio(
				_baseWeight,
				_quoteWeight,
				assimilatorAddress
			);

			balances_[i] = _bal;
			grossLiquidity_ += _bal;
		}

		return (grossLiquidity_, balances_);
	}

	function getGrossLiquidityAndBalances(FXPool curve)
		internal
		returns (int128 grossLiquidity_, int128[] memory)
	{
		uint256 _length = curve.getAssetsLength();

		int128[] memory balances_ = new int128[](_length);

		for (uint256 i = 0; i < _length; i++) {
			address assimilatorAddress = curve.getAsset(i).addr;
			int128 _bal = Assimilators.viewNumeraireBalance(assimilatorAddress);

			balances_[i] = _bal;
			grossLiquidity_ += _bal;
		}

		return (grossLiquidity_, balances_);
	}

	function requireLiquidityInvariant(
		FXPool curve,
		int128 _curves,
		int128 _newShells,
		int128 _oGLiq,
		int128[] memory _oBals
	) private {
		(int128 _nGLiq, int128[] memory _nBals) = getGrossLiquidityAndBalances(curve);

		int128 _beta = curve.beta();
		int128 _delta = curve.delta();
		int128[] memory _weights = new int128[](curve.getWeightsLength());

		for (uint128 i = 0; i < _weights.length; i++) {
			_weights[i] = curve.weights(i);
		}

		int128 _omega = CurveMath.calculateFee(_oGLiq, _oBals, _beta, _delta, _weights);

		int128 _psi = CurveMath.calculateFee(_nGLiq, _nBals, _beta, _delta, _weights);

		CurveMath.enforceLiquidityInvariant(_curves, _newShells, _oGLiq, _nGLiq, _omega, _psi);
	}

	// function burn(
	// 	FXPool curve,
	// 	address account,
	// 	uint256 amount
	// ) private {
	// 	curve.balances[account] = burnSub(curve.balances[account], amount);

	// 	curve.totalSupply = burnSub(curve.totalSupply, amount);

	// 	emit Transfer(msg.sender, address(0), amount);
	// }

	// function mint(
	// 	FXPool curve,
	// 	address account,
	// 	uint256 amount
	// ) private {
	// 	curve.totalSupply = mintAdd(curve.totalSupply, amount);

	// 	curve.balances[account] = mintAdd(curve.balances[account], amount);

	// 	emit Transfer(address(0), msg.sender, amount);
	// }

	function mintAdd(uint256 x, uint256 y) private pure returns (uint256 z) {
		require((z = x + y) >= x, 'Curve/mint-overflow');
	}

	function burnSub(uint256 x, uint256 y) private pure returns (uint256 z) {
		require((z = x - y) <= x, 'Curve/burn-underflow');
	}
}