// SPDX-License-Identifier: MIT

pragma solidity ^0.7.3;

import './Assimilators.sol';

import './Storage.sol';

import './lib/UnsafeMath64x64.sol';
import './lib/ABDKMath64x64.sol';

import './CurveMath.sol';
import 'hardhat/console.sol';

library ProportionalLiquidity {
    using ABDKMath64x64 for uint256;
    using ABDKMath64x64 for int128;
    using UnsafeMath64x64 for int128;

    event Transfer(address indexed from, address indexed to, uint256 value);

    int128 public constant ONE = 0x10000000000000000;
    int128 public constant ONE_WEI = 0x12;

    struct JoinExitData {
        uint256[] uintAmounts;
        int128[] intAmounts;
    }

    function proportionalDeposit(Storage.Curve storage curve, uint256 _deposit)
        external
        view
        returns (uint256 curves_, uint256[] memory)
    {
        console.log('_deposit :', _deposit);
        int128 __deposit = _deposit.divu(1e18);
        console.log('__deposit: ');
        console.logInt(__deposit);

        uint256 _length = curve.assets.length;

        // uint256[] memory deposits_ = new uint256[](_length);
        // int128[] memory intDepositAmounts = new int128[](_length);
        JoinExitData memory depositData = JoinExitData(new uint256[](_length), new int128[](_length));

        (int128 _oGLiq, int128[] memory _oBals) = getGrossLiquidityAndBalancesForDeposit(curve);
        console.log('_oGLiq');
        console.logInt(_oGLiq);
        console.log(ABDKMath64x64.toUInt(_oGLiq));
        console.log('_oBals[0]');
        console.logInt(_oBals[0]);
        console.log(ABDKMath64x64.toUInt(_oBals[0]));
        console.log('_oBals[1]');
        console.logInt(_oBals[1]);
        console.log(ABDKMath64x64.toUInt(_oBals[1]));

        // Needed to calculate liquidity invariant
        (int128 _oGLiqProp, int128[] memory _oBalsProp) = getGrossLiquidityAndBalances(curve);
        console.log('_oGLiqProp');
        console.logInt(_oGLiqProp);
        console.log(ABDKMath64x64.toUInt(_oGLiqProp));
        console.log('_oBalsProp[0]');
        console.logInt(_oBalsProp[0]);
        console.log(ABDKMath64x64.toUInt(_oBalsProp[0]));
        console.log('_oBalsProp[1]');
        console.logInt(_oBalsProp[1]);
        console.log(ABDKMath64x64.toUInt(_oBalsProp[1]));

        // No liquidity, oracle sets the ratio
        if (_oGLiq == 0) {
            for (uint256 i = 0; i < _length; i++) {
                // Variable here to avoid stack-too-deep errors
                int128 _d = __deposit.mul(curve.weights[i]);
                console.log('_d');
                console.logInt(_d);
                depositData.uintAmounts[i] = Assimilators.viewRawAmount(curve.assets[i].addr, _d.add(ONE_WEI));
                console.log('Deposit data amounts [1]: ', depositData.uintAmounts[0]);
                console.log('Deposit data amounts [2]: ', depositData.uintAmounts[1]);
            }
        } else {
            // We already have an existing pool ratio
            // which must be respected
            int128 _multiplier = __deposit.div(_oGLiq);

            console.log('_multiplier');
            console.logInt(_multiplier);
            console.log(ABDKMath64x64.toUInt(_multiplier));

            address vault = address(curve.vault);
            bytes32 poolId = curve.poolId;

            int128[] memory weights = curve.weights;
            Storage.Assimilator[] memory assims = curve.assets;

            for (uint256 i = 0; i < _length; i++) {
                // int128 amount = _oBals[i].mul(_multiplier).add(ONE_WEI);
                depositData.intAmounts[i] = _oBals[i].mul(_multiplier).add(ONE_WEI);
                console.log('_oBals[0]');
                console.logInt(_oBals[0]);
                console.log(ABDKMath64x64.toUInt(_oBals[0]));
                console.log('_oBals[1]');
                console.logInt(_oBals[1]);
                console.log(ABDKMath64x64.toUInt(_oBals[1]));

                console.log('depositData.intAmounts[0]: ');
                console.logInt(depositData.intAmounts[0]);
                console.log(ABDKMath64x64.toUInt(depositData.intAmounts[0]));
                console.log('depositData.intAmounts[1]: ');
                console.log(ABDKMath64x64.toUInt(depositData.intAmounts[1]));

                depositData.uintAmounts[i] = Assimilators.viewRawAmountLPRatio(
                    assims[i].addr,
                    weights[0].mulu(1e18),
                    weights[1].mulu(1e18),
                    // amount,
                    depositData.intAmounts[i],
                    vault,
                    poolId
                );

                console.log('depositData.uintAmounts[0]: ', depositData.uintAmounts[0]);
                console.log('depositData.uintAmounts[1]: ', depositData.uintAmounts[1]);
            }
        }

        int128 _totalShells = curve.totalSupply.divu(1e18);

        int128 _newShells = __deposit;

        if (_totalShells > 0) {
            _newShells = __deposit.div(_oGLiq);
            _newShells = _newShells.mul(_totalShells);
        }

        /*
         * Problem: to validate deposit via invariant check, 
         we need to simulate the gross liquidity and token balances of the pool after deposit
         at this point, the balancer vault has not transferred deposit funds from user to vault yet 
            (this will happen after the hook is called by the vault)
         * Solution: 
            * pass deposits_ here now so that we can update balances within requireLiquidityInvariant
            * within requireLiquidityInvariant, need to update new gross liquidity (_nGliq var) to reflect the new higher or lower pool liquidity
                by adding _newShells to _nGLiq
         */
        requireLiquidityInvariant(curve, _totalShells, _newShells, _oGLiqProp, _oBalsProp, depositData.intAmounts);

        // assign return value to curves_ instead of the original mint(curve, msg.sender, curves_ = _newShells.mulu(1e18));
        curves_ = _newShells.mulu(1e18);

        return (curves_, depositData.uintAmounts);
    }

    function viewProportionalDeposit(Storage.Curve storage curve, uint256 _deposit)
        external
        view
        returns (uint256 curves_, uint256[] memory)
    {
        int128 __deposit = _deposit.divu(1e18);

        (int128 _oGLiq, int128[] memory _oBals) = getGrossLiquidityAndBalancesForDeposit(curve);

        uint256[] memory deposits_ = new uint256[](curve.assets.length);

        // No liquidity
        if (_oGLiq == 0) {
            for (uint256 i = 0; i < curve.assets.length; i++) {
                deposits_[i] = Assimilators.viewRawAmount(
                    curve.assets[i].addr,
                    __deposit.mul(curve.weights[i]).add(ONE_WEI)
                );
            }
        } else {
            // We already have an existing pool ratio
            // this must be respected
            uint256 _baseWeight = curve.weights[0].mulu(1e18);
            uint256 _quoteWeight = curve.weights[1].mulu(1e18);
            address vault = address(curve.vault);
            bytes32 poolId = curve.poolId;
            int128 _multiplier = __deposit.div(_oGLiq);

            // Deposits into the pool is determined by existing LP ratio
            for (uint256 i = 0; i < curve.assets.length; i++) {
                int128 amount = _oBals[i].mul(_multiplier).add(ONE_WEI);

                deposits_[i] = Assimilators.viewRawAmountLPRatio(
                    curve.assets[i].addr,
                    _baseWeight,
                    _quoteWeight,
                    amount,
                    vault,
                    poolId
                );
            }
        }

        int128 _totalShells = curve.totalSupply.divu(1e18);

        int128 _newShells = __deposit;

        if (_totalShells > 0) {
            _newShells = __deposit.div(_oGLiq);
            _newShells = _newShells.mul(_totalShells);
        }

        curves_ = _newShells.mulu(1e18);

        return (curves_, deposits_);
    }

    function proportionalWithdraw(Storage.Curve storage curve, uint256 _withdrawal)
        external
        view
        returns (uint256[] memory)
    {
        uint256 _length = curve.assets.length;

        JoinExitData memory withdrawData = JoinExitData(new uint256[](_length), new int128[](_length));

        (int128 _oGLiq, int128[] memory _oBals) = getGrossLiquidityAndBalances(curve);

        // uint256[] memory withdrawals_ = new uint256[](_length);

        int128 _totalShells = curve.totalSupply.divu(1e18);
        int128 __withdrawal = _withdrawal.divu(1e18);

        int128 _multiplier = __withdrawal.div(_totalShells);

        for (uint256 i = 0; i < _length; i++) {
            int128 amount = _oBals[i].mul(_multiplier);
            withdrawData.intAmounts[i] = amount.neg();
            withdrawData.uintAmounts[i] = Assimilators.viewRawAmount(curve.assets[i].addr, amount);
        }

        requireLiquidityInvariant(curve, _totalShells, __withdrawal.neg(), _oGLiq, _oBals, withdrawData.intAmounts);

        //   burn(curve, msg.sender, _withdrawal);

        return withdrawData.uintAmounts;
    }

    function viewProportionalWithdraw(
        Storage.Curve storage curve,
        uint256 _withdrawal,
        address vault,
        bytes32 poolId
    ) external view returns (uint256[] memory) {
        uint256 _length = curve.assets.length;

        (, int128[] memory _oBals) = getGrossLiquidityAndBalances(curve);

        uint256[] memory withdrawals_ = new uint256[](_length);

        int128 _multiplier = _withdrawal.divu(1e18).div(curve.totalSupply.divu(1e18));

        for (uint256 i = 0; i < _length; i++) {
            withdrawals_[i] = Assimilators.viewRawAmount(curve.assets[i].addr, _oBals[i].mul(_multiplier));
        }

        return withdrawals_;
    }

    /// @notice views the total amount of liquidity in the curve in numeraire value and format - 18 decimals
    /// @return total_ the total value in the curve
    /// @return individual_ the individual values in the curve
    function viewLiquidity(Storage.Curve storage curve)
        external
        view
        returns (uint256 total_, uint256[] memory individual_)
    {
        uint256 _length = curve.assets.length;

        individual_ = new uint256[](_length);

        for (uint256 i = 0; i < _length; i++) {
            // uint256 _liquidity = Assimilators.viewNumeraireBalance(curve.assets[i].addr).mulu(1e18);
            uint256 _liquidity = Assimilators
                .viewNumeraireBalance(curve.assets[i].addr, address(curve.vault), curve.poolId)
                .mulu(1e18);

            total_ += _liquidity;
            individual_[i] = _liquidity;
        }

        return (total_, individual_);
    }

    function getGrossLiquidityAndBalancesForDeposit(Storage.Curve storage curve)
        internal
        view
        returns (int128 grossLiquidity_, int128[] memory)
    {
        uint256 _length = curve.assets.length;

        int128[] memory balances_ = new int128[](_length);
        uint256 _baseWeight = curve.weights[0].mulu(1e18);
        uint256 _quoteWeight = curve.weights[1].mulu(1e18);

        for (uint256 i = 0; i < _length; i++) {
            int128 _bal = Assimilators.viewNumeraireBalanceLPRatio(
                _baseWeight,
                _quoteWeight,
                curve.assets[i].addr,
                address(curve.vault),
                curve.poolId
            );

            balances_[i] = _bal;
            grossLiquidity_ += _bal;
        }

        return (grossLiquidity_, balances_);
    }

    function getGrossLiquidityAndBalances(Storage.Curve storage curve)
        internal
        view
        returns (int128 grossLiquidity_, int128[] memory)
    {
        uint256 _length = curve.assets.length;

        int128[] memory balances_ = new int128[](_length);

        for (uint256 i = 0; i < _length; i++) {
            int128 _bal = Assimilators.viewNumeraireBalance(curve.assets[i].addr, address(curve.vault), curve.poolId);
            balances_[i] = _bal;
            grossLiquidity_ += _bal;
        }

        return (grossLiquidity_, balances_);
    }

    function requireLiquidityInvariant(
        Storage.Curve storage curve,
        int128 _curves,
        int128 _newShells,
        int128 _oGLiq,
        int128[] memory _oBals,
        int128[] memory intDepositAmounts
    ) private view {
        (int128 _nGLiq, int128[] memory _nBals) = getGrossLiquidityAndBalances(curve);
        console.log('Require liquidity invariant');
        console.log('_nGliq before simulating token balances: ', ABDKMath64x64.toUInt(_nGLiq));
        console.log('_nGBals[0] before simulating token balances: ', ABDKMath64x64.toUInt(_nBals[0]));
        console.log('_nGBals[1] before simulating token balances: ', ABDKMath64x64.toUInt(_nBals[1]));

        // 'simulate' the deposit/withdrawal of token balances
        for (uint256 i = 0; i < _nBals.length; i++) {
            _nBals[i] = _nBals[i].add(intDepositAmounts[i]);
        }

        console.log('requireLiquidityInvariant _oGLiq: ');
        console.logInt(_oGLiq);
        console.log('requireLiquidityInvariant _nGLiq w/o new shells: ');
        console.logInt(_nGLiq);
        console.log('requireLiquidityInvariant _oBals[0]: ');
        console.logInt(_oBals[0]);
        console.log('requireLiquidityInvariant _oBals[1]: ');
        console.logInt(_oBals[1]);
        console.log('requireLiquidityInvariant _nBals[0]: ');
        console.logInt(_nBals[0]);
        console.log('requireLiquidityInvariant _nBals[1]: ');
        console.logInt(_nBals[1]);

        // add to nGliq cause Vault does transfers after onJoin
        _nGLiq = _nGLiq.add(_newShells);

        console.log('requireLiquidityInvariant _nGLiq w/ new shells: ');
        console.logInt(_nGLiq);

        int128 _beta = curve.beta;
        int128 _delta = curve.delta;
        int128[] memory _weights = curve.weights;

        int128 _omega = CurveMath.calculateFee(_oGLiq, _oBals, _beta, _delta, _weights);

        int128 _psi = CurveMath.calculateFee(_nGLiq, _nBals, _beta, _delta, _weights);

        CurveMath.enforceLiquidityInvariant(_curves, _newShells, _oGLiq, _nGLiq, _omega, _psi);
    }

    /*
    function burn(
        Storage.Curve storage curve,
        address account,
        uint256 amount
    ) private {
        curve.balances[account] = burnSub(curve.balances[account], amount);

        curve.totalSupply = burnSub(curve.totalSupply, amount);

        emit Transfer(msg.sender, address(0), amount);
    }

    function mint(
        Storage.Curve storage curve,
        address account,
        uint256 amount
    ) private {
        curve.totalSupply = mintAdd(curve.totalSupply, amount);

        curve.balances[account] = mintAdd(curve.balances[account], amount);

        emit Transfer(address(0), msg.sender, amount);
    }

    function mintAdd(uint256 x, uint256 y) private pure returns (uint256 z) {
        require((z = x + y) >= x, 'Curve/mint-overflow');
    }

    function burnSub(uint256 x, uint256 y) private pure returns (uint256 z) {
        require((z = x - y) <= x, 'Curve/burn-underflow');
    }

    */
}
