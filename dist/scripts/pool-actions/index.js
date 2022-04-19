"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var deployFxPool_1 = __importDefault(require("./deployFxPool"));
var addLiquidity_1 = __importDefault(require("./addLiquidity"));
var removeLiquidity_1 = __importDefault(require("./removeLiquidity"));
exports.default = (function () {
    // task('deploy-pool', 'Deploy custom pool')
    //   .addParam('to', 'Network to deploy Pool')
    //   .addParam('strategy', 'Strategy of deployment')
    //   .addParam('force', 'Force deploy tx')
    //   .addParam('verify', 'Verify deployed contracts')
    //   .addOptionalParam('basetoken', 'Base Token of Pool')
    //   .addOptionalParam('quotetoken', 'Quote token of Pool')
    //   .addOptionalParam('baseassimilator', 'Base assimilator')
    //   .addOptionalParam('quoteassimilator', 'Quote assimilator')
    //   .addOptionalParam('proportionalliquidity', 'Proportional Liquidity contract address')
    //   .addOptionalParam('swaps', 'Swaps contract address')
    //   .setAction(DeployPool)
    task('deploy-fx-pool', 'Deploy an FX-accurate pool')
        .addParam('to', 'Network to deploy Pool')
        .addParam('basetoken', 'Base token for the pool')
        .addOptionalParam('fresh', 'Deploy a new AssimilatorFactory?')
        .setAction(deployFxPool_1.default);
    task('add-liquidity', 'Add liquidity to custom balancer pool')
        .addParam('to', 'Network to deploy Pool')
        .addParam('poolid', 'Pool to add liquidity')
        .addParam('basetoken', 'Base Token of Pool')
        .addParam('quotetoken', 'Quote token of Pool')
        .addParam('baseamount', 'Amount to add on base token side')
        .addParam('quoteamount', 'Amount to add on quote token side')
        .addParam('frominternalbalance', 'Add liquidity from vault internal balance')
        .setAction(addLiquidity_1.default);
    task('remove-liquidity', 'Remove liquidity from custom balancer pool')
        .addParam('to', 'Network to deploy Pool')
        .addParam('pooladdress', 'Pool to remove liquidity from (address)')
        .addParam('poolid', 'Pool to remove liquidity from (vault pool id)')
        .addParam('basetoken', 'Base Token of Pool')
        .addParam('quotetoken', 'Quote token of Pool')
        .addParam('lptamount', 'Amount of LPT to withdraw')
        .addParam('tointernalbalance', 'Remove liquidity send to vault internal balance')
        .setAction(removeLiquidity_1.default);
});
