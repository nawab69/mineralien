import { expect } from "chai";
import { ethers } from "hardhat";
import { Mineralien } from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("Mineralien", function () {
  let mineralienContract: Mineralien;
  let owner: SignerWithAddress,
    minter: SignerWithAddress,
    otherAccount: SignerWithAddress;

  beforeEach(async function () {
    [owner, minter, otherAccount] = await ethers.getSigners();
    const Mineralien = await ethers.getContractFactory("Mineralien");
    mineralienContract = await Mineralien.deploy(owner.address);
    await mineralienContract.deployed();
  });

  it("Should allow DEFAULT_ADMIN_ROLE to grant MINTER_ROLE", async function () {
    const MINTER_ROLE = await mineralienContract.MINTER_ROLE();
    // Attempt to grant MINTER_ROLE from a non-admin account (should fail)
    await expect(
      mineralienContract
        .connect(otherAccount)
        .grantRole(MINTER_ROLE, minter.address)
    ).to.be.revertedWith("AccessControlUnauthorizedAccount");

    // Grant MINTER_ROLE from the DEFAULT_ADMIN_ROLE (should succeed)
    await mineralienContract.grantRole(MINTER_ROLE, minter.address);

    // Verify that the minter role has been granted
    expect(
      await mineralienContract.hasRole(MINTER_ROLE, minter.address)
    ).to.equal(true);
  });

  describe("Setting URI", function () {
    it("Should set the URI (by DEFAULT_ADMIN_ROLE)", async function () {
      const newURI = "https://api.example.com/nfts/";
      await mineralienContract.setURI(newURI);
      expect(await mineralienContract.uri(0)).to.equal(newURI);
    });

    it("Should not allow setting URI by non-admin", async function () {
      const newURI = "https://my-other-nfts.io/";
      await expect(
        mineralienContract.connect(otherAccount).setURI(newURI)
      ).to.be.revertedWith("AccessControlUnauthorizedAccount");
    });
  });

  describe("Getting URI", function () {
    it("Should return the correct URI after setting", async function () {
      const newURI = "https://api.example.com/minerals/";
      await mineralienContract.setURI(newURI);

      // Test with an arbitrary token ID (adjust if necessary)
      const tokenId = 5;
      expect(await mineralienContract.uri(tokenId)).to.equal(newURI);
    });
  });

  describe("Minting by Minter or Admin", function () {
    beforeEach(async function () {
      const MINTER_ROLE = await mineralienContract.MINTER_ROLE();
      // Grant MINTER_ROLE to the 'minter' account
      await mineralienContract.grantRole(MINTER_ROLE, minter.address);
    });

    it("Should allow minting by MINTER_ROLE", async function () {
      const tokenId = 1;
      const amount = 10;

      await mineralienContract
        .connect(minter)
        .mint(minter.address, tokenId, amount, "0x");

      expect(
        await mineralienContract.balanceOf(minter.address, tokenId)
      ).to.equal(amount);
    });

    it("Should allow minting by DEFAULT_ADMIN_ROLE", async function () {
      const tokenId = 2;
      const amount = 5;

      await mineralienContract.mint(
        otherAccount.address,
        tokenId,
        amount,
        "0x"
      );

      expect(
        await mineralienContract.balanceOf(otherAccount.address, tokenId)
      ).to.equal(amount);
    });
  });

  describe("Minting Rejection", function () {
    it("Should not allow minting by non-minter", async function () {
      const tokenId = 3;
      const amount = 1;

      await expect(
        mineralienContract
          .connect(otherAccount)
          .mint(otherAccount.address, tokenId, amount, "0x")
      ).to.be.revertedWith("AccessControlUnauthorizedAccount");
    });
  });

  describe("Minting Batch", function () {
    beforeEach(async function () {
      // Grant MINTER_ROLE to the 'minter' account
      const MINTER_ROLE = await mineralienContract.MINTER_ROLE();
      await mineralienContract.grantRole(MINTER_ROLE, minter.address);
    });

    it("Should allow minting a batch by MINTER_ROLE", async function () {
      const tokenIds = [1, 2, 3];
      const amounts = [5, 10, 3];

      await mineralienContract
        .connect(minter)
        .mintBatch(minter.address, tokenIds, amounts, "0x");

      // Assertions
      for (let i = 0; i < tokenIds.length; i++) {
        expect(
          await mineralienContract.balanceOf(minter.address, tokenIds[i])
        ).to.equal(amounts[i]);
      }
    });
  });

  describe("Total Supply", function () {
    beforeEach(async function () {
      const MINTER_ROLE = await mineralienContract.MINTER_ROLE();
      // Grant MINTER_ROLE to the 'minter' account
      await mineralienContract.grantRole(MINTER_ROLE, minter.address);
    });
    it("Should correctly calculate total supply after minting", async function () {
      // Minting actions
      await mineralienContract
        .connect(minter)
        .mint(minter.address, 1, 10, "0x");
      await mineralienContract
        .connect(minter)
        .mint(otherAccount.address, 2, 5, "0x");
      await mineralienContract
        .connect(minter)
        .mint(minter.address, 3, 20, "0x");

      // Assertion
      const totalSupply = await mineralienContract["totalSupply(uint256)"](1); // Check total supply for Token ID 1 (You can test other valid Token IDs as well)
      expect(totalSupply).to.equal(10);
    });
  });

  describe("Burning", function () {
    beforeEach(async function () {
      const MINTER_ROLE = await mineralienContract.MINTER_ROLE();
      // Grant MINTER_ROLE to the 'minter' account
      await mineralienContract.grantRole(MINTER_ROLE, minter.address);
    });

    it("Should allow burning by token holder (single token)", async function () {
      const tokenId = 1;
      const burnAmount = 3;

      // Mint tokens to the account
      await mineralienContract
        .connect(minter)
        .mint(otherAccount.address, tokenId, 10, "0x");

      // Initial balance check
      expect(
        await mineralienContract.balanceOf(otherAccount.address, tokenId)
      ).to.equal(10);

      // Burning
      await mineralienContract
        .connect(otherAccount)
        .burn(otherAccount.address, tokenId, burnAmount);

      // Balance check after burning
      expect(
        await mineralienContract.balanceOf(otherAccount.address, tokenId)
      ).to.equal(10 - burnAmount);
    });

    it("Should allow burning by token holder (batch)", async function () {
      const tokenIds = [1, 2];
      const amounts = [2, 5];

      await mineralienContract
        .connect(minter)
        .mintBatch(otherAccount.address, tokenIds, amounts, "0x");

      // (Mint tokens - adjust as needed)

      await mineralienContract
        .connect(otherAccount)
        .burnBatch(otherAccount.address, tokenIds, amounts);

      expect(
        await mineralienContract.balanceOf(otherAccount.address, 1)
      ).to.equal(0);
      expect(
        await mineralienContract.balanceOf(otherAccount.address, 2)
      ).to.equal(0);
    });

    it("Should allow burning by approved operator", async function () {
      const operator = otherAccount; // Adjust as needed
      const tokenId = 1;
      const burnAmount = 3;

      // (Mint tokens - adjust as needed)

      await mineralienContract
        .connect(minter)
        .mint(minter.address, tokenId, 10, "0x");

      // Approve operator

      const tx = await mineralienContract
        .connect(minter)
        .setApprovalForAll(operator.address, true);

      await tx.wait();

      await mineralienContract
        .connect(operator)
        .burn(minter.address, tokenId, burnAmount);
    });

    it("Should not allow burning with insufficient balance", async function () {
      await expect(
        mineralienContract
          .connect(otherAccount)
          .burn(otherAccount.address, 1, 10)
      ).to.be.reverted;
    });
  });
});
