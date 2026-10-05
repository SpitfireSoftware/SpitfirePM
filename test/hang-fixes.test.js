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
