import { kovan as haloKovanAddresses, rinkeby as haloRinkebyAddresses } from '@halodao/halodao-contract-addresses'

export const getTokenAddress = (network: string, baseToken: string) => {
  switch (network) {
    case 'kovan':
      return haloKovanAddresses.tokens[baseToken as keyof typeof haloKovanAddresses.tokens]
    case 'rinkeby':
      return haloRinkebyAddresses.tokens[baseToken as keyof typeof haloRinkebyAddresses.tokens]
    default:
      return undefined
  }
}

export const getTokenOracleAddress = (network: string, baseToken: string) => {
  // @todo: store & get address from `@halodao/halodao-contract-addresses`
  switch (baseToken) {
    case 'USDC':
      return network === 'kovan'
        ? '0x9211c6b3BF41A10F78539810Cf5c64e1BB78Ec60'
        : network === 'rinkeby'
        ? '0xa24de01df22b63d23Ebc1882a5E3d4ec0d907bFB'
        : undefined
    case 'fxPHP':
      return network === 'kovan' ? '0x84fdC8dD500F29902C99c928AF2A91970E7432b6' : undefined
    case 'XSGD':
      return undefined
    case 'EURS':
      return network === 'kovan'
        ? '0x0c15Ab9A0DB086e062194c273CC79f41597Bbf13'
        : network === 'rinkeby'
        ? '0x78F9e60608bF48a1155b4B2A5e31F32318a1d85F'
        : undefined
    default:
      return undefined
  }
}

export const getAssimilatorFactoryAddress = (network: string) => {
  // @todo: store & get address from `@halodao/halodao-contract-addresses`
  return '0x972127aFf8e6464e50eFc0a2aD344063355AE424'
}

export const getVaultAddress = (network: string) => {
  switch (network) {
    case 'kovan':
      return haloKovanAddresses.ammV2.vault
    case 'rinkeby':
      return haloRinkebyAddresses.ammV2.vault
    default:
      return undefined
  }
}
