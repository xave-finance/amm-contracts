import chai, { expect } from 'chai'
import { BigNumber } from 'ethers'
import { ethers, waffle } from 'hardhat'
import { TestNumberConvert__factory } from '../typechain/factories/TestNumberConvert__factory'

describe('Test Number Convert', () => {
	let signer: any

	describe('#fromInt128ToUint256', () => {
		it('x', async () => {
			;[signer] = await ethers.getSigners()
			const TestNumberConvert = new TestNumberConvert__factory(signer)
			const converter = await TestNumberConvert.deploy()
			const int128 = 1
			// const uint256 = await converter.fromInt128ToUint256(int128)
			// console.log('int128:', int128)
			// console.log('uint256:', uint256)

			console.log(`maximum int128: ${(await converter.viewMaxInt128()).toString()}`)

			console.log(
				`maximum int128 to int256 ${(await converter.viewMaxInt128ToInt256()).toString()}`
			)
			//
			//	console.log(
			//		`maximum int128 to int256 converted to hex to be assigned to uint: ${BigNumber.from(
			//			await converter.viewMaxInt128ToInt256Bytes()
			//		).toString()}`
			//	)

			console.log(
				`view max viewMaxInt128toUint256: ${(await converter.viewMaxInt128toUint256()).toString()}`
			)
		})
	})
})
