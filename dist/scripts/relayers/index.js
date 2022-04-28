"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var deployDepositRelayer_1 = __importDefault(require("./deployDepositRelayer"));
exports.default = (function () {
    task('deploy-deposit-relayer', 'Deploy Deposit Relayer')
        .setAction(deployDepositRelayer_1.default);
});
