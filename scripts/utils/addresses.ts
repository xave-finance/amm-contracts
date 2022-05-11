import { mainnet, kovan, rinkeby, matic, arb, arbTestnet } from '@halodao/halodao-contract-addresses'

const getHaloAddresses = (network: string) => {
  switch (network) {
    case 'kovan':
      return kovan
    case 'rinkeby':
      return rinkeby
    case 'arbTestnet':
      return arbTestnet
    case 'mainnet':
      return mainnet
    case 'matic':
      return matic
    case 'arb':
      return arb
    default:
      return undefined
  }
}

export const getTokenAddress = (network: string, baseToken: string) => {
  const haloAddresses = getHaloAddresses(network)
  if (!haloAddresses) return undefined
  return haloAddresses.tokens[baseToken as keyof typeof haloAddresses.tokens]
}

export const getTokenOracleAddress = (network: string, baseToken: string) => {
  const haloAddresses = getHaloAddresses(network)
  if (!haloAddresses) return undefined
  return haloAddresses.ammV2.oracles[baseToken as keyof typeof haloAddresses.ammV2.oracles]
}

export const getAssimilatorFactoryAddress = (network: string) => {
  return '0xc3FF5bd24e1E19821bD77D5C537E7Fa1509334E6'
  // const haloAddresses = getHaloAddresses(network)
  // if (!haloAddresses) return undefined
  // return haloAddresses.ammV2.assimilatorFactory
}

export const getProportionalLiquidityAddress = (network: string) => {
  return '0xEBca7E6bcE044df0B9873f854336a740C67890eE'
  // const haloAddresses = getHaloAddresses(network)
  // if (!haloAddresses) return undefined
  // return haloAddresses.ammV2.proportionalLiquidity
}

// need to add haloAddresses.ammV2.swapLib to @halodao/halodao-contract-addresses package
export const getSwapLibAddress = (network: string) => {
  return '0xc377d1f8Cf42758cfAA05563e9F123Da8A8bfA0D'
  // const haloAddresses = getHaloAddresses(network)
  // if (!haloAddresses) return undefined
  // return haloAddresses.ammV2.swapLib
}

export const getVaultAddress = (network: string) => {
  const haloAddresses = getHaloAddresses(network)
  if (!haloAddresses) return undefined
  return haloAddresses.ammV2.vault
}

export const getEnabledPools = (network: string) => {
  const haloAddresses = getHaloAddresses(network)
  if (!haloAddresses) return undefined
  return haloAddresses.ammV2.pools.enabled
}

export const getAllTokenAddresses = (network: string) => {
  const haloAddresses = getHaloAddresses(network)
  if (!haloAddresses) return undefined
  return haloAddresses.tokens
}

export const getVaultAddresses = (network: string) => {
  const haloAddresses = getHaloAddresses(network)
  if (!haloAddresses) return undefined
  return haloAddresses.ammV2.vault
}
