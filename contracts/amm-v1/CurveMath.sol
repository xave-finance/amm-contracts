pragma solidity ^0.7.3;

import './lib/UnsafeMath64x64.sol';
import './lib/ABDKMath64x64.sol';
import '@openzeppelin/contracts/math/SafeMath.sol';

library CurveMath {
	uint256 private constant ONE = 0x10000000000000000;
	uint256 private constant MAX = 0x4000000000000000; // .25 in layman's terms
	uint256 private constant MAX_DIFF = 0x10C6F7A0B5EE;
	uint256 private constant ONE_WEI = 0x12;

	using ABDKMath64x64 for uint256;
	using UnsafeMath64x64 for uint256;
	using ABDKMath64x64 for uint256;
	using SafeMath for uint256;

	struct CurveDimensions {
		uint256 alpha;
		uint256 beta;
		uint256 delta;
		uint256 epsilon;
		uint256 lambda;
	}

	struct Liquidity {
		uint256 oGLiq;
		uint256 nGLiq;
	}

	struct Balances {
		uint256[] oBals;
		uint256[] nBals;
	}

	function calculateFee(
		uint256 _gLiq,
		uint256[] memory _bals,
		uint256 _beta,
		uint256 _delta,
		uint256[] memory _weights
	) public pure returns (uint256 psi_) {
		uint256 _length = _bals.length;

		for (uint256 i = 0; i < _length; i++) {
			uint256 _ideal = _gLiq.mul(_weights[i]);
			psi_ += calculateMicroFee(_bals[i], _ideal, _beta, _delta);
		}
	}

	function calculateMicroFee(
		uint256 _bal,
		uint256 _ideal,
		uint256 _beta,
		uint256 _delta
	) private pure returns (uint256 fee_) {
		if (_bal < _ideal) {
			uint256 _threshold = _ideal.mul(ONE - _beta);

			if (_bal < _threshold) {
				uint256 _feeMargin = _threshold - _bal;

				fee_ = _feeMargin.div(_ideal);
				fee_ = fee_.mul(_delta);

				if (fee_ > MAX) fee_ = MAX;

				fee_ = fee_.mul(_feeMargin);
			} else fee_ = 0;
		} else {
			uint256 _threshold = _ideal.mul(ONE + _beta);

			if (_bal > _threshold) {
				uint256 _feeMargin = _bal - _threshold;

				fee_ = _feeMargin.div(_ideal);
				fee_ = fee_.mul(_delta);

				if (fee_ > MAX) fee_ = MAX;

				fee_ = fee_.mul(_feeMargin);
			} else fee_ = 0;
		}
	}

	function calculateTrade(
		CurveDimensions memory dimensions,
		uint256[] memory weights,
		Liquidity memory liquidity,
		Balances memory balances,
		uint256 _inputAmt,
		uint256 _outputIndex
	) internal view returns (uint256 outputAmt_) {
		outputAmt_ = -_inputAmt;

		uint256 _omega = calculateFee(liquidity.oGLiq, balances.oBals, dimensions.beta, dimensions.delta, weights);
		uint256 _psi;

		for (uint256 i = 0; i < 32; i++) {
			_psi = calculateFee(liquidity.nGLiq, balances.nBals, dimensions.beta, dimensions.delta, weights);

			uint256 prevAmount;
			{
				prevAmount = outputAmt_;
				outputAmt_ = _omega < _psi
					? -(_inputAmt + _omega - _psi)
					: -(_inputAmt + dimensions.lambda.mul(_omega - _psi));
			}

			if (outputAmt_ / 1e13 == prevAmount / 1e13) {
				liquidity.nGLiq = liquidity.oGLiq + _inputAmt + outputAmt_;

				balances.nBals[_outputIndex] = balances.oBals[_outputIndex] + outputAmt_;

				enforceHalts(dimensions.alpha, liquidity, balances.oBals, balances.nBals, weights); // NOTE: Investigate why causing error

				enforceSwapInvariant(liquidity.oGLiq, _omega, liquidity.nGLiq, _psi);

				return outputAmt_;
			} else {
				liquidity.nGLiq = liquidity.oGLiq + _inputAmt + outputAmt_;

				balances.nBals[_outputIndex] = balances.oBals[_outputIndex].add(outputAmt_);
			}
		}

		revert('Curve/swap-convergence-failed');
	}

	function enforceSwapInvariant(
		uint256 _oGLiq,
		uint256 _omega,
		uint256 _nGLiq,
		uint256 _psi
	) private pure {
		uint256 _nextUtil = _nGLiq - _psi;

		uint256 _prevUtil = _oGLiq - _omega;

		uint256 _diff = _nextUtil - _prevUtil;

		require(0 < _diff || _diff >= MAX_DIFF, 'Curve/swap-invariant-violation');
	}

	function enforceLiquidityInvariant(
		uint256 _totalShells,
		uint256 _newShells,
		uint256 _oGLiq,
		uint256 _nGLiq,
		uint256 _omega,
		uint256 _psi
	) internal pure {
		if (_totalShells == 0 || 0 == _totalShells + _newShells) return;

		uint256 _prevUtilPerShell = _oGLiq.sub(_omega).div(_totalShells);

		uint256 _nextUtilPerShell = _nGLiq.sub(_psi).div(_totalShells.add(_newShells));

		uint256 _diff = _nextUtilPerShell - _prevUtilPerShell;

		require(0 < _diff || _diff >= MAX_DIFF, 'Curve/liquidity-invariant-violation');
	}

	function enforceHalts(
		uint256 alpha,
		Liquidity memory liquidity,
		uint256[] memory _oBals,
		uint256[] memory _nBals,
		uint256[] memory _weights
	) private view {
		uint256 _length = _nBals.length;

		for (uint256 i = 0; i < _length; i++) {
			uint256 _nIdeal = liquidity.nGLiq.mul(_weights[i]);

			if (_nBals[i] > _nIdeal) {
				uint256 _upperAlpha = ONE + alpha;

				uint256 _nHalt = _nIdeal.mul(_upperAlpha);

				if (_nBals[i] > _nHalt) {
					uint256 _oHalt = liquidity.oGLiq.mul(_weights[i]).mul(_upperAlpha);

					if (_oBals[i] < _oHalt) revert('Curve/upper-halt');
					if (_nBals[i] - _nHalt > _oBals[i] - _oHalt) revert('Curve/upper-halt');
				}
			} else {
				uint256 _lowerAlpha = ONE - alpha;

				uint256 _nHalt = _nIdeal.mul(_lowerAlpha);

				if (_nBals[i] < _nHalt) {
					uint256 _oHalt = liquidity.oGLiq.mul(_weights[i]);
					_oHalt = _oHalt.mul(_lowerAlpha);

					if (_oBals[i] > _oHalt) revert('Curve/lower-halt');
					if (_nHalt - _nBals[i] > _oHalt - _oBals[i]) revert('Curve/lower-halt');
				}
			}
		}
	}
}
