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

pragma solidity ^0.7.1;

interface IAssimilator {
    function getRate() external view returns (uint256);

    function intakeRaw(uint256 amount) external returns (uint256);

    function intakeRawAndGetBalance(uint256 amount) external returns (uint256, uint256);

    function intakeNumeraire(uint256 amount) external returns (uint256);

    function intakeNumeraireLPRatio(
        uint256,
        uint256,
        address,
        uint256
    ) external returns (uint256);

    function outputRaw(address dst, uint256 amount) external returns (uint256);

    function outputRawAndGetBalance(address dst, uint256 amount) external returns (uint256, uint256);

    function outputNumeraire(address dst, uint256 amount) external returns (uint256);

    function viewRawAmount(uint256) external view returns (uint256);

    function viewRawAmountLPRatio(
        uint256,
        uint256,
        address,
        uint256
    ) external view returns (uint256);

    function viewNumeraireAmount(uint256) external view returns (uint256);

    function viewNumeraireBalanceLPRatio(
        uint256,
        uint256,
        address
    ) external view returns (uint256);

    function viewNumeraireBalance(address) external view returns (uint256);

    function viewNumeraireAmountAndBalance(address, uint256) external view returns (uint256, uint256);
}
