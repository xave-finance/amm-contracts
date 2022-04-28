"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sortTokenAddressesLikeVault = void 0;
var sortTokenAddressesLikeVault = function (addresses, baseTokenAddress, viewDepositData) {
    var liquidityToAdd;
    if (addresses[0] === baseTokenAddress) {
        liquidityToAdd = [viewDepositData.deposits[0], viewDepositData.deposits[1]];
    }
    else if (addresses[1] === baseTokenAddress) {
        liquidityToAdd = [viewDepositData.deposits[1], viewDepositData.deposits[0]];
    }
    else {
        throw console.error('sortTokensLikeVault: addresses[0] or addresses[1] is not expected');
    }
    return liquidityToAdd;
};
exports.sortTokenAddressesLikeVault = sortTokenAddressesLikeVault;
