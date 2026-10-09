// Generated (NSwag Fetch template) clients, exercised in plain Node with a fake `http.fetch`
// injected through the generated constructor's second argument.
const test = require("node:test");
const assert = require("node:assert/strict");

// APIClientBase.getBaseUrl reads window.location when a client is constructed without a baseUrl
globalThis.window = { location: { origin: "https://unit.example.test", pathname: "/sfPMS/Dashboard.aspx" } };

const { AccountClient, AlertsClient, SessionClient, CatalogClient, ApiException } = require("../dist/SwaggerClients.js");
const { APIClientBase } = require("../dist/APIClientBase.js");

const BASE = "https://unit.example.test/sfPMS";

/** builds an http object whose fetch answers with the given status/body and records every call */
function fakeHttp(status, body, headers) {
    const calls = [];
    const http = {
        calls,
        fetch(url, init) {
            calls.push({ url, init });
            return Promise.resolve(new Response(body, { status, headers: headers || { "Content-Type": "application/json" } }));
        },
    };
    return http;
}

test("GET happy path: URL, method, Accept header, parsed JSON result", async () => {
    const http = fakeHttp(200, JSON.stringify(["g1", "g2", "g3"]));
    const client = new SessionClient(BASE, http);
    const result = await client.getNewGuid(3);
    assert.deepEqual(result, ["g1", "g2", "g3"]);
    assert.equal(http.calls.length, 1);
    assert.equal(http.calls[0].url, `${BASE}/api/session/guid/3`);
    assert.equal(http.calls[0].init.method, "GET");
    assert.equal(new Headers(http.calls[0].init.headers).get("Accept"), "application/json");
    assert.equal(http.calls[0].init.credentials, undefined, "credentials must stay at the fetch default (same-origin), as jQuery.ajax did");
});

test("POST happy path: JSON body and Content-Type", async () => {
    const http = fakeHttp(200, JSON.stringify("ticket"));
    const client = new AccountClient(BASE, http);
    const result = await client.postLogin({ UserName: "u", Password: "p" });
    assert.equal(result, "ticket");
    const { url, init } = http.calls[0];
    assert.equal(url, `${BASE}/api/Account`);
    assert.equal(init.method, "POST");
    assert.equal(init.body, JSON.stringify({ UserName: "u", Password: "p" }));
    assert.equal(new Headers(init.headers).get("Content-Type"), "application/json");
});

test("typed non-200 rejects with the parsed body (same as the jQuery template)", async () => {
    const client = new AccountClient(BASE, fakeHttp(401, JSON.stringify("Unusable credentials")));
    await assert.rejects(client.postLogin({}), (reason) => reason === "Unusable credentials");
});

test("non-200 with an empty body rejects with an ApiException carrying the status", async () => {
    const client = new AccountClient(BASE, fakeHttp(401, ""));
    await assert.rejects(client.postLogin({}), (reason) => ApiException.isApiException(reason) && reason.status === 401);
});

test("undocumented status rejects with ApiException and keeps the response text", async () => {
    const client = new SessionClient(BASE, fakeHttp(418, "short and stout", { "Content-Type": "text/plain" }));
    await assert.rejects(client.getNewGuid(1), (reason) => ApiException.isApiException(reason) && reason.status === 418 && reason.response === "short and stout");
});

test("204 / empty body resolves null", async () => {
    const client = new SessionClient(BASE, fakeHttp(204, null));
    assert.equal(await client.getNewGuid(1), null);
    const client200 = new SessionClient(BASE, fakeHttp(200, ""));
    assert.equal(await client200.getNewGuid(1), null);
});

test("network failure rejects with the fetch error (TypeError), not a status-0 ApiException", async () => {
    const http = { fetch() { return Promise.reject(new TypeError("Failed to fetch")); } };
    const client = new SessionClient(BASE, http);
    await assert.rejects(client.getNewGuid(1), TypeError);
});

test("beforeSend hook: setRequestHeader lands on the request and keeps the generated headers", async () => {
    const http = fakeHttp(200, JSON.stringify("ok"));
    const client = new AccountClient(BASE, http);
    let hookCalls = 0;
    client.beforeSend = (xhr) => { hookCalls++; xhr.setRequestHeader("Authorization", "Bearer token-123"); };
    await client.postLogin({});
    assert.equal(hookCalls, 1);
    const headers = new Headers(http.calls[0].init.headers);
    assert.equal(headers.get("Authorization"), "Bearer token-123");
    assert.equal(headers.get("Content-Type"), "application/json");
    assert.equal(headers.get("Accept"), "application/json");
});

test("beforeSend is per instance and off by default", async () => {
    const http = fakeHttp(200, JSON.stringify("ok"));
    const client = new AccountClient(BASE, http);
    assert.equal(client.beforeSend, undefined);
    await client.postLogin({});
    assert.equal(new Headers(http.calls[0].init.headers).get("Authorization"), null);
});

test("GA hook still fires through transformResult for a non-ignored controller", async () => {
    const seen = [];
    const original = APIClientBase.prototype.GAAPIEvent;
    APIClientBase.prototype.GAAPIEvent = function (controller, endpoint) { seen.push([controller, endpoint]); return undefined; };
    // transformResult throttles repeats of the same controller/endpoint; start from a clean slate
    APIClientBase._LastAt = 0; APIClientBase._LastControler = ""; APIClientBase._LastEndpoint = "";
    try {
        // the GA regex wants /api/<controller>/<endpoint>; "catalog" is not in GAIgnoreActions
        const client = new CatalogClient(BASE, fakeHttp(200, JSON.stringify({ name: "Root" })));
        const result = await client.getRootFolderName();
        assert.deepEqual(result, { name: "Root" });
        assert.deepEqual(seen, [["catalog", "root"]]);
        // an /api/<controller> URL without an endpoint segment is not reported (unchanged behaviour)
        const alerts = new AlertsClient(BASE, fakeHttp(200, JSON.stringify([])));
        await alerts.getUserAlertList("00000000-0000-0000-0000-000000000001");
        assert.equal(seen.length, 1);
    } finally {
        APIClientBase.prototype.GAAPIEvent = original;
    }
});

test("responses the swagger calls octet-stream are still parsed as JSON (HttpResponseMessage actions)", async () => {
    const client = new CatalogClient(BASE, fakeHttp(200, JSON.stringify({ name: "Root", key: "k" })));
    const result = await client.getRootFolderName();
    assert.deepEqual(result, { name: "Root", key: "k" });
});

test("date revival: a client built without a baseUrl revives ISO dates, one built with an explicit baseUrl does not (B1, preserved)", async () => {
    const body = JSON.stringify({ When: "2026-04-06T12:16:34Z", Text: "x" });
    const defaulted = new SessionClient(undefined, fakeHttp(200, body));
    const explicit = new SessionClient(BASE, fakeHttp(200, body));
    assert.equal(APIClientBase._SiteURL, BASE, "default client resolved the site URL from window.location");
    const fromDefault = await defaulted.getWCC("");
    const fromExplicit = await explicit.getWCC("");
    assert.ok(fromDefault.When instanceof Date, "default-constructed client revives dates");
    assert.equal(typeof fromExplicit.When, "string", "explicit-baseUrl client leaves ISO strings alone");
});
