// SPDX-License-Identifier: MIT

// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

pragma solidity ^0.7.3;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

import "./lib/ABDKMath64x64.sol";

// import "../CustomPool.sol";

import './Assimilators.sol';
import "./CurveMath.sol";

contract Orchestrator {
    using SafeERC20 for IERC20;
    using ABDKMath64x64 for int128;
    using ABDKMath64x64 for uint256;

    int128 private constant ONE_WEI = 0x12;

    CurveMath private curveMath;

    constructor (CurveMath _curveMath) {
        curveMath = _curveMath;
    }

    event ParametersSet(uint256 alpha, uint256 beta, uint256 delta, uint256 epsilon, uint256 lambda);

    event AssetIncluded(address indexed numeraire, address indexed reserve, uint256 weight);

    event AssimilatorIncluded(
        address indexed derivative,
        address indexed numeraire,
        address indexed reserve,
        address assimilator
    );

    function setParams(
        CustomPool pool,
        uint256 _alpha,
        uint256 _beta,
        uint256 _feeAtHalt,
        uint256 _epsilon,
        uint256 _lambda
    ) external returns (int128 alpha, int128 beta, int128 delta, int128 epsilon, int128 lambda) {
        require(0 < _alpha && _alpha < 1e18, "Curve/parameter-invalid-alpha");

        require(_beta < _alpha, "Curve/parameter-invalid-beta");

        require(_feeAtHalt <= 5e17, "Curve/parameter-invalid-max");

        require(_epsilon <= 1e16, "Curve/parameter-invalid-epsilon");

        require(_lambda <= 1e18, "Curve/parameter-invalid-lambda");

        int128 _omega = getFee(pool);

        {
            alpha = (_alpha + 1).divu(1e18);

            beta = (_beta + 1).divu(1e18);

            int128 minued = pool.alpha().sub(pool.beta());

            delta = (_feeAtHalt).divu(1e18).div(uint256(2).fromUInt().mul(minued)) + ONE_WEI;

            epsilon = (_epsilon + 1).divu(1e18);

            lambda = (_lambda + 1).divu(1e18);
        }

        int128 _psi = getFee(pool);

        require(_omega >= _psi, "Curve/parameters-increase-fee");

        uint256 x;
        {
            x = pool.delta().mulu(1e18);
        }

        emit ParametersSet(_alpha, _beta, x, _epsilon, _lambda);
    }

    function getFee(CustomPool pool) private returns (int128 fee_) {
        int128 _gLiq;

        // Always pairs
        int128[] memory _bals = new int128[](2);

        for (uint256 i = 0; i < _bals.length; i++) {
            address assimilatorAddress = pool.getAsset(i).addr;
            int128 _bal = Assimilators.viewNumeraireBalance(assimilatorAddress);

            _bals[i] = _bal;

            _gLiq += _bal;
        }
        int128[] memory _weights = new int128[](pool.getWeightsLength());

		for (uint128 i = 0; i < _weights.length; i++) {
			_weights[i] = pool.weights(i);
		}

        fee_ = curveMath.calculateFee(_gLiq, _bals, pool.beta(), pool.delta(), _weights);
        // fee_ = curveMath.calculateFee(_gLiq, _bals, pool.beta, pool.delta, pool.weights);
    }

    function includeAssimilator(
        CustomPool pool,
        address _derivative,
        address _numeraire,
        address _reserve,
        address _assimilator,
        address _derivativeApproveTo
    ) private {
        require(_derivative != address(0), "Curve/derivative-cannot-be-zeroth-address");

        require(_numeraire != address(0), "Curve/numeraire-cannot-be-zeroth-address");

        require(_reserve != address(0), "Curve/numeraire-cannot-be-zeroth-address");

        require(_assimilator != address(0), "Curve/assimilator-cannot-be-zeroth-address");

        IERC20(_numeraire).safeApprove(_derivativeApproveTo, uint256(-1));

        // CustomPool.Assimilator storage _numeraireAssim = pool.assimilators[_numeraire];
        CustomPool.Assimilator memory _numeraireAssim = pool.getAssimilator(_numeraire);

        // pool.assimilators[_derivative] = CustomPool.Assimilator(_assimilator, _numeraireAssim.ix);
        pool.setAssimilator(_derivative, CustomPool.Assimilator(_assimilator, _numeraireAssim.ix));

        emit AssimilatorIncluded(_derivative, _numeraire, _reserve, _assimilator);
    }

    function viewCurve(CustomPool pool)
        external
        view
        returns (
            uint256 alpha_,
            uint256 beta_,
            uint256 delta_,
            uint256 epsilon_,
            uint256 lambda_
        )
    {
        alpha_ = pool.alpha().mulu(1e18);

        beta_ = pool.beta().mulu(1e18);

        delta_ = pool.delta().mulu(1e18);

        epsilon_ = pool.epsilon().mulu(1e18);

        lambda_ = pool.lambda().mulu(1e18);
    }
}
