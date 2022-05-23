import { mainnet, kovan, rinkeby, matic, arb, arbTestnet } from '@halodao/xave-contract-addresses'

const USE_TEST_TOKENS = true

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

const getTestToken = (token: string) => {
  switch (token) {
    case 'USDC':
      return 'testUSDC'
    case 'fxPHP':
      return 'testFxPHP'
    case 'XSGD':
      return 'testXSGD'
    case 'EURS':
      return 'testEURS'
    default:
      return `test${token}`
  }
}

export const getTokenAddress = (network: string, baseToken: string) => {
  const haloAddresses = getHaloAddresses(network)
  if (!haloAddresses) return undefined
  if (network === 'arb' && USE_TEST_TOKENS) {
    return haloAddresses.tokens[getTestToken(baseToken) as keyof typeof haloAddresses.tokens]
  }
  return haloAddresses.tokens[baseToken as keyof typeof haloAddresses.tokens]
}

export const getTokenOracleAddress = (network: string, baseToken: string) => {
  const haloAddresses = getHaloAddresses(network)
  if (!haloAddresses) return undefined
  return haloAddresses.amm.oracles[baseToken as keyof typeof haloAddresses.amm.oracles]
}

export const getAssimilatorFactoryAddress = (network: string) => {
  // return '0xB474537769c335BC96cB86DeC70E6C7F36b39b1e'
  const haloAddresses = getHaloAddresses(network)
  if (!haloAddresses) return undefined
  return haloAddresses.amm.assimilatorFactory
}

export const getProportionalLiquidityAddress = (network: string) => {
  // return '0x3af74d19F50f24C75e4000Fe665d718387b1DA74'
  const haloAddresses = getHaloAddresses(network)
  if (!haloAddresses) return undefined
  return haloAddresses.amm.proportionalLiquidity
}

// need to add haloAddresses.amm.swapLib to @halodao/xave-contract-addresses package
export const getSwapLibAddress = (network: string) => {
  // return '0xF82fd35163D1383e76ceD09c605DF5DB81439014'
  const haloAddresses = getHaloAddresses(network)
  if (!haloAddresses) return undefined
  return haloAddresses.amm.swapLibrary
}

export const getVaultAddress = (network: string) => {
  const haloAddresses = getHaloAddresses(network)
  if (!haloAddresses) return undefined
  return haloAddresses.amm.vault
}

export const getEnabledPools = (network: string) => {
  const haloAddresses = getHaloAddresses(network)
  if (!haloAddresses) return undefined
  return haloAddresses.amm.pools.enabled
}

export const getAllTokenAddresses = (network: string) => {
  const haloAddresses = getHaloAddresses(network)
  if (!haloAddresses) return undefined
  return haloAddresses.tokens
}

export const getVaultAddresses = (network: string) => {
  const haloAddresses = getHaloAddresses(network)
  if (!haloAddresses) return undefined
  return haloAddresses.amm.vault
}
