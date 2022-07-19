import { BigNumberish } from 'ethers'
import { parseUnits } from 'ethers/lib/utils'

const PROTOCOL_PERCENTAGE_FEE = '0'

export interface FXPoolConstructorParams {
  assetWeights: BigNumberish[] // LP weights
  unitSeconds: BigNumberish
  protocolPercentFee: BigNumberish //
  name: string // LP Token name
  symbol: string // LP token symbol
}

export const XSGDUSDCFxPool: FXPoolConstructorParams = {
  assetWeights: ['0.5', '0.5'],
  unitSeconds: parseUnits('100'),
  protocolPercentFee: PROTOCOL_PERCENTAGE_FEE, // 10% initial agreed value
  name: 'HALO XSGDUSDC FXPool', // LP Token name
  symbol: 'HFX-XSGDUSDC', // LP token symbol
}

export const fxPHPUSDCFxPool: FXPoolConstructorParams = {
  assetWeights: [parseUnits('0.5'), parseUnits('0.5')],
  unitSeconds: parseUnits('100'),
  protocolPercentFee: PROTOCOL_PERCENTAGE_FEE, // 10% initial agreed value
  name: 'HALO fxPHPUSDC FXPool', // LP Token name
  symbol: 'HFX-fxPHPUSDC', // LP token symbol
}

export const EURSUSDCFxPool: FXPoolConstructorParams = {
  assetWeights: ['0.5', '0.5'],
  unitSeconds: parseUnits('100'),
  protocolPercentFee: PROTOCOL_PERCENTAGE_FEE, // 10% initial agreed value
  name: 'HALO EURSUSDC FXPool', // LP Token name
  symbol: 'HFX-EURSUSDC', // LP token symbol
}
