import { expect } from 'chai'
import { ethers } from 'hardhat'
import { Signer } from 'ethers'
import { setupEnvironment, TestEnv } from '../common/setupEnvironment'
import { getAssimilatorContract, getFxPoolContract, getUSDCAssimilatorContract } from '../common/contractGetters'
import { mockToken } from '../constants/mockTokenList'
import calculator from '../common/helpers/calculators'
import { parseEther, parseUnits } from 'ethers/lib/utils'
import { ONE_ETHER, ONE_TO_THE_SIX } from '../constants'
import { EURSUSDCFxPool, fxPHPUSDCFxPool, XSGDUSDCFxPool } from '../constants/mockPoolList'
import { sortAddresses } from '../../scripts/utils/sortAddresses'
import { FXPool } from '../../typechain/FXPool'
import { simulateDeposit } from '../common/helpers/amm'

const INPUT_AMOUNT = parseEther('222')

describe('XSGD-USDC Assimilator Tests', () => {
  let testEnv: TestEnv
  let admin: Signer
  let adminAddress: string
  let calc: ReturnType<typeof calculator>
  let poolId: string
  let fxPool: FXPool
  let sortedAddresses: string[]
  let fxPoolAddress: string

  before('build test env', async () => {
    testEnv = await setupEnvironment()
    ;[admin] = await ethers.getSigners()
    adminAddress = await admin.getAddress()
    calc = calculator(testEnv.mockABDK)
    sortedAddresses = sortAddresses([testEnv.XSGD.address, testEnv.USDC.address])

    await testEnv.fxPoolFactory.newFXPool(
      XSGDUSDCFxPool.name,
      XSGDUSDCFxPool.symbol,
      XSGDUSDCFxPool.percentFee,
      testEnv.vault.address,
      sortedAddresses
    )

    fxPoolAddress = await testEnv.fxPoolFactory.getActiveFxPool(sortedAddresses)
    fxPool = await getFxPoolContract(fxPoolAddress, testEnv.proportionalLiquidity.address, testEnv.fxSwaps.address)
    poolId = await fxPool.getPoolId()
    await expect(fxPool.setCollectorAddress(adminAddress)).to.emit(fxPool, 'ChangeCollectorAddress')
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

  it('Deploys xsgd assimilators from the assimilator factory', async () => {
    await expect(
      testEnv.assimilatorFactory.newBaseAssimilator(
        testEnv.XSGD.address,
        parseUnits('1', `${mockToken[1].decimal}`),
        testEnv.XSGDOracle.address
      ),
      'XSGD assimilator not created'
    ).to.emit(testEnv.assimilatorFactory, 'NewAssimilator')
  })

  it('Gets newly deployed XSGD-USD assimilator from the assimilator factory with immutable params set properly', async () => {
    const baseWeight = parseUnits('0.5')
    const quoteWeight = parseUnits('0.5')
    const xsgdAssimilatorAddress = await testEnv.assimilatorFactory.getAssimilator(testEnv.XSGD.address)
    const usdcAssimilatorAddress = await testEnv.assimilatorFactory.usdcAssimilator()
    expect(xsgdAssimilatorAddress, 'XSGD-USD assimilator not created and returns zero address').to.not.equals(
      ethers.constants.AddressZero
    )

    const xsgdAssimilatorContract = await getAssimilatorContract(xsgdAssimilatorAddress)

    expect(await xsgdAssimilatorContract.usdc(), 'USDC address incorrect').to.be.equals(testEnv.USDC.address)
    expect(await xsgdAssimilatorContract.oracle(), 'XSGD Oracle address incorrect').to.be.equals(
      testEnv.XSGDOracle.address
    )
    expect(await xsgdAssimilatorContract.baseToken(), 'XSGD address incorrect').to.be.equals(testEnv.XSGD.address)
    expect(await xsgdAssimilatorContract.baseDecimals(), 'XSGD decimals incorrect').to.be.equals(
      parseUnits('1', `${mockToken[1].decimal}`)
    )

    await fxPool.initialize(
      [
        testEnv.XSGD.address,
        xsgdAssimilatorAddress,
        testEnv.XSGD.address,
        xsgdAssimilatorAddress,
        testEnv.XSGD.address,
        testEnv.USDC.address,
        usdcAssimilatorAddress,
        testEnv.USDC.address,
        usdcAssimilatorAddress,
        testEnv.USDC.address,
      ],
      [baseWeight, quoteWeight]
    )
  })

  it('XSGD-USD assimilator calculation tests', async () => {
    const xsgdAssimilatorAddress = await testEnv.assimilatorFactory.getAssimilator(testEnv.XSGD.address)
    const xsgdAssimilatorContract = await getAssimilatorContract(xsgdAssimilatorAddress)
    const xsgdRateFromAssimilator = await xsgdAssimilatorContract.getRate()

    const xsgdAssimilatorDecimals = await xsgdAssimilatorContract.baseDecimals()
    const baseWeight = await testEnv.mockABDK.mulu(parseUnits('0.5'), ONE_ETHER) // from ProportionalLiquidity line 106
    const quoteWeight = await testEnv.mockABDK.mulu(parseUnits('0.5'), ONE_ETHER) // from ProportionalLiquidity line 107

    await testEnv.XSGD.approve(testEnv.vault.address, ethers.constants.MaxUint256)
    await testEnv.USDC.approve(testEnv.vault.address, ethers.constants.MaxUint256)

    const numeraireAmountsIn = ['10000']

    await simulateDeposit(
      numeraireAmountsIn,
      testEnv.USDC.address,
      testEnv.XSGD.address,
      poolId,
      adminAddress,
      testEnv.vault
    )

    const usdcBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)
    const xsgdBalance = await testEnv.XSGD.balanceOf(testEnv.vault.address)

    expect(xsgdRateFromAssimilator, 'Rate from assimilator is not equal to oracle price').to.equals(
      mockToken[1].mockOraclePrice
    )

    expect(
      await xsgdAssimilatorContract.viewRawAmount(INPUT_AMOUNT),
      'View raw amount calculation is incorrect'
    ).to.equals(await calc.calculateRawAmount(INPUT_AMOUNT, xsgdAssimilatorDecimals, xsgdRateFromAssimilator))

    expect(
      await xsgdAssimilatorContract.viewRawAmountLPRatio(
        baseWeight,
        quoteWeight,
        INPUT_AMOUNT,
        testEnv.vault.address,
        poolId
      ),
      'View raw amount LP ratio calculation is incorrect'
    ).to.equals(
      await calc.calculateRawAmountLpRatio(
        usdcBalance,
        baseWeight,
        quoteWeight,
        xsgdAssimilatorDecimals,
        xsgdBalance,
        INPUT_AMOUNT
      )
    )

    expect(
      await xsgdAssimilatorContract.viewNumeraireAmount(INPUT_AMOUNT),
      'View numeraire amount calculation is incorrect'
    ).to.equals(await calc.calculateNumeraireAmount(INPUT_AMOUNT, xsgdRateFromAssimilator, xsgdAssimilatorDecimals))

    expect(
      await xsgdAssimilatorContract.viewNumeraireBalance(testEnv.vault.address, poolId),
      'View numeraire balance calculation is incorrect'
    ).to.equals(await calc.calculateNumeraireBalance(xsgdBalance, xsgdRateFromAssimilator, xsgdAssimilatorDecimals))

    const { amount_, balance_ } = await xsgdAssimilatorContract.viewNumeraireAmountAndBalance(
      INPUT_AMOUNT,
      testEnv.vault.address,
      poolId
    )

    expect(amount_).to.be.equals(
      await calc.calculateNumeraireAmount(INPUT_AMOUNT, xsgdRateFromAssimilator, xsgdAssimilatorDecimals),
      'amount_ in viewNumeraireAmountAndBalance calculation is incorrect'
    )
    expect(balance_).to.be.equals(
      await calc.calculateNumeraireBalance(xsgdBalance, xsgdRateFromAssimilator, xsgdAssimilatorDecimals),
      'balance_ in viewNumeraireAmountAndBalance calculation is incorrect'
    )

    expect(
      await xsgdAssimilatorContract.viewNumeraireBalanceLPRatio(baseWeight, quoteWeight, testEnv.vault.address, poolId),
      'View Numeraire Balance LP Ratio calculation is incorrect'
    ).to.equals(await calc.calculateNumeraireBalanceLPRatio(usdcBalance, quoteWeight, xsgdBalance, baseWeight))
  })
})

describe('EURS-USD Assimilator Tests', () => {
  let testEnv: TestEnv
  let admin: Signer
  let adminAddress: string
  let calc: ReturnType<typeof calculator>
  let poolId: string
  let fxPool: FXPool
  let sortedAddresses: string[]
  let fxPoolAddress: string

  before('build test env', async () => {
    testEnv = await setupEnvironment()
    ;[admin] = await ethers.getSigners()
    adminAddress = await admin.getAddress()
    calc = calculator(testEnv.mockABDK)

    sortedAddresses = sortAddresses([testEnv.EURS.address, testEnv.USDC.address])

    await testEnv.fxPoolFactory.newFXPool(
      EURSUSDCFxPool.name,
      EURSUSDCFxPool.symbol,
      EURSUSDCFxPool.percentFee,
      testEnv.vault.address,
      sortedAddresses
    )

    fxPoolAddress = await testEnv.fxPoolFactory.getActiveFxPool(sortedAddresses)
    fxPool = await getFxPoolContract(fxPoolAddress, testEnv.proportionalLiquidity.address, testEnv.fxSwaps.address)
    poolId = await fxPool.getPoolId()
    await expect(fxPool.setCollectorAddress(adminAddress)).to.emit(fxPool, 'ChangeCollectorAddress')
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

  it('Deploys eurs assimilators from the assimilator factory', async () => {
    await expect(
      testEnv.assimilatorFactory.newBaseAssimilator(
        testEnv.EURS.address,
        parseUnits('1', `${mockToken[2].decimal}`),
        testEnv.EURSOracle.address
      ),
      'EURS assimilator not created'
    ).to.emit(testEnv.assimilatorFactory, 'NewAssimilator')
  })

  it('Gets newly deployed EURS-USD assimilator from the assimilator factory with immutable params set properly', async () => {
    const eursAssimilatorAddress = await testEnv.assimilatorFactory.getAssimilator(testEnv.EURS.address)
    const usdcAssimilatorAddress = await testEnv.assimilatorFactory.usdcAssimilator()
    expect(eursAssimilatorAddress, 'EURS-USD assimilator not created and returns zero address').to.not.equals(
      ethers.constants.AddressZero
    )

    const eursAssimilatorContract = await getAssimilatorContract(eursAssimilatorAddress)
    const baseWeight = await testEnv.mockABDK.mulu(parseUnits('0.5'), ONE_ETHER) // from ProportionalLiquidity line 106
    const quoteWeight = await testEnv.mockABDK.mulu(parseUnits('0.5'), ONE_ETHER) // from ProportionalLiquidity line 107

    expect(await eursAssimilatorContract.usdc(), 'USDC address incorrect').to.be.equals(testEnv.USDC.address)
    expect(await eursAssimilatorContract.oracle(), 'EURS Oracle address incorrect').to.be.equals(
      testEnv.EURSOracle.address
    )
    expect(await eursAssimilatorContract.baseToken(), 'EURS address incorrect').to.be.equals(testEnv.EURS.address)
    expect(await eursAssimilatorContract.baseDecimals(), 'EURS decimals incorrect').to.be.equals(
      parseUnits('1', `${mockToken[2].decimal}`)
    )

    await fxPool.initialize(
      [
        testEnv.EURS.address,
        eursAssimilatorAddress,
        testEnv.EURS.address,
        eursAssimilatorAddress,
        testEnv.EURS.address,
        testEnv.USDC.address,
        usdcAssimilatorAddress,
        testEnv.USDC.address,
        usdcAssimilatorAddress,
        testEnv.USDC.address,
      ],
      [baseWeight, quoteWeight]
    )
  })

  it('EURS-USD assimilator calculation tests', async () => {
    const eursAssimilatorAddress = await testEnv.assimilatorFactory.getAssimilator(testEnv.EURS.address)
    const eursAssimilatorContract = await getAssimilatorContract(eursAssimilatorAddress)
    const eursRateFromAssimilator = await eursAssimilatorContract.getRate()

    const eursAssimilatorDecimals = await eursAssimilatorContract.baseDecimals()
    const baseWeight = await testEnv.mockABDK.mulu(parseUnits('0.5'), ONE_ETHER) // from ProportionalLiquidity line 106
    const quoteWeight = await testEnv.mockABDK.mulu(parseUnits('0.5'), ONE_ETHER) // from ProportionalLiquidity line 107

    await testEnv.EURS.approve(testEnv.vault.address, ethers.constants.MaxUint256)
    await testEnv.USDC.approve(testEnv.vault.address, ethers.constants.MaxUint256)

    const numeraireAmountsIn = ['10000']

    await simulateDeposit(
      numeraireAmountsIn,
      testEnv.USDC.address,
      testEnv.EURS.address,
      poolId,
      adminAddress,
      testEnv.vault
    )

    const usdcBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)
    const eursBalance = await testEnv.EURS.balanceOf(testEnv.vault.address)

    expect(eursRateFromAssimilator, 'Rate from assimilator is not equal to oracle price').to.equals(
      mockToken[2].mockOraclePrice
    )

    expect(
      await eursAssimilatorContract.viewRawAmount(INPUT_AMOUNT),
      'View raw amount calculation is incorrect'
    ).to.equals(await calc.calculateRawAmount(INPUT_AMOUNT, eursAssimilatorDecimals, eursRateFromAssimilator))

    expect(
      await eursAssimilatorContract.viewRawAmountLPRatio(
        baseWeight,
        quoteWeight,
        INPUT_AMOUNT,
        testEnv.vault.address,
        poolId
      ),
      'View raw amount LP ratio calculation is incorrect'
    ).to.equals(
      await calc.calculateRawAmountLpRatio(
        usdcBalance,
        baseWeight,
        quoteWeight,
        eursAssimilatorDecimals,
        eursBalance,
        INPUT_AMOUNT
      )
    )

    expect(
      await eursAssimilatorContract.viewNumeraireAmount(INPUT_AMOUNT),
      'View numeraire amount calculation is incorrect'
    ).to.equals(await calc.calculateNumeraireAmount(INPUT_AMOUNT, eursRateFromAssimilator, eursAssimilatorDecimals))

    expect(
      await eursAssimilatorContract.viewNumeraireBalance(testEnv.vault.address, poolId),
      'View numeraire balance calculation is incorrect'
    ).to.equals(await calc.calculateNumeraireBalance(eursBalance, eursRateFromAssimilator, eursAssimilatorDecimals))

    const { amount_, balance_ } = await eursAssimilatorContract.viewNumeraireAmountAndBalance(
      INPUT_AMOUNT,
      testEnv.vault.address,
      poolId
    )

    expect(amount_).to.be.equals(
      await calc.calculateNumeraireAmount(INPUT_AMOUNT, eursRateFromAssimilator, eursAssimilatorDecimals),
      'amount_ in viewNumeraireAmountAndBalance calculation is incorrect'
    )
    expect(balance_).to.be.equals(
      await calc.calculateNumeraireBalance(eursBalance, eursRateFromAssimilator, eursAssimilatorDecimals),
      'balance_ in viewNumeraireAmountAndBalance calculation is incorrect'
    )

    expect(
      await eursAssimilatorContract.viewNumeraireBalanceLPRatio(baseWeight, quoteWeight, testEnv.vault.address, poolId),
      'View Numeraire Balance LP Ratio calculation is incorrect'
    ).to.equals(await calc.calculateNumeraireBalanceLPRatio(usdcBalance, quoteWeight, eursBalance, baseWeight))
  })
})

describe('FxPHP-USDC Assimilator and USDC-USD Assimilator tests', () => {
  let testEnv: TestEnv
  let admin: Signer
  let adminAddress: string
  let calc: ReturnType<typeof calculator>
  let poolId: string
  let sortedAddresses: string[]
  let fxPoolAddress: string
  let fxPool: FXPool

  const fxPHPDecimals = mockToken[3].decimal

  before('build test env', async () => {
    testEnv = await setupEnvironment()
    ;[admin] = await ethers.getSigners()
    adminAddress = await admin.getAddress()
    calc = calculator(testEnv.mockABDK)

    sortedAddresses = sortAddresses([testEnv.fxPHP.address, testEnv.USDC.address])

    await testEnv.fxPoolFactory.newFXPool(
      fxPHPUSDCFxPool.name,
      fxPHPUSDCFxPool.symbol,
      fxPHPUSDCFxPool.percentFee,
      testEnv.vault.address,
      sortedAddresses
    )

    fxPoolAddress = await testEnv.fxPoolFactory.getActiveFxPool(sortedAddresses)
    fxPool = await getFxPoolContract(fxPoolAddress, testEnv.proportionalLiquidity.address, testEnv.fxSwaps.address)
    poolId = await fxPool.getPoolId()
    await expect(fxPool.setCollectorAddress(adminAddress)).to.emit(fxPool, 'ChangeCollectorAddress')
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

  it('Deploys fxPHP assimilators from the assimilator factory', async () => {
    await expect(
      testEnv.assimilatorFactory.newBaseAssimilator(
        testEnv.fxPHP.address,
        parseUnits('1', `${mockToken[3].decimal}`),
        testEnv.fxPHPOracle.address
      ),
      'fxPHP assimilator not created'
    ).to.emit(testEnv.assimilatorFactory, 'NewAssimilator')
  })

  it('Gets newly deployed fxPHP-USD assimilator from the assimilator factory with immutable params set properly', async () => {
    const fxPHPAssimilatorAddress = await testEnv.assimilatorFactory.getAssimilator(testEnv.fxPHP.address)
    const usdcAssimilatorAddress = await testEnv.assimilatorFactory.usdcAssimilator()

    expect(fxPHPAssimilatorAddress, 'fxPHP-USD assimilator not created and returns zero address').to.not.equals(
      ethers.constants.AddressZero
    )

    const fxPHPAssimilatorContract = await getAssimilatorContract(fxPHPAssimilatorAddress)
    const baseWeight = await testEnv.mockABDK.mulu(parseUnits('0.5'), ONE_ETHER) // from ProportionalLiquidity line 106
    const quoteWeight = await testEnv.mockABDK.mulu(parseUnits('0.5'), ONE_ETHER) // from ProportionalLiquidity line 107

    expect(await fxPHPAssimilatorContract.usdc(), 'USDC address incorrect').to.be.equals(testEnv.USDC.address)
    expect(await fxPHPAssimilatorContract.oracle(), 'fxPHP Oracle address incorrect').to.be.equals(
      testEnv.fxPHPOracle.address
    )
    expect(await fxPHPAssimilatorContract.baseToken(), 'fxPHP address incorrect').to.be.equals(testEnv.fxPHP.address)
    expect(await fxPHPAssimilatorContract.baseDecimals(), 'fxPHP decimals incorrect').to.be.equals(
      parseUnits('1', `${mockToken[3].decimal}`)
    )

    await fxPool.initialize(
      [
        testEnv.fxPHP.address,
        fxPHPAssimilatorAddress,
        testEnv.fxPHP.address,
        fxPHPAssimilatorAddress,
        testEnv.fxPHP.address,
        testEnv.USDC.address,
        usdcAssimilatorAddress,
        testEnv.USDC.address,
        usdcAssimilatorAddress,
        testEnv.USDC.address,
      ],
      [baseWeight, quoteWeight]
    )
  })

  it('fxPHP-USD assimilator calculation tests', async () => {
    // 1 - assign constants
    const fxPHPAssimilatorAddress = await testEnv.assimilatorFactory.getAssimilator(testEnv.fxPHP.address)
    const fxPHPAssimilatorContract = await getAssimilatorContract(fxPHPAssimilatorAddress)
    const fxPHPRateFromAssimilator = await fxPHPAssimilatorContract.getRate()

    const fxPHPAssimilatorDecimals = await fxPHPAssimilatorContract.baseDecimals()
    const baseWeight = await testEnv.mockABDK.mulu(parseUnits('0.5'), ONE_ETHER) // from ProportionalLiquidity line 106
    const quoteWeight = await testEnv.mockABDK.mulu(parseUnits('0.5'), ONE_ETHER) // from ProportionalLiquidity line 107

    await testEnv.fxPHP.approve(testEnv.vault.address, ethers.constants.MaxUint256)
    await testEnv.USDC.approve(testEnv.vault.address, ethers.constants.MaxUint256)

    // 2 - Simulate Deposit
    const numeraireAmountsIn = ['100000']

    await simulateDeposit(
      numeraireAmountsIn,
      testEnv.USDC.address,
      testEnv.fxPHP.address,
      poolId,
      adminAddress,
      testEnv.vault
    )

    const usdcBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)
    const fxPHPBalance = await testEnv.fxPHP.balanceOf(testEnv.vault.address)

    console.log(`Usdc balance after fxPhp deposit: ${usdcBalance}`)

    // 3 - Check assimilator values
    expect(fxPHPRateFromAssimilator, 'Rate from assimilator is not equal to oracle price').to.equals(
      mockToken[3].mockOraclePrice
    )

    expect(
      await fxPHPAssimilatorContract.viewRawAmount(INPUT_AMOUNT),
      'View raw amount calculation is incorrect'
    ).to.equals(await calc.calculateRawAmount(INPUT_AMOUNT, fxPHPAssimilatorDecimals, fxPHPRateFromAssimilator))

    expect(
      await fxPHPAssimilatorContract.viewRawAmountLPRatio(
        baseWeight,
        quoteWeight,
        INPUT_AMOUNT,
        testEnv.vault.address,
        poolId
      ),
      'View raw amount LP ratio calculation is incorrect'
    ).to.equals(
      await calc.calculateRawAmountLpRatio(
        usdcBalance,
        baseWeight,
        quoteWeight,
        fxPHPAssimilatorDecimals,
        fxPHPBalance,
        INPUT_AMOUNT
      )
    )

    expect(
      await fxPHPAssimilatorContract.viewNumeraireAmount(INPUT_AMOUNT),
      'View numeraire amount calculation is incorrect'
    ).to.equals(await calc.calculateNumeraireAmount(INPUT_AMOUNT, fxPHPRateFromAssimilator, fxPHPAssimilatorDecimals))

    expect(
      await fxPHPAssimilatorContract.viewNumeraireBalance(testEnv.vault.address, poolId),
      'View numeraire balance calculation is incorrect'
    ).to.equals(await calc.calculateNumeraireBalance(fxPHPBalance, fxPHPRateFromAssimilator, fxPHPAssimilatorDecimals))

    const { amount_, balance_ } = await fxPHPAssimilatorContract.viewNumeraireAmountAndBalance(
      INPUT_AMOUNT,
      testEnv.vault.address,
      poolId
    )

    expect(amount_).to.be.equals(
      await calc.calculateNumeraireAmount(INPUT_AMOUNT, fxPHPRateFromAssimilator, fxPHPAssimilatorDecimals),
      'amount_ in viewNumeraireAmountAndBalance calculation is incorrect'
    )
    expect(balance_).to.be.equals(
      await calc.calculateNumeraireBalance(fxPHPBalance, fxPHPRateFromAssimilator, fxPHPAssimilatorDecimals),
      'balance_ in viewNumeraireAmountAndBalance calculation is incorrect'
    )

    expect(
      await fxPHPAssimilatorContract.viewNumeraireBalanceLPRatio(
        baseWeight,
        quoteWeight,
        testEnv.vault.address,
        poolId
      ),
      'View Numeraire Balance LP Ratio calculation is incorrect'
    ).to.equals(await calc.calculateNumeraireBalanceLPRatio(usdcBalance, quoteWeight, fxPHPBalance, baseWeight))
  })

  it('USDC-USD assimilator calculation tests', async () => {
    const USDC_DECIMALS = ONE_TO_THE_SIX // assigning for reference purposes
    const usdcAssimilatorAddress = await testEnv.assimilatorFactory.usdcAssimilator()
    const usdcAssimilatorContract = await getUSDCAssimilatorContract(usdcAssimilatorAddress)
    const usdcRateFromAssimilator = await usdcAssimilatorContract.getRate()
    const usdcBalance = await testEnv.USDC.balanceOf(testEnv.vault.address)

    const baseWeight = await testEnv.mockABDK.mulu(parseUnits('0.5'), ONE_ETHER) // from ProportionalLiquidity line 106
    const quoteWeight = await testEnv.mockABDK.mulu(parseUnits('0.5'), ONE_ETHER) // from ProportionalLiquidity line 107

    expect(usdcRateFromAssimilator).to.equals(mockToken[0].mockOraclePrice)

    expect(
      await usdcAssimilatorContract.viewRawAmount(INPUT_AMOUNT),
      'View raw amount calculation is incorrect'
    ).to.equals(await calc.calculateRawAmount(INPUT_AMOUNT, USDC_DECIMALS, usdcRateFromAssimilator))

    expect(
      await usdcAssimilatorContract.viewRawAmountLPRatio(
        baseWeight,
        quoteWeight,
        INPUT_AMOUNT,
        testEnv.vault.address,
        poolId
      ),
      'View raw amount LP ratio calculation is incorrect'
    ).to.equals(await testEnv.mockABDK.mulu(INPUT_AMOUNT, USDC_DECIMALS))

    expect(
      await usdcAssimilatorContract.viewNumeraireAmount(INPUT_AMOUNT),
      'View numeraire amount calculation is incorrect'
    ).to.equals(await calc.calculateNumeraireAmount(INPUT_AMOUNT, usdcRateFromAssimilator, USDC_DECIMALS))

    expect(
      await usdcAssimilatorContract.viewNumeraireBalance(testEnv.vault.address, poolId),
      'View numeraire balance calculation is incorrect'
    ).to.equals(await calc.calculateNumeraireBalance(usdcBalance, usdcRateFromAssimilator, USDC_DECIMALS))

    const { amount_, balance_ } = await usdcAssimilatorContract.viewNumeraireAmountAndBalance(
      INPUT_AMOUNT,
      testEnv.vault.address,
      poolId
    )

    expect(amount_).to.be.equals(
      await calc.calculateNumeraireAmount(INPUT_AMOUNT, usdcRateFromAssimilator, USDC_DECIMALS),
      'amount_ in viewNumeraireAmountAndBalance calculation is incorrect'
    )
    expect(balance_).to.be.equals(
      await calc.calculateNumeraireBalance(usdcBalance, usdcRateFromAssimilator, USDC_DECIMALS),
      'balance_ in viewNumeraireAmountAndBalance calculation is incorrect'
    )

    expect(
      await usdcAssimilatorContract.viewNumeraireBalanceLPRatio(baseWeight, quoteWeight, testEnv.vault.address, poolId),
      'View Numeraire Balance LP Ratio calculation is incorrect'
    ).to.equals(await calc.calculateNumeraireBalanceLPRatio(usdcBalance, quoteWeight, usdcBalance, baseWeight))
  })
})
