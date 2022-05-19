import { parseUnits } from 'ethers/lib/utils'
import { ethers } from 'hardhat'
import { mockToken, TokenSymbol } from '../../constants/mockTokenList'

export const mintMockToken = async (tokenAddress: string, amount: string, decimals: number, to: string) => {
  const mockERC20 = await ethers.getContractAt('MockToken', tokenAddress)

  await mockERC20.mint(to, parseUnits(amount, decimals))
}

export const approveMockToken = async (tokenAddress: string, amount: string, decimals: number, spender: string) => {
  const mockERC20 = await ethers.getContractAt('MockToken', tokenAddress)

  await mockERC20.approve(spender, parseUnits(amount, decimals))
}

export const getMockTokenDecimalBySymbol = (inputCurrency: TokenSymbol) => {
  const result = mockToken.filter((token) => {
    return token.symbol === inputCurrency
  })

  return result[0].decimal
}
