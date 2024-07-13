// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

contract CommodityPriceContract is Ownable, Pausable {
    struct CommodityToken {
        string name;
        uint256 price;
        uint8 decimals; // Store decimals to handle price precision
        uint256 expired; // Timestamp for when price becomes outdated
        address priceFeedAddress; // Address of the Chainlink Price Feed contract
        uint256 lastFetched; // Timestamp of last price update
    }

    mapping(string => CommodityToken) public tokenInfo;

    event PriceUpdated(string indexed tokenName, uint256 newPrice);
    event TokenAdded(string indexed tokenName, address priceFeed);

    constructor() Ownable(msg.sender) {}

    function addOrUpdateTokenInfo(
        string memory tokenName,
        address _priceFeedAddress
    ) public onlyOwner {
        require(_priceFeedAddress != address(0), "Invalid price feed address");

        // Fetch decimals when adding a new token
        uint8 decimals = AggregatorV3Interface(_priceFeedAddress).decimals();
        tokenInfo[tokenName] = CommodityToken({
            name: tokenName,
            price: 0, // Initial price is set to 0
            decimals: decimals,
            expired: block.timestamp + 86400, // 24 hour expiry by default
            priceFeedAddress: _priceFeedAddress,
            lastFetched: 0 // Indicate no price fetched yet
        });
        emit TokenAdded(tokenName, _priceFeedAddress);
    }

    function fetchPrice(string memory tokenName) public whenNotPaused {
        CommodityToken storage token = tokenInfo[tokenName];
        require(token.priceFeedAddress != address(0), "Token not found");

        AggregatorV3Interface priceFeed = AggregatorV3Interface(
            token.priceFeedAddress
        );

        (, int256 price, , uint256 updatedAt, ) = priceFeed.latestRoundData();
        require(price >= 0, "Invalid price from Chainlink oracle");

        // Scale price to the correct number of decimals
        uint256 adjustedPrice = uint256(price) * (10 ** (18 - token.decimals));
        token.price = adjustedPrice;
        token.lastFetched = updatedAt;
        token.expired = block.timestamp + 86400;

        emit PriceUpdated(tokenName, adjustedPrice);
    }

    function updatePriceManually(
        string memory tokenName,
        uint256 newPrice
    ) public onlyOwner {
        require(
            tokenInfo[tokenName].priceFeedAddress != address(0),
            "Token not found"
        );

        CommodityToken storage token = tokenInfo[tokenName];
        token.price = newPrice * (10 ** (18 - token.decimals));
        token.expired = block.timestamp + 86400;
        emit PriceUpdated(tokenName, token.price);
    }

    function getPrice(string memory tokenName) public view returns (uint256) {
        require(
            tokenInfo[tokenName].priceFeedAddress != address(0),
            "Token not found"
        );
        return tokenInfo[tokenName].price;
    }

    function getLastFetched(
        string memory tokenName
    ) public view returns (uint256) {
        require(
            tokenInfo[tokenName].priceFeedAddress != address(0),
            "Token not found"
        );
        return tokenInfo[tokenName].lastFetched;
    }

    function getExpiryTime(
        string memory tokenName
    ) public view returns (uint256) {
        require(
            tokenInfo[tokenName].priceFeedAddress != address(0),
            "Token not found"
        );
        return tokenInfo[tokenName].expired;
    }

    function isPriceValid(string memory tokenName) public view returns (bool) {
        require(
            tokenInfo[tokenName].priceFeedAddress != address(0),
            "Token not found"
        );
        return block.timestamp <= tokenInfo[tokenName].expired;
    }

    function getValidPrice(
        string memory tokenName
    ) public view returns (uint256) {
        require(
            tokenInfo[tokenName].priceFeedAddress != address(0),
            "Token not found"
        );
        require(
            block.timestamp <= tokenInfo[tokenName].expired,
            "Price has expired"
        );
        return tokenInfo[tokenName].price;
    }
}
