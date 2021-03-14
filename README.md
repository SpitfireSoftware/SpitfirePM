# Client API for Spitfire Project Management 

Spitfire Project Management is a solution that helps construction and capital organizations manage projects, documents and images.  The web application includes a REST API with dynamic Swagger documentation via NSwag (https://github.com/RicoSuter/NSwag).   This package provides TypeScript and JavaScript clients and helpers for working with this API.

### Sample Usage
 var api = new exports.ActionItemsClient(sfApplicationRootPath)
    var apiResult = api.getUserActionItemsAll(sfWCC.UserKey)
    if (typeof top.sfRestClient === "undefined") top.sfRestClient = new exports.sfRestClient();
    apiResult.then(function (a) {
        //debugger;
        top.sfRestClient.BuildViewModel("ActionItems", top.sfRestClient._EmptyKey, a)
            .done(function (v) { console.log(v); });

    });