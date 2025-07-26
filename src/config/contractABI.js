const DIAGNOSTIC_TEST_HASH_ABI = [
  {
    type: "function",
    name: "storeHash",
    inputs: [
      { name: "_testId", type: "uint256", internalType: "uint256" },
      { name: "_hash", type: "bytes32", internalType: "bytes32" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "verifyHash",
    inputs: [
      { name: "_testId", type: "uint256", internalType: "uint256" },
      { name: "_hash", type: "bytes32", internalType: "bytes32" },
    ],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getHash",
    inputs: [{ name: "_testId", type: "uint256", internalType: "uint256" }],
    outputs: [{ name: "", type: "bytes32", internalType: "bytes32" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "testHashes",
    inputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    outputs: [{ name: "", type: "bytes32", internalType: "bytes32" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "HashStored",
    inputs: [
      {
        name: "testId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      { name: "hash", type: "bytes32", indexed: true, internalType: "bytes32" },
      {
        name: "submitter",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "timestamp",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "error",
    name: "InvalidHash",
    inputs: [],
  },
  {
    type: "error",
    name: "TestAlreadyExists",
    inputs: [{ name: "testId", type: "uint256", internalType: "uint256" }],
  },
  {
    type: "error",
    name: "TestNotFound",
    inputs: [{ name: "testId", type: "uint256", internalType: "uint256" }],
  },
];

module.exports = {
  DIAGNOSTIC_TEST_HASH_ABI,
};
