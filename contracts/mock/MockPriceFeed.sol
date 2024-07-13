// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

contract MockPriceFeed {
    int256 private latestPrice;
    uint8 private _decimals;

    constructor() {
        _decimals = 18;
    }

    function setLatestPrice(int256 _price) public {
        latestPrice = _price;
    }

    function decimals() public view returns (uint8) {
        return _decimals;
    }

    function latestRoundData()
        public
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (0, latestPrice, block.timestamp, block.timestamp, 0);
    }
}
