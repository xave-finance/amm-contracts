import assert from 'assert'

declare const ethers: any

export enum HaloSwapType {
  SwapExactIn,
  SwapExactOut,
}

export const getSwaps = async (
  amount: string,
  swapType: HaloSwapType,
  tokenIn: {
    address: string
    decimals: number
  },
  tokenOut: {
    address: string
    decimals: number
  },
  allPools: {
    poolId: string
    assets: string[]
  }[]
) => {
  if (!tokenIn || !tokenOut) {
    return {
      tokenAddresses: [],
      swaps: [],
    }
  }

  const decimals = swapType === HaloSwapType.SwapExactIn ? tokenIn.decimals : tokenOut.decimals

  // scenario 1: there's a pool with both tokenIn and tokenOut
  const poolWithBothTokens = allPools.find(
    (p) => p.assets.includes(tokenIn.address) && p.assets.includes(tokenOut.address)
  )
  if (poolWithBothTokens) {
    console.log('token decimals: ', decimals)
    console.log('token amount: ', ethers.utils.formatUnits(ethers.utils.parseUnits(amount, decimals), decimals))
    const sortedTokenAddresses = [tokenIn.address.toLowerCase(), tokenOut.address.toLowerCase()].sort()
    console.log('sortedTokenAddresses: ', sortedTokenAddresses)

    return {
      tokenAddresses: sortedTokenAddresses,
      swaps: [
        {
          poolId: poolWithBothTokens.poolId,
          assetInIndex: sortedTokenAddresses.indexOf(tokenIn.address.toLowerCase()),
          assetOutIndex: sortedTokenAddresses.indexOf(tokenOut.address.toLowerCase()),
          amount: ethers.utils.parseUnits(amount, decimals),
          userData: '0x',
        },
      ],
    }
  }

  // scenario 2: need to do 2 trades
  const poolWithTokenIn = allPools.find((p) => p.assets.includes(tokenIn.address))
  const poolWithTokenOut = allPools.find((p) => p.assets.includes(tokenOut.address))
  assert(poolWithTokenIn && poolWithTokenOut, 'Unable to find a swap route')

  const sortedTokenAddresses = [
    tokenIn.address.toLowerCase(),
    poolWithTokenIn.assets[1].toLowerCase(),
    tokenOut.address.toLowerCase(),
  ].sort()
  console.log('sortedTokenAddresses: ', sortedTokenAddresses)

  let swaps = []
  if (swapType === HaloSwapType.SwapExactIn) {
    swaps = [
      {
        poolId: poolWithTokenIn.poolId,
        assetInIndex: sortedTokenAddresses.indexOf(tokenIn.address.toLowerCase()),
        assetOutIndex: sortedTokenAddresses.indexOf(poolWithTokenIn.assets[1].toLowerCase()),
        amount: ethers.utils.parseUnits(amount, decimals),
        userData: '0x',
      },
      {
        poolId: poolWithTokenOut.poolId,
        assetInIndex: sortedTokenAddresses.indexOf(poolWithTokenIn.assets[1].toLowerCase()),
        assetOutIndex: sortedTokenAddresses.indexOf(tokenOut.address.toLowerCase()),
        amount: '0',
        userData: '0x',
      },
    ]
  } else {
    swaps = [
      {
        poolId: poolWithTokenOut.poolId,
        assetInIndex: sortedTokenAddresses.indexOf(tokenOut.address.toLowerCase()),
        assetOutIndex: sortedTokenAddresses.indexOf(poolWithTokenOut.assets[1].toLowerCase()),
        amount: ethers.utils.parseUnits(amount, decimals),
        userData: '0x',
      },
      {
        poolId: poolWithTokenIn.poolId,
        assetInIndex: sortedTokenAddresses.indexOf(poolWithTokenOut.assets[1].toLowerCase()),
        assetOutIndex: sortedTokenAddresses.indexOf(tokenIn.address.toLowerCase()),
        amount: '0',
        userData: '0x',
      },
    ]
  }

  return {
    tokenAddresses: sortedTokenAddresses,
    swaps,
  }
}
