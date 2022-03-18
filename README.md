# HaloDAO AMM V2

## Description

This repository contains the smart contracts source code and markets configuration for HaloDAO AMM V2. The repository uses Hardhat as development enviroment for compilation, testing and deployment tasks.

## Quick Start

- `yarn` to install all dependencies
- `yarn compile` to generate initial typechain depedencies

## Environment Variables

Refer to our [env example](./.env.example) file in project root.

## Running Tests

Note: use `nvm use` to use the same node version with `.nvmrc`

- For running local test: `yarn test-local`
- For running tests against a forked node: `yarn test-fork` \*\*

## Verifying smart contracts in bscscan, etherscan, polygonscan and arbiscan

- `@nomiclabs/hardhat-etherscan` version 3.0.0 is used to verify smart contract in multiple chain.
- Add the chain api key in the object `etherscan/apiKey` with identifier of each chain as the key. Please refer [here](https://hardhat.org/plugins/nomiclabs-hardhat-etherscan.html#multiple-api-keys-and-alternative-block-explorers) for the chain key.
- Provide the following in your .env file;
  - INFURA_PROJECT_ID
  - MNEMONIC_SEED
  - ETHERSCAN_API_KEY
  - BSCSCAN_API_KEY
  - POLYSCAN_API_KEY
  - ARBISCAN_API_KEY

### Development and Debug Scripts

### Testnet Deployment scripts
