pragma solidity ^0.7.1;

import "../amm-v1/lib/ABDKMath64x64.sol";
import "../amm-v1/lib/ABDKMathQuad.sol";

contract TestNumberConvert {
  function fromInt128ToUint256(int128 input) external pure returns (uint256) {
    int256 x = ABDKMath64x64.to128x128(input);
    bytes16 y = ABDKMathQuad.fromInt(x);
    return ABDKMathQuad.toUInt(y);
  }
}