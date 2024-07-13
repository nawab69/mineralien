import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const Token = await ethers.getContractFactory("Mineralien");
  const token = await Token.deploy(deployer.address);
  await token.deployed();

  console.log("Token address:", token.address);

  const tokenIds = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const amounts = [
    9990000000000, 5550000000000, 3210000000000, 1230000000000, 9990000000000,
    5550000000000, 3210000000000, 1230000000000, 9990000000000,
  ];
  await token.mintBatch(deployer.address, tokenIds, amounts, "0x");

  console.log("Minted tokens");

  const uri =
    "https://raw.githubusercontent.com/mineralien/metadata/main/{id}.json";

  await token.setURI(uri);

  console.log("Set URI");
}

main();
