export interface mockTokenInfo {
	name: string
	symbol: string
	decimal: number
	mockOraclePrice: string // in 8 decimals
	addressInMainnetFork: string
	minterInMainnetFork: string //impersonate
}

export const mockToken: mockTokenInfo[] = [
	{
		name: 'USDC',
		symbol: 'USDC',
		decimal: 6,
		mockOraclePrice: '100000000',
		addressInMainnetFork: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
		minterInMainnetFork: '0xfcb19e6a322b27c06842a71e8c725399f049ae3a',
	},
	{
		name: 'Xfers SGD',
		symbol: 'XSGD',
		decimal: 6,
		mockOraclePrice: '74217020', // XSGD/USD
		addressInMainnetFork: '0x70e8de73ce538da2beed35d14187f6959a8eca96',
		minterInMainnetFork: '0x8c3b0cAeC968b2e640D96Ff0B4c929D233B25982',
	},
]
