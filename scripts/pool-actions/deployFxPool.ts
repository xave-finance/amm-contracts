import { kovan as haloKovanAddresses } from '@halodao/halodao-contract-addresses'

const getBaseTokenAddress = (network: string, baseToken: string) => {
  if (network === 'kovan') {
    const knownTokens = Object.keys(haloKovanAddresses.tokens)
    if (knownTokens.includes(baseToken)) {
      return haloKovanAddresses.tokens[baseToken as keyof typeof haloKovanAddresses.tokens]
    }
  }
  return undefined
}

export default async (taskArgs: any) => {
  const network = taskArgs.to
  const baseToken = taskArgs.basetoken

  console.log(`Deploying ${baseToken}:USDC pool to ${network}...`)

  const baseTokenAddress = getBaseTokenAddress(network, baseToken)
  if (!baseTokenAddress) {
    console.error(`Address for base token not available on ${network}!`)
    return
  }
}
