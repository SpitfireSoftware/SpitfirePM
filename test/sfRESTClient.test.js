// sfRestClient on a classic page (jsdom + jQuery + fake fetch): the hand-written methods that moved
// from jQuery promises/ajax to native promises and fetch, and the "never settles" fixes.
const test = require("node:test");
const assert = require("node:assert/strict");
const { loadClassicPage, waitForGlobalClient, settlesWithin } = require("./helpers/classic-page.js");

/** objects created inside the jsdom realm have another Object.prototype; compare them as plain data */
const plain = (value) => JSON.parse(JSON.stringify(value));

const pages = [];
function page(options) {
    const p = loadClassicPage(options);
    pages.push(p);
    return p;
}
test.after(() => { for (const p of pages) p.close(); });

test("bootstrap: constructing sfRestClient loads the session and permit map over fetch and creates window.sfClient", async () => {
    const p = page();
    const first = new p.exports.sfRestClient();
    p.bootstrapped = true;
    const client = await waitForGlobalClient(p);
    assert.notEqual(client, first, "the global instance is a second construction, as before");
    assert.equal(p.callsTo(/\/api\/session\/who/).length >= 1, true);
    assert.equal(p.callsTo(/\/api\/session\/permits\/map/).length, 1, "concurrent constructions share one permit map request");
    assert.equal("WORK" in p.exports.sfRestClient._UCPermitMap, true);
    assert.ok(p.window.localStorage.getItem("sfUCFunctionNameMap"), "map cached in localStorage");
    assert.equal(client.GetPageContextValue("SiteID"), "SITE1");
});

test("LoadUCFunctionMap: 304 keeps the map, force reloads, a failed request resolves with the current map", async () => {
    let mapStatus = 200;
    const p = page({ routes: [{ match: /\/api\/session\/permits\/map/, reply: () => mapStatus === "reject" ? { reject: new TypeError("Failed to fetch") } : { status: mapStatus, body: { _etag: { "etag-2": 0 }, WORK: {}, PART: { Fresh: "ucfk-fresh" } } } }] });
    const client = await waitForGlobalClient(p);
    const before = p.callsTo(/permits\/map/).length;

    mapStatus = 304;
    const sameMap = await settlesWithin(client.LoadUCFunctionMap(true), 1000, "LoadUCFunctionMap(304)");
    assert.equal(p.callsTo(/permits\/map/).length, before + 1, "force issues a new request even though an earlier one completed");
    assert.equal("Fresh" in sameMap.PART, true);

    mapStatus = 403;
    assert.equal("PART" in await settlesWithin(client.LoadUCFunctionMap(true), 1000, "LoadUCFunctionMap(403)"), true);

    mapStatus = "reject";
    assert.equal("PART" in await settlesWithin(client.LoadUCFunctionMap(true), 1000, "LoadUCFunctionMap(network)"), true);
    assert.equal(p.exports.sfRestClient._SessionClientGetUCFKMap, null, "in-flight request handle cleared once settled");
});

test("CheckPermit resolves the permit from the global permit set", async () => {
    const p = page();
    const client = await waitForGlobalClient(p);
    const permit = await settlesWithin(client.CheckPermit("PART", "ActionItems"), 2000, "CheckPermit");
    assert.equal(permit, client.PermissionFlags.Read + client.PermissionFlags.Update);
    assert.equal(await client.CheckPermit("PART", "ActionItems"), 5, "second call answers from the static cache");
});

test("CheckPermit settles (0) when the project permit request fails and clears the in-flight entry", async () => {
    const p = page({ routes: [{ match: /\/api\/session\/permits\/project\/P1$/, status: 500, body: "boom", headers: { "Content-Type": "text/plain" } }] });
    const client = await waitForGlobalClient(p);
    const permit = await settlesWithin(client.CheckPermit("PART", "ProjectList", undefined, "P1"), 2000, "CheckPermit(failing project)");
    assert.equal(permit, 0);
    assert.equal(p.exports.sfRestClient._LoadingPermitRequests.size, 0);
});

test("CheckPermit for an unknown function reloads the map once and resolves 0", async () => {
    const p = page();
    const client = await waitForGlobalClient(p);
    const before = p.callsTo(/permits\/map/).length;
    assert.equal(await settlesWithin(client.CheckPermit("PART", "NoSuchPart"), 2000, "CheckPermit(unknown)"), 0);
    assert.equal(p.callsTo(/permits\/map/).length, before + 1);
});

test("GetPagePartPermits resolves every part, 0 for the ones without permits", async () => {
    const p = page();
    const client = await waitForGlobalClient(p);
    const parts = await settlesWithin(client.GetPagePartPermits(client.PageTypeNames.HomeDashboard), 2000, "GetPagePartPermits");
    assert.deepEqual(plain(parts), { ActionItems: 5, ProjectList: 0, AlertList: 0 });
});

test("UploadFile single request: posts FormData and resolves the server's status", async () => {
    const p = page({ routes: [{ match: /\/api\/catalog\/upload/, status: 200, body: [{ name: "a.txt", progress: 100 }] }] });
    const client = await waitForGlobalClient(p);
    const file = new p.window.File(["hello"], "a.txt", { type: "text/plain" });
    const ctx = new p.exports.SFFileUploadContext("doc");
    const status = await settlesWithin(client.UploadFile(file, ctx), 2000, "UploadFile");
    assert.deepEqual(plain(status), { name: "a.txt", progress: 100 });
    const call = p.callsTo(/\/api\/catalog\/upload/)[0];
    assert.equal(call.init.method, "POST");
    assert.equal(call.init.body instanceof p.window.FormData, true);
    assert.equal(call.init.body.get("fileToUpload").name, "a.txt");
});

test("UploadFile resolves with taskResult.error on an HTTP failure and on a network failure", async () => {
    let mode = "http";
    const p = page({ routes: [{ match: /\/api\/catalog\/upload/, reply: () => mode === "http" ? { status: 500, body: "", headers: { "Content-Type": "text/plain" } } : { reject: new TypeError("Failed to fetch") } }] });
    const client = await waitForGlobalClient(p);
    const file = new p.window.File(["hello"], "a.txt", { type: "text/plain" });
    const ctx = new p.exports.SFFileUploadContext("doc");
    const failed = await settlesWithin(client.UploadFile(file, ctx), 2000, "UploadFile(500)");
    assert.equal(failed.name, "a.txt");
    assert.ok(failed.error, "error set");
    mode = "network";
    const failed2 = await settlesWithin(client.UploadFile(file, ctx), 2000, "UploadFile(network)");
    assert.equal(failed2.error, "Failed to fetch");
});

test("UploadFile chunk mode: beginUpload then one request per chunk; a beginUpload failure resolves with error", async () => {
    let beginStatus = 200;
    const p = page({ routes: [
        { match: /\/api\/catalog\/stream\/chunk/, status: 200, body: [{ name: "big.bin", progress: 50 }] },
        { match: /\/api\/catalog\/stream$/, reply: () => ({ status: beginStatus, body: beginStatus === 200 ? { f: "upload-key" } : "", headers: { "Content-Type": "application/json" } }) },
    ] });
    const client = await waitForGlobalClient(p);
    client.SetOptions({ UploadDirectLimit: 8, UploadChunkSize: 4 });
    const file = new p.window.File(["0123456789A"], "big.bin", { type: "application/octet-stream" }); // 11 bytes -> 3 chunks
    const ctx = new p.exports.SFFileUploadContext("doc");
    const progress = [];
    const status = await settlesWithin(client.UploadFile(file, ctx, (s) => { progress.push(s.progress); return false; }), 3000, "UploadFile(chunks)");
    assert.deepEqual(plain(status), { name: "big.bin", progress: 50 });
    assert.equal(p.callsTo(/\/api\/catalog\/stream$/).length, 1);
    assert.equal(p.callsTo(/\/api\/catalog\/stream\/chunk/).length, 3);
    assert.equal(progress.length, 2, "progress callback for every chunk but the last");
    const ranges = p.callsTo(/\/api\/catalog\/stream\/chunk/).map((c) => c.init.headers["Content-Range"]);
    assert.deepEqual(ranges, ["bytes 0-3/11", "bytes 4-7/11", "bytes 8-10/11"]);

    beginStatus = 500;
    const failed = await settlesWithin(client.UploadFile(file, ctx), 3000, "UploadFile(beginUpload fails)");
    assert.ok(failed.error, "beginUpload failure resolves with error instead of hanging");
});

test("WaitForTask polls until the task leaves 202", async () => {
    let polls = 0;
    const p = page({ routes: [{ match: /\/api\/session\/task\/t1\/state/, reply: () => ({ status: 200, body: ++polls < 2 ? { ThisStatus: 202, ThisReason: "" } : { ThisStatus: 200, ThisReason: "done" } }) }] });
    const client = await waitForGlobalClient(p);
    client.SetOptions({ TaskStatePollInterval: 300 });
    const result = await settlesWithin(client.WaitForTask("t1"), 3000, "WaitForTask");
    assert.equal(result.ThisStatus, 200);
    assert.equal(polls, 2);
});

test("setImgSrc resolves the themed path through px.ashx and caches it; a failed request resolves empty", async () => {
    let pxStatus = 200;
    const p = page({ routes: [{ match: /px\.ashx\//, reply: () => ({ status: pxStatus, body: "/sfPMS/images/themed/x.png", headers: { "Content-Type": "text/html" } }) }] });
    const client = await waitForGlobalClient(p);
    const $img = p.window.$("<img src='x.png' />");
    assert.equal(await settlesWithin(client.setImgSrc($img), 1000, "setImgSrc"), "/sfPMS/images/themed/x.png");
    assert.equal($img.attr("src"), "/sfPMS/images/themed/x.png");
    assert.equal($img.data("sfimg"), true);
    assert.equal(await client.setImgSrc($img), "/sfPMS/images/themed/x.png", "second call answers without a request");
    assert.equal(p.callsTo(/px\.ashx/).length, 1);

    pxStatus = 500;
    const $other = p.window.$("<img src='y.png' />");
    assert.equal(await settlesWithin(client.setImgSrc($other), 1000, "setImgSrc(500)"), "");
});

test("_GetAPIJSON resolves {status, data} and keeps a 304 as a resolution", async () => {
    const p = page({ routes: [{ match: /\/api\/unit\/notmodified/, status: 304, body: null }, { match: /\/api\/unit\/ok/, status: 200, body: { a: 1 } }] });
    const client = await waitForGlobalClient(p);
    assert.deepEqual(plain(await client._GetAPIJSON("unit/ok")), { status: 200, data: { a: 1 } });
    assert.deepEqual(plain(await client._GetAPIJSON("unit/notmodified")), { status: 304 });
});

test("GA4MonitorSend posts with keepalive and never rejects", async () => {
    let fail = false;
    const p = page({ routes: [{ match: /google-analytics\.com/, reply: () => fail ? { reject: new TypeError("blocked") } : { status: 204 } }] });
    await waitForGlobalClient(p);
    const base = p.exports.APIClientBase;
    const payload = { client_id: "SITE1", events: [{ name: "unit", params: {} }] };
    await settlesWithin(base.GA4MonitorSend(payload), 1000, "GA4MonitorSend");
    const call = p.callsTo(/google-analytics\.com\/mp\/collect/).pop();
    assert.equal(call.init.method, "POST");
    assert.equal(call.init.keepalive, true);
    assert.deepEqual(JSON.parse(call.init.body), payload);
    fail = true;
    await assert.doesNotReject(settlesWithin(base.GA4MonitorSend(payload), 1000, "GA4MonitorSend(blocked)"));
    await assert.doesNotReject(base.GAMonitorSend({ v: 1, t: "event", cid: "SITE1", ec: "unit", ea: "a" }));
});
