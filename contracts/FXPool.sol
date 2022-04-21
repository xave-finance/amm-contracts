// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.7.3;
pragma experimental ABIEncoderV2;

import '@balancer-labs/v2-vault/contracts/interfaces/IMinimalSwapInfoPool.sol';
import '@balancer-labs/v2-vault/contracts/interfaces/IVault.sol';
import '@balancer-labs/v2-pool-utils/contracts/BalancerPoolToken.sol';

import './core/Storage.sol';
import './core/ProportionalLiquidity.sol';
import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';
import {Pausable} from '@openzeppelin/contracts/utils/Pausable.sol';
import {ReentrancyGuard} from '@openzeppelin/contracts/utils/ReentrancyGuard.sol';

import 'hardhat/console.sol';

// @todo check implmentation with BasePool at https://github.com/balancer-labs/balancer-v2-monorepo/tree/master/pkg/pool-utils/contracts
// check bptOut
contract FXPool is IMinimalSwapInfoPool, BalancerPoolToken, Ownable, Storage, ReentrancyGuard, Pausable {
    using ABDKMath64x64 for int128;
    using ABDKMath64x64 for uint256;

    // The expiration time
    uint256 public immutable expiration;
    // The number of seconds in our timescalecons
    uint256 public immutable unitSeconds;

    // The Balancer pool data
    // Note we change style to match Balancer's custom getter
    // IVault private immutable _vault;
    // bytes32 private immutable _poolId;

    // The percent of each trade's implied yield to collect as LP fee
    uint256 public immutable percentFee;
    int128 private constant ONE_WEI = 0x12;

    // EVENTS
    /// @notice This event allows the frontend to track the fees
    /// @param collectedBase the base asset tokens fees collected in this txn
    /// @param collectedBond the bond asset tokens fees collected in this txn
    /// @param remainingBase the amount of base asset fees have been charged but not collected
    /// @param remainingBond the amount of bond asset fees have been charged but not collected
    /// @dev All values emitted by this event are 18 point fixed not token native decimals
    event FeeCollection(uint256 collectedBase, uint256 collectedBond, uint256 remainingBase, uint256 remainingBond);

    event ParametersSet(uint256 alpha, uint256 beta, uint256 delta, uint256 epsilon, uint256 lambda);

    event AssetIncluded(address indexed numeraire, address indexed reserve, uint256 weight);

    event AssimilatorIncluded(
        address indexed derivative,
        address indexed numeraire,
        address indexed reserve,
        address assimilator
    );

    event EmergencyAlarm(bool isEmergency);

    event OnJoinPool(bytes32 poolId, uint256 lptAmountMinted, uint256[] amountsDeposited);
    event OnExitPool(bytes32 poolId, uint256 lptAmountBurned, uint256[] amountsWithdrawn);

    modifier isEmergency() {
        require(emergency, 'FXPool/emergency-only-allowing-emergency-proportional-withdraw');
        _;
    }

    modifier deadline(uint256 _deadline) {
        require(block.timestamp < _deadline, 'FXPool/tx-deadline-passed');
        _;
    }

    constructor(
        address[] memory _assetsToRegister,
        uint256 _expiration,
        uint256 _unitSeconds,
        IVault vault,
        uint256 _percentFee,
        // uint256 _percentFeeGov,
        // address _governance,
        string memory _name,
        string memory _symbol
    ) BalancerPoolToken(_name, _symbol) {
        // Sanity Check
        // not sure if this needed
        require(_expiration - block.timestamp < _unitSeconds, 'FXPool/Expired');
        // Initialization on the vault
        bytes32 poolId = vault.registerPool(IVault.PoolSpecialization.TWO_TOKEN);

        // Pass in zero addresses for Asset Managers
        // Note - functions below assume this token order
        IERC20[] memory tokens = new IERC20[](2);
        tokens[0] = IERC20(_assetsToRegister[0]);
        tokens[1] = IERC20(_assetsToRegister[1]);

        vault.registerTokens(poolId, tokens, new address[](2));

        // Set immutable state variables
        // _vault = vault;
        // _poolId = poolId;

        curve.vault = vault;
        curve.poolId = poolId;

        percentFee = _percentFee;
        expiration = _expiration; // use as deadline for swaps and liquidity functions?
        unitSeconds = _unitSeconds;
    }

    function initialize(address[] memory _assets, uint256[] memory _assetWeights) external onlyOwner {
        require(_assetWeights.length == 2, 'Curve/assetWeights-must-be-length-two');
        require(_assets.length % 5 == 0, 'Curve/assets-must-be-divisible-by-five');

        for (uint256 i = 0; i < _assetWeights.length; i++) {
            uint256 ix = i * 5;

            numeraires.push(_assets[ix]);
            derivatives.push(_assets[ix]);

            reserves.push(_assets[2 + ix]);
            if (_assets[ix] != _assets[2 + ix]) derivatives.push(_assets[2 + ix]);

            includeAsset(
                //   curve,
                _assets[ix], // numeraire
                _assets[1 + ix], // numeraire assimilator
                _assets[2 + ix], // reserve
                _assets[3 + ix], // reserve assimilator
                // _assets[4 + ix], // reserve approve to
                _assetWeights[i]
            );
        }
    }

    /// @dev Returns the vault for this pool
    /// @return The vault for this pool
    function getVault() external view returns (IVault) {
        // return _vault;
        return curve.vault;
    }

    function getPoolId() external view override returns (bytes32) {
        // return _poolId;
        return curve.poolId;
    }

    function getFee() private view returns (int128 fee_) {
        int128 _gLiq;

        // Always pairs
        int128[] memory _bals = new int128[](2);

        for (uint256 i = 0; i < _bals.length; i++) {
            int128 _bal = Assimilators.viewNumeraireBalance(curve.assets[i].addr, address(curve.vault), curve.poolId);

            _bals[i] = _bal;

            _gLiq += _bal;
        }

        fee_ = CurveMath.calculateFee(_gLiq, _bals, curve.beta, curve.delta, curve.weights);
    }

    function setParams(
        uint256 _alpha,
        uint256 _beta,
        uint256 _feeAtHalt,
        uint256 _epsilon,
        uint256 _lambda
    ) external {
        require(0 < _alpha && _alpha < 1e18, 'Curve/parameter-invalid-alpha');

        require(_beta < _alpha, 'Curve/parameter-invalid-beta');

        require(_feeAtHalt <= 5e17, 'Curve/parameter-invalid-max');

        require(_epsilon <= 1e16, 'Curve/parameter-invalid-epsilon');

        require(_lambda <= 1e18, 'Curve/parameter-invalid-lambda');

        int128 _omega = getFee();

        curve.alpha = (_alpha + 1).divu(1e18);

        curve.beta = (_beta + 1).divu(1e18);

        curve.delta = (_feeAtHalt).divu(1e18).div(uint256(2).fromUInt().mul(curve.alpha.sub(curve.beta))) + ONE_WEI;

        curve.epsilon = (_epsilon + 1).divu(1e18);

        curve.lambda = (_lambda + 1).divu(1e18);

        int128 _psi = getFee();

        require(_omega >= _psi, 'Curve/parameters-increase-fee');

        emit ParametersSet(_alpha, _beta, curve.delta.mulu(1e18), _epsilon, _lambda);
    }

    function includeAsset(
        //  Storage.Curve storage curve,
        address _numeraire,
        address _numeraireAssim,
        address _reserve,
        address _reserveAssim,
        //   address _reserveApproveTo,
        uint256 _weight
    ) private {
        require(_numeraire != address(0), 'Curve/numeraire-cannot-be-zeroth-address');

        require(_numeraireAssim != address(0), 'Curve/numeraire-assimilator-cannot-be-zeroth-address');

        require(_reserve != address(0), 'Curve/reserve-cannot-be-zeroth-address');

        require(_reserveAssim != address(0), 'Curve/reserve-assimilator-cannot-be-zeroth-address');

        require(_weight < 1e18, 'Curve/weight-must-be-less-than-one');

        // if (_numeraire != _reserve) IERC20(_numeraire).safeApprove(_reserveApproveTo, uint256(-1));

        Storage.Assimilator storage _numeraireAssimilator = curve.assimilators[_numeraire];

        _numeraireAssimilator.addr = _numeraireAssim;

        _numeraireAssimilator.ix = uint8(curve.assets.length);

        Storage.Assimilator storage _reserveAssimilator = curve.assimilators[_reserve];

        _reserveAssimilator.addr = _reserveAssim;

        _reserveAssimilator.ix = uint8(curve.assets.length);

        int128 __weight = _weight.divu(1e18).add(uint256(1).divu(1e18));

        curve.weights.push(__weight);

        curve.assets.push(_numeraireAssimilator);

        emit AssetIncluded(_numeraire, _reserve, _weight);

        emit AssimilatorIncluded(_numeraire, _numeraire, _reserve, _numeraireAssim);

        if (_numeraireAssim != _reserveAssim) {
            emit AssimilatorIncluded(_reserve, _numeraire, _reserve, _reserveAssim);
        }
    }

    function includeAssimilator(
        //  Storage.Curve storage curve,
        address _derivative,
        address _numeraire,
        address _reserve,
        address _assimilator,
        address _derivativeApproveTo
    ) private {
        require(_derivative != address(0), 'Curve/derivative-cannot-be-zeroth-address');

        require(_numeraire != address(0), 'Curve/numeraire-cannot-be-zeroth-address');

        require(_reserve != address(0), 'Curve/numeraire-cannot-be-zeroth-address');

        require(_assimilator != address(0), 'Curve/assimilator-cannot-be-zeroth-address');

        // @todo double check implementation
        //IERC20(_numeraire).safeApprove(_derivativeApproveTo, uint256(-1));
        Storage.Assimilator storage _numeraireAssim = curve.assimilators[_numeraire];

        curve.assimilators[_derivative] = Storage.Assimilator(_assimilator, _numeraireAssim.ix);

        emit AssimilatorIncluded(_derivative, _numeraire, _reserve, _assimilator);
    }

    function viewCurve()
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
        alpha_ = curve.alpha.mulu(1e18);

        beta_ = curve.beta.mulu(1e18);

        delta_ = curve.delta.mulu(1e18);

        epsilon_ = curve.epsilon.mulu(1e18);

        lambda_ = curve.lambda.mulu(1e18);
    }

    // Trade Functionality
    // @todo trade functionality
    /// @dev Called by the Vault on swaps to get a price quote
    /// @param swapRequest The request which contains the details of the swap
    /// @param currentBalanceTokenIn The input token balance
    /// @param currentBalanceTokenOut The output token balance
    /// @return the amount of the output or input token amount of for swap
    function onSwap(
        SwapRequest memory swapRequest,
        uint256 currentBalanceTokenIn,
        uint256 currentBalanceTokenOut
    ) public override whenNotPaused returns (uint256) {
        // just hacking this until we implement the invariant :)

        // console.log('TOKEN IN');
        // console.log(currentBalanceTokenIn);
        // console.log('TOKEN OUT');
        // console.log(currentBalanceTokenOut);

        return _calculateInvariant(currentBalanceTokenIn, 0, 1);
    }

    /// @dev Hook for joining the pool that must be called from the vault.
    ///      It mints a proportional number of tokens compared to current LP pool,
    ///      based on the maximum input the user indicates.
    /// @param poolId The balancer pool id, checked to ensure non erroneous vault call
    // @param sender Unused by this pool but in interface
    /// @param recipient The address which will receive lp tokens.
    /// @param currentBalances The current pool balances, sorted by address low to high.  length 2
    // @param latestBlockNumberUsed last block number unused in this pool
    /// @param protocolSwapFee no fee is collected on join only when they are paid to governance
    /// @param userData Abi encoded fixed length 2 array containing max inputs also sorted by
    ///                 address low to high
    /// @return amountsIn The actual amounts of token the vault should move to this pool
    /// @return dueProtocolFeeAmounts The amounts of each token to pay as protocol fees
    function onJoinPool(
        bytes32 poolId,
        address, // sender
        address recipient,
        uint256[] memory currentBalances, // @todo for vault transfers
        uint256,
        uint256 protocolSwapFee,
        bytes calldata userData
    ) external override whenNotPaused returns (uint256[] memory amountsIn, uint256[] memory dueProtocolFeeAmounts) {
        (uint256[] memory tokensIn, address[] memory assetAddresses) = abi.decode(userData, (uint256[], address[]));

        uint256 totalDepositNumeraire = (_convertToNumeraire(tokensIn[0], _getAssetIndex(assetAddresses[0])) +
            _convertToNumeraire(tokensIn[1], _getAssetIndex(assetAddresses[1]))) * 1e18;

        (uint256 lpTokens, uint256[] memory amountToDeposit) = ProportionalLiquidity.proportionalDeposit(
            curve,
            totalDepositNumeraire
        );
        {
            amountsIn = new uint256[](2);
            amountsIn[0] = amountToDeposit[_getAssetIndex(assetAddresses[0])];
            amountsIn[1] = amountToDeposit[_getAssetIndex(assetAddresses[1])];
        }
        // @todo check reentrancy attack, call from BalancerToken.supply or change the library?
        curve.totalSupply = curve.totalSupply += lpTokens;

        BalancerPoolToken._mintPoolTokens(recipient, lpTokens);
        // @todo mintLPFee() ?
        // @todo check fee calculation
        {
            dueProtocolFeeAmounts = new uint256[](2);
            dueProtocolFeeAmounts[0] = 0;
            dueProtocolFeeAmounts[1] = 0;
        }

        emit OnJoinPool(poolId, lpTokens, amountToDeposit);
    }

    /// @dev Hook for leaving the pool that must be called from the vault.
    ///      It burns a proportional number of tokens compared to current LP pool,
    ///      based on the minium output the user wants.
    /// @param poolId The balancer pool id, checked to ensure non erroneous vault call
    /// @param sender The address which is the source of the LP token
    // @param recipient Unused by this pool but in interface
    /// @param currentBalances The current pool balances, sorted by address low to high.  length 2
    // @param latestBlockNumberUsed last block number unused in this pool
    /// @param protocolSwapFee The percent of pool fees to be paid to the Balancer Protocol
    /// @param userData Abi encoded uint256 which is the number of LP tokens the user wants to
    ///                 withdraw
    /// @return amountsOut The number of each token to send to the caller
    /// @return dueProtocolFeeAmounts The amounts of each token to pay as protocol fees
    function onExitPool(
        bytes32 poolId,
        address sender,
        address,
        uint256[] memory currentBalances, // @todo for vault transfers
        uint256,
        uint256 protocolSwapFee,
        bytes calldata userData
    ) external override returns (uint256[] memory amountsOut, uint256[] memory dueProtocolFeeAmounts) {
        (uint256 tokensToBurn, address[] memory assetAddresses) = abi.decode(userData, (uint256, address[]));

        uint256[] memory amountToWithdraw = ProportionalLiquidity.proportionalWithdraw(curve, tokensToBurn);

        {
            amountsOut = new uint256[](2);
            amountsOut[0] = amountToWithdraw[_getAssetIndex(assetAddresses[0])];
            amountsOut[1] = amountToWithdraw[_getAssetIndex(assetAddresses[1])];
        }
        // @todo check reentrancy attack, call from BalancerToken.supply or change the library?
        curve.totalSupply = curve.totalSupply -= tokensToBurn;
        BalancerPoolToken._burnPoolTokens(sender, tokensToBurn);

        // @todo check fee calculation
        {
            dueProtocolFeeAmounts = new uint256[](2);
            dueProtocolFeeAmounts[0] = 0;
            dueProtocolFeeAmounts[1] = 0;
        }

        emit OnExitPool(poolId, tokensToBurn, amountToWithdraw);
    }

    // ADMIN AND ACCESS CONTROL FUNCTIONS

    /// @notice Governance sets someone's pause status
    /// @param status true for able to pause false for not
    function setPause(bool status) external onlyOwner {
        bool currentStatus = paused();

        require(currentStatus != status, 'FXPool: Pause status is the same as parameter');

        if (status == true) {
            _pause();
        } else {
            _unpause();
        }
    }

    function setCap(uint256 _cap) external onlyOwner {
        curve.cap = _cap;
    }

    /*

    @todo implement or vault?
    function emergencyWithdraw(uint256 _curvesToBurn, uint256 _deadline)
        external
        isEmergency
        deadline(_deadline)
        nonReentrant
        returns (uint256[] memory withdrawals_)
    {
        //return ProportionalLiquidity.emergencyProportionalWithdraw(curve, _curvesToBurn);

        return;
    }
    */

    function setEmergency(bool _emergency) external onlyOwner {
        emit EmergencyAlarm(_emergency);

        emergency = _emergency;
    }

    // Curve math
    // @todo add curve modifiers
    function viewDeposit(bytes calldata userData) external view returns (uint256, uint256[] memory) {
        (uint256[] memory tokensIn, address[] memory assetAddresses) = abi.decode(userData, (uint256[], address[]));

        uint256 totalDepositNumeraire = (_convertToNumeraire(tokensIn[0], _getAssetIndex(assetAddresses[0])) +
            _convertToNumeraire(tokensIn[1], _getAssetIndex(assetAddresses[1]))) * 1e18;

        console.log('viewDeposit: calling deposit with totalDepositNumeraire ', totalDepositNumeraire);

        return ProportionalLiquidity.viewProportionalDeposit(curve, totalDepositNumeraire);
    }

    // function viewDeposit(uint256 _deposit) external view returns (uint256, uint256[] memory) {
    //     return ProportionalLiquidity.viewProportionalDeposit(curve, _deposit);
    // }

    function viewWithdraw(uint256 _curvesToBurn) external view returns (uint256[] memory) {
        return ProportionalLiquidity.viewProportionalWithdraw(curve, _curvesToBurn, address(curve.vault), curve.poolId);
    }

    function _withinThreshold(uint256 a, uint256 b) internal pure returns (bool) {
        if (a == b) {
            return true;
        } else {
            return false;
        }
    }

    /// @dev Mints the maximum possible LP given a set of max inputs
    function _mintLP(uint256 _tokensToMint) internal {
        // @todo add mint function from curve
    }

    /// @dev Burns a number of LP tokens and returns the amount of the pool which they own.
    function _burnLP() internal returns (uint256[] memory amountsReleased) {
        // @todo add burn function from curve
    }

    function _calculateInvariant(
        uint256 tokenAmount,
        uint256 baseTokenPosition,
        uint256 usdcPosition
    ) internal view returns (uint256) {
        // just hacking this until we implement the invariant :)
        int128 numeraireAmount = Assimilators.viewNumeraireAmount(curve.assets[usdcPosition].addr, tokenAmount);

        return Assimilators.viewRawAmount(curve.assets[baseTokenPosition].addr, numeraireAmount);
    }

    function _convertToNumeraire(uint256 tokenAmount, uint256 tokenPosition) internal view returns (uint256) {
        int128 numeraireAmount = Assimilators.viewNumeraireAmount(curve.assets[tokenPosition].addr, tokenAmount);

        return ABDKMath64x64.toUInt(numeraireAmount);
    }

    function _getAssetIndex(address _assetAddress) internal view returns (uint256) {
        require(
            _assetAddress == derivatives[0] || _assetAddress == derivatives[1],
            'FXPool: Address is not a derivative'
        );

        if (_assetAddress == derivatives[0]) {
            return 0;
        } else {
            return 1;
        }
    }

    /// @notice view the assimilator address for a derivative
    /// @return assimilator_ the assimilator address
    function assimilator(address _derivative) public view returns (address assimilator_) {
        assimilator_ = curve.assimilators[_derivative].addr;
    }
}
