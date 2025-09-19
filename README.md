# Client API for Spitfire Project Management

Spitfire Project Management is a solution that helps construction and capital organizations manage projects, documents and SOP.  The web application includes a REST API with dynamic Swagger documentation via NSwag (https://github.com/RicoSuter/NSwag).   This package provides TypeScript and JavaScript clients and helpers for working with this API.

### Sample Usage - JavaScript

```
// client-side-example.js
...

if (typeof top.sfClient === "undefined") top.sfClient = new exports.sfRestClient();


let userKey = top.sfClient.GetPageContextValue("UserKey")
let api = new exports.ActionItemsClient(sfApplicationRootPath)
let apiResult = api.getUserActionItemsAll(userKey)
apiResult.then( (a) => {
        top.sfClient.BuildViewModel("ActionItems", top.sfClient._EmptyKey, a)
            .done(function (v) { console.log(v); });
    });

...
```

### Change Log

```
23.9390.1 - Adds Probability to FileInformation model
23.9330.8 - Adds ConfigController, Stats endpoints, serverUnavailable event
23.9140.0 - Adds Create Project Endpoint
23.9080.3 - Diffgrams for Doc Items and Attachments; GatherDependsOnValues() supports #DocMasterDetail references
23.8940.3 - Adds SaveDocumentPatch to DocumentModel exposed from WX and exports sfProcessDTKMap
23.8882.1 - Adds endpoints to XTSClient
23.8860.1 - Improves EDB Export support
23.8825.5 - Adds Report Menu and Route action REST endpoints
23.8810.1 - Updates swagger for Flush session endpoint  
23.8780.3 - TabStripDetails
23.8764.0 - Google Auth, Microsoft Entra and endpoints for federated identites
23.8699.7 - PopDoc supports HTML Element and sfRowKey
23.8592.1 - Updates swagger
23.8510.2 - First release for sfPMS v2023
 1.40.206 - SignalR 2.4.3 and FontAwesome 6
 1.40.205 - Improved RecentDocList management
 1.40.208 - Improved poor Signal message and TableAndFieldInfo type
```
