import ethers, { Contract } from 'ethers'

export default async (contract: Contract, constructorArgs: any[]) => {
  const contractBytecode = contract.bytecode

  const encodedContructorArgs = await contract.interface.encodeDeploy(constructorArgs)
  console.log('ethers:', ethers)
  const bytecodePlusEncodedArgs = ethers.utils.hexConcat([contractBytecode, encodedContructorArgs])

  return bytecodePlusEncodedArgs
}