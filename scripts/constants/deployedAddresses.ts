export const pools = {
  // fxPHP: {
  //   address: '0x5288e69aFDd329D677202FE855275A8C7a89F763',
  //   poolId: '0x5288e69afdd329d677202fe855275a8c7a89f7630002000000000000000007c8',
  //   baseToken: '0x07bAB1e2D6DCb965d250F376B811ab8c2373AAE0',
  //   quoteToken: '0x7e6F38922B59545bB5A6dc3A71039b85dFB1B7cE',
  // },
  fxPHP: {
    address: '0x5894Dae4A6623526a5cf46eDB0cFD6e2A9FB4F08',
    poolId: '0x5894dae4a6623526a5cf46edb0cfd6e2a9fb4f080002000000000000000007d2',
    baseToken: '0x07bAB1e2D6DCb965d250F376B811ab8c2373AAE0',
    quoteToken: '0x7e6F38922B59545bB5A6dc3A71039b85dFB1B7cE',
  },
}

export const listOfPools = Object.keys(pools).map((key) => `${key}:USDC`)

export const proportionalLiquidity = '0xABCBE0Ec8796D19BCb4609DA4ac819D409E39545'
