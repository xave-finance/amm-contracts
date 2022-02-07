// import "module-alias/register";

import { Signer } from "ethers";

import { Vault__factory } from '../../typechain/factories/Vault__factory'

import Vault from '@balancer-labs/v2-deployments/deployed/kovan/Vault.json'

export async function deployBalancerVault(signer: Signer, wethAddress: string) {
  const signerAddress = await signer.getAddress();
  const vaultDeployer = new Vault__factory(signer);
  // const vaultContract = await vaultDeployer.deploy(
  //   signerAddress,
  //   wethAddress,
  //   0,
  //   0
  // );

  // await vaultContract.deployed();

  const vaultContract = await vaultDeployer.attach(Vault.address)


  return vaultContract;
}
