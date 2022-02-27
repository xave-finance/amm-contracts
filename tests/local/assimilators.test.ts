import { expect } from 'chai'
import { ethers } from 'hardhat'
import { Signer } from 'ethers'

import { setupEnvironment, TestEnv } from '../common/setupEnvironment'
import { getAssimilatorContract, getUSDCAssimilatorContract } from '../common/contractGetters'
import { mockToken } from '../constants/mockTokenList'
import {
  calculateNumeraireAmount,
  calculateNumeraireBalance,
  calculateNumeraireBalanceLPRatio,
  calculateRawAmount,
  calculateRawAmountLpRatio,
} from '../common/helpers/calculators'
import { parseEther, parseUnits } from 'ethers/lib/utils'
import { ONE_ETHER, ONE_TO_THE_SIX } from '../constants'

describe('Assimilators', () => {
  const INPUT_AMOUNT = parseEther('100')
  let testEnv: TestEnv
  let admin: Signer
  let adminAddress: string

  before('build test env', async () => {
    testEnv = await setupEnvironment()
    ;[admin] = await ethers.getSigners()
    adminAddress = await admin.getAddress()
  })

  it('Assimilator Factory is deployed properly', async () => {
    expect(testEnv.assimilatorFactory.address, 'Assimilator Factory is not deployed').to.not.equals(
      ethers.constants.AddressZero
    )
    expect(await testEnv.assimilatorFactory.usdc(), 'USDC not set').to.be.equals(testEnv.USDC.address)
    expect(await testEnv.assimilatorFactory.usdcOracle(), 'USDC Oracle not set').to.be.equals(
      testEnv.USDCOracle.address
    )
    expect(await testEnv.assimilatorFactory.usdcAssimilator(), 'USDC Assimilator not set').to.not.equals(
      ethers.constants.AddressZero
    )
  })

  it('Deploys a new base assimilator from the assimilator factory', async () => {
    await expect(
      testEnv.assimilatorFactory.newBaseAssimilator(
        testEnv.XSGD.address,
        parseUnits('1', `${mockToken[1].decimal}`),
        testEnv.XSGDOracle.address
      ),
      'Assimilator not created'
    ).to.emit(testEnv.assimilatorFactory, 'NewAssimilator')
  })

  it('Gets newly deployed base assimilator from the assimilator factory with immutable params set properly', async () => {
    const xsgdAssimilatorAddress = await testEnv.assimilatorFactory.getAssimilator(testEnv.XSGD.address)
    expect(xsgdAssimilatorAddress, 'Assimilator not created and returns zero address').to.not.equals(
      ethers.constants.AddressZero
    )

    const xsgdAssimilatorContract = await getAssimilatorContract(xsgdAssimilatorAddress)

    expect(await xsgdAssimilatorContract.usdc(), 'USDC not set').to.be.equals(testEnv.USDC.address)
    expect(await xsgdAssimilatorContract.oracle(), 'Oracle not set').to.be.equals(testEnv.XSGDOracle.address)
    expect(await xsgdAssimilatorContract.baseToken(), 'Base token not set').to.be.equals(testEnv.XSGD.address)
    expect(await xsgdAssimilatorContract.baseDecimals(), 'Base decimals not set').to.be.equals(
      parseUnits('1', `${mockToken[1].decimal}`)
    )
  })

  it('Base assimilator calculation tests', async () => {
    const mockCurveAddress = adminAddress // illustrate calculation using current EOA account
    const xsgdAssimilatorAddress = await testEnv.assimilatorFactory.getAssimilator(testEnv.XSGD.address)
    const xsgdAssimilatorContract = await getAssimilatorContract(xsgdAssimilatorAddress)
    const xsgdRateFromAssimilator = await xsgdAssimilatorContract.getRate()

    const xsgdAssimilatorDecimals = await xsgdAssimilatorContract.baseDecimals()
    const convertedAmountToUintDecimal = await testEnv.mockABDK.mulu(INPUT_AMOUNT, xsgdAssimilatorDecimals)
    const baseWeight = await testEnv.mockABDK.mulu(parseUnits('0.5'), ONE_ETHER) // from ProportionalLiquidity line 106
    const quoteWeight = await testEnv.mockABDK.mulu(parseUnits('0.5'), ONE_ETHER) // from ProportionalLiquidity line 107

    const usdcBalance = await testEnv.USDC.balanceOf(mockCurveAddress)
    const xsgdBalance = await testEnv.XSGD.balanceOf(mockCurveAddress)

    expect(xsgdRateFromAssimilator, 'Rate from assimilator is not equal to oracle price').to.equals(
      mockToken[1].mockOraclePrice
    )

    expect(
      await xsgdAssimilatorContract.viewRawAmount(INPUT_AMOUNT),
      'View raw amount calculation is incorrect'
    ).to.equals(calculateRawAmount(convertedAmountToUintDecimal, xsgdRateFromAssimilator))

    expect(
      await xsgdAssimilatorContract.viewRawAmountLPRatio(baseWeight, quoteWeight, adminAddress, INPUT_AMOUNT),
      'View raw amount LP ratio calculation is incorrect'
    ).to.equals(
      calculateRawAmountLpRatio(
        usdcBalance,
        baseWeight,
        quoteWeight,
        xsgdAssimilatorDecimals,
        xsgdBalance,
        convertedAmountToUintDecimal
      )
    )

    expect(
      await xsgdAssimilatorContract.viewNumeraireAmount(INPUT_AMOUNT),
      'View numeraire amount calculation is incorrect'
    ).to.equals(
      await testEnv.mockABDK.divu(
        calculateNumeraireAmount(INPUT_AMOUNT, xsgdRateFromAssimilator),
        xsgdAssimilatorDecimals
      )
    )

    expect(
      await xsgdAssimilatorContract.viewNumeraireBalance(mockCurveAddress),
      'View numeraire balance calculation is incorrect'
    ).to.equals(
      await testEnv.mockABDK.divu(
        calculateNumeraireBalance(usdcBalance, xsgdRateFromAssimilator),
        xsgdAssimilatorDecimals
      )
    )

    const { amount_, balance_ } = await xsgdAssimilatorContract.viewNumeraireAmountAndBalance(
      mockCurveAddress,
      INPUT_AMOUNT
    )

    expect(amount_).to.be.equals(
      await testEnv.mockABDK.divu(
        calculateNumeraireAmount(INPUT_AMOUNT, xsgdRateFromAssimilator),
        xsgdAssimilatorDecimals
      ),
      'amount_ in viewNumeraireAmountAndBalance calculation is incorrect'
    )
    expect(balance_).to.be.equals(
      await testEnv.mockABDK.divu(
        calculateNumeraireBalance(usdcBalance, xsgdRateFromAssimilator),
        xsgdAssimilatorDecimals
      ),
      'balance_ in viewNumeraireAmountAndBalance calculation is incorrect'
    )

    expect(
      await xsgdAssimilatorContract.viewNumeraireBalanceLPRatio(baseWeight, quoteWeight, mockCurveAddress),
      'View Numeraire Balance LP Ratio calculation is incorrect'
    ).to.equals(
      await testEnv.mockABDK.divu(
        calculateNumeraireBalanceLPRatio(usdcBalance, quoteWeight, xsgdBalance, baseWeight),
        ONE_ETHER
      )
    )
  })

  it('USDC USD assimilator calculation tests', async () => {
    const mockCurveAddress = adminAddress // illustrate calculation using current EOA account
    const USDC_DECIMALS = ONE_TO_THE_SIX // assigning for reference purposes
    const usdcAssimilatorAddress = await testEnv.assimilatorFactory.usdcAssimilator()
    const usdcAssimilatorContract = await getUSDCAssimilatorContract(usdcAssimilatorAddress)
    const usdcRateFromAssimilator = await usdcAssimilatorContract.getRate()
    const convertedAmountToUintDecimal = await testEnv.mockABDK.mulu(INPUT_AMOUNT, USDC_DECIMALS)
    const usdcBalance = await testEnv.USDC.balanceOf(adminAddress)

    const baseWeight = await testEnv.mockABDK.mulu(parseUnits('0.5'), ONE_ETHER) // from ProportionalLiquidity line 106
    const quoteWeight = await testEnv.mockABDK.mulu(parseUnits('0.5'), ONE_ETHER) // from ProportionalLiquidity line 107

    expect(usdcRateFromAssimilator).to.equals(mockToken[0].mockOraclePrice)

    expect(
      await usdcAssimilatorContract.viewRawAmount(INPUT_AMOUNT),
      'View raw amount calculation is incorrect'
    ).to.equals(calculateRawAmount(convertedAmountToUintDecimal, usdcRateFromAssimilator))

    expect(
      await usdcAssimilatorContract.viewRawAmountLPRatio(baseWeight, quoteWeight, mockCurveAddress, INPUT_AMOUNT),
      'View raw amount LP ratio calculation is incorrect'
    ).to.equals(await testEnv.mockABDK.mulu(INPUT_AMOUNT, USDC_DECIMALS))

    // @todo viewNumeraireAmount  amount_ = ((_amount * _rate) / 1e8).divu(baseDecimals);

    expect(
      await usdcAssimilatorContract.viewNumeraireAmount(INPUT_AMOUNT),
      'View numeraire amount calculation is incorrect'
    ).to.equals(
      await testEnv.mockABDK.divu(calculateNumeraireAmount(INPUT_AMOUNT, usdcRateFromAssimilator), USDC_DECIMALS)
    )

    expect(
      await usdcAssimilatorContract.viewNumeraireBalance(mockCurveAddress),
      'View numeraire balance calculation is incorrect'
    ).to.equals(
      await testEnv.mockABDK.divu(calculateNumeraireBalance(usdcBalance, usdcRateFromAssimilator), USDC_DECIMALS)
    )

    const { amount_, balance_ } = await usdcAssimilatorContract.viewNumeraireAmountAndBalance(
      mockCurveAddress,
      INPUT_AMOUNT
    )

    expect(amount_).to.be.equals(
      await testEnv.mockABDK.divu(calculateNumeraireAmount(INPUT_AMOUNT, usdcRateFromAssimilator), USDC_DECIMALS),
      'amount_ in viewNumeraireAmountAndBalance calculation is incorrect'
    )
    expect(balance_).to.be.equals(
      await testEnv.mockABDK.divu(calculateNumeraireBalance(usdcBalance, usdcRateFromAssimilator), USDC_DECIMALS),
      'balance_ in viewNumeraireAmountAndBalance calculation is incorrect'
    )

    expect(
      await usdcAssimilatorContract.viewNumeraireBalanceLPRatio(baseWeight, quoteWeight, mockCurveAddress),
      'View Numeraire Balance LP Ratio calculation is incorrect'
    ).to.equals(
      await testEnv.mockABDK.divu(
        calculateNumeraireBalanceLPRatio(usdcBalance, quoteWeight, usdcBalance, baseWeight),
        ONE_ETHER
      )
    )
  })
})
