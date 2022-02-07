// SPDX-License-Identifier: MIT

pragma solidity ^0.7.3;
pragma experimental ABIEncoderV2;

import './Assimilators.sol';

import "../FXPool.sol";

import './lib/UnsafeMath64x64.sol';
import './lib/ABDKMath64x64.sol';

import './CurveMath.sol';

import '../balancer-core-v2/solidity-utils/contracts/openzeppelin/SafeMath.sol';

import "hardhat/console.sol";

contract ProportionalLiquidity {
	using ABDKMath64x64 for uint256;
	using ABDKMath64x64 for uint256;
	using UnsafeMath64x64 for uint256;
	using SafeMath for uint256;

	event Transfer(address indexed from, address indexed to, uint256 value);

	uint256 public constant ONE = 0x10000000000000000;
	uint256 public constant ONE_WEI = 0x12;

	struct Assimilator {
		address addr;
		uint8 ix;
	}

	function proportionalDeposit(FXPool curve, uint256 _deposit)
		external
		returns (uint256 curves_, uint256[] memory)
	{
		uint256 __deposit = _deposit.div(1e18);

		uint256 _length = curve.getAssetsLength();

		uint256[] memory deposits_ = new uint256[](_length);

		(uint256 _oGLiq, uint256[] memory _oBals) = getGrossLiquidityAndBalancesForDeposit(curve);

		// Needed to calculate liquidity invariant
		(uint256 _oGLiqProp, uint256[] memory _oBalsProp) = getGrossLiquidityAndBalances(curve);

		// No liquidity, oracle sets the ratio
		if (_oGLiq == 0) {
			for (uint256 i = 0; i < _length; i++) {
				// Variable here to avoid stack-too-deep errors
				uint256 _d = __deposit.mul((curve.weights(i)));
				address assimilatorAddress = curve.getAsset(i).addr;
				deposits_[i] = Assimilators.intakeNumeraire(assimilatorAddress, _d.add(1));
			}
		} else {
			// We already have an existing pool ratio
			// which must be respected
			// uint256 _multiplier = __deposit.div(_oGLiq);
			uint256 _multiplier = __deposit / _oGLiq;

			uint256 _baseWeight = curve.weights(0) * (1e18);
			uint256 _quoteWeight = curve.weights(1) * (1e18);

			for (uint256 i = 0; i < _length; i++) {
				address assimilatorAddress = curve.getAsset(i).addr;
				uint256 oGBal = _oBals[i].mul(_multiplier);
				deposits_[i] = Assimilators.intakeNumeraireLPRatio(
					assimilatorAddress,
					_baseWeight,
					_quoteWeight,
					oGBal.add(1)
				);
			}
		}

		uint256 _totalShells = curve.totalSupply().div(1e18);

		uint256 _newShells = __deposit;

		if (_totalShells > 0) {
			_newShells = __deposit.div(_oGLiq);
			_newShells = _newShells.mul(_totalShells);
		}

		requireLiquidityInvariant(curve, _totalShells, _newShells, _oGLiqProp, _oBalsProp);

		// mint(curve, msg.sender, curves_ = _newShells.mulu(1e18));

		return (curves_, deposits_);
	}

	function viewProportionalDeposit(FXPool curve, uint256 _deposit)
		external view
		returns (uint256 curves_, uint256[] memory)
	{
		console.log("DEPOSIT:::");
		console.log(_deposit);
		uint256 __deposit = _deposit.div(1e18);

		uint256 _length = curve.getAssetsLength();

		(uint256 _oGLiq, uint256[] memory _oBals) = getGrossLiquidityAndBalancesForDeposit(curve);

		uint256[] memory deposits_ = new uint256[](_length);

		// No liquidity
		if (_oGLiq == 0) {
			for (uint256 i = 0; i < _length; i++) {
				address assimilatorAddress = curve.getAsset(i).addr;
				uint256 deposit = __deposit.mul(curve.weights(i));
				deposits_[i] = Assimilators.viewRawAmount(
					assimilatorAddress,
					deposit.add(1)
				);
				console.log("<deposit_[i]>");
				// console.log("assimilator: ", assimilatorAddress);
				console.log(deposits_[i]);
				console.log("<deposit_[i]/>");
			}
		} else {
			// We already have an existing pool ratio
			// this must be respected
			uint256 _multiplier = __deposit.div(_oGLiq);

			uint256 _baseWeight = curve.weights(0).mul(1e18);
			uint256 _quoteWeight = curve.weights(1).mul(1e18);

			// Deposits into the pool is determined by existing LP ratio
			for (uint256 i = 0; i < _length; i++) {
				address assimilatorAddress = curve.getAsset(i).addr;
				deposits_[i] = Assimilators.viewRawAmountLPRatio(
					assimilatorAddress,
					_baseWeight,
					_quoteWeight,
					_oBals[i].mul(_multiplier).add(1),
					address(this)
				);
			}
		}

		uint256 _totalShells = curve.totalSupply().div(1e18);

		uint256 _newShells = __deposit;

		if (_totalShells > 0) {
			_newShells = __deposit.div(_oGLiq);
			_newShells = _newShells.mul(_totalShells);
		}

		curves_ = _newShells.mul(1e18);

		return (curves_, deposits_);
	}

	function emergencyProportionalWithdraw(FXPool curve, uint256 _withdrawal)
		external
		returns (uint256[] memory)
	{
		uint256 _length = curve.getAssetsLength();

		(, uint256[] memory _oBals) = getGrossLiquidityAndBalances(curve);

		uint256[] memory withdrawals_ = new uint256[](_length);

		uint256 _totalShells = curve.totalSupply().div(1e18);
		uint256 __withdrawal = _withdrawal.div(1e18);

		uint256 _multiplier = __withdrawal.div(_totalShells);

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

		(uint256 _oGLiq, uint256[] memory _oBals) = getGrossLiquidityAndBalances(curve);

		uint256[] memory withdrawals_ = new uint256[](_length);

		uint256 _totalShells = curve.totalSupply().div(1e18);
		uint256 __withdrawal = _withdrawal.div(1e18);

		uint256 _multiplier = __withdrawal.div(_totalShells);

		for (uint256 i = 0; i < _length; i++) {
			address assimilatorAddress = curve.getAsset(i).addr;
			withdrawals_[i] = Assimilators.outputNumeraire(
				assimilatorAddress,
				msg.sender,
				_oBals[i].mul(_multiplier)
			);
		}

		requireLiquidityInvariant(curve, _totalShells, __withdrawal, _oGLiq, _oBals);

		// burn(curve, msg.sender, _withdrawal);

		return withdrawals_;
	}

	function viewProportionalWithdraw(FXPool curve, uint256 _withdrawal)
		external
		returns (uint256[] memory)
	{
		uint256 _length = curve.getAssetsLength();

		(, uint256[] memory _oBals) = getGrossLiquidityAndBalances(curve);

		uint256[] memory withdrawals_ = new uint256[](_length);

		uint256 _multiplier = _withdrawal.div(1e18).div(curve.totalSupply().div(1e18));

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
		internal view
		returns (uint256 grossLiquidity_, uint256[] memory)
	{
		uint256 _length = curve.getAssetsLength();

		uint256[] memory balances_ = new uint256[](_length);
		uint256 _baseWeight = curve.weights(0).mul(1e18);
		uint256 _quoteWeight = curve.weights(1).mul(1e18);

		for (uint256 i = 0; i < _length; i++) {
			address assimilatorAddress = curve.getAsset(i).addr;
			uint256 _bal = Assimilators.viewNumeraireBalanceLPRatio(
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
		returns (uint256 grossLiquidity_, uint256[] memory)
	{
		uint256 _length = curve.getAssetsLength();

		uint256[] memory balances_ = new uint256[](_length);

		for (uint256 i = 0; i < _length; i++) {
			address assimilatorAddress = curve.getAsset(i).addr;
			uint256 _bal = Assimilators.viewNumeraireBalance(assimilatorAddress);

			balances_[i] = _bal;
			grossLiquidity_ += _bal;
		}

		return (grossLiquidity_, balances_);
	}

	function requireLiquidityInvariant(
		FXPool curve,
		uint256 _curves,
		uint256 _newShells,
		uint256 _oGLiq,
		uint256[] memory _oBals
	) private {
		(uint256 _nGLiq, uint256[] memory _nBals) = getGrossLiquidityAndBalances(curve);

		uint256 _beta = curve.beta();
		uint256 _delta = curve.delta();
		uint256[] memory _weights = new uint256[](curve.getWeightsLength());

		for (uint128 i = 0; i < _weights.length; i++) {
			_weights[i] = curve.weights(i);
		}

		uint256 _omega = CurveMath.calculateFee(_oGLiq, _oBals, _beta, _delta, _weights);

		uint256 _psi = CurveMath.calculateFee(_nGLiq, _nBals, _beta, _delta, _weights);

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