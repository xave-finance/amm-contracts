import Vault from '@balancer-labs/v2-deployments/deployed/kovan/Vault.json'

import { sortAddresses } from './utils/sortAddresses'

declare const ethers: any
declare const hre: any

const verify = async() => {

  const CONTRACT = '0x24631757083c2E1580d5C3A90C7Bc5d2CE398E7B'

  const _name = 'HLP-MPESO-USDC'
  const _symbol = 'HLP'
  const _baseCurrency = '0xaE70265126c20F64A6b011b86F8E7852B0010eCe'
  const _quoteCurrency = '0xa57c092a117C9dE50922A75674dd35ab34d82c4A'
  const _baseWeight = 500000000000000000
  const _quoteWeight = 500000000000000000
  const _baseAssimilator = '0xF9596c5781ABAA8dC8cf8eFE091fa93e61665a2F'
  const _quoteAssimilator = '0x07F540613ea0B7e723ffB5978515A342a134be07'


  await hre.run('verify:verify', {
    address: CONTRACT,
    constructorArguments: ['HLP-CHF-USDC', 'HLP', [
      '0xC11a1bdb6f239445cFBb1Ed5A25660F0358D5465',
      '0xE6dBa291C1E2c59474c5b92D6e865637C1C0bFaC',
      '0xC11a1bdb6f239445cFBb1Ed5A25660F0358D5465',
      '0xE6dBa291C1E2c59474c5b92D6e865637C1C0bFaC',
      '0xC11a1bdb6f239445cFBb1Ed5A25660F0358D5465',
      '0xa57c092a117C9dE50922A75674dd35ab34d82c4A',
      '0xE6dBa291C1E2c59474c5b92D6e865637C1C0bFaC',
      '0xa57c092a117C9dE50922A75674dd35ab34d82c4A',
      '0xE6dBa291C1E2c59474c5b92D6e865637C1C0bFaC',
      '0xa57c092a117C9dE50922A75674dd35ab34d82c4A'
    ], [
              ethers.utils.parseUnits("0.5"),
              ethers.utils.parseUnits("0.5"),
            ]],
    // constructorArguments: []
  })
}

verify()
  .then(() => process.exit(0))
  .catch((error) => console.error(error))