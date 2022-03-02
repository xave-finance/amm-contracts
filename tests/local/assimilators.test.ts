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

  it('Deploys XSGD, EURS & fxPHP assimilators from the assimilator factory', async () => {
    await expect(
      testEnv.assimilatorFactory.newBaseAssimilator(
        testEnv.XSGD.address,
        parseUnits('1', `${mockToken[1].decimal}`),
        testEnv.XSGDOracle.address
      ),
      'XSGD assimilator not created'
    ).to.emit(testEnv.assimilatorFactory, 'NewAssimilator')

    await expect(
      testEnv.assimilatorFactory.newBaseAssimilator(
        testEnv.EURS.address,
        parseUnits('1', `${mockToken[2].decimal}`),
        testEnv.EURSOracle.address
      ),
      'EURS assimilator not created'
    ).to.emit(testEnv.assimilatorFactory, 'NewAssimilator')

    await expect(
      testEnv.assimilatorFactory.newBaseAssimilator(
        testEnv.fxPHP.address,
        parseUnits('1', `${mockToken[3].decimal}`),
        testEnv.fxPHPOracle.address
      ),
      'fxPHP assimilator not created'
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

  it('Base assimilators calculation tests', async () => {
    const mockCurveAddress = adminAddress // illustrate calculation using current EOA account
    const xsgdAssimilatorAddress = await testEnv.assimilatorFactory.getAssimilator(testEnv.XSGD.address)
    const eursAssimilatorAddress = await testEnv.assimilatorFactory.getAssimilator(testEnv.EURS.address)
    const fxPHPAssimilatorAddress = await testEnv.assimilatorFactory.getAssimilator(testEnv.fxPHP.address)

    const baseWeight = await testEnv.mockABDK.mulu(parseUnits('0.5'), ONE_ETHER) // from ProportionalLiquidity line 106
    const quoteWeight = await testEnv.mockABDK.mulu(parseUnits('0.5'), ONE_ETHER) // from ProportionalLiquidity line 107

    const usdcBalance = await testEnv.USDC.balanceOf(mockCurveAddress)
    const xsgdBalance = await testEnv.XSGD.balanceOf(mockCurveAddress)
    const eursBalance = await testEnv.EURS.balanceOf(mockCurveAddress)
    const fxPHPBalance = await testEnv.fxPHP.balanceOf(mockCurveAddress)

    /**
     * `getRate()` assertions
     **/
    const xsgdAssimilatorContract = await getAssimilatorContract(xsgdAssimilatorAddress)
    const xsgdRateFromAssimilator = await xsgdAssimilatorContract.getRate()
    expect(xsgdRateFromAssimilator, 'Rate from XSGD assimilator is not equal to oracle price').to.equals(
      mockToken[1].mockOraclePrice
    )

    const eursAssimilatorContract = await getAssimilatorContract(eursAssimilatorAddress)
    const eursRateFromAssimilator = await eursAssimilatorContract.getRate()
    expect(eursRateFromAssimilator, 'Rate from EURS assimilator is not equal to oracle price').to.equals(
      mockToken[2].mockOraclePrice
    )

    const fxPHPAssimilatorContract = await getAssimilatorContract(fxPHPAssimilatorAddress)
    const fxPHPRateFromAssimilator = await fxPHPAssimilatorContract.getRate()
    expect(fxPHPRateFromAssimilator, 'Rate from fxPHP assimilator is not equal to oracle price').to.equals(
      mockToken[3].mockOraclePrice
    )

    /**
     * `viewRawAmount()` assertions
     **/
    const xsgdAssimilatorDecimals = await xsgdAssimilatorContract.baseDecimals()
    const xsgdInputAmountUInt = await testEnv.mockABDK.mulu(INPUT_AMOUNT, xsgdAssimilatorDecimals)
    expect(
      await xsgdAssimilatorContract.viewRawAmount(INPUT_AMOUNT),
      'View raw amount calculation (XGSD) is incorrect'
    ).to.equals(calculateRawAmount(xsgdInputAmountUInt, xsgdRateFromAssimilator))

    const eursAssimilatorDecimals = await eursAssimilatorContract.baseDecimals()
    const eursInputAmountUInt = await testEnv.mockABDK.mulu(INPUT_AMOUNT, eursAssimilatorDecimals)
    expect(
      await eursAssimilatorContract.viewRawAmount(INPUT_AMOUNT),
      'View raw amount calculation (EURS) is incorrect'
    ).to.equals(calculateRawAmount(eursInputAmountUInt, eursRateFromAssimilator))

    const fxPHPAssimilatorDecimals = await fxPHPAssimilatorContract.baseDecimals()
    const fxPHPInputAmountUInt = await testEnv.mockABDK.mulu(INPUT_AMOUNT, fxPHPAssimilatorDecimals)
    expect(
      await fxPHPAssimilatorContract.viewRawAmount(INPUT_AMOUNT),
      'View raw amount calculation (fxPHP) is incorrect'
    ).to.equals(calculateRawAmount(fxPHPInputAmountUInt, fxPHPRateFromAssimilator))

    /**
     * `viewRawAmountLPRatio()` assertions
     **/
    expect(
      await xsgdAssimilatorContract.viewRawAmountLPRatio(baseWeight, quoteWeight, adminAddress, INPUT_AMOUNT),
      'View raw amount LP ratio calculation (XSGD) is incorrect'
    ).to.equals(
      calculateRawAmountLpRatio(
        usdcBalance,
        baseWeight,
        quoteWeight,
        xsgdAssimilatorDecimals,
        xsgdBalance,
        xsgdInputAmountUInt
      )
    )

    expect(
      await eursAssimilatorContract.viewRawAmountLPRatio(baseWeight, quoteWeight, adminAddress, INPUT_AMOUNT),
      'View raw amount LP ratio calculation (EURS) is incorrect'
    ).to.equals(
      calculateRawAmountLpRatio(
        usdcBalance,
        baseWeight,
        quoteWeight,
        eursAssimilatorDecimals,
        eursBalance,
        eursInputAmountUInt
      )
    )

    expect(
      await fxPHPAssimilatorContract.viewRawAmountLPRatio(baseWeight, quoteWeight, adminAddress, INPUT_AMOUNT),
      'View raw amount LP ratio calculation (fxPHP) is incorrect'
    ).to.equals(
      calculateRawAmountLpRatio(
        usdcBalance,
        baseWeight,
        quoteWeight,
        fxPHPAssimilatorDecimals,
        fxPHPBalance,
        fxPHPInputAmountUInt
      )
    )

    /**
     * `viewNumeraireAmount()` assertions
     **/
    expect(
      await xsgdAssimilatorContract.viewNumeraireAmount(INPUT_AMOUNT),
      'View numeraire amount calculation (XSGD) is incorrect'
    ).to.equals(
      await calculateNumeraireAmount(INPUT_AMOUNT, xsgdRateFromAssimilator, xsgdAssimilatorDecimals, testEnv.mockABDK)
    )

    expect(
      await eursAssimilatorContract.viewNumeraireAmount(INPUT_AMOUNT),
      'View numeraire amount calculation (EURS) is incorrect'
    ).to.equals(
      await calculateNumeraireAmount(INPUT_AMOUNT, eursRateFromAssimilator, eursAssimilatorDecimals, testEnv.mockABDK)
    )

    expect(
      await fxPHPAssimilatorContract.viewNumeraireAmount(INPUT_AMOUNT),
      'View numeraire amount calculation (fxPHP) is incorrect'
    ).to.equals(
      await calculateNumeraireAmount(INPUT_AMOUNT, fxPHPRateFromAssimilator, fxPHPAssimilatorDecimals, testEnv.mockABDK)
    )

    /**
     * `viewNumeraireBalance()` assertions
     **/
    expect(
      await xsgdAssimilatorContract.viewNumeraireBalance(mockCurveAddress),
      'View numeraire balance calculation (XSGD) is incorrect'
    ).to.equals(
      await calculateNumeraireBalance(xsgdBalance, xsgdRateFromAssimilator, xsgdAssimilatorDecimals, testEnv.mockABDK)
    )

    expect(
      await eursAssimilatorContract.viewNumeraireBalance(mockCurveAddress),
      'View numeraire balance calculation (EURS) is incorrect'
    ).to.equals(
      await calculateNumeraireBalance(eursBalance, eursRateFromAssimilator, eursAssimilatorDecimals, testEnv.mockABDK)
    )

    expect(
      await fxPHPAssimilatorContract.viewNumeraireBalance(mockCurveAddress),
      'View numeraire balance calculation (fxPHP) is incorrect'
    ).to.equals(
      await calculateNumeraireBalance(
        fxPHPBalance,
        fxPHPRateFromAssimilator,
        fxPHPAssimilatorDecimals,
        testEnv.mockABDK
      )
    )

    /**
     * `viewNumeraireBalance()` assertions
     **/
    const { amount_: xsgdAmount_, balance_: xsgdBalance_ } =
      await xsgdAssimilatorContract.viewNumeraireAmountAndBalance(mockCurveAddress, INPUT_AMOUNT)
    expect(xsgdAmount_).to.be.equals(
      await calculateNumeraireAmount(INPUT_AMOUNT, xsgdRateFromAssimilator, xsgdAssimilatorDecimals, testEnv.mockABDK),
      'amount_ in viewNumeraireAmountAndBalance calculation (XSGD) is incorrect'
    )
    expect(xsgdBalance_).to.be.equals(
      await calculateNumeraireBalance(xsgdBalance, xsgdRateFromAssimilator, xsgdAssimilatorDecimals, testEnv.mockABDK),
      'balance_ in viewNumeraireAmountAndBalance calculation (XSGD) is incorrect'
    )

    const { amount_: eursAmount_, balance_: eursBalance_ } =
      await eursAssimilatorContract.viewNumeraireAmountAndBalance(mockCurveAddress, INPUT_AMOUNT)
    expect(eursAmount_).to.be.equals(
      await calculateNumeraireAmount(INPUT_AMOUNT, eursRateFromAssimilator, eursAssimilatorDecimals, testEnv.mockABDK),
      'amount_ in viewNumeraireAmountAndBalance calculation (EURS) is incorrect'
    )
    expect(eursBalance_).to.be.equals(
      await calculateNumeraireBalance(eursBalance, eursRateFromAssimilator, eursAssimilatorDecimals, testEnv.mockABDK),
      'balance_ in viewNumeraireAmountAndBalance calculation (EURS) is incorrect'
    )

    const { amount_: fxPHPAmount_, balance_: fxPHPBalance_ } =
      await fxPHPAssimilatorContract.viewNumeraireAmountAndBalance(mockCurveAddress, INPUT_AMOUNT)
    expect(fxPHPAmount_).to.be.equals(
      await calculateNumeraireAmount(
        INPUT_AMOUNT,
        fxPHPRateFromAssimilator,
        fxPHPAssimilatorDecimals,
        testEnv.mockABDK
      ),
      'amount_ in viewNumeraireAmountAndBalance calculation (fxPHP) is incorrect'
    )
    expect(fxPHPBalance_).to.be.equals(
      await calculateNumeraireBalance(
        fxPHPBalance,
        fxPHPRateFromAssimilator,
        fxPHPAssimilatorDecimals,
        testEnv.mockABDK
      ),
      'balance_ in viewNumeraireAmountAndBalance calculation (fxPHP) is incorrect'
    )

    /**
     * `viewNumeraireBalanceLPRatio()` assertions
     **/
    expect(
      await xsgdAssimilatorContract.viewNumeraireBalanceLPRatio(baseWeight, quoteWeight, mockCurveAddress),
      'View Numeraire Balance LP Ratio calculation (XSGD) is incorrect'
    ).to.equals(
      await calculateNumeraireBalanceLPRatio(usdcBalance, quoteWeight, xsgdBalance, baseWeight, testEnv.mockABDK)
    )

    expect(
      await eursAssimilatorContract.viewNumeraireBalanceLPRatio(baseWeight, quoteWeight, mockCurveAddress),
      'View Numeraire Balance LP Ratio calculation (EURS) is incorrect'
    ).to.equals(
      await calculateNumeraireBalanceLPRatio(usdcBalance, quoteWeight, eursBalance, baseWeight, testEnv.mockABDK)
    )

    expect(
      await fxPHPAssimilatorContract.viewNumeraireBalanceLPRatio(baseWeight, quoteWeight, mockCurveAddress),
      'View Numeraire Balance LP Ratio calculation (fxPHP) is incorrect'
    ).to.equals(
      await calculateNumeraireBalanceLPRatio(usdcBalance, quoteWeight, fxPHPBalance, baseWeight, testEnv.mockABDK)
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

    expect(
      await usdcAssimilatorContract.viewNumeraireAmount(INPUT_AMOUNT),
      'View numeraire amount calculation is incorrect'
    ).to.equals(await calculateNumeraireAmount(INPUT_AMOUNT, usdcRateFromAssimilator, USDC_DECIMALS, testEnv.mockABDK))

    expect(
      await usdcAssimilatorContract.viewNumeraireBalance(mockCurveAddress),
      'View numeraire balance calculation is incorrect'
    ).to.equals(await calculateNumeraireBalance(usdcBalance, usdcRateFromAssimilator, USDC_DECIMALS, testEnv.mockABDK))

    const { amount_, balance_ } = await usdcAssimilatorContract.viewNumeraireAmountAndBalance(
      mockCurveAddress,
      INPUT_AMOUNT
    )

    expect(amount_).to.be.equals(
      await calculateNumeraireAmount(INPUT_AMOUNT, usdcRateFromAssimilator, USDC_DECIMALS, testEnv.mockABDK),
      'amount_ in viewNumeraireAmountAndBalance calculation is incorrect'
    )
    expect(balance_).to.be.equals(
      await calculateNumeraireBalance(usdcBalance, usdcRateFromAssimilator, USDC_DECIMALS, testEnv.mockABDK),
      'balance_ in viewNumeraireAmountAndBalance calculation is incorrect'
    )

    expect(
      await usdcAssimilatorContract.viewNumeraireBalanceLPRatio(baseWeight, quoteWeight, mockCurveAddress),
      'View Numeraire Balance LP Ratio calculation is incorrect'
    ).to.equals(
      await calculateNumeraireBalanceLPRatio(usdcBalance, quoteWeight, usdcBalance, baseWeight, testEnv.mockABDK)
    )
  })
})
