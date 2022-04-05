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

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/math/SafeMath.sol';
import '../core/lib/ABDKMath64x64.sol';
import '../core/interfaces/IAssimilator.sol';
import '../core/interfaces/IOracle.sol';

import '../interfaces/IVaultPoolBalances.sol';
import 'hardhat/console.sol';

contract BaseToUsdAssimilator is IAssimilator {
    using ABDKMath64x64 for int128;
    using ABDKMath64x64 for uint256;

    using SafeMath for uint256;

    IERC20 public immutable usdc;
    IOracle public immutable oracle;
    IERC20 public immutable baseToken;
    uint256 public immutable baseDecimals;

    constructor(
        uint256 _baseDecimals,
        IERC20 _baseToken,
        IERC20 _quoteToken,
        IOracle _oracle
    ) {
        baseDecimals = _baseDecimals;
        baseToken = _baseToken;
        usdc = _quoteToken;
        oracle = _oracle;
    }

    function getRate() public view override returns (uint256) {
        (, int256 price, , , ) = oracle.latestRoundData();
        return uint256(price);
    }

    // takes raw baseToken amount, transfers it in, calculates corresponding numeraire amount and returns it
    function intakeRawAndGetBalance(uint256 _amount) external override returns (int128 amount_, int128 balance_) {
        bool _transferSuccess = baseToken.transferFrom(msg.sender, address(this), _amount);

        require(_transferSuccess, 'Curve/baseToken-transfer-from-failed');

        uint256 _balance = baseToken.balanceOf(address(this));

        uint256 _rate = getRate();

        balance_ = ((_balance * _rate) / 1e8).divu(baseDecimals);

        amount_ = ((_amount * _rate) / 1e8).divu(baseDecimals);
    }

    // takes raw baseToken amount, transfers it in, calculates corresponding numeraire amount and returns it
    function intakeRaw(uint256 _amount) external override returns (int128 amount_) {
        bool _transferSuccess = baseToken.transferFrom(msg.sender, address(this), _amount);

        require(_transferSuccess, 'Curve/baseToken-transfer-from-failed');

        uint256 _rate = getRate();

        amount_ = ((_amount * _rate) / 1e8).divu(baseDecimals);
    }

    // takes a numeraire amount, calculates the raw amount of baseToken, transfers it in and returns the corresponding raw amount
    function intakeNumeraire(int128 _amount) external override returns (uint256 amount_) {
        uint256 _rate = getRate();

        amount_ = (_amount.mulu(baseDecimals) * 1e8) / _rate;

        bool _transferSuccess = baseToken.transferFrom(msg.sender, address(this), amount_);

        require(_transferSuccess, 'Curve/baseToken-transfer-from-failed');
    }

    // takes a numeraire amount, calculates the raw amount of baseToken, transfers it in and returns the corresponding raw amount
    function intakeNumeraireLPRatio(
        uint256 _baseWeight,
        uint256 _quoteWeight,
        address _addr,
        int128 _amount
    ) external override returns (uint256 amount_) {
        uint256 _baseTokenBal = baseToken.balanceOf(_addr);

        if (_baseTokenBal <= 0) return 0;

        // base decimals
        _baseTokenBal = _baseTokenBal.mul(1e18).div(_baseWeight);

        // 1e6
        uint256 _usdcBal = usdc.balanceOf(_addr).mul(1e18).div(_quoteWeight);

        // Rate is in 1e6
        uint256 _rate = _usdcBal.mul(baseDecimals).div(_baseTokenBal);

        amount_ = (_amount.mulu(baseDecimals) * 1e6) / _rate;

        bool _transferSuccess = baseToken.transferFrom(msg.sender, address(this), amount_);

        require(_transferSuccess, 'Curve/baseToken-transfer-from-failed');
    }

    // takes a raw amount of baseToken and transfers it out, returns numeraire value of the raw amount
    function outputRawAndGetBalance(address _dst, uint256 _amount)
        external
        override
        returns (int128 amount_, int128 balance_)
    {
        uint256 _rate = getRate();

        uint256 _baseTokenAmount = ((_amount) * _rate) / 1e8;

        bool _transferSuccess = baseToken.transfer(_dst, _baseTokenAmount);

        require(_transferSuccess, 'Curve/baseToken-transfer-failed');

        uint256 _balance = baseToken.balanceOf(address(this));

        amount_ = _baseTokenAmount.divu(baseDecimals);

        balance_ = ((_balance * _rate) / 1e8).divu(baseDecimals);
    }

    // takes a raw amount of baseToken and transfers it out, returns numeraire value of the raw amount
    function outputRaw(address _dst, uint256 _amount) external override returns (int128 amount_) {
        uint256 _rate = getRate();

        uint256 _baseTokenAmount = (_amount * _rate) / 1e8;

        bool _transferSuccess = baseToken.transfer(_dst, _baseTokenAmount);

        require(_transferSuccess, 'Curve/baseToken-transfer-failed');

        amount_ = _baseTokenAmount.divu(baseDecimals);
    }

    // takes a numeraire value of baseToken, figures out the raw amount, transfers raw amount out, and returns raw amount
    function outputNumeraire(address _dst, int128 _amount) external override returns (uint256 amount_) {
        uint256 _rate = getRate();

        amount_ = (_amount.mulu(baseDecimals) * 1e8) / _rate;

        bool _transferSuccess = baseToken.transfer(_dst, amount_);

        require(_transferSuccess, 'Curve/baseToken-transfer-failed');
    }

    // takes a numeraire amount and returns the raw amount
    function viewRawAmount(int128 _amount) external view override returns (uint256 amount_) {
        uint256 _rate = getRate();

        amount_ = (_amount.mulu(baseDecimals) * 1e8) / _rate;
    }

    function viewRawAmountLPRatio(
        uint256 _baseWeight,
        uint256 _quoteWeight,
        address _addr,
        int128 _amount
    ) external view override returns (uint256 amount_) {
        uint256 _baseTokenBal = baseToken.balanceOf(_addr);

        if (_baseTokenBal <= 0) return 0;

        // base decimals
        _baseTokenBal = _baseTokenBal.mul(1e18).div(_baseWeight);

        // 1e6
        uint256 _usdcBal = usdc.balanceOf(_addr).mul(1e18).div(_quoteWeight);

        // Rate is in 1e6
        uint256 _rate = _usdcBal.mul(baseDecimals).div(_baseTokenBal);

        amount_ = (_amount.mulu(baseDecimals) * 1e6) / _rate;
    }

    // takes a raw amount and returns the numeraire amount
    function viewNumeraireAmount(uint256 _amount) external view override returns (int128 amount_) {
        uint256 _rate = getRate();

        // console.log(address(this));
        // console.log('_rate: ', _rate);
        // console.log('_amount: ', _amount);
        // console.log('baseDecimals: ', baseDecimals);

        amount_ = ((_amount * _rate) / 1e8).divu(baseDecimals);
        // console.log('amount_:');
        // console.logInt(amount_);
    }

    // views the numeraire value of the current balance of the reserve, in this case baseToken
    function viewNumeraireBalance(
        address _addr,
        address vault,
        bytes32 poolId
    ) external view override returns (int128 balance_) {
        uint256 _rate = getRate();

        (, uint256[] memory balances, ) = IVaultPoolBalances(vault).getPoolTokens(poolId);
        //uint256 _balance = baseToken.balanceOf(_addr);
        // @TODO: Check selector depending on its position alphabetically on the curve storage
        uint256 _balance = balances[1];

        if (_balance <= 0) return ABDKMath64x64.fromUInt(0);

        balance_ = ((_balance * _rate) / 1e8).divu(baseDecimals);
    }

    // views the numeraire value of the current balance of the reserve, in this case baseToken
    function viewNumeraireAmountAndBalance(
        address _addr,
        uint256 _amount,
        address vault,
        bytes32 poolId
    ) external view override returns (int128 amount_, int128 balance_) {
        uint256 _rate = getRate();

        amount_ = ((_amount * _rate) / 1e8).divu(baseDecimals);

        //  uint256 _balance = baseToken.balanceOf(_addr);
        (, uint256[] memory balances, ) = IVaultPoolBalances(vault).getPoolTokens(poolId);

        // @TODO: Check selector depending on its position alphabetically on the curve storage
        uint256 _balance = balances[1];

        balance_ = ((_balance * _rate) / 1e8).divu(baseDecimals);
    }

    // views the numeraire value of the current balance of the reserve, in this case baseToken
    // instead of calculating with chainlink's "rate" it'll be determined by the existing
    // token ratio. This is in here to prevent LPs from losing out on future oracle price updates
    function viewNumeraireBalanceLPRatio(
        uint256 _baseWeight,
        uint256 _quoteWeight,
        address _addr
    ) external view override returns (int128 balance_) {
        uint256 _baseTokenBal = baseToken.balanceOf(_addr);

        if (_baseTokenBal <= 0) return ABDKMath64x64.fromUInt(0);

        uint256 _usdcBal = usdc.balanceOf(_addr).mul(1e18).div(_quoteWeight);

        // Rate is in 1e6
        uint256 _rate = _usdcBal.mul(1e18).div(_baseTokenBal.mul(1e18).div(_baseWeight));

        balance_ = ((_baseTokenBal * _rate) / 1e6).divu(1e18);
    }
}
