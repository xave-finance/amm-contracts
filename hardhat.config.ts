require('dotenv').config()

import '@typechain/hardhat'
import '@openzeppelin/hardhat-upgrades'
import '@nomiclabs/hardhat-waffle'
import '@nomiclabs/hardhat-etherscan'
import '@nomiclabs/hardhat-ethers'
import 'hardhat-gas-reporter'
import 'hardhat-tracer'
//import '@tenderly/hardhat-tenderly'

import initializePoolTasks from './scripts/pool-actions/'
import initializeSwapTasks from './scripts/swaps/'
import initializeRelayerTasks from './scripts/relayers/'

const INFURA_PROJECT_ID = process.env.INFURA_PROJECT_ID || ''
const MNEMONIC_SEED = process.env.MNEMONIC_SEED || ''
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || ''
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || ''
const TENDERLY_USERNAME = process.env.TENDERLY_USERNAME || ''
const TENDERLY_PROJECT = process.env.TENDERLY_PROJECT || ''

initializePoolTasks()
//initializeSwapTasks()
//initializeRelayerTasks()

/**
 * @type import('hardhat/config').HardhatUserConfig
 */

export default {
  solidity: {
    compilers: [
      // {
      //   version: '0.7.1',
      //   settings: {
      //     optimizer: {
      //       enabled: true,
      //       runs: 10000,
      //     },
      //   },
      // },
      {
        version: '0.7.3',
        settings: {
          optimizer: {
            enabled: true,
            runs: 10000,
          },
        },
      },
      // {
      //   version: '0.8.0',
      //   settings: {
      //     optimizer: {
      //       enabled: true,
      //       runs: 7500,
      //     },
      //   },
      // },
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
    //hardhat: {
    //	chainId: 1337,
    //	// forking: {
    //	// 	url: `https://eth-kovan.alchemyapi.io/v2/${ALCHEMY_API_KEY}`,
    //	// 	blockNumber: 29238122,
    //	// 	// blockNumber: 28764216,
    //	// },
    //	//forking: {
    //	//	enabled: true,
    //	//	url: `https://eth-mainnet.alchemyapi.io/v2/${ALCHEMY_API_KEY}`,
    //	//	blockNumber: 13453242,
    //	//},
    //	accounts: {
    //		accountsBalance: '100000000000000000000000', // 100000 ETH
    //		count: 5,
    //	},
    //},

    hardhat: {
      chainId: 1337,
      accounts: {
        mnemonic: MNEMONIC_SEED,
      },
      allowUnlimitedContractSize: true,
    },
    kovan: {
      url: `https://kovan.infura.io/v3/${INFURA_PROJECT_ID}`,
      accounts: {
        mnemonic: MNEMONIC_SEED,
      },
      blockGasLimit: 20000000,
    },
    rinkeby: {
      url: `https://rinkeby.infura.io/v3/${INFURA_PROJECT_ID}`,
      accounts: {
        mnemonic: MNEMONIC_SEED,
      },
      blockGasLimit: 20000000,
    },
    matic: {
      chainId: 137,
      url: `https://polygon-mainnet.infura.io/v3/${INFURA_PROJECT_ID}`,
      accounts: {
        mnemonic: MNEMONIC_SEED,
      },
      gasPrice: 8000000000,
    },
    localhost: {
      chainId: 1337,
      url: 'http://127.0.0.1:8545/',
      accounts: {
        mnemonic: MNEMONIC_SEED,
        accountsBalance: '100000000000000000000000',
      },
    },
  },
  etherscan: {
    // change to BSCSCAN_API_KEY if BSC, ETHERSCAN_API_KEY if Eth networks
    apiKey: ETHERSCAN_API_KEY,
  },
  tenderly: {
    username: TENDERLY_USERNAME,
    project: TENDERLY_PROJECT,
  },
}
