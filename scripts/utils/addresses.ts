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
  const haloAddresses = getHaloAddresses(network)
  if (!haloAddresses) return undefined
  return haloAddresses.ammV2.assimilatorFactory
}

export const getProportionalLiquidityAddress = (network: string) => {
  const haloAddresses = getHaloAddresses(network)
  if (!haloAddresses) return undefined
  return haloAddresses.ammV2.proportionalLiquidity
}

// need to add haloAddresses.ammV2.swapLib to @halodao/halodao-contract-addresses package
// export const getSwapLibAddress = (network: string) => {
//   const haloAddresses = getHaloAddresses(network)
//   if (!haloAddresses) return undefined
//   return haloAddresses.ammV2.swapLib
// }

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
