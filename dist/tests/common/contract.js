"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getArtifact = exports.deployedAt = exports.deploy = void 0;
var hardhat_1 = require("hardhat");
var artifacts_1 = require("hardhat/internal/artifacts");
var path_1 = __importDefault(require("path"));
// Deploys a contract, with optional `from` address and arguments.
// Local contracts are deployed by simply passing the contract name, contracts from other packages must be prefixed by
// the package name, without the @balancer-labs scope. Note that the full path is never required.
//
// For example, to deploy Vault.sol from the package that holds its artifacts, use `deploy('Vault')`. To deploy it from
// a different package, use `deploy('v2-vault/Vault')`, assuming the Vault's package is @balancer-labs/v2-vault.
function deploy(contract, _a) {
    var _b = _a === void 0 ? {} : _a, from = _b.from, args = _b.args, libraries = _b.libraries;
    return __awaiter(this, void 0, void 0, function () {
        var artifact, factory, instance;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (!args)
                        args = [];
                    if (!!from) return [3 /*break*/, 2];
                    return [4 /*yield*/, hardhat_1.ethers.getSigners()];
                case 1:
                    from = (_c.sent())[0];
                    _c.label = 2;
                case 2: return [4 /*yield*/, getArtifact(contract)];
                case 3:
                    artifact = _c.sent();
                    if (libraries !== undefined)
                        artifact.bytecode = linkBytecode(artifact, libraries);
                    factory = new hardhat_1.ethers.ContractFactory(artifact.abi, artifact.bytecode, from);
                    return [4 /*yield*/, factory.deploy.apply(factory, args)];
                case 4:
                    instance = _c.sent();
                    return [2 /*return*/, deployedAt(contract, instance.address)];
            }
        });
    });
}
exports.deploy = deploy;
// Creates a contract object for a contract deployed at a known address. The `contract` argument follows the same rules
// as in `deploy`.
function deployedAt(contract, address) {
    return __awaiter(this, void 0, void 0, function () {
        var artifact;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getArtifact(contract)];
                case 1:
                    artifact = _a.sent();
                    return [2 /*return*/, hardhat_1.ethers.getContractAt(artifact.abi, address)];
            }
        });
    });
}
exports.deployedAt = deployedAt;
function getArtifact(contract) {
    return __awaiter(this, void 0, void 0, function () {
        var artifactsPath, packageName, packagePath, artifacts;
        return __generator(this, function (_a) {
            if (!contract.includes('/')) {
                artifactsPath = path_1.default.resolve('./artifacts');
            }
            else {
                packageName = "@balancer-labs/".concat(contract.split('/')[0]);
                packagePath = path_1.default.dirname(require.resolve("".concat(packageName, "/package.json")));
                artifactsPath = "".concat(packagePath, "/artifacts");
            }
            artifacts = new artifacts_1.Artifacts(artifactsPath);
            return [2 /*return*/, artifacts.readArtifact(contract.split('/').slice(-1)[0])];
        });
    });
}
exports.getArtifact = getArtifact;
// From https://github.com/nomiclabs/hardhat/issues/611#issuecomment-638891597, temporary workaround until
// https://github.com/nomiclabs/hardhat/issues/1716 is addressed.
function linkBytecode(artifact, libraries) {
    var bytecode = artifact.bytecode;
    for (var _i = 0, _a = Object.entries(artifact.linkReferences); _i < _a.length; _i++) {
        var _b = _a[_i], fileReferences = _b[1];
        for (var _c = 0, _d = Object.entries(fileReferences); _c < _d.length; _c++) {
            var _e = _d[_c], libName = _e[0], fixups = _e[1];
            var addr = libraries[libName];
            if (addr === undefined) {
                continue;
            }
            for (var _f = 0, fixups_1 = fixups; _f < fixups_1.length; _f++) {
                var fixup = fixups_1[_f];
                bytecode =
                    bytecode.substr(0, 2 + fixup.start * 2) +
                        addr.substr(2) +
                        bytecode.substr(2 + (fixup.start + fixup.length) * 2);
            }
        }
    }
    return bytecode;
}
