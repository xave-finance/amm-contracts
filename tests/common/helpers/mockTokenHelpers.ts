import { parseUnits } from 'ethers/lib/utils'
import { ethers } from 'hardhat'

export const mintMockToken = async (
	tokenAddress: string,
	amount: string,
	decimals: number,
	to: string
) => {
	const mockERC20 = await ethers.getContractAt('MockToken', tokenAddress)

	await mockERC20.mint(to, parseUnits(amount, decimals))
}

export const approveMockToken = async (
	tokenAddress: string,
	amount: string,
	decimals: number,
	spender: string
) => {
	const mockERC20 = await ethers.getContractAt('MockToken', tokenAddress)

	await mockERC20.approve(spender, parseUnits(amount, decimals))
}
