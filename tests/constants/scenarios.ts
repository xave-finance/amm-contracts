import { BigNumberish } from 'ethers'
import { parseUnits } from 'ethers/lib/utils'
import { TokenSymbol } from './mockTokenList'

export const enum TransactionType {
  deposit = 'deposit',
  withdraw = 'withdraw',
  singleSwap = 'singleSwap',
  batchSwap = 'batchSwap',
}

export type DepositTestCase = {
  caseNo: string
  description: string
  type: TransactionType
  inputA: BigNumberish
  inputACurrency: TokenSymbol
  inputB: BigNumberish
  inputBCurrency: TokenSymbol
  expectedTotalNumberOfShells: BigNumberish
  expectedReservesA: BigNumberish
  expectedReservesB: BigNumberish
}

export const depositTestCases: DepositTestCase[] = [
  {
    caseNo: '1',
    description: 'Depositing 2000 USDC and 102727.4128 fxPHP to pool with no reserve',
    type: TransactionType.deposit,
    inputA: '2000',
    inputACurrency: TokenSymbol.USDC,
    inputB: '102727.412810108377621038',
    inputBCurrency: TokenSymbol.fxPHP,
    expectedTotalNumberOfShells: '4000',
    expectedReservesA: parseUnits('2', 21),
    expectedReservesB: parseUnits('2', 21),
  },
  {
    caseNo: '2',
    description: 'Depositing 4000 USD (50:50 ratio)',
    type: TransactionType.deposit,
    inputA: '2000',
    inputACurrency: TokenSymbol.USDC,
    inputB: '102727.412810108377621038',
    inputBCurrency: TokenSymbol.fxPHP,
    expectedTotalNumberOfShells: '4000',
    expectedReservesA: parseUnits('2', 21),
    expectedReservesB: parseUnits('2', 21),
  },
  {
    caseNo: '4',
    description: 'Depositing 4000 USD worth to pool with some reserve (imbalanced ratio)',
    type: TransactionType.deposit,
    inputA: '2000',
    inputACurrency: TokenSymbol.USDC,
    inputB: '102727.4128',
    inputBCurrency: TokenSymbol.fxPHP,
    expectedTotalNumberOfShells: '4000',
    expectedReservesA: parseUnits('2', 21),
    expectedReservesB: parseUnits('2', 21),
  },
  {
    caseNo: '6',
    description: 'Depositing 4000 USD worth to pool with some reserve (imbalanced ratio)',
    type: TransactionType.deposit,
    inputA: '2000',
    inputACurrency: TokenSymbol.USDC,
    inputB: '102727.4128',
    inputBCurrency: TokenSymbol.fxPHP,
    expectedTotalNumberOfShells: '4000',
    expectedReservesA: parseUnits('2', 21),
    expectedReservesB: parseUnits('2', 21),
  },
]

export const swapTestCases = [
  {
    caseNo: '3',
    description: 'Swapping out 115568.3394 fxphp to USDC pool with some reserve (50:50 ratio)',
    type: TransactionType.singleSwap,
    input: '115568.3394',
    inputCurrency: TokenSymbol.fxPHP,
    output: '0', // TODO: Double check
    outputCurrency: TokenSymbol.USDC,
  },
  {
    caseNo: '5',
    description: 'Swap out 6000USDC for 30,776.67 fxPHP to pool with some reserve (imbalanced ratio)',
    type: TransactionType.singleSwap,
    input: '6000',
    inputCurrency: TokenSymbol.USDC,
    output: '30776.67',
    outputCurrency: TokenSymbol.fxPHP,
  },
  {
    caseNo: '7',
    description: 'Swap 18,351.33 fxPHP to USDC in pool with some reserve (swap back to 50:50 ratio)',
    type: TransactionType.singleSwap,
    input: '18351.33',
    inputCurrency: TokenSymbol.fxPHP,
    output: '0',
    outputCurrency: TokenSymbol.USDC,
  },
]
