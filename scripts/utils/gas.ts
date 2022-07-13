declare const ethers: any

export const getFastGasPrice = async () => {
  const gasPrice = await ethers.provider.getGasPrice()
  const fastGasPrice = gasPrice.mul(ethers.BigNumber.from(125)).div(ethers.BigNumber.from(100))
  return fastGasPrice
}
