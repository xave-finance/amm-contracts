require('dotenv').config()

import '@typechain/hardhat'
import '@openzeppelin/hardhat-upgrades'
import '@nomiclabs/hardhat-waffle'
import '@nomiclabs/hardhat-etherscan'
require("@tenderly/hardhat-tenderly")

import './test/common/setupTests'

import initializePoolTasks from './scripts//pool-actions/'

const INFURA_PROJECT_ID = process.env.INFURA_PROJECT_ID || ''
const MNEMONIC_SEED = process.env.MNEMONIC_SEED || ''
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || ''
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || ''
const TENDERLY_USERNAME = process.env.TENDERLY_USERNAME || ''
const TENDERLY_PROJECT= process.env.TENDERLY_PROJECT || ''

initializePoolTasks()

/**
 * @type import('hardhat/config').HardhatUserConfig
 */

export default {
	solidity: {
		compilers: [
			{
				version: '0.7.1',
				settings: {
					optimizer: {
						enabled: true,
						runs: 10000,
					},
				},
			},
			{
				version: '0.7.3',
				settings: {
					optimizer: {
						enabled: true,
						runs: 10000,
					},
				},
			},
			{
				version: '0.8.0',
				settings: {
					optimizer: {
						enabled: true,
						runs: 7500,
					},
				},
			},
		],
		overrides: {
			'contracts/balancer-core-v2/vault/Vault.sol': {
				version: '0.7.1',
				settings: {
					optimizer: {
						enabled: true,
						runs: 400,
					},
				},
			},
			'contracts/balancer-core-v2/pools/weighted/WeightedPoolFactory.sol': {
				version: '0.7.1',
				settings: {
					optimizer: {
						enabled: true,
						runs: 800,
					},
				},
			},
		},
	},
	networks: {
		hardhat: {
			forking: {
				url: `https://eth-kovan.alchemyapi.io/v2/${ALCHEMY_API_KEY}`,
				blockNumber: 28132012,
			},
			accounts: {
				accountsBalance: '100000000000000000000000', // 100000 ETH
				count: 5,
			},
		},
		kovan: {
			url: `https://kovan.infura.io/v3/${INFURA_PROJECT_ID}`,
			accounts: {
				mnemonic: MNEMONIC_SEED,
			},
			blockGasLimit: 20000000,
		},
		localhost: {
			chainId: 1337,
			url: 'http://127.0.0.1:8545/',
		},
	},
	etherscan: {
		// change to BSCSCAN_API_KEY if BSC, ETHERSCAN_API_KEY if Eth networks
		apiKey: ETHERSCAN_API_KEY,
	},
	tenderly: {
		username: TENDERLY_USERNAME,
		project: TENDERLY_PROJECT
	}
}
