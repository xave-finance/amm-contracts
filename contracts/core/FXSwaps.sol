// SPDX-License-Identifier: MIT

pragma solidity ^0.7.3;

import './Assimilators.sol';
import './Storage.sol';
import './CurveMath.sol';

import './lib/UnsafeMath64x64.sol';
import './lib/ABDKMath64x64.sol';

// importing copy paste OZ SafeMath here to avoid circular dependency + balancer version has missing funcs
import './lib/OZSafeMath.sol';

library FXSwaps {
    using ABDKMath64x64 for int128;
    using UnsafeMath64x64 for int128;
    using ABDKMath64x64 for uint256;
    using OZSafeMath for uint256;

    // move to FXPool
    event Trade(
        address indexed trader,
        address indexed origin,
        address indexed target,
        uint256 originAmount,
        uint256 targetAmount
    );

    int128 public constant ONE = 0x10000000000000000;

    function getOriginAndTarget(
        Storage.Curve storage curve,
        address _o,
        address _t
    ) private view returns (Storage.Assimilator memory, Storage.Assimilator memory) {
        Storage.Assimilator memory o_ = curve.assimilators[_o];
        Storage.Assimilator memory t_ = curve.assimilators[_t];

        require(o_.addr != address(0), 'Curve/origin-not-supported');
        require(t_.addr != address(0), 'Curve/target-not-supported');

        return (o_, t_);
    }

    // function originSwap(
    //     Storage.Curve storage curve,
    //     address _origin,
    //     address _target,
    //     uint256 _originAmount,
    //     address _recipient
    // ) external returns (uint256 tAmt_) {
    //     (Storage.Assimilator memory _o, Storage.Assimilator memory _t) = getOriginAndTarget(curve, _origin, _target);

    //     if (_o.ix == _t.ix)
    //         // replace outtake and intake
    //         return Assimilators.outputNumeraire(_t.addr, _recipient, Assimilators.intakeRaw(_o.addr, _originAmount));

    //     (int128 _amt, int128 _oGLiq, int128 _nGLiq, int128[] memory _oBals, int128[] memory _nBals) = getOriginSwapData(
    //         curve,
    //         _o.ix,
    //         _t.ix,
    //         _o.addr,
    //         _originAmount
    //     );

    //     _amt = CurveMath.calculateTrade(curve, _oGLiq, _nGLiq, _oBals, _nBals, _amt, _t.ix);

    //     _amt = _amt.us_mul(ONE - curve.epsilon);

    //     tAmt_ = Assimilators.outputNumeraire(_t.addr, _recipient, _amt);

    //     emit Trade(msg.sender, _origin, _target, _originAmount, tAmt_);
    // }

    function viewOriginSwap(
        Storage.Curve storage curve,
        address _origin,
        address _target,
        uint256 _originAmount
    ) external view returns (uint256 tAmt_) {
        (Storage.Assimilator memory _o, Storage.Assimilator memory _t) = getOriginAndTarget(curve, _origin, _target);

        if (_o.ix == _t.ix)
            return Assimilators.viewRawAmount(_t.addr, Assimilators.viewNumeraireAmount(_o.addr, _originAmount));

        (int128 _amt, int128 _oGLiq, int128 _nGLiq, int128[] memory _nBals, int128[] memory _oBals) = viewSwapData(
            curve,
            _o.ix,
            _t.ix,
            _originAmount,
            _o.addr,
            false
        );

        _amt = CurveMath.calculateTrade(curve, _oGLiq, _nGLiq, _oBals, _nBals, _amt, _t.ix);

        _amt = _amt.us_mul(ONE - curve.epsilon);

        tAmt_ = Assimilators.viewRawAmount(_t.addr, _amt.abs());
    }

    // function targetSwap(
    //     Storage.Curve storage curve,
    //     address _origin,
    //     address _target,
    //     uint256 _targetAmount,
    //     address _recipient
    // ) external returns (uint256 oAmt_) {
    //     (Storage.Assimilator memory _o, Storage.Assimilator memory _t) = getOriginAndTarget(curve, _origin, _target);

    //     if (_o.ix == _t.ix)
    //         return Assimilators.intakeNumeraire(_o.addr, Assimilators.outputRaw(_t.addr, _recipient, _targetAmount));

    //     // If the origin is the quote currency (i.e. usdc)
    //     // we need to make sure to massage the _targetAmount
    //     // by dividing it by the exchange rate (so it gets
    //     // multiplied later to reach the same target amount).
    //     // Inelegant solution, but this way we don't need to
    //     // re-write large chunks of the code-base

    //     // curve.assets[1].addr = quoteCurrency
    //     // no variable assignment due to stack too deep
    //     if (curve.assets[1].addr == _o.addr) {
    //         _targetAmount = _targetAmount.mul(1e8).div(Assimilators.getRate(_t.addr));
    //     }

    //     (int128 _amt, int128 _oGLiq, int128 _nGLiq, int128[] memory _oBals, int128[] memory _nBals) = getTargetSwapData(
    //         curve,
    //         _t.ix,
    //         _o.ix,
    //         _t.addr,
    //         _recipient,
    //         _targetAmount
    //     );

    //     _amt = CurveMath.calculateTrade(curve, _oGLiq, _nGLiq, _oBals, _nBals, _amt, _o.ix);

    //     // If the origin is the quote currency (i.e. usdc)
    //     // we need to make sure to massage the _amt too

    //     // curve.assets[1].addr = quoteCurrency
    //     if (curve.assets[1].addr == _o.addr) {
    //         _amt = _amt.mul(Assimilators.getRate(_t.addr).divu(1e8));
    //     }

    //     _amt = _amt.us_mul(ONE + curve.epsilon);

    //     oAmt_ = Assimilators.intakeNumeraire(_o.addr, _amt);

    //     emit Trade(msg.sender, _origin, _target, oAmt_, _targetAmount);
    // }

    function viewTargetSwap(
        Storage.Curve storage curve,
        address _origin,
        address _target,
        uint256 _targetAmount
    ) external view returns (uint256 oAmt_) {
        (Storage.Assimilator memory _o, Storage.Assimilator memory _t) = getOriginAndTarget(curve, _origin, _target);

        if (_o.ix == _t.ix)
            return Assimilators.viewRawAmount(_o.addr, Assimilators.viewNumeraireAmount(_t.addr, _targetAmount));

        // If the origin is the quote currency (i.e. usdc)
        // we need to make sure to massage the _targetAmount
        // by dividing it by the exchange rate (so it gets
        // multiplied later to reach the same target amount).
        // Inelegant solution, but this way we don't need to
        // re-write large chunks of the code-base

        // curve.assets[1].addr = quoteCurrency
        // no variable assignment due to stack too deep
        bool isTarget = curve.assets[1].addr == _o.addr;
        // if (curve.assets[1].addr == _o.addr) {
        if (isTarget) {
            _targetAmount = _targetAmount.mul(1e8).div(Assimilators.getRate(_t.addr));
        }

        (int128 _amt, int128 _oGLiq, int128 _nGLiq, int128[] memory _nBals, int128[] memory _oBals) = viewSwapData(
            curve,
            _t.ix,
            _o.ix,
            _targetAmount,
            _t.addr,
            isTarget
        );

        _amt = CurveMath.calculateTrade(curve, _oGLiq, _nGLiq, _oBals, _nBals, _amt, _o.ix);

        // If the origin is the quote currency (i.e. usdc)
        // we need to make sure to massage the _amt too

        // curve.assets[1].addr = quoteCurrency
        if (isTarget) {
            _amt = _amt.mul(Assimilators.getRate(_t.addr).divu(1e8));
        }

        _amt = _amt.us_mul(ONE + curve.epsilon);

        oAmt_ = Assimilators.viewRawAmount(_o.addr, _amt);
    }

    /*function getOriginSwapData(
        Storage.Curve storage curve,
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
        uint256 _length = curve.assets.length;

        int128[] memory oBals_ = new int128[](_length);
        int128[] memory nBals_ = new int128[](_length);
        Storage.Assimilator[] memory _reserves = curve.assets;

        for (uint256 i = 0; i < _length; i++) {
            if (i != _inputIx) nBals_[i] = oBals_[i] = Assimilators.viewNumeraireBalance(_reserves[i].addr);
            else {
                int128 _bal;
                // replace intake
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
    }*/

    /*function getTargetSwapData(
        Storage.Curve storage curve,
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
        uint256 _length = curve.assets.length;

        int128[] memory oBals_ = new int128[](_length);
        int128[] memory nBals_ = new int128[](_length);
        Storage.Assimilator[] memory _reserves = curve.assets;

        for (uint256 i = 0; i < _length; i++) {
            if (i != _inputIx) nBals_[i] = oBals_[i] = Assimilators.viewNumeraireBalance(_reserves[i].addr);
            else {
                int128 _bal;
                // replace output
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
    }*/

    // function viewOriginSwapData(
    //     Storage.Curve storage curve,
    //     uint256 _inputIx,
    //     uint256 _outputIx,
    //     uint256 _amt,
    //     address _assim,
    //     bool isTarget
    // )
    //     private
    //     view
    //     returns (
    //         int128 amt_,
    //         int128 oGLiq_,
    //         int128 nGLiq_,
    //         int128[] memory,
    //         int128[] memory
    //     )
    // {
    //     uint256 _length = curve.assets.length;
    //     int128[] memory nBals_ = new int128[](_length);
    //     int128[] memory oBals_ = new int128[](_length);

    //     // uint256 _length = curve.assets.length;
    //     // int128[] memory nBals_ = new int128[](_length);
    //     // int128[] memory oBals_ = new int128[](_length);

    //     // for (uint256 i = 0; i < _length; i++) {
    //     //     if (i != _inputIx)
    //     //         nBals_[i] = oBals_[i] = Assimilators.viewNumeraireBalance(
    //     //             curve.assets[i].addr,
    //     //             address(curve.vault),
    //     //             curve.poolId
    //     //         );
    //     //     else {
    //     //         int128 _bal;
    //     //         (amt_, _bal) = Assimilators.viewNumeraireAmountAndBalance(
    //     //             _assim,
    //     //             _amt,
    //     //             address(curve.vault),
    //     //             curve.poolId
    //     //         );

    //     //         oBals_[i] = _bal;
    //     //         nBals_[i] = _bal.add(amt_);
    //     //     }

    //     //     oGLiq_ += oBals_[i];
    //     //     nGLiq_ += nBals_[i];
    //     // }

    //     (oGLiq_, nGLiq_) = calculateNumeraireAmountsAndBalances(curve, _amt, _assim, _inputIx, isTarget);

    //     nGLiq_ = nGLiq_.sub(amt_);
    //     nBals_[_outputIx] = ABDKMath64x64.sub(nBals_[_outputIx], amt_);

    //     return (amt_, oGLiq_, nGLiq_, nBals_, oBals_);
    // }

    struct ViewSwapData {
        uint256 _amt;
        address _assim;
        uint256 _inputIx;
        bool isTarget;
    }

    function viewSwapData(
        Storage.Curve storage curve,
        uint256 _inputIx,
        uint256 _outputIx,
        uint256 _amt,
        address _assim,
        bool isTarget
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
        uint256 _length = curve.assets.length;
        int128[] memory nBals_ = new int128[](_length);
        int128[] memory oBals_ = new int128[](_length);
        // address vault = address(curve.vault);
        // bytes32 poolId = curve.poolId;
        // Storage.Assimilator[] memory assets = curve.assets;

        // for (uint256 i = 0; i < _length; i++) {
        //     if (i != _inputIx) nBals_[i] = oBals_[i] = Assimilators.viewNumeraireBalance(assims[i].addr, vault, poolId);
        //     else {
        //         int128 _bal;
        //         (amt_, _bal) = Assimilators.viewNumeraireAmountAndBalance(_assim, _amt, vault, poolId);
        //         amt_ = amt_.neg();

        //         oBals_[i] = _bal;
        //         nBals_[i] = _bal.add(amt_);
        //     }

        //     oGLiq_ += oBals_[i];
        //     nGLiq_ += nBals_[i];
        // }

        ViewSwapData memory _data = ViewSwapData(_amt, _assim, _inputIx, isTarget);

        (oGLiq_, nGLiq_, oBals_, nBals_) = calculateNumeraireAmountsAndBalances(
            curve,
            _data
            // _amt,
            // _assim,
            // _inputIx,
            // isTarget
        );

        nGLiq_ = nGLiq_.sub(amt_);
        nBals_[_outputIx] = ABDKMath64x64.sub(nBals_[_outputIx], amt_);

        return (amt_, oGLiq_, nGLiq_, nBals_, oBals_);
    }

    // internal func to avoid stack too deep
    function calculateNumeraireAmountsAndBalances(Storage.Curve storage curve, ViewSwapData memory _data)
        internal
        view
        returns (
            // uint256 _amt,
            // address _assim,
            // uint256 _inputIx,
            // bool isTarget
            // address vault,
            // bytes32 poolId
            int128 oGLiq_,
            int128 nGLiq_,
            int128[] memory oBals_,
            int128[] memory nBals_
        )
    {
        uint256 _length = curve.assets.length;
        // int128[] memory nBals_ = new int128[](_length);
        // int128[] memory oBals_ = new int128[](_length);
        // int128 amt_ = 0;
        address vault = address(curve.vault);
        bytes32 poolId = curve.poolId;
        Storage.Assimilator[] memory assets = curve.assets;

        for (uint256 i = 0; i < _length; i++) {
            if (i != _data._inputIx)
                nBals_[i] = oBals_[i] = Assimilators.viewNumeraireBalance(assets[i].addr, vault, poolId);
            else {
                // int128 _bal;
                // (amt_, _bal) = Assimilators.viewNumeraireAmountAndBalance(_assim, _amt, vault, poolId);
                // if (isTarget) amt_ = amt_.neg();
                // oBals_[i] = _bal;
                // nBals_[i] = _bal.add(amt_);
                (oBals_[i], nBals_[i]) = calculateNumeraireAmountsAndBalances_EqualInputIndex(
                    curve,
                    _data._assim,
                    _data._amt,
                    _data.isTarget
                );
            }

            oGLiq_ += oBals_[i];
            nGLiq_ += nBals_[i];
        }
    }

    // internal func to avoid stack too deep
    function calculateNumeraireAmountsAndBalances_EqualInputIndex(
        Storage.Curve storage curve,
        address _assim,
        uint256 _amt,
        bool isTarget
    ) internal view returns (int128 oBal_i, int128 nBal_i) {
        address vault = address(curve.vault);
        bytes32 poolId = curve.poolId;
        int128 _bal;
        int128 amt_;

        (amt_, _bal) = Assimilators.viewNumeraireAmountAndBalance(_assim, _amt, vault, poolId);
        if (isTarget) amt_ = amt_.neg();

        oBal_i = _bal;
        nBal_i = _bal.add(amt_);
    }
}
