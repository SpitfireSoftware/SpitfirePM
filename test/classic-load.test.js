// Classic-load smoke test.
//
// Classic sfPMS pages do not bundle this package. They load the compiled files from dist/
// as plain <script> tags, in a fixed order, sharing one window, one global `exports` object
// and a stub `require` (sfPMS/dscript/npmLoader.js: returns top.$ for "jquery", else `exports`).
// Every file therefore runs in one shared global lexical scope, so a duplicate top-level
// `const`/`class` across files is a SyntaxError and an import of a module that is not in the
// list resolves to `exports` (whatever has been exported so far).
//
// This test reproduces that loader in jsdom and asserts the classic contract still holds.
// NOTE: the file is dist/sfRESTClient.js (case matters on Linux; PageClass.vb spells it sfRestClient.js).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { JSDOM } = require("jsdom");

const distDir = path.join(__dirname, "..", "dist");
const CLASSIC_LOAD_ORDER = [
    "string.extensions.js",
    "APIClientBase.js",
    "SwaggerClients.js",
    "BrowserExtensionChecker.js",
    "sfRESTClient.js",
];
const GENERATED_CLIENT_CLASSES = [
    "AccountClient", "ActionItemsClient", "AlertsClient", "LookupClient", "ARRClient", "CatalogClient",
    "ConfigClient", "ContactClient", "DocumentToolsClient", "ExcelToolsClient", "ProjectToolsClient",
    "ProjectDocListClient", "ProjectKPIClient", "ProjectTeamClient", "ProjectsClient", "SessionClient",
    "SystemClient", "UICFGClient", "XTSClient",
];

function makeClassicWindow() {
    const dom = new JSDOM("<!DOCTYPE html><html><head><title></title></head><body><form id='Form1'></form></body></html>", {
        url: "https://classic.example.test/sfPMS/Dashboard.aspx",
        runScripts: "outside-only",
        pretendToBeVisual: true,
    });
    const window = dom.window;
    const context = dom.getInternalVMContext();
    // jQuery first, exactly as the classic page does (sets window.jQuery and window.$ by assignment)
    const jquerySrc = fs.readFileSync(require.resolve("jquery/dist/jquery.js"), "utf8");
    new vm.Script(jquerySrc, { filename: "jquery.js" }).runInContext(context);
    assert.equal(typeof window.$, "function", "jQuery did not load into the jsdom window");
    // the npmLoader.js stub
    window.exports = {};
    window.require = function stubRequire(moduleName) {
        if (moduleName === "jquery") return window.$;
        return window.exports;
    };
    return { dom, window, context };
}

function loadClassicFiles(context, files) {
    for (const file of files) {
        const fullPath = path.join(distDir, file);
        assert.ok(fs.existsSync(fullPath), `${file} is missing from dist/ (run npm run build first)`);
        const src = fs.readFileSync(fullPath, "utf8");
        // one vm.Script per file == one <script> tag per file: shared global lexical scope
        new vm.Script(src, { filename: file }).runInContext(context);
    }
}

test("classic page loads the five dist files in order without a parse or redeclaration error", () => {
    const { context } = makeClassicWindow();
    assert.doesNotThrow(() => loadClassicFiles(context, CLASSIC_LOAD_ORDER));
});

test("classic page sees exports.sfRestClient and every generated client class", () => {
    const { window, context } = makeClassicWindow();
    loadClassicFiles(context, CLASSIC_LOAD_ORDER);
    const exported = window.exports;
    assert.equal(typeof exported.sfRestClient, "function", "exports.sfRestClient missing");
    assert.equal(typeof exported.ApiException, "function", "exports.ApiException missing");
    for (const className of GENERATED_CLIENT_CLASSES) {
        assert.equal(typeof exported[className], "function", `exports.${className} missing`);
    }
    // the string/date prototype extensions must be installed on the page's realm
    assert.equal("a{0}c".sfFormat === undefined, true, "test realm must not be polluted");
    assert.equal(window.eval('"a{0}c".sfFormat("b")'), "abc");
    assert.equal(window.eval('typeof window.__HTTPApplicationName'), "function");
});

test("a generated client can be constructed on a classic page and resolves the site URL", () => {
    const { window, context } = makeClassicWindow();
    loadClassicFiles(context, CLASSIC_LOAD_ORDER);
    const client = new window.exports.SessionClient();
    assert.equal(window.exports.APIClientBase._SiteURL, "https://classic.example.test/sfPMS");
    assert.ok(client instanceof window.exports.APIClientBase);
});
