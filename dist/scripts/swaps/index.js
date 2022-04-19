"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var singleSwap_1 = __importDefault(require("./singleSwap"));
exports.default = (function () {
    task('single-swap', 'Single Swap')
        .addParam('to', 'Network to deploy Pool')
        .addParam('pool', 'Pool to add liquidity')
        .addParam('kind', 'Kind of swap')
        .addParam('basetoken', 'Base Token of swap')
        .addParam('quotetoken', 'Quote token of swap')
        .addParam('amount', 'Amount to swap')
        .addParam('frominternalbalance', 'Add liquidity from vault internal balance')
        .addParam('tointernalbalance', 'Remove liquidity send to vault internal balance')
        .addParam('limit', 'The minimum amount of tokens we would accept to receive/send')
        .addParam('deadline', 'The UNIX timestamp at which our trade must be completed by')
        .setAction(singleSwap_1.default);
});
