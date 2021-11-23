pragma solidity ^0.7.3;

import '../CustomPool.sol';

import './lib/UnsafeMath64x64.sol';
import './lib/ABDKMath64x64.sol';

contract CurveMath {
	int128 private constant ONE = 0x10000000000000000;
	int128 private constant MAX = 0x4000000000000000; // .25 in layman's terms
	int128 private constant MAX_DIFF = -0x10C6F7A0B5EE;
	int128 private constant ONE_WEI = 0x12;

	using ABDKMath64x64 for int128;
	using UnsafeMath64x64 for int128;
	using ABDKMath64x64 for uint256;

	function calculateFee(
		int128 _gLiq,
		int128[] memory _bals,
		CustomPool pool,
		int128[] memory _weights
	) public view returns (int128 psi_) {
		int128 _beta = pool.beta();
		int128 _delta = pool.delta();

		psi_ = calculateFee(_gLiq, _bals, _beta, _delta, _weights);
	}

	function calculateFee(
		int128 _gLiq,
		int128[] memory _bals,
		int128 _beta,
		int128 _delta,
		int128[] memory _weights
	) public pure returns (int128 psi_) {
		uint256 _length = _bals.length;

		for (uint256 i = 0; i < _length; i++) {
			int128 _ideal = _gLiq.mul(_weights[i]);
			psi_ += calculateMicroFee(_bals[i], _ideal, _beta, _delta);
		}
	}

	function calculateMicroFee(
		int128 _bal,
		int128 _ideal,
		int128 _beta,
		int128 _delta
	) private pure returns (int128 fee_) {
		if (_bal < _ideal) {
			int128 _threshold = _ideal.mul(ONE - _beta);

			if (_bal < _threshold) {
				int128 _feeMargin = _threshold - _bal;

				fee_ = _feeMargin.div(_ideal);
				fee_ = fee_.mul(_delta);

				if (fee_ > MAX) fee_ = MAX;

				fee_ = fee_.mul(_feeMargin);
			} else fee_ = 0;
		} else {
			int128 _threshold = _ideal.mul(ONE + _beta);

			if (_bal > _threshold) {
				int128 _feeMargin = _bal - _threshold;

				fee_ = _feeMargin.div(_ideal);
				fee_ = fee_.mul(_delta);

				if (fee_ > MAX) fee_ = MAX;

				fee_ = fee_.mul(_feeMargin);
			} else fee_ = 0;
		}
	}

	function calculateTrade(
		CustomPool pool,
		int128 _oGLiq,
		int128 _nGLiq,
		int128[] memory _oBals,
		int128[] memory _nBals,
		int128 _inputAmt,
		uint256 _outputIndex
	) internal view returns (int128 outputAmt_) {
		outputAmt_ = -_inputAmt;

		int128 _lambda = pool.lambda();
		int128[] memory _weights = new int128[](pool.getWeightsLength());

		for(uint128 i = 0; i < _weights.length; i++) {
			_weights[i] = pool.weights(i);
		}

		int128 _omega = calculateFee(_oGLiq, _oBals, pool, _weights);
		int128 _psi;

		for (uint256 i = 0; i < 32; i++) {
			_psi = calculateFee(_nGLiq, _nBals, pool, _weights);

			int128 prevAmount;
			{
				prevAmount = outputAmt_;
				outputAmt_ = _omega < _psi
					? -(_inputAmt + _omega - _psi)
					: -(_inputAmt + _lambda.mul(_omega - _psi));
			}

			if (outputAmt_ / 1e13 == prevAmount / 1e13) {
				_nGLiq = _oGLiq + _inputAmt + outputAmt_;

				_nBals[_outputIndex] = _oBals[_outputIndex] + outputAmt_;

				enforceHalts(pool, _oGLiq, _nGLiq, _oBals, _nBals, _weights);

				enforceSwapInvariant(_oGLiq, _omega, _nGLiq, _psi);

				return outputAmt_;
			} else {
				_nGLiq = _oGLiq + _inputAmt + outputAmt_;

				_nBals[_outputIndex] = _oBals[_outputIndex].add(outputAmt_);
			}
		}

		revert('Curve/swap-convergence-failed');
	}

	function calculateLiquidityMembrane(
		CustomPool pool,
		int128 _oGLiq,
		int128 _nGLiq,
		int128[] memory _oBals,
		int128[] memory _nBals
	) internal returns (int128 curves_) {
		int128[] memory _weights = new int128[](pool.getWeightsLength());

		for(uint128 i = 0; i < _weights.length; i++) {
			_weights[i] = pool.weights(i);
		}

		enforceHalts(pool, _oGLiq, _nGLiq, _oBals, _nBals, _weights);

		int128 _omega;
		int128 _psi;

		{
			int128 _beta = pool.beta();
			int128 _delta = pool.delta();
			int128[] memory _weights = new int128[](pool.getWeightsLength());

			for(uint128 i = 0; i < _weights.length; i++) {
				_weights[i] = pool.weights(i);
			}

			_omega = calculateFee(_oGLiq, _oBals, _beta, _delta, _weights);
			_psi = calculateFee(_nGLiq, _nBals, _beta, _delta, _weights);
		}

		int128 _feeDiff = _psi.sub(_omega);
		int128 _liqDiff = _nGLiq.sub(_oGLiq);
		int128 _oUtil = _oGLiq.sub(_omega);
		int128 _totalShells = pool.totalSupply().divu(1e18);
		int128 _curveMultiplier;

		if (_totalShells == 0) {
			curves_ = _nGLiq.sub(_psi);
		} else if (_feeDiff >= 0) {
			_curveMultiplier = _liqDiff.sub(_feeDiff).div(_oUtil);
		} else {
			_curveMultiplier = _liqDiff.sub(pool.lambda().mul(_feeDiff));

			_curveMultiplier = _curveMultiplier.div(_oUtil);
		}

		if (_totalShells != 0) {
			curves_ = _totalShells.mul(_curveMultiplier);

			enforceLiquidityInvariant(_totalShells, curves_, _oGLiq, _nGLiq, _omega, _psi);
		}
	}

	function enforceSwapInvariant(
		int128 _oGLiq,
		int128 _omega,
		int128 _nGLiq,
		int128 _psi
	) private pure {
		int128 _nextUtil = _nGLiq - _psi;

		int128 _prevUtil = _oGLiq - _omega;

		int128 _diff = _nextUtil - _prevUtil;

		require(0 < _diff || _diff >= MAX_DIFF, 'Curve/swap-invariant-violation');
	}

	function enforceLiquidityInvariant(
		int128 _totalShells,
		int128 _newShells,
		int128 _oGLiq,
		int128 _nGLiq,
		int128 _omega,
		int128 _psi
	) internal pure {
		if (_totalShells == 0 || 0 == _totalShells + _newShells) return;

		int128 _prevUtilPerShell = _oGLiq.sub(_omega).div(_totalShells);

		int128 _nextUtilPerShell = _nGLiq.sub(_psi).div(_totalShells.add(_newShells));

		int128 _diff = _nextUtilPerShell - _prevUtilPerShell;

		require(0 < _diff || _diff >= MAX_DIFF, 'Curve/liquidity-invariant-violation');
	}

	function enforceHalts(
		CustomPool pool,
		int128 _oGLiq,
		int128 _nGLiq,
		int128[] memory _oBals,
		int128[] memory _nBals,
		int128[] memory _weights
	) private view {
		uint256 _length = _nBals.length;
		int128 _alpha = pool.alpha();

		for (uint256 i = 0; i < _length; i++) {
			int128 _nIdeal = _nGLiq.mul(_weights[i]);

			if (_nBals[i] > _nIdeal) {
				int128 _upperAlpha = ONE + _alpha;

				int128 _nHalt = _nIdeal.mul(_upperAlpha);

				if (_nBals[i] > _nHalt) {
					int128 _oHalt = _oGLiq.mul(_weights[i]).mul(_upperAlpha);

					if (_oBals[i] < _oHalt) revert('Curve/upper-halt');
					if (_nBals[i] - _nHalt > _oBals[i] - _oHalt) revert('Curve/upper-halt');
				}
			} else {
				int128 _lowerAlpha = ONE - _alpha;

				int128 _nHalt = _nIdeal.mul(_lowerAlpha);

				if (_nBals[i] < _nHalt) {
					int128 _oHalt = _oGLiq.mul(_weights[i]);
					_oHalt = _oHalt.mul(_lowerAlpha);

					if (_oBals[i] > _oHalt) revert('Curve/lower-halt');
					if (_nHalt - _nBals[i] > _oHalt - _oBals[i]) revert('Curve/lower-halt');
				}
			}
		}
	}
}
