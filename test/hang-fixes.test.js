// Promises that used to never settle (or settle wrongly) on failure paths. Each test drives the
// public method under a failing fake fetch and asserts it settles within a timeout.
const test = require("node:test");
const assert = require("node:assert/strict");
const { loadClassicPage, waitForGlobalClient, settlesWithin } = require("./helpers/classic-page.js");

const pages = [];
function page(options) {
    const p = loadClassicPage(options);
    pages.push(p);
    return p;
}
test.after(() => { for (const p of pages) p.close(); });

const GUID1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const GUID2 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const GUID3 = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

test("GetDV: a failed batch and an unanswered item both resolve null instead of hanging", async () => {
    let collectionStatus = 500;
    const p = page({ routes: [
        { match: /\/api\/viewable\/collection/, reply: () => collectionStatus === 500
            ? { status: 500, body: "", headers: { "Content-Type": "text/plain" } }
            : { status: 200, body: [] } },
        { match: /\/api\/viewable\/sfUser\?/, status: 200, body: JSON.stringify("First User") },
    ] });
    const client = await waitForGlobalClient(p);
    // the first request goes straight to the server; the next ones, issued while it is pending, are batched
    const direct = client.GetDV("sfUser", GUID1);
    const batched = client.GetDV("sfUser", GUID2);
    assert.equal(await settlesWithin(direct, 2000, "GetDV(direct)"), "First User");
    assert.equal(await settlesWithin(batched, 2000, "GetDV(batched, server 500)"), null);
    assert.equal(p.callsTo(/viewable\/collection/).length, 1);

    collectionStatus = 200; // the batch answers, but not for this item
    const direct2 = client.GetDV("sfUser", GUID1, undefined, true);
    const unanswered = client.GetDV("sfUser", GUID3);
    await settlesWithin(direct2, 2000, "GetDV(direct2)");
    assert.equal(await settlesWithin(unanswered, 2000, "GetDV(batched, unanswered)"), null);
    assert.equal(client._DVThrottledResolvers.size, 0, "no resolver left behind");
});

test("BuildViewModelForContext rejects when the part CFG cannot be loaded, and still builds when it can", async () => {
    const p = page({ routes: [
        { match: /\/api\/uicfg\/live\/Broken/, status: 500, body: "", headers: { "Content-Type": "text/plain" } },
        { match: /\/api\/uicfg\/live\/Simple/, status: 200, body: { PartName: "Simple", UIItems: [{ ItemName: "Owner", DataField: "Owner", DV: "sfUser" }] } },
        { match: /\/api\/viewable\/sfUser\?/, status: 200, body: JSON.stringify("Owner Name") },
    ] });
    const client = await waitForGlobalClient(p);
    await assert.rejects(settlesWithin(client.BuildViewModelForContext("Broken", "ctx", undefined, [{ Owner: GUID1 }]), 2000, "BuildViewModelForContext(broken cfg)"),
        (reason) => !/did not settle/.test(reason.message));
    const rows = await settlesWithin(client.BuildViewModelForContext("Simple", "ctx", undefined, [{ Owner: GUID1 }]), 2000, "BuildViewModelForContext(ok)");
    assert.equal(rows.length, 1);
    assert.equal(rows[0].Owner_dv, "Owner Name");
});

test("GetLookupResults rejects when the lookup request or its CFG fails, and resolves rows when both work", async () => {
    const p = page({ routes: [
        { match: /\/api\/matches\/BrokenLookup\//, status: 500, body: "", headers: { "Content-Type": "text/plain" } },
        { match: /\/api\/matches\/NoCfg\//, status: 200, body: [{ Key: "k" }] },
        { match: /\/api\/uicfg\/lookup\/NoCfg/, status: 500, body: "", headers: { "Content-Type": "text/plain" } },
        { match: /\/api\/matches\/Good\//, status: 200, body: [{ Key: "k", Owner: GUID1 }] },
        { match: /\/api\/uicfg\/lookup\/Good/, status: 200, body: { PartName: "Good", UIItems: [{ ItemName: "Owner", DataField: "Owner", DV: "sfUser" }] } },
        { match: /\/api\/viewable\/sfUser\?/, status: 200, body: JSON.stringify("Owner Name") },
    ] });
    const client = await waitForGlobalClient(p);
    const notSettled = (reason) => !/did not settle/.test(reason.message);
    await assert.rejects(settlesWithin(client.GetLookupResults("BrokenLookup", {}), 2000, "GetLookupResults(500)"), notSettled);
    await assert.rejects(settlesWithin(client.GetLookupResults("NoCfg", {}), 2000, "GetLookupResults(no cfg)"), notSettled);
    const rows = await settlesWithin(client.GetLookupResults("Good", {}), 2000, "GetLookupResults(ok)");
    assert.equal(rows[0].Owner_dv, "Owner Name");
});

test("RuleResult resolves the caller's default when the request fails, without caching it", async () => {
    let ruleStatus = 500;
    const p = page({ routes: [{ match: /\/api\/uicfg\/rule\/DocTypeConfig\/boolean/, reply: () => ruleStatus === 500
        ? { status: 500, body: "", headers: { "Content-Type": "text/plain" } }
        : { status: 200, body: true } }] });
    const client = await waitForGlobalClient(p);
    assert.equal(await settlesWithin(client.RuleResult("DocTypeConfig", "WithPowerUX", GUID1, false), 2000, "RuleResult(500)"), false);
    ruleStatus = 200;
    assert.equal(await settlesWithin(client.RuleResult("DocTypeConfig", "WithPowerUX", GUID1, false), 2000, "RuleResult(200)"), true, "the failure was not cached");
    assert.equal(await client.RuleResult("DocTypeConfig", "WithPowerUX", GUID1, false), true, "the answer is cached");
    assert.equal(p.callsTo(/uicfg\/rule\/DocTypeConfig/).length, 2);
});

test("PopDoc, PopNewDoc and OpenProject resolve null when their lookups fail", async () => {
    const p = page({ routes: [
        { match: /\/api\/viewable\/(DocMasterType|DocType|Project)\?/, status: 500, body: "", headers: { "Content-Type": "text/plain" } },
    ] });
    const client = await waitForGlobalClient(p);
    assert.equal(await settlesWithin(client.PopDoc(GUID1), 2000, "PopDoc(failing DV)"), null);
    assert.equal(await settlesWithin(client.PopNewDoc(GUID2, "GC001"), 2000, "PopNewDoc(failing DV)"), null);
    assert.equal(await settlesWithin(client.OpenProject("GC001"), 2000, "OpenProject(failing DV)"), null);
});

test("AssureJQUITools: a repeat call returns the first call's promise; a non-top frame resolves false", async () => {
    const p = page();
    const client = await waitForGlobalClient(p);
    const first = p.exports.sfRestClient.ExternalToolsLoadedPromise; // the bootstrap's AssureJQUITools call
    assert.ok(first instanceof p.window.Promise);
    assert.equal(client.AssureJQUITools(p.window.$("<div />")), first, "repeat call shares the pending load");
    // simulate the jQuery UI script finishing: the shared promise settles for both callers
    const jqui = p.window.document.querySelector("script[src*='jquery-ui.min.js']");
    jqui.dispatchEvent(new p.window.Event("load"));
    assert.equal(await settlesWithin(first, 1000, "AssureJQUITools"), true);
});

test("AddCachedScript resolves false when the script fails to load", async () => {
    const p = page();
    const client = await waitForGlobalClient(p);
    const loading = client.AddCachedScript("https://cdn.example.test/missing.js", true);
    const script = p.window.document.querySelector("script[src='https://cdn.example.test/missing.js']");
    assert.ok(script, "script element appended");
    script.dispatchEvent(new p.window.Event("error"));
    assert.equal(await settlesWithin(loading, 1000, "AddCachedScript(error)"), false);
});

test("SharePageContext reports false when a Doc* key is offered on a non-document page, and still applies the other keys", async () => {
    const p = page();
    const client = await waitForGlobalClient(p);
    assert.equal(await client.SharePageContext({ DocSessionKey: GUID1, dsCacheKey: "ds-unit" }), false);
    assert.equal(client.GetPageContextValue("DocSessionKey"), client.EmptyKey, "Doc key ignored on a dashboard");
    assert.equal(client.GetPageContextValue("dsCacheKey"), "ds-unit", "other keys still applied");
    assert.equal(await client.SharePageContext({ dsCacheKey: "ds-unit-2" }), true);
});
