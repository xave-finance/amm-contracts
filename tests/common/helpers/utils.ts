import { ethers } from 'hardhat'

export function sortAddresses(addresses: string[]) {
  return addresses.sort()
}
export const getLatestBlockTime = async (): Promise<number> => {
  const blockNumber = await ethers.provider.getBlockNumber()
  const block = await ethers.provider.getBlock(blockNumber)

  if (block) {
    return block.timestamp
  }

  return new Date().getTime()
}

export const getFutureTime = async (): Promise<number> => {
  const t = await getLatestBlockTime()
  return t + 60
}
