import { kovan as haloKovanAddresses } from '@halodao/halodao-contract-addresses'

export const getTokenAddress = (network: string, baseToken: string) => {
  switch (network) {
    case 'kovan':
      return haloKovanAddresses.tokens[baseToken as keyof typeof haloKovanAddresses.tokens]
    default:
      return undefined
  }
}

export const getTokenOracleAddress = (network: string, baseToken: string) => {
  // @todo: store & get address from `@halodao/halodao-contract-addresses`
  switch (baseToken) {
    case 'USDC':
      return '0x9211c6b3BF41A10F78539810Cf5c64e1BB78Ec60'
    case 'fxPHP':
      return '0x84fdC8dD500F29902C99c928AF2A91970E7432b6'
    case 'XSGD':
      return undefined
    case 'EURS':
      return '0x0c15Ab9A0DB086e062194c273CC79f41597Bbf13'
    default:
      return undefined
  }
}

export const getAssimilatorFactoryAddress = (network: string) => {
  // @todo: store & get address from `@halodao/halodao-contract-addresses`
  return '0x92a79F98e37c5bb68eBEFC04730FED8AD0AF2d82'
}

export const getVaultAddress = (network: string) => {
  switch (network) {
    case 'kovan':
      return haloKovanAddresses.ammV2.vault
    default:
      return undefined
  }
}
