import { BigNumberish } from 'ethers'
import { parseUnits } from 'ethers/lib/utils'

export interface FXPoolConstructorParams {
  assetWeights: BigNumberish[]
  unitSeconds: BigNumberish
  percentFee: BigNumberish
  name: string // LP Token name
  symbol: string // LP token symbol
}

export const XSGDUSDCFxPool: FXPoolConstructorParams = {
  assetWeights: ['0.5', '0.5'],
  unitSeconds: '1000',
  percentFee: '1000', // test value
  name: 'HALO XSGDUSDC FXPool', // LP Token name
  symbol: 'HFX-XSGDUSDC', // LP token symbol
}

export const fxPHPUSDCFxPool: FXPoolConstructorParams = {
  assetWeights: [parseUnits('0.5'), parseUnits('0.5')],
  // expiration: '1000', //UNIX
  unitSeconds: parseUnits('100'),
  percentFee: parseUnits('1'), //test Value
  name: 'HALO fxPHPUSDC FXPool', // LP Token name
  symbol: 'HFX-fxPHPUSDC', // LP token symbol
}
