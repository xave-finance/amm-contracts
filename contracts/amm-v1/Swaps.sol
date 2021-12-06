// SPDX-License-Identifier: MIT

pragma solidity ^0.7.3;
pragma experimental ABIEncoderV2;

import './Assimilators.sol';
import './CurveMath.sol';
import './lib/UnsafeMath64x64.sol';
import './lib/ABDKMath64x64.sol';

import '../FXPool.sol';

import '../balancer-core-v2/solidity-utils/contracts/openzeppelin/SafeMath.sol';

contract Swaps {
	using ABDKMath64x64 for int128;
	using UnsafeMath64x64 for int128;
	using ABDKMath64x64 for uint256;
	using SafeMath for uint256;

	event Trade(
		address indexed trader,
		address indexed origin,
		address indexed target,
		uint256 originAmount,
		uint256 targetAmount
	);

	int128 public constant ONE = 0x10000000000000000;

	function getOriginAndTarget(
		FXPool pool,
		address _o,
		address _t
	) private view returns (FXPool.Assimilator memory, FXPool.Assimilator memory) {
		FXPool.Assimilator memory o_ = pool.getAssimilator(_o);
		FXPool.Assimilator memory t_ = pool.getAssimilator(_t);

		require(o_.addr != address(0), 'Curve/origin-not-supported');
		require(t_.addr != address(0), 'Curve/target-not-supported');

		return (o_, t_);
	}

	function _getDimensions(FXPool pool)
		private
		view
		returns (CurveMath.CurveDimensions memory dimensions, int128[] memory weights)
	{
		weights = new int128[](pool.getWeightsLength());

		{
			for (uint128 i = 0; i < weights.length; i++) {
				weights[i] = pool.getWeight(i);
			}
		}

		dimensions = CurveMath.CurveDimensions({
			alpha: pool.alpha(),
			beta: pool.beta(),
			delta: pool.delta(),
			epsilon: pool.epsilon(),
			lambda: pool.lambda()
		});
	}

	function _calculateTrade(
		FXPool pool,
		int128 _oGLiq,
		int128 _nGLiq,
		int128[] memory _oBals,
		int128[] memory _nBals,
		int128 _amt,
		FXPool.Assimilator memory _o
	) private view returns (int128) {
		(CurveMath.CurveDimensions memory dimensions, int128[] memory weights) = _getDimensions(
			pool
		);

		CurveMath.Liquidity memory liquidity = CurveMath.Liquidity({oGLiq: _oGLiq, nGLiq: _nGLiq});

		CurveMath.Balances memory balances = CurveMath.Balances({oBals: _oBals, nBals: _nBals});

		_amt = CurveMath.calculateTrade(dimensions, weights, liquidity, balances, _amt, _o.ix);

		return (_amt);
	}

	function originSwap(
		FXPool pool,
		address _origin,
		address _target,
		uint256 _originAmount,
		address _recipient
	) external returns (uint256 tAmt_) {
		(FXPool.Assimilator memory _o, FXPool.Assimilator memory _t) = getOriginAndTarget(
			pool,
			_origin,
			_target
		);

		if (_o.ix == _t.ix)
			return
				Assimilators.outputNumeraire(
					_t.addr,
					_recipient,
					Assimilators.intakeRaw(_o.addr, _originAmount)
				);

		(
			int128 _amt,
			int128 _oGLiq,
			int128 _nGLiq,
			int128[] memory _oBals,
			int128[] memory _nBals
		) = getOriginSwapData(pool, _o.ix, _t.ix, _o.addr, _originAmount);

		int128 _calculatedAmt = _calculateTrade(pool, _oGLiq, _nGLiq, _oBals, _nBals, _amt, _o);
		_amt = _calculatedAmt;

		_amt = _amt.us_mul(ONE - pool.epsilon());

		tAmt_ = Assimilators.outputNumeraire(_t.addr, _recipient, _amt);

		emit Trade(msg.sender, _origin, _target, _originAmount, tAmt_);
	}

	function viewOriginSwap(
		FXPool pool,
		address _origin,
		address _target,
		uint256 _originAmount
	) external view returns (uint256 tAmt_) {
		(FXPool.Assimilator memory _o, FXPool.Assimilator memory _t) = getOriginAndTarget(
			pool,
			_origin,
			_target
		);

		if (_o.ix == _t.ix)
			return
				Assimilators.viewRawAmount(
					_t.addr,
					Assimilators.viewNumeraireAmount(_o.addr, _originAmount)
				);

		(
			int128 _amt,
			int128 _oGLiq,
			int128 _nGLiq,
			int128[] memory _nBals,
			int128[] memory _oBals
		) = viewOriginSwapData(pool, _o.ix, _t.ix, _originAmount, _o.addr);

		(CurveMath.CurveDimensions memory dimensions, int128[] memory weights) = _getDimensions(
			pool
		);

		CurveMath.Liquidity memory liquidity = CurveMath.Liquidity({oGLiq: _oGLiq, nGLiq: _nGLiq});

		CurveMath.Balances memory balances = CurveMath.Balances({oBals: _oBals, nBals: _nBals});

		_amt = CurveMath.calculateTrade(dimensions, weights, liquidity, balances, _amt, _t.ix);

		_amt = _amt.us_mul(ONE - dimensions.epsilon);

		tAmt_ = Assimilators.viewRawAmount(_t.addr, _amt.abs());
	}

	function targetSwap(
		FXPool pool,
		address _origin,
		address _target,
		uint256 _targetAmount,
		address _recipient
	) external returns (uint256 oAmt_) {
		(FXPool.Assimilator memory _o, FXPool.Assimilator memory _t) = getOriginAndTarget(
			pool,
			_origin,
			_target
		);

		if (_o.ix == _t.ix)
			return
				Assimilators.intakeNumeraire(
					_o.addr,
					Assimilators.outputRaw(_t.addr, _recipient, _targetAmount)
				);

		// If the origin is the quote currency (i.e. usdc)
		// we need to make sure to massage the _targetAmount
		// by dividing it by the exchange rate (so it gets
		// multiplied later to reach the same target amount).
		// Inelegant solution, but this way we don't need to
		// re-write large chunks of the code-base

		// curve.assets[1].addr = quoteCurrency
		// no variable assignment due to stack too deep
		if (pool.getAsset(1).addr == _o.addr) {
			_targetAmount = _targetAmount.mul(1e8).div(Assimilators.getRate(_t.addr));
		}

		(
			int128 _amt,
			int128 _oGLiq,
			int128 _nGLiq,
			int128[] memory _oBals,
			int128[] memory _nBals
		) = getTargetSwapData(pool, _t.ix, _o.ix, _t.addr, _recipient, _targetAmount);

		int128 _calculatedAmt = _calculateTrade(pool, _oGLiq, _nGLiq, _oBals, _nBals, _amt, _o);
		_amt = _calculatedAmt;

		// If the origin is the quote currency (i.e. usdc)
		// we need to make sure to massage the _amt too

		// curve.assets[1].addr = quoteCurrency
		if (pool.getAsset(1).addr == _o.addr) {
			_amt = _amt.mul(Assimilators.getRate(_t.addr).divu(1e8));
		}

		_amt = _amt.us_mul(ONE + pool.epsilon());

		oAmt_ = Assimilators.intakeNumeraire(_o.addr, _amt);

		emit Trade(msg.sender, _origin, _target, oAmt_, _targetAmount);
	}

	function viewTargetSwap(
		FXPool pool,
		address _origin,
		address _target,
		uint256 _targetAmount
	) external view returns (uint256 oAmt_) {
		(FXPool.Assimilator memory _o, FXPool.Assimilator memory _t) = getOriginAndTarget(
			pool,
			_origin,
			_target
		);

		if (_o.ix == _t.ix)
			return
				Assimilators.viewRawAmount(
					_o.addr,
					Assimilators.viewNumeraireAmount(_t.addr, _targetAmount)
				);

		// If the origin is the quote currency (i.e. usdc)
		// we need to make sure to massage the _targetAmount
		// by dividing it by the exchange rate (so it gets
		// multiplied later to reach the same target amount).
		// Inelegant solution, but this way we don't need to
		// re-write large chunks of the code-base

		// curve.assets[1].addr = quoteCurrency
		// no variable assignment due to stack too deep
		if (pool.getAsset(1).addr == _o.addr) {
			_targetAmount = _targetAmount.mul(1e8).div(Assimilators.getRate(_t.addr));
		}

		(
			int128 _amt,
			int128 _oGLiq,
			int128 _nGLiq,
			int128[] memory _nBals,
			int128[] memory _oBals
		) = viewTargetSwapData(pool, _t.ix, _o.ix, _targetAmount, _t.addr);

		int128 _calculatedAmt = _calculateTrade(pool, _oGLiq, _nGLiq, _oBals, _nBals, _amt, _o);
		_amt = _calculatedAmt;

		// If the origin is the quote currency (i.e. usdc)
		// we need to make sure to massage the _amt too

		// curve.assets[1].addr = quoteCurrency
		if (pool.getAsset(1).addr == _o.addr) {
			_amt = _amt.mul(Assimilators.getRate(_t.addr).divu(1e8));
		}

		_amt = _amt.us_mul(ONE + pool.epsilon());

		oAmt_ = Assimilators.viewRawAmount(_o.addr, _amt);
	}

	// HERE
	function getOriginSwapData(
		FXPool pool,
		uint256 _inputIx,
		uint256 _outputIx,
		address _assim,
		uint256 _amt
	)
		private
		returns (
			int128 amt_,
			int128 oGLiq_,
			int128 nGLiq_,
			int128[] memory,
			int128[] memory
		)
	{
		uint256 _length = pool.getAssetsLength();

		int128[] memory oBals_ = new int128[](_length);
		int128[] memory nBals_ = new int128[](_length);
		// FXPool.Assimilator[] memory _reserves = pool.assets;
		FXPool.Assimilator[] memory _reserves = pool.getAssets();

		for (uint256 i = 0; i < _length; i++) {
			if (i != _inputIx)
				nBals_[i] = oBals_[i] = Assimilators.viewNumeraireBalance(_reserves[i].addr);
			else {
				int128 _bal;
				(amt_, _bal) = Assimilators.intakeRawAndGetBalance(_assim, _amt);

				oBals_[i] = _bal.sub(amt_);
				nBals_[i] = _bal;
			}

			oGLiq_ += oBals_[i];
			nGLiq_ += nBals_[i];
		}

		nGLiq_ = nGLiq_.sub(amt_);
		nBals_[_outputIx] = ABDKMath64x64.sub(nBals_[_outputIx], amt_);

		return (amt_, oGLiq_, nGLiq_, oBals_, nBals_);
	}

	function getTargetSwapData(
		FXPool pool,
		uint256 _inputIx,
		uint256 _outputIx,
		address _assim,
		address _recipient,
		uint256 _amt
	)
		private
		returns (
			int128 amt_,
			int128 oGLiq_,
			int128 nGLiq_,
			int128[] memory,
			int128[] memory
		)
	{
		uint256 _length = pool.getAssetsLength();

		int128[] memory oBals_ = new int128[](_length);
		int128[] memory nBals_ = new int128[](_length);
		FXPool.Assimilator[] memory _reserves = pool.getAssets();

		for (uint256 i = 0; i < _length; i++) {
			if (i != _inputIx)
				nBals_[i] = oBals_[i] = Assimilators.viewNumeraireBalance(_reserves[i].addr);
			else {
				int128 _bal;
				(amt_, _bal) = Assimilators.outputRawAndGetBalance(_assim, _recipient, _amt);

				oBals_[i] = _bal.sub(amt_);
				nBals_[i] = _bal;
			}

			oGLiq_ += oBals_[i];
			nGLiq_ += nBals_[i];
		}

		nGLiq_ = nGLiq_.sub(amt_);
		nBals_[_outputIx] = ABDKMath64x64.sub(nBals_[_outputIx], amt_);

		return (amt_, oGLiq_, nGLiq_, oBals_, nBals_);
	}

	function viewOriginSwapData(
		FXPool pool,
		uint256 _inputIx,
		uint256 _outputIx,
		uint256 _amt,
		address _assim
	)
		private
		view
		returns (
			int128 amt_,
			int128 oGLiq_,
			int128 nGLiq_,
			int128[] memory,
			int128[] memory
		)
	{
		uint256 _length = pool.getAssetsLength();
		int128[] memory nBals_ = new int128[](_length);
		int128[] memory oBals_ = new int128[](_length);

		for (uint256 i = 0; i < _length; i++) {
			if (i != _inputIx)
				nBals_[i] = oBals_[i] = Assimilators.viewNumeraireBalance(pool.getAsset(i).addr);
			else {
				int128 _bal;
				(amt_, _bal) = Assimilators.viewNumeraireAmountAndBalance(_assim, _amt);

				oBals_[i] = _bal;
				nBals_[i] = _bal.add(amt_);
			}

			oGLiq_ += oBals_[i];
			nGLiq_ += nBals_[i];
		}

		nGLiq_ = nGLiq_.sub(amt_);
		nBals_[_outputIx] = ABDKMath64x64.sub(nBals_[_outputIx], amt_);

		return (amt_, oGLiq_, nGLiq_, nBals_, oBals_);
	}

	function viewTargetSwapData(
		FXPool pool,
		uint256 _inputIx,
		uint256 _outputIx,
		uint256 _amt,
		address _assim
	)
		private
		view
		returns (
			int128 amt_,
			int128 oGLiq_,
			int128 nGLiq_,
			int128[] memory,
			int128[] memory
		)
	{
		uint256 _length = pool.getAssetsLength();
		int128[] memory nBals_ = new int128[](_length);
		int128[] memory oBals_ = new int128[](_length);

		for (uint256 i = 0; i < _length; i++) {
			if (i != _inputIx)
				nBals_[i] = oBals_[i] = Assimilators.viewNumeraireBalance(pool.getAsset(i).addr);
			else {
				int128 _bal;
				(amt_, _bal) = Assimilators.viewNumeraireAmountAndBalance(_assim, _amt);
				amt_ = amt_.neg();

				oBals_[i] = _bal;
				nBals_[i] = _bal.add(amt_);
			}

			oGLiq_ += oBals_[i];
			nGLiq_ += nBals_[i];
		}

		nGLiq_ = nGLiq_.sub(amt_);
		nBals_[_outputIx] = ABDKMath64x64.sub(nBals_[_outputIx], amt_);

		return (amt_, oGLiq_, nGLiq_, nBals_, oBals_);
	}
}
