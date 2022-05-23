'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.getEnabledPools =
  exports.getVaultAddress =
  exports.getProportionalLiquidityAddress =
  exports.getAssimilatorFactoryAddress =
  exports.getTokenOracleAddress =
  exports.getTokenAddress =
    void 0
var halodao_contract_addresses_1 = require('@halodao/xave-contract-addresses')
var getHaloAddresses = function (network) {
  switch (network) {
    case 'kovan':
      return halodao_contract_addresses_1.kovan
    case 'rinkeby':
      return halodao_contract_addresses_1.rinkeby
    case 'arbTestnet':
      return halodao_contract_addresses_1.arbTestnet
    case 'mainnet':
      return halodao_contract_addresses_1.mainnet
    case 'matic':
      return halodao_contract_addresses_1.matic
    case 'arb':
      return halodao_contract_addresses_1.arb
    default:
      return undefined
  }
}
var getTokenAddress = function (network, baseToken) {
  var haloAddresses = getHaloAddresses(network)
  if (!haloAddresses) return undefined
  return haloAddresses.tokens[baseToken]
}
exports.getTokenAddress = getTokenAddress
var getTokenOracleAddress = function (network, baseToken) {
  var haloAddresses = getHaloAddresses(network)
  if (!haloAddresses) return undefined
  return haloAddresses.ammV2.oracles[baseToken]
}
exports.getTokenOracleAddress = getTokenOracleAddress
var getAssimilatorFactoryAddress = function (network) {
  var haloAddresses = getHaloAddresses(network)
  if (!haloAddresses) return undefined
  return haloAddresses.ammV2.assimilatorFactory
}
exports.getAssimilatorFactoryAddress = getAssimilatorFactoryAddress
var getProportionalLiquidityAddress = function (network) {
  var haloAddresses = getHaloAddresses(network)
  if (!haloAddresses) return undefined
  return haloAddresses.ammV2.proportionalLiquidity
}
exports.getProportionalLiquidityAddress = getProportionalLiquidityAddress
var getVaultAddress = function (network) {
  var haloAddresses = getHaloAddresses(network)
  if (!haloAddresses) return undefined
  return haloAddresses.ammV2.vault
}
exports.getVaultAddress = getVaultAddress
var getEnabledPools = function (network) {
  var haloAddresses = getHaloAddresses(network)
  if (!haloAddresses) return undefined
  return haloAddresses.ammV2.pools.enabled
}
exports.getEnabledPools = getEnabledPools
