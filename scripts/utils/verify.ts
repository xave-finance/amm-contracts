
export default async (hre: any, address: string, constructorArguments: any) => {
  await hre.run('verify:verify', {
    address,
    constructorArguments
  })
}