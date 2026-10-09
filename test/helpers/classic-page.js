// A classic sfPMS page in jsdom: jQuery, the npmLoader stub require, the five dist files in
// classic order, and a fake fetch that answers from a route table. Used to exercise sfRestClient
// without a server.
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { JSDOM } = require("jsdom");

const distDir = path.join(__dirname, "..", "..", "dist");
const CLASSIC_LOAD_ORDER = ["string.extensions.js", "APIClientBase.js", "SwaggerClients.js", "BrowserExtensionChecker.js", "sfRESTClient.js"];

const WCC = {
    AdminLevel: 0,
    UserKey: "11111111-1111-4111-8111-111111111111",
    LoginSessionKey: "22222222-2222-4222-8222-222222222222",
    SessionID: "session-1",
    SiteID: "SITE1",
    DevMode: false,
    FullName: "Unit Tester",
    Version: "2023.0.9774.21549",
    DataPK: "00000000-0000-0000-0000-000000000000",
    DocTypeKey: "00000000-0000-0000-0000-000000000000",
    dsCacheKey: "1",
};

/** routes answered by the fake fetch unless a test overrides them; order matters, first match wins */
function defaultRoutes() {
    return [
        { match: /\/api\/session\/who/, status: 200, body: WCC },
        { match: /\/api\/session\/recent/, status: 200, body: [] },
        { match: /\/api\/session\/permits\/map/, status: 200, body: { _etag: { "etag-1": 0 }, WORK: { Doc: "ucfk-work-doc" }, PART: { ActionItems: "ucfk-part-ai", ProjectList: "ucfk-part-pl", AlertList: "ucfk-part-al" } } },
        { match: /\/api\/session\/permits\/project\/0$/, status: 200, body: { Project: "0", Permits: { "ucfk-part-ai": [{ IsGlobal: true, ReadOK: true, UpdOK: true }] } } },
        { match: /\/api\/catalog\/icon\/list/, status: 200, body: { _etag: "icons-1", default: "images/OtherFilesIcon.svg", pdf: "images/pdf.svg" } },
        { match: /google-analytics\.com/, status: 204, body: null },
    ];
}

/**
 * @param options.routes extra routes, consulted before the defaults
 * @param options.url page URL (decides the page type)
 */
function loadClassicPage(options = {}) {
    const dom = new JSDOM("<!DOCTYPE html><html><head><title></title></head><body><form id='Form1'></form></body></html>", {
        url: options.url || "https://classic.example.test/sfPMS/Dashboard.aspx",
        runScripts: "outside-only",
        pretendToBeVisual: true,
    });
    const window = dom.window;
    const context = dom.getInternalVMContext();
    const routes = [...(options.routes || []), ...defaultRoutes()];
    const fetchCalls = [];

    // the browser globals jsdom does not provide but the library uses
    window.Headers = Headers;
    window.Response = Response;
    window.Request = Request;
    window.fetch = function fakeFetch(url, init) {
        const entry = { url: String(url), init: init || {} };
        fetchCalls.push(entry);
        const route = routes.find((r) => r.match.test(entry.url));
        if (!route) return Promise.resolve(new Response("", { status: 404 }));
        const answer = typeof route.reply === "function" ? route.reply(entry.url, entry.init) : route;
        if (answer.reject) return Promise.reject(answer.reject);
        const body = answer.body === undefined || answer.body === null ? null
            : typeof answer.body === "string" ? answer.body : JSON.stringify(answer.body);
        return Promise.resolve(new Response(answer.status === 204 || answer.status === 304 ? null : body, {
            status: answer.status,
            headers: answer.headers || { "Content-Type": "application/json" },
        }));
    };

    new vm.Script(fs.readFileSync(require.resolve("jquery/dist/jquery.js"), "utf8"), { filename: "jquery.js" }).runInContext(context);
    assert.equal(typeof window.$, "function");
    window.exports = {};
    window.require = (moduleName) => (moduleName === "jquery" ? window.$ : window.exports);
    for (const file of CLASSIC_LOAD_ORDER) {
        const fullPath = path.join(distDir, file);
        assert.ok(fs.existsSync(fullPath), `${file} is missing from dist/ (run npm run build first)`);
        new vm.Script(fs.readFileSync(fullPath, "utf8"), { filename: file }).runInContext(context);
    }

    return {
        dom,
        window,
        exports: window.exports,
        fetchCalls,
        callsTo: (pattern) => fetchCalls.filter((c) => pattern.test(c.url)),
        /** the bootstrap retries StartSignalRClientHub on a timer forever; closing the window stops it */
        close: () => dom.window.close(),
    };
}

/** resolves after the page's global sfClient exists (the constructor creates it after the permit map loads) */
async function waitForGlobalClient(page, timeoutMs = 3000) {
    if (!page.window.sfClient && !page.bootstrapped) {
        page.bootstrapped = true;
        new page.exports.sfRestClient(); // like the classic page: the first construction creates window.sfClient
    }
    const started = Date.now();
    while (!page.window.sfClient) {
        if (Date.now() - started > timeoutMs) throw new Error("window.sfClient was not created");
        await new Promise((r) => setTimeout(r, 10));
    }
    return page.window.sfClient;
}

/** rejects if the promise does not settle within timeoutMs: the "never settles" guard for the hang fixes */
function settlesWithin(promise, timeoutMs, label) {
    let timer;
    const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label || "promise"} did not settle within ${timeoutMs}ms`)), timeoutMs);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

module.exports = { loadClassicPage, waitForGlobalClient, settlesWithin, WCC, CLASSIC_LOAD_ORDER };
