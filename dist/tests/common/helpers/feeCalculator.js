"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.incurPoolFee = void 0;
var numbers_1 = require("./numbers");
var incurPoolFee = function (principal, feeRate) {
    var fee = principal.mul(feeRate).div((0, numbers_1.fp)(100));
    return principal.sub(fee);
};
exports.incurPoolFee = incurPoolFee;
