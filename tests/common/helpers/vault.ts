import * as ethersRef from 'ethers'

export const buildAndSend = async (
  single_swap_function: any,
  chain_id: string,
  vaultAddress: string,
  gas_price: string,
  provider: ethersRef.ethers.providers.JsonRpcProvider,
  address: string
) => {
  var gas_estimate
  try {
    gas_estimate = await single_swap_function.estimateGas()
    console.log('gas_estimate:', gas_estimate)
  } catch (err) {
    gas_estimate = 100000
    console.log('Failed to estimate gas, attempting to send with', gas_estimate, 'gas limit...')
  }

  const tx_object = {
    chainId: chain_id,
    gas: ethersRef.ethers.utils.hexValue(gas_estimate.toString()),
    gasPrice: ethersRef.ethers.utils.hexValue(ethersRef.ethers.utils.parseUnits(gas_price, 'gwei')),
    nonce: await provider.getTransactionCount(address),
    data: single_swap_function.encodeABI(),
    to: vaultAddress,
  }

  const tx = new Tx()
  const signed_tx = await web3.eth.accounts
    .signTransaction(tx_object, private_key)
    .then((signed_tx) => web3.eth.sendSignedTransaction(signed_tx['rawTransaction']))
  console.log('Sending transaction...')
  const tx_hash = signed_tx['logs'][0]['transactionHash']
  const url = block_explorer_url + 'tx/' + tx_hash
  open(url)
}
