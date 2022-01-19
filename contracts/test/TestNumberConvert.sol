pragma solidity ^0.7.1;

import "../amm-v1/lib/ABDKMath64x64.sol";
import "../amm-v1/lib/ABDKMathQuad.sol";

contract TestNumberConvert {
  function fromInt128ToUint256(int128 input) external pure returns (uint256) {
    int256 x = ABDKMath64x64.to128x128(input);
    bytes16 y = ABDKMathQuad.fromInt(x);
    return ABDKMathQuad.toUInt(y);
  }

  function viewMaxInt128() external pure returns (int128) {
    return type(int128).max;
  }

  function viewMaxInt128ToInt256() external pure returns (int256) {
    return int256(type(int128).max);
  }

    function viewMaxInt128ToInt256Bytes() external pure returns (bytes16) {
    return ABDKMathQuad.fromInt(ABDKMath64x64.to128x128(type(int128).max));
  }

  function viewMaxInt128toUint256() external pure returns (uint256) {
    //int256 x = ABDKMathQuad.to128x128();
    bytes16 y = ABDKMathQuad.fromInt(int256(type(int128).max));
    return ABDKMathQuad.toUInt(y);
  }

 



}