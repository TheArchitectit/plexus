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
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
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
Object.defineProperty(exports, "__esModule", { value: true });
var bun_1 = require("bun");
var node_readline_1 = require("node:readline");
var promises_1 = require("node:fs/promises");
var node_fs_1 = require("node:fs");
var genai_1 = require("@google/genai");
var rl = (0, node_readline_1.createInterface)({
    input: process.stdin,
    output: process.stdout,
});
var ask = function (query, defaultVal) {
    var promptText = defaultVal ? "".concat(query, " (").concat(defaultVal, "): ") : "".concat(query, ": ");
    return new Promise(function (resolve) {
        rl.question(promptText, function (answer) {
            resolve(answer.trim() || defaultVal || "");
        });
    });
};
function run(cmd) {
    return __awaiter(this, void 0, void 0, function () {
        var proc, text, err, exitCode;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    proc = (0, bun_1.spawn)(cmd, { stdout: "pipe", stderr: "pipe" });
                    return [4 /*yield*/, new Response(proc.stdout).text()];
                case 1:
                    text = _a.sent();
                    return [4 /*yield*/, new Response(proc.stderr).text()];
                case 2:
                    err = _a.sent();
                    return [4 /*yield*/, proc.exited];
                case 3:
                    exitCode = _a.sent();
                    if (exitCode !== 0) {
                        throw new Error("Command failed: ".concat(cmd.join(" "), "\n").concat(err));
                    }
                    return [2 /*return*/, text.trim()];
            }
        });
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var currentVersion, tags, sortedTags, e_1, nextVersion, match, version, aiNotes, apiKey, useAi, logRange, gitLog, client, response, error_1, headline, notes, choice, changelogPath, date, newEntry, currentChangelog, newContent, header, e_2;
        var _a, _b, _c, _d, _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    console.log("🚀 Starting Release Process...");
                    currentVersion = "v0.0.0";
                    _f.label = 1;
                case 1:
                    _f.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, run(["git", "tag", "--list", "v*"])];
                case 2:
                    tags = _f.sent();
                    sortedTags = tags.split("\n").filter(Boolean).sort(function (a, b) {
                        return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
                    });
                    if (sortedTags.length > 0) {
                        currentVersion = sortedTags[sortedTags.length - 1];
                    }
                    return [3 /*break*/, 4];
                case 3:
                    e_1 = _f.sent();
                    return [3 /*break*/, 4];
                case 4:
                    nextVersion = currentVersion;
                    match = currentVersion.match(/^v(\d+)\.(\d+)\.(\d+)$/);
                    if (match) {
                        nextVersion = "v".concat(match[1], ".").concat(match[2], ".").concat(parseInt(match[3]) + 1);
                    }
                    else {
                        nextVersion = "v0.0.1";
                    }
                    return [4 /*yield*/, ask("Version", nextVersion)];
                case 5:
                    version = _f.sent();
                    aiNotes = "";
                    apiKey = process.env.GEMINI_API_KEY;
                    if (!apiKey) return [3 /*break*/, 11];
                    return [4 /*yield*/, ask("Generate Release Notes with AI? (y/N)", "y")];
                case 6:
                    useAi = _f.sent();
                    if (!(useAi.toLowerCase() === "y")) return [3 /*break*/, 11];
                    _f.label = 7;
                case 7:
                    _f.trys.push([7, 10, , 11]);
                    console.log("🤖 Generating release notes...");
                    logRange = currentVersion === "v0.0.0" ? "HEAD" : "".concat(currentVersion, "..HEAD");
                    return [4 /*yield*/, run(["git", "log", logRange, "--pretty=format:%h %s"])];
                case 8:
                    gitLog = _f.sent();
                    client = new genai_1.GoogleGenAI({
                        apiKey: apiKey,
                        httpOptions: process.env.GEMINI_API_BASE ? { baseUrl: process.env.GEMINI_API_BASE } : undefined
                    });
                    return [4 /*yield*/, client.models.generateContent({
                            model: "gemini-3-flash-preview",
                            contents: "Summarize the following git commit log into release notes. Call out main new features, as well as smaller changes and their commit hashes.\n\n".concat(gitLog),
                        })];
                case 9:
                    response = _f.sent();
                    if ((_e = (_d = (_c = (_b = (_a = response.candidates) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.parts) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.text) {
                        aiNotes = response.candidates[0].content.parts[0].text;
                        console.log("\n🤖 AI Generated Notes:\n" + aiNotes + "\n");
                    }
                    return [3 /*break*/, 11];
                case 10:
                    error_1 = _f.sent();
                    console.error("❌ Failed to generate AI notes:", error_1);
                    return [3 /*break*/, 11];
                case 11: return [4 /*yield*/, ask("Headline")];
                case 12:
                    headline = _f.sent();
                    notes = "";
                    if (!aiNotes) return [3 /*break*/, 14];
                    return [4 /*yield*/, ask("Use generated notes? (Y/n)", "Y")];
                case 13:
                    choice = _f.sent();
                    if (choice.toLowerCase() === "y") {
                        notes = aiNotes;
                    }
                    _f.label = 14;
                case 14:
                    if (!!notes) return [3 /*break*/, 16];
                    return [4 /*yield*/, ask("Release Notes (Markdown supported)")];
                case 15:
                    notes = _f.sent();
                    _f.label = 16;
                case 16:
                    rl.close();
                    changelogPath = "CHANGELOG.md";
                    date = new Date().toISOString().split("T")[0];
                    newEntry = "## ".concat(version, " - ").concat(date, "\n\n### ").concat(headline, "\n\n").concat(notes, "\n\n");
                    currentChangelog = "";
                    if (!(0, node_fs_1.existsSync)(changelogPath)) return [3 /*break*/, 18];
                    return [4 /*yield*/, (0, promises_1.readFile)(changelogPath, "utf-8")];
                case 17:
                    currentChangelog = _f.sent();
                    return [3 /*break*/, 19];
                case 18:
                    currentChangelog = "# Changelog\n\n";
                    _f.label = 19;
                case 19:
                    newContent = "";
                    header = "# Changelog\n\n";
                    if (currentChangelog.startsWith(header)) {
                        newContent = header + newEntry + currentChangelog.substring(header.length);
                    }
                    else if (currentChangelog.startsWith("# Changelog")) {
                        // Handle case where maybe there's only one newline
                        newContent = currentChangelog.replace("# Changelog", "# Changelog\n\n" + newEntry);
                    }
                    else {
                        newContent = header + newEntry + currentChangelog;
                    }
                    // Clean up excessive newlines
                    newContent = newContent.replace(/\n{3,}/g, "\n\n");
                    return [4 /*yield*/, (0, promises_1.writeFile)(changelogPath, newContent)];
                case 20:
                    _f.sent();
                    console.log("\n\u2705 Updated ".concat(changelogPath));
                    // 4. Git Operations
                    console.log("\n📦 Performing Git operations...");
                    _f.label = 21;
                case 21:
                    _f.trys.push([21, 27, , 28]);
                    return [4 /*yield*/, run(["git", "add", changelogPath])];
                case 22:
                    _f.sent();
                    return [4 /*yield*/, run(["git", "commit", "-m", "chore: release ".concat(version)])];
                case 23:
                    _f.sent();
                    return [4 /*yield*/, run(["git", "tag", version])];
                case 24:
                    _f.sent();
                    console.log("\u2705 Tagged ".concat(version));
                    console.log("⬆️  Pushing changes...");
                    return [4 /*yield*/, run(["git", "push"])];
                case 25:
                    _f.sent();
                    return [4 /*yield*/, run(["git", "push", "--tags"])];
                case 26:
                    _f.sent();
                    console.log("\u2705 Pushed ".concat(version));
                    return [3 /*break*/, 28];
                case 27:
                    e_2 = _f.sent();
                    console.error("❌ Git operation failed:", e_2);
                    process.exit(1);
                    return [3 /*break*/, 28];
                case 28: return [2 /*return*/];
            }
        });
    });
}
main();
