"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONTRACT_REVERT = exports.ONE_ETHER = exports.ONE_TO_THE_SIX = exports.ONE_TO_THE_SIX_NUM = exports.ONE_TO_THE_EIGHT = exports.ONE_TO_THE_EIGHT_NUM = exports.INTIAL_MINT = exports.MAX_WEIGHTED_TOKENS = exports.MAX_GAS_LIMIT = exports.MAX_INT256 = exports.MAX_INT53 = exports.MIN_INT53 = exports.MAX_INT22 = exports.MIN_INT22 = exports.MAX_UINT64 = exports.MAX_UINT32 = exports.MAX_UINT31 = exports.MAX_UINT10 = exports.MAX_UINT112 = exports.MAX_UINT256 = exports.mockBalancerVaultValues = void 0;
var ethers_1 = require("ethers");
var utils_1 = require("ethers/lib/utils");
var numbers_1 = require("../common/v2-helpers/numbers");
// reference: https://etherscan.io/address/0xba12222222228d8ba445958a75a0704d566bf2c8
exports.mockBalancerVaultValues = {
    pauseWindowEndTime: 100,
    bufferPeriodEndTime: 100,
};
exports.MAX_UINT256 = (0, numbers_1.maxUint)(256);
exports.MAX_UINT112 = (0, numbers_1.maxUint)(112);
exports.MAX_UINT10 = (0, numbers_1.maxUint)(10);
exports.MAX_UINT31 = (0, numbers_1.maxUint)(31);
exports.MAX_UINT32 = (0, numbers_1.maxUint)(32);
exports.MAX_UINT64 = (0, numbers_1.maxUint)(64);
exports.MIN_INT22 = (0, numbers_1.minInt)(22);
exports.MAX_INT22 = (0, numbers_1.maxInt)(22);
exports.MIN_INT53 = (0, numbers_1.minInt)(53);
exports.MAX_INT53 = (0, numbers_1.maxInt)(53);
exports.MAX_INT256 = (0, numbers_1.maxInt)(256);
exports.MAX_GAS_LIMIT = 8e6;
exports.MAX_WEIGHTED_TOKENS = 100;
exports.INTIAL_MINT = '1000000';
exports.ONE_TO_THE_EIGHT_NUM = 100000000;
exports.ONE_TO_THE_EIGHT = ethers_1.BigNumber.from("".concat(exports.ONE_TO_THE_EIGHT_NUM));
exports.ONE_TO_THE_SIX_NUM = 1000000;
exports.ONE_TO_THE_SIX = ethers_1.BigNumber.from("".concat(exports.ONE_TO_THE_SIX_NUM));
exports.ONE_ETHER = (0, utils_1.parseEther)('1');
var CONTRACT_REVERT;
(function (CONTRACT_REVERT) {
    CONTRACT_REVERT["Ownable"] = "Ownable: caller is not the owner";
})(CONTRACT_REVERT = exports.CONTRACT_REVERT || (exports.CONTRACT_REVERT = {}));
