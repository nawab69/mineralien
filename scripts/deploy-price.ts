import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying the contracts with the account: ${deployer.address}`);

  const CommodityPriceContract = await ethers.getContractFactory(
    "CommodityPriceContract"
  );

  const commodityPriceContract = await CommodityPriceContract.deploy();

  console.log(
    `CommodityPriceContract address: ${commodityPriceContract.address}`
  );

  await commodityPriceContract.deployed();

  console.log("CommodityPriceContract deployed successfully");

  const priceFeedAddresses = {
    GOLD: "0xC5981F461d74c46eB4b0CF3f4Ec79f025573B0Ea",
  };

  await commodityPriceContract.addOrUpdateTokenInfo(
    "GOLD",
    priceFeedAddresses.GOLD
  );

  console.log("Added GOLD token info");
}

main();
