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

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "./lib/ABDKMath64x64.sol";
import "./interfaces/IAssimilator.sol";
import "./interfaces/IOracle.sol";

import "../balancer-core-v2/solidity-utils/contracts/openzeppelin/SafeMath.sol";

contract UsdcToUsdAssimilator is IAssimilator {
    using ABDKMath64x64 for uint256;
    using ABDKMath64x64 for uint256;
    using SafeMath for uint256;

    // IOracle private constant oracle = IOracle(0x9211c6b3BF41A10F78539810Cf5c64e1BB78Ec60);
    // IERC20 private constant usdc = IERC20(0xa57c092a117C9dE50922A75674dd35ab34d82c4A);
    IOracle private oracle;
    IERC20 private usdc;

    constructor(IOracle oracle_, IERC20 usdc_) {
        oracle = oracle_;
        usdc = usdc_;
    }

    uint256 private constant DECIMALS = 1e6;

    // solhint-disable-next-line
    function getRate() public view override returns (uint256) {
        return uint256(oracle.latestAnswer());
    }

    function intakeRawAndGetBalance(uint256 _amount) external override returns (uint256 amount_, uint256 balance_) {
        bool _success = usdc.transferFrom(msg.sender, address(this), _amount);

        require(_success, "Curve/USDC-transfer-from-failed");

        uint256 _balance = usdc.balanceOf(address(this));

        uint256 _rate = getRate();

        balance_ = ((_balance * _rate) / 1e8).div(DECIMALS);

        amount_ = ((_amount * _rate) / 1e8).div(DECIMALS);
    }

    function intakeRaw(uint256 _amount) external override returns (uint256 amount_) {
        bool _success = usdc.transferFrom(msg.sender, address(this), _amount);

        require(_success, "Curve/USDC-transfer-from-failed");

        uint256 _rate = getRate();

        amount_ = ((_amount * _rate) / 1e8).div(DECIMALS);
    }

    function intakeNumeraire(uint256 _amount) external override returns (uint256 amount_) {
        uint256 _rate = getRate();

        amount_ = (_amount.mul(DECIMALS) * 1e8) / _rate;

        bool _success = usdc.transferFrom(msg.sender, address(this), amount_);

        require(_success, "Curve/USDC-transfer-from-failed");
    }

    function intakeNumeraireLPRatio(
        uint256,
        uint256,
        address,
        uint256 _amount
    ) external override returns (uint256 amount_) {
        amount_ = _amount.mul(DECIMALS);

        bool _success = usdc.transferFrom(msg.sender, address(this), amount_);

        require(_success, "Curve/USDC-transfer-from-failed");
    }

    function outputRawAndGetBalance(address _dst, uint256 _amount)
        external
        override
        returns (uint256 amount_, uint256 balance_)
    {
        uint256 _rate = getRate();

        uint256 _usdcAmount = ((_amount * _rate) / 1e8);

        bool _success = usdc.transfer(_dst, _usdcAmount);

        require(_success, "Curve/USDC-transfer-failed");

        uint256 _balance = usdc.balanceOf(address(this));

        amount_ = _usdcAmount.div(DECIMALS);

        balance_ = ((_balance * _rate) / 1e8).div(DECIMALS);
    }

    function outputRaw(address _dst, uint256 _amount) external override returns (uint256 amount_) {
        uint256 _rate = getRate();

        uint256 _usdcAmount = (_amount * _rate) / 1e8;

        bool _success = usdc.transfer(_dst, _usdcAmount);

        require(_success, "Curve/USDC-transfer-failed");

        amount_ = _usdcAmount.div(DECIMALS);
    }

    function outputNumeraire(address _dst, uint256 _amount) external override returns (uint256 amount_) {
        uint256 _rate = getRate();

        amount_ = (_amount.mul(DECIMALS) * 1e8) / _rate;

        bool _success = usdc.transfer(_dst, amount_);

        require(_success, "Curve/USDC-transfer-failed");
    }

    function viewRawAmount(uint256 _amount) external view override returns (uint256 amount_) {
        uint256 _rate = getRate();

        amount_ = (_amount.mul(DECIMALS) * 1e8) / _rate;
    }

    function viewRawAmountLPRatio(
        uint256,
        uint256,
        address,
        uint256 _amount
    ) external pure override returns (uint256 amount_) {
        amount_ = _amount.mul(DECIMALS);
    }

    function viewNumeraireAmount(uint256 _amount) external view override returns (uint256 amount_) {
        uint256 _rate = getRate();

        amount_ = ((_amount * _rate) / 1e8).div(DECIMALS);
    }

    function viewNumeraireBalance(address _addr) public view override returns (uint256 balance_) {
        uint256 _rate = getRate();

        uint256 _balance = usdc.balanceOf(_addr);

        if (_balance <= 0) return 0;

        balance_ = ((_balance * _rate) / 1e8).div(DECIMALS);
    }

    // views the numeraire value of the current balance of the reserve wrt to USD
    // since this is already the USD assimlator, the ratio is just 1
    function viewNumeraireBalanceLPRatio(
        uint256,
        uint256,
        address _addr
    ) external view override returns (uint256 balance_) {
        uint256 _balance = usdc.balanceOf(_addr);

        return _balance.div(DECIMALS);
    }

    function viewNumeraireAmountAndBalance(address _addr, uint256 _amount)
        external
        view
        override
        returns (uint256 amount_, uint256 balance_)
    {
        uint256 _rate = getRate();

        amount_ = ((_amount * _rate) / 1e8).div(DECIMALS);

        uint256 _balance = usdc.balanceOf(_addr);

        balance_ = ((_balance * _rate) / 1e8).div(DECIMALS);
    }
}
