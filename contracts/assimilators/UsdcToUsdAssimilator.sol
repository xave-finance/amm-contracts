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

import '../core/lib/ABDKMath64x64.sol';
import '../core/interfaces/IAssimilator.sol';
import '../core/interfaces/IOracle.sol';

import '../interfaces/IVaultPoolBalances.sol';

contract UsdcToUsdAssimilator is IAssimilator {
    using ABDKMath64x64 for int128;
    using ABDKMath64x64 for uint256;

    IOracle public immutable oracle;
    IERC20 public immutable usdc;

    constructor(IOracle _oracle, IERC20 _usdc) {
        oracle = _oracle;
        usdc = _usdc;
    }

    uint256 private constant DECIMALS = 1e6;

    // solhint-disable-next-line
    function getRate() public view override returns (uint256) {
        return uint256(oracle.latestAnswer());
    }

    function intakeRawAndGetBalance(uint256 _amount) external override returns (int128 amount_, int128 balance_) {
        bool _success = usdc.transferFrom(msg.sender, address(this), _amount);

        require(_success, 'Curve/USDC-transfer-from-failed');

        uint256 _balance = usdc.balanceOf(address(this));

        uint256 _rate = getRate();

        balance_ = ((_balance * _rate) / 1e8).divu(DECIMALS);

        amount_ = ((_amount * _rate) / 1e8).divu(DECIMALS);
    }

    function intakeRaw(uint256 _amount) external override returns (int128 amount_) {
        bool _success = usdc.transferFrom(msg.sender, address(this), _amount);

        require(_success, 'Curve/USDC-transfer-from-failed');

        uint256 _rate = getRate();

        amount_ = ((_amount * _rate) / 1e8).divu(DECIMALS);
    }

    function intakeNumeraire(int128 _amount) external override returns (uint256 amount_) {
        uint256 _rate = getRate();

        amount_ = (_amount.mulu(DECIMALS) * 1e8) / _rate;

        bool _success = usdc.transferFrom(msg.sender, address(this), amount_);

        require(_success, 'Curve/USDC-transfer-from-failed');
    }

    function intakeNumeraireLPRatio(
        uint256,
        uint256,
        address,
        int128 _amount
    ) external override returns (uint256 amount_) {
        amount_ = _amount.mulu(DECIMALS);

        bool _success = usdc.transferFrom(msg.sender, address(this), amount_);

        require(_success, 'Curve/USDC-transfer-from-failed');
    }

    function outputRawAndGetBalance(address _dst, uint256 _amount)
        external
        override
        returns (int128 amount_, int128 balance_)
    {
        uint256 _rate = getRate();

        uint256 _usdcAmount = ((_amount * _rate) / 1e8);

        bool _success = usdc.transfer(_dst, _usdcAmount);

        require(_success, 'Curve/USDC-transfer-failed');

        uint256 _balance = usdc.balanceOf(address(this));

        amount_ = _usdcAmount.divu(DECIMALS);

        balance_ = ((_balance * _rate) / 1e8).divu(DECIMALS);
    }

    function outputRaw(address _dst, uint256 _amount) external override returns (int128 amount_) {
        uint256 _rate = getRate();

        uint256 _usdcAmount = (_amount * _rate) / 1e8;

        bool _success = usdc.transfer(_dst, _usdcAmount);

        require(_success, 'Curve/USDC-transfer-failed');

        amount_ = _usdcAmount.divu(DECIMALS);
    }

    function outputNumeraire(address _dst, int128 _amount) external override returns (uint256 amount_) {
        uint256 _rate = getRate();

        amount_ = (_amount.mulu(DECIMALS) * 1e8) / _rate;

        bool _success = usdc.transfer(_dst, amount_);

        require(_success, 'Curve/USDC-transfer-failed');
    }

    function viewRawAmount(int128 _amount) external view override returns (uint256 amount_) {
        uint256 _rate = getRate();

        amount_ = (_amount.mulu(DECIMALS) * 1e8) / _rate;
    }

    function viewRawAmountLPRatio(
        uint256,
        uint256,
        address,
        int128 _amount,
        address,
        bytes32
    ) external pure override returns (uint256 amount_) {
        amount_ = _amount.mulu(DECIMALS);
    }

    function viewNumeraireAmount(uint256 _amount) external view override returns (int128 amount_) {
        uint256 _rate = getRate();

        amount_ = ((_amount * _rate) / 1e8).divu(DECIMALS);
    }

    function viewNumeraireBalance(
        address _addr,
        address vault,
        bytes32 poolId
    ) public view override returns (int128 balance_) {
        uint256 _rate = getRate();
        (, uint256[] memory balances, ) = IVaultPoolBalances(vault).getPoolTokens(poolId);
        // uint256 _balance = usdc.balanceOf(_addr);
        uint256 _balance = balances[0];

        if (_balance <= 0) return ABDKMath64x64.fromUInt(0);

        balance_ = ((_balance * _rate) / 1e8).divu(DECIMALS);
    }

    // views the numeraire value of the current balance of the reserve wrt to USD
    // since this is already the USD assimlator, the ratio is just 1
    function viewNumeraireBalanceLPRatio(
        uint256,
        uint256,
        address _addr,
        address,
        bytes32
    ) external view override returns (int128 balance_) {
        uint256 _balance = usdc.balanceOf(_addr);

        return _balance.divu(DECIMALS);
    }

    function viewNumeraireAmountAndBalance(
        address _addr,
        uint256 _amount,
        address vault,
        bytes32 poolId
    ) external view override returns (int128 amount_, int128 balance_) {
        uint256 _rate = getRate();

        amount_ = ((_amount * _rate) / 1e8).divu(DECIMALS);

        // uint256 _balance = usdc.balanceOf(_addr);

        (, uint256[] memory balances, ) = IVaultPoolBalances(vault).getPoolTokens(poolId);
        // uint256 _balance = usdc.balanceOf(_addr);
        uint256 _balance = balances[0];

        balance_ = ((_balance * _rate) / 1e8).divu(DECIMALS);
    }
}
