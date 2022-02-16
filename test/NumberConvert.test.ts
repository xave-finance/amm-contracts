import chai, { expect } from 'chai'
import { ethers, waffle } from 'hardhat'
import { TestNumberConvert__factory } from '../typechain/factories/TestNumberConvert__factory'

describe('Test Number Convert', () => {
  let signer: any

  before('setup signers', async () => {
    ;[signer] = await ethers.getSigners()
  })

  describe('#fromInt128ToUint256', () => {
    it('x', async () => {
      const TestNumberConvert = new TestNumberConvert__factory(signer)
      const converter = await TestNumberConvert.deploy()
      const int128 = 1
      const uint256 = await converter.fromInt128ToUint256(int128)
      console.log('int128:', int128)
      console.log('uint256:', uint256)
    })
  })
})