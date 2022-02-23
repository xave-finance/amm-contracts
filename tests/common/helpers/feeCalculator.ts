import { BigNumber } from 'ethers';
import { decimal, fp } from './numbers'

export const incurPoolFee = (principal: BigNumber, feeRate: BigNumber) => {
  const fee = principal.mul(feeRate).div(fp(100))
  return principal.sub(fee)
}
