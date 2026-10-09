# Findings: SpitfireNPM modernization (native promises, fetch transport)

Companion to `PLAN.md`. Everything the cloud session changed is in the branch's commit messages; this file lists
what it **did not** change: known bugs and debt left in place (with the reason), new findings made while
converting, and options deliberately not taken. Line numbers refer to the branch head.

Risk scale: **low** = local fix, no signature change, covered by a test or obvious by reading; **medium** =
changes a value a consumer might see; **high** = behaviour/security change needing a decision or a server change.

## 1. Fixed in this branch (for reference)

Never-settling promises: `GetDV` batch failures and unanswered items, `BuildViewModelForContext`,
`GetLookupResults`, `RuleResult`, `PopDoc`/`PopNewDoc`/`OpenProject`, `CheckPermit` (failed permit
requests, stale `_LoadingPermitRequests`), `GetPagePartPermits`, `UploadFile` (`beginUpload` rejection),
`AssureJQUITools` (repeat call, non-top frame), `AddCachedScript` (script error), `LoadUCFunctionMap`
(`force` never reloaded, B2; unguarded localStorage parse, B16). Logic: `InvokeAction` regex escapes, two
`new Error` never thrown, `return false` inside `forEach` in `SharePageContext`, duplicate `sessionAlive()`,
duplicate `GAClientID` guard, `basekune`, `GetLookupSuggestions` caching a rejection,
`ExportCompetitiveBidData` leaving the Please-wait dialog up. Hygiene: `.vs/` untracked, README sample,
unused imports/locals, dead `main.ts`/`CreateBundle.js`, stale `nswag.json`, commented-out jQuery code.

## 2. Known issues deliberately left in place

| # | Where | What | Impact | Suggested fix | Risk |
|---|---|---|---|---|---|
| B1 | `APIClientBase.ts:49` `getBaseUrl` | The ISO-date reviver is armed only when a client is built **without** a base URL. Clients built with an explicit URL (`new SessionClient(this._SiteURL)`, most of `sfRESTClient.ts`) return ISO **strings**; default-built ones return `Date` objects. Preserved exactly (the Fetch template now calls `getBaseUrl(default, explicit)` on every construction, so the explicit path returns early without arming). Test: `fetch-clients.test.js` "date revival". | Consumers see two shapes for the same field depending on how the client was built. | Arm the reviver in the `APIClientBase` constructor (or never); then audit every consumer that parses or compares those fields. | medium |
| B3 | `sfRESTClient.ts:5722` `ClearCache` | Clears `_LoadedPermits`/`_LoadingPermitRequests` but not `GlobalPermitAPIPromise`, so after a user switch `CheckPermit` awaits the previous user's global permit request and reads `_LoadedPermits.get("0")` (now empty) until the next load. | Global permits stale/absent after logout-login without a reload. | `sfRestClient.GlobalPermitAPIPromise = undefined` in `ClearCache`. | low |
| B4 | `sfRESTClient.ts:158,726` `PartStorageData._PromiseList` | One list per part, reset by every `_ConstructViewModel` call; two overlapping builds for the same part share and clobber it. `DataModels` is keyed per build but the promise list is not. | A concurrent build can resolve before all its DVs are applied. | Make the list local to `_ConstructViewModel` and pass it into `_ApplyUICFGtoRawData`. | medium (signature of a public method `_ApplyUICFGtoRawData`) |
| B8 | `sfRESTClient.ts:4237` `OpenWindowsLinkHelper` | `A && !b || c || d` — precedence makes the `PostbackRefresh` function check apply only to the first alternative. | Posts back on pages that have no `PostbackRefresh` when `afterOpenArg` is a string/array. | Parenthesize: `A && (!b || c || d)`. Confirm the intended semantics with a classic document page first. | medium |
| B11 | `sfRESTClient.ts:480-483` `PageTypeNames` | `Report` and `PivotTool` both `128`; `Unknown` is `8092` (looks like a typo for `8192`). | `IsPageOfType(Report)` is true on the pivot tool and vice versa. | Give `PivotTool` its own bit (e.g. `256` is free), `Unknown: 8192`. Grep consumers for the literal values before changing. | medium |
| B12 | `sfRESTClient.ts:3310` `IsDocExclusiveToMe` | `DataLockFlag >= "2"` is a string comparison (`"10" >= "2"` is false). | Wrong exclusivity answer for flags ≥ 10, if such values exist. | `Number(DataLockFlag) >= 2`. Confirm the flag's range server-side. | low |
| B13 | `sfRESTClient.ts:3266` `GetPageContextValue` | `silentDefault` is documented and passed by callers but never read; every miss warns. | Console noise (`DataLockFlag`, `PartName`, `TZOffset` on every link). | `if (!silentDefault) console.warn(...)`. | low |
| B14 | `sfRESTClient.ts:1394` `GetIconURL` | `(Date.now() - start) < 5432` is always true (`start` was just taken); the comment says "do not use loop", so the branch only kicks off `_LoadIconMap()`. | Harmless; misleading. | Delete the timer expression. | low |
| B15 | `sfRESTClient.ts:531` `ApplyDataChanges` | A changed row that is not found is pushed onto `changes.Add` **while** `changes.Change` is being iterated, and only if `Add` exists; otherwise the row is dropped. | Rows silently lost when a diffgram has `Change` but no `Add`. | Collect unmatched changes locally and append them after the loop, creating `Add` if needed. | low |
| B18 | `sfRESTClient.ts:1123` `GetDV` doc | The doc promises `null` "when the request fails", but the direct (unbatched) path rejects with the API error; only the batched path now resolves `null`. | Callers that trust the doc and do not `catch` get an unhandled rejection. | Decide: either `.catch(() => null)` on the direct path (matches the doc, hides the error) or fix the doc. | low |
| B21 | `sfRESTClient.ts:2313` `LoadUserSessionInfo` | Sets `WCCLoaded = false` on entry even when it is about to reuse the shared in-flight `getWCC` promise; every caller that checks `WCCLoaded` meanwhile re-enters. | Extra `LoadUserSessionInfo` calls and `getWCC` requests during startup. | Only reset the flag when a new request is created. | low |
| — | `sfRESTClient.ts` (17 sites; `OpenWindowsLinkHelper` builds two more at 4232-4249) | `setTimeout` with a **string** of code, evaluated in the page. Two are built from SignalR payloads: `5960` (`request` from `dashboardOpenLink` interpolated into code) and `HandleEvalRequest` (`5763`, `(0,eval)(request)` for `nowViewingDocument`/`dashboardOpenLink`). The other `eval`s: `3786` (`data-js` attribute in the support panel), `4085` (`javascript:` action strings from menus). | A compromised or spoofed hub message runs arbitrary script in every connected session. | Replace string timers with closures (mechanical); for hub payloads, parse `request` into a whitelist of actions (`PopDoc`, `OpenProject`, `refresh*`) instead of evaluating it. Needs a server-side inventory of what the hub sends. | high |
| — | `MakeTable` 2045, `jqAlert` 4752, `CreateButtonElement` 3234, `BuildWCCInfoTableHTML` 3681, `DisplayThisNotification` 4366 | Values are concatenated into HTML without escaping (`withTip`, `msg`, WCC values, query results). | XSS if any of those values is user-controlled (WCC `FullName`, query aliases). | Escape text (`$("<td>").text(val)`) or a small `escapeHtml`. `jqAlert`'s `msg` is intentionally HTML in some callers; split into `jqAlert(html)` and `jqAlertText`. | high |
| — | `APIClientBase.ts:187-188` | GA4 `api_secret` and `measurement_id` are in the shipped source. | Anyone can post events to the property. | Proxy GA4 Measurement Protocol through the server (`api/stats`) or accept it (the secret only allows posting events). | medium |
| — | four site-URL resolvers | `APIClientBase.getBaseUrl` (`:49`), `PartStorageData` (`:296`), `sfRestClient.ResolveSiteRootURLs` (`:3022`), `string.extensions.sfApplicationRootPath` (`:284`) each derive the application root from `window.location` with slightly different rules (`powerux` → `sfPMS` in three of them, `localhost/powerux/` special case in one). | Four places to keep in step; `setRuntimeAPIPath` is a no-op. | One resolver in `APIClientBase`, the rest read it. | medium |
| — | `globals.ts:83-89` | `sfPMSHub.server.*` are typed as returning native `Promise`; SignalR 2.x returns jQuery Deferreds. `.then/.catch` work (Deferred is thenable, jQuery ≥ 3), `await` works, but `.finally` and `Promise.all` typing are a lie and `.done/.fail` are hidden. | Type/runtime mismatch; `pingServer` relies on `.then` only, so it works today. | Type them as `JQuery.Promise<T>` or wrap each call in `Promise.resolve(...)`. | low |
| — | `string.extensions.ts` | `String`/`Date`/`Window` prototype extensions and `jQuery.fn.hasData` are installed at import time; `HTTPApplicationName` (`:203`) and `UseClassicCatalog` (`sfRESTClient.ts:2919`) read `window.location` at import time. | Importing the library in a non-browser context (tests, SSR, workers) throws or misdetects. | Guard with `typeof window !== "undefined"` (partly done) and move location reads into lazy getters. | low |
| — | `package.json` `"main": ""`, no `exports` map | Consumers must deep-import `spitfirepm/dist/...` (391 such imports in PowerUX). Fine today; blocks an ESM build. | — | Add an `exports` map that keeps the `dist/*` paths and adds `.` → `dist/sfRESTClient`. | low |
| — | `src/SWSRestClients.ts` | 2021 NSwag 13 TypeScript client for the separate SWS service, still on `jQuery.ajax` (5 calls). No surveyed consumer imports it; the live SWS pipeline is the C# client in `DashboardFoundationSolution/SWSRESTClient`. Left untouched (Stan's ruling), excluded from the grep checks. | Ships 17 kB of dead, jQuery-dependent code. | Delete it in a later version after a grep of all consumers, or regenerate it with the same Fetch template. | low |
| — | `sfRESTClient.ts:1705` `UploadFile` | `FileUploadKey` (the `f` returned by `beginUpload`) is stored and never sent; chunks are matched server-side by file name. | Two concurrent uploads of the same file name could interleave. | Send the key as a header/query on each chunk (server change). | medium |
| — | `sfRESTClient.ts:1820` `WaitForTask` | `getTaskState` returning `null` throws `TypeError` inside the loop (now a rejection; it used to be an unhandled rejection plus a hang). | Export/task UI shows nothing. | Treat `null` as "ended with unknown status". | low |
| — | `sfRESTClient.ts:2173` `_LoadUCFunctionMapHasBeenForced` | Instance flag guarding a static map reload: the global instance and the first instance each get one forced reload. | At most one redundant reload. | Make it static. | low |
| — | `sfRESTClient.ts:3673` `GetPageProjectKey` | `!this.IsHomeDashboardPage &&` tests the function, not its result (always false). | Dev-mode log never prints. | Add `()`. | low |
| — | `sfRESTClient.ts:2652` `sfRowKey` | Parameter typed `JQuery<HTMLElement>` but the body checks `instanceof HTMLElement`; `PopDoc` passes elements. | Type lies; works at runtime. | Type as `JQuery<HTMLElement> \| HTMLElement`. | low |
| — | `sfRESTClient.ts:5112` `GetSFTabCount` | Returns `3.14` on macOS (debug leftover). | Tab counting disabled on Mac. | Remove or document. | low |
| — | `sfRESTClient.ts:6485` `pingServer` | `if (1===1)` dead branch; the `webix.alert` alternative is unreachable. | Dead code. | Delete the else. | low |
| — | `sfRESTClient.ts:6452,6644` | `525600` is compared to milliseconds (it reads like "minutes in a year"; it is 8.76 minutes). | Idle logic triggers after ~9 minutes between 0:00 and 02:00. | Confirm intent, name the constant. | low |
| — | `sfRESTClient.ts:5807` `StartSignalRClientHub` | Retries every 234 ms forever when `$.connection` never appears (pages that do not load SignalR). | A timer per such page for its lifetime. | Cap retries or stop when `AssureJQUITools` resolved false. | low |
| — | `sfRESTClient.ts:6895` | `exports.$ = $` and the whole `exports` object are the live `SwaggerClients` module namespace (classic: the global `exports`); add-ins mutate it. | Works; undocumented coupling. | Document in the migration guide (done). | — |

## 3. New findings from this work

1. **22 endpoints are documented as `application/octet-stream` but answer JSON** (`HttpResponseMessage`
   actions: `deleteComment`, `deleteFile`, `getPublicAsset`, `deleteFolder`, `getIconForType`,
   `getIconListByType`, `patchObjectMeta`, `deleteObject`, `getRootFolderName`, `updateContact`,
   `deleteContact`, `mergeContacts`, `moveContact`, `discardContactPhoto`, `deleteDocHeader`,
   `updateDocHeader`, `deleteProjectCache`, `refreshPeerSummary`, `patchUserProjectList`,
   `getProjectPermitNameMap`, `getTaskResult`, `sendTaskResult`). The Fetch template would resolve
   `FileResponse { data: Blob }` for them; the generator rewrites those responses to JSON/`any` so the
   contract stays what the jQuery template delivered. **Server fix:** add `[ProducesResponseType(typeof(...), 200)]`
   / `Produces("application/json")` to those actions (and declare the truly binary ones, probably only
   `getTaskResult`, as files); then remove the rewrite in `Program.cs` and the results become typed. Risk: medium.
2. **Generated constructors** now take `(baseUrl?, http?)`; `baseUrl` and `http` are `private` in every
   generated class (the jQuery template had a public `baseUrl`). No library code reads `client.baseUrl`;
   consumers must be grepped (see the migration guide).
3. **Network failure shape**: a generated endpoint now rejects with the fetch `TypeError` instead of an
   `ApiException` with `status === 0`. No library code branched on status 0. `CheckForSystemNotification`
   reads `reason.status`; a `TypeError` has none, so it logs nothing for a network failure (same as before
   for status 0, which hit no branch either).
4. **Generation determinism**: `Program.cs` sorts paths and schemas with the culture-sensitive default
   comparer; JavaScript's `JSON.parse` orders numeric response-code keys ascending. Output from the
   normalized snapshot is byte-stable (generated twice, compared); a Windows run should be compared once
   before trusting cross-platform parity. Consider `StringComparer.Ordinal` in both `OrderBy` calls.
5. The snapshot's `servers[0].url` is `https://dev.spitfirepm.com:8443/SFPMS` (the path casing the
   dev site echoed); the baked-in default URL argument changed from `sfPMS` to `SFPMS`. `getBaseUrl`
   ignores that argument.
6. `getBaseUrl` is `public` on `APIClientBase`; with the Fetch template it is called with two arguments.
   Any consumer subclass overriding it with the one-argument signature still compiles (fewer parameters is
   allowed) but would arm the reviver for explicit URLs too.
7. `jQuery.fn.bind` is patched at class-definition time (`:5777`) to redirect SignalR's `unload` binding
   to `pagehide`. `peerDependencies` allows jQuery 4, where `$.trim` is gone (now unused here) and
   `.bind` is deprecated but present; SignalR 2.4.3 with jQuery 4 is untested.
8. `test/helpers/classic-page.js` injects Node's `Headers`/`Response`/`fetch` into jsdom; jsdom itself has
   no `fetch`. Browsers are fine. Anything that wants to run the library under jsdom must do the same.
9. The classic loader's shared global scope is now exercised by a test (`classic-load.test.js`); it would
   catch a duplicate top-level `const`/`class` across the five files. SwaggerClients.js no longer declares
   a top-level `const jQuery` (it did, shadowing `window.jQuery`).

## 4. Options not taken (listed, not done)

- **`UseAbortSignal = true`** in `Program.cs` adds a trailing `signal?: AbortSignal` parameter to all 444
  endpoints (optional, so source-compatible) and lets PowerUX cancel grid requests on navigation. One-line
  change plus regeneration; left off to keep this PR's generated diff to the template switch.
- **DOM/dialog isolation**: `sfRESTClient.ts` still mixes transport, caching and jQuery UI. A split into
  `sfRestClient` (data) and `sfClassicUI` (dialogs, autocomplete, notifications) would let PowerUX drop
  jQuery UI; blocked by the classic loader's fixed five-file list (`PageClass.vb:2116`).
- **ESM build / `exports` map**: `module: commonjs` is required by the classic loader; a dual build would
  need a second `tsconfig` and the `exports` map above.
- **`StringComparer.Ordinal`** in the generator (finding 4).
- **`getTaskResult` as a real file download** (finding 1).

## 5. Follow-on work outside this repo (from the survey; file as cases)

- sfPMS `cscript/Util.js:2563`: retry `setTimeout` evaluates a quoted string, so `NPMLoaderPromise` can hang.
- sfPMS `Util.js:625` `sfAPICheckPermit` and jqUtility `getDV` wrappers never reject.
- sfPMS `PageClass.vb` never loads `version.js`, so `sfClient.ClientVersion` is undefined on classic pages.
- sfPMS `tscript/XTSDocHelper.ts:152` (`depth++` passes the old value; polls forever) and `:211` (missing `()`).
- PowerUX `models/document/document.ts:821`: `if (!Route.sfrc.IsLoggedIn())` tests a promise, always false.
- PowerUX `.npmrc` has a committed auth token for `npm.webix.com`.
- Deploys ship whatever is in a developer's `tscript/node_modules`, not the lockfile version.
- Retire the Azure DevOps `TypeScriptClientGenerator` repo and `GenerateSwag2TS.cmd` once the in-repo
  generator is proven on Windows.
- The 22 `octet-stream` actions (finding 1) and the hub payload `eval`s (section 2) are server-side cases.
