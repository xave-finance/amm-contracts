export interface FXPoolConstructorParams {
  assetWeights: string[]
  expiration: string
  unitSeconds: string
  percentFee: string
  name: string // LP Token name
  symbol: string // LP token symbol
}

export const XSGDUSDCFxPool: FXPoolConstructorParams = {
  assetWeights: ['0.5', '0.5'],
  expiration: '1000', //UNIX
  unitSeconds: '1000', //@todo unix, needed?
  percentFee: '0.03',
  name: 'HALO XSGDUSDC FXPool', // LP Token name
  symbol: 'HFX-XSGDUSDC', // LP token symbol
}
