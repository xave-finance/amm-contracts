pragma solidity ^0.7.1;

contract MockedProportionalLiquidity {
  event MockedProportionalDeposit(uint256 foo, uint256[] bar);

  function proportionalDeposit(uint256 _deposit, uint256[] memory amountsIn) public returns (uint256 updatedDeposit, uint256[] memory deposits)  {
    updatedDeposit = _deposit;

    {
      deposits = new uint256[](2);

      deposits[0] = amountsIn[0];
      deposits[1] = amountsIn[1];
    }

    emit MockedProportionalDeposit(updatedDeposit, amountsIn);

  }
}