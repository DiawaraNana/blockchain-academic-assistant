import "@nomicfoundation/hardhat-toolbox";

const config = {
  solidity: "0.8.20",
  defaultNetwork: "hardhat",
  paths: {
    sources: "./contracts",
    tests:   "./test",
    cache:   "./cache",
    artifacts: "./artifacts"
  }
};

export default config;