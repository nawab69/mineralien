import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  CommodityPriceContract,
  CommodityPriceContract__factory,
  MockPriceFeed,
} from "../typechain";

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CommodityPriceContract", function () {
  let CommodityPriceContract: CommodityPriceContract__factory,
    commodityPriceContract: CommodityPriceContract;
  let owner: SignerWithAddress, addr1: SignerWithAddress;
  let mockPriceFeed: MockPriceFeed;

  before(async function () {
    [owner, addr1] = await ethers.getSigners();

    // Deploy a mock price feed
    const MockPriceFeed = await ethers.getContractFactory("MockPriceFeed");
    mockPriceFeed = await MockPriceFeed.deploy();
    await mockPriceFeed.deployed();

    // Deploy the CommodityPriceContract
    CommodityPriceContract = await ethers.getContractFactory(
      "CommodityPriceContract"
    );
    commodityPriceContract = await CommodityPriceContract.deploy();
    await commodityPriceContract.deployed();
  });

  describe("Token Management", function () {
    it("Should add a new token", async function () {
      await commodityPriceContract.addOrUpdateTokenInfo(
        "Gold",
        mockPriceFeed.address
      );

      const token = await commodityPriceContract.tokenInfo("Gold");
      expect(token.name).to.equal("Gold");
      expect(token.price).to.equal(0);
      expect(token.priceFeedAddress).to.equal(mockPriceFeed.address);
    });

    it("Should update token information", async function () {
      await commodityPriceContract.addOrUpdateTokenInfo(
        "Gold",
        mockPriceFeed.address
      );

      const token = await commodityPriceContract.tokenInfo("Gold");
      expect(token.price).to.equal(0);
    });
  });

  describe("Fetching Prices", function () {
    it("Should fetch and update the price", async function () {
      await commodityPriceContract.addOrUpdateTokenInfo(
        "Gold",
        mockPriceFeed.address
      );

      await mockPriceFeed.setLatestPrice(2000); // Set price in mock price feed

      await commodityPriceContract.fetchPrice("Gold");

      const token = await commodityPriceContract.tokenInfo("Gold");
      expect(token.price).to.equal(2000);
    });

    it("Should update the last fetched timestamp", async function () {
      await commodityPriceContract.addOrUpdateTokenInfo(
        "Gold",
        mockPriceFeed.address
      );

      await mockPriceFeed.setLatestPrice(2000); // Set price in mock price feed

      await commodityPriceContract.fetchPrice("Gold");

      const token = await commodityPriceContract.tokenInfo("Gold");
      const blockTimestamp = (await ethers.provider.getBlock("latest"))
        .timestamp;

      expect(
        Math.abs(token.lastFetched.toNumber() - blockTimestamp)
      ).to.be.lessThan(5);
    });
  });

  describe("Manual Price Updates", function () {
    it("Should allow the owner to update the price manually", async function () {
      await commodityPriceContract.addOrUpdateTokenInfo(
        "Gold",
        mockPriceFeed.address
      );

      await commodityPriceContract.updatePriceManually("Gold", 3000);

      const token = await commodityPriceContract.tokenInfo("Gold");
      expect(token.price).to.equal(3000);
    });

    it("Should not allow non-owners to update the price manually", async function () {
      await commodityPriceContract.addOrUpdateTokenInfo(
        "Gold",
        mockPriceFeed.address
      );

      await expect(
        commodityPriceContract.connect(addr1).updatePriceManually("Gold", 3000)
      ).to.be.revertedWith("OwnableUnauthorizedAccount");
    });
  });

  describe("Price Validity", function () {
    it("Should return true if price is valid", async function () {
      await commodityPriceContract.addOrUpdateTokenInfo(
        "Gold",
        mockPriceFeed.address
      );

      await commodityPriceContract.fetchPrice("Gold");

      expect(await commodityPriceContract.isPriceValid("Gold")).to.be.true;
    });

    it("Should return false if price is expired", async function () {
      await commodityPriceContract.addOrUpdateTokenInfo(
        "Gold",
        mockPriceFeed.address
      );

      await commodityPriceContract.fetchPrice("Gold");

      // Fast forward time beyond the expiry time
      await ethers.provider.send("evm_increaseTime", [86401]);
      await ethers.provider.send("evm_mine");

      expect(await commodityPriceContract.isPriceValid("Gold")).to.be.false;
    });
  });

  describe("Get Valid Price", function () {
    it("Should return the price if it is valid", async function () {
      await commodityPriceContract.addOrUpdateTokenInfo(
        "Gold",
        mockPriceFeed.address
      );
      await mockPriceFeed.setLatestPrice(2000);
      await commodityPriceContract.fetchPrice("Gold");

      const price = await commodityPriceContract.getValidPrice("Gold");
      expect(price).to.equal(2000);
    });

    it("Should throw an error if the price is expired", async function () {
      await commodityPriceContract.addOrUpdateTokenInfo(
        "Gold",
        mockPriceFeed.address
      );
      await mockPriceFeed.setLatestPrice(2000);
      await commodityPriceContract.fetchPrice("Gold");

      // Fast forward time beyond the expiry time
      await ethers.provider.send("evm_increaseTime", [86401]);
      await ethers.provider.send("evm_mine");

      await expect(
        commodityPriceContract.getValidPrice("Gold")
      ).to.be.revertedWith("Price has expired");
    });
  });
});
