/**
 * Sorts the data in the order that vault expects it
 * Sorting: alphabetized by token address
 *
 * @param sortedAddresses: alphabetized sorted token addresses
 * @param baseTokenAddress: the base token address (e.g. fxPHP on an fxPHP:USDC pool)
 * @param orderedData: an array of data wherein index 0 represents the base token and index 1 represents the quote token
 * @returns an array of data sorted alphabetically by token address
 */
export const sortDataLikeVault = (sortedAddresses: string[], baseTokenAddress: string, orderedData: any[]): any[] => {
  if (sortedAddresses[0] === baseTokenAddress) {
    return [orderedData[0], orderedData[1]]
  } else if (sortedAddresses[1] === baseTokenAddress) {
    return [orderedData[1], orderedData[0]]
  } else {
    throw console.error('sortDataLikeVault: sortedAddresses[0] or sortedAddresses[1] is not expected')
  }
}

/**
 * Orders the data in the way we want it displayed on the frontend UI (aka FE)
 * Ordering: <baseToken>, USDC
 *
 * @param sortedAddresses: alphabetized sorted token addresses
 * @param baseTokenAddress: the base token address (e.g. fxPHP on an fxPHP:USDC pool)
 * @param sortedData: an array of data based on `sortedAddresses` sorting
 * @returns an array of data in the order: <baseToken>, USDC
 */
export const orderDataLikeFE = (sortedAddresses: string[], baseTokenAddress: string, sortedData: any[]): any[] => {
  if (sortedAddresses[0] === baseTokenAddress) {
    return [sortedData[0], sortedData[1]]
  } else if (sortedAddresses[1] === baseTokenAddress) {
    return [sortedData[1], sortedData[0]]
  } else {
    throw console.error('orderDataLikeFE: sortedAddresses[0] or sortedAddresses[1] is not expected')
  }
}
