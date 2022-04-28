"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fxPHPUSDCFxPool = exports.XSGDUSDCFxPool = void 0;
var utils_1 = require("ethers/lib/utils");
exports.XSGDUSDCFxPool = {
    assetWeights: ['0.5', '0.5'],
    unitSeconds: '1000',
    percentFee: '1000',
    name: 'HALO XSGDUSDC FXPool',
    symbol: 'HFX-XSGDUSDC', // LP token symbol
};
exports.fxPHPUSDCFxPool = {
    assetWeights: [(0, utils_1.parseUnits)('0.5'), (0, utils_1.parseUnits)('0.5')],
    // expiration: '1000', //UNIX
    unitSeconds: (0, utils_1.parseUnits)('100'),
    percentFee: (0, utils_1.parseUnits)('1'),
    name: 'HALO fxPHPUSDC FXPool',
    symbol: 'HFX-fxPHPUSDC', // LP token symbol
};
