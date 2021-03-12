
import { GUID  } from "./global";
import { String } from "./string.extensions";
import { IUCPermit, LookupClient, Suggestion, UICFGClient, UIDisplayPart } from "./SwaggerClients"

/* eslint-disable prefer-template */
/* eslint-disable no-extend-native */
/* eslint-disable prefer-spread */
/* eslint-disable no-undef */
/* eslint-disable prefer-arrow-callback */
/* eslint-disable vars-on-top */
/* eslint-disable no-var */

// script created by Stan York and modified for typescript and linter requirements by Uladzislau Kumakou
 
import * as $ from 'jquery';


class PartStorageData{
    CFG : any;
    DataModels : Map<string,any>;
    ViewModels : Map<string,any>;
    RestClient : sfRestClient ;
    _CurrentContext : string | null = null;
    _PromiseList : Promise<any>[] | null = null;
    constructor(client: sfRestClient) {
       this.CFG = null;
        this.DataModels = new Map<string,any[]>();
        this.ViewModels = new Map<string,any[]>();
        this.RestClient = client;
        this._CurrentContext = null;
        this._PromiseList = null;
    
    }
}

const  sfApplicationRootPath = `${window.location.origin}/${window.location.pathname.substr(1, window.location.pathname.substr(1).indexOf("/"))}`;
export type PartStorageList =  Map<string,PartStorageData>; 

export class sfRestClient
{
    version = 2020;
    BuildViewModel(partName: string, context: string , rawData: any, cfg: any, forDocType : string | null) : JQueryPromise<any> {
        var darnSoon = $.Deferred();
        var ResultReady = darnSoon.promise();
        if (partName in this._LoadedParts) {
            console.log('already have CFG for part:' + partName);
        }
        else {
            if (!this._z.WCCLoaded) this.LoadUserSessionInfo();
             this._LoadedParts.set(partName,new PartStorageData(this));
        }

        var thisPart : PartStorageData | undefined = this._LoadedParts.get(partName);
        var requests = [];
        if (!thisPart?.CFG) {
            thisPart!.CFG = cfg;
        }
        if (!thisPart?.CFG) {
            var api : UICFGClient = new UICFGClient(sfApplicationRootPath);
            var apiResult : Promise<UIDisplayPart | null> = api.getLiveDisplay(partName,forDocType ,thisPart!._CurrentContext);
            if (apiResult) {
                requests.push(apiResult); 
                thisPart!.CFG = apiResult.finally();
            }   
            
        }
        thisPart!.DataModels.set(context, rawData)
        thisPart!._CurrentContext = context;
        thisPart!._PromiseList = [];
        $.when.apply($, requests)
            .done(function () {
                thisPart!.CFG.UIItems.forEach(thisPart!.RestClient._ApplyUICFGtoRawData, thisPart);

                $.when.apply($, thisPart!._PromiseList!)
                    .done(function () {
                        darnSoon.resolve(thisPart!.DataModels.get(context));
                    });
            });

        return ResultReady;
    }
    CheckPermit(ucModule: string , ucFunction: string, optionalDTK: string, optionalProject: string, optionalReference: string) : JQueryPromise<number> {
        var RESTClient : sfRestClient = this;
        var DeferredResult = $.Deferred();
        var permitCheck = DeferredResult.promise();
        if (!RESTClient._z.WCCLoaded) RESTClient.LoadUserSessionInfo();

        // if ((typeof RESTClient._WCC.UserKey === 'string') && (RESTClient._WCC.UserKey === RESTClient._EmptyKey)) {
        //    DeferredResult.resolve(0);
        //    console.warn("CheckPermit: Current User not known")
        //    return permitCheck; // no user, no permission
        // }

        if (typeof optionalDTK !== "string") optionalDTK = "";
        if (typeof optionalReference !== "string") optionalReference = "";
        if (typeof optionalProject !== "string") optionalProject = "0";
        var PermitCacheID = ucModule + "_" + ucFunction
            + "_T" + optionalDTK.replaceAll("-", "")
            + "_R" + optionalReference
            + "_P" + optionalProject;
        if (typeof RESTClient._UserPermitResultCache.get(PermitCacheID) === "number") {
            DeferredResult.resolve(RESTClient._UserPermitResultCache.get(PermitCacheID));
            return permitCheck; // quick!
        }

        var UCFK = "";
        var ThisProjectPermitSet = {};
        var UCFKDeferredResult = $.Deferred();
        var UCFKPromise = UCFKDeferredResult.promise();
        var PPSDeferredResult = $.Deferred();
        var PPSPromise = PPSDeferredResult.promise();
        if (ucModule.length === 36) {
            UCFK = ucModule;
            UCFKDeferredResult.resolve(UCFK);
        }
        else {
            RESTClient.LoadUCFunctionMap().done(function (r) {
                UCFK = RESTClient._UCPermitMap[ucModule][ucFunction];
                if (!UCFK) console.warn("CheckPermit could not find {0}|{1} - verify proper case!".sfFormat(ucModule, ucFunction));
                UCFKDeferredResult.resolve(UCFK);
            });
        }

        if (!(optionalProject in RESTClient._LoadedPermits)) {
            RESTClient._GetRequest("session/permits/project/" + optionalProject).done(function (r) {
                console.log("Loaded Project {0} Permit set from server...".sfFormat(optionalProject));
                RESTClient._LoadedPermits[optionalProject] = r.Permits;
                ThisProjectPermitSet = r.Permits;
                PPSDeferredResult.resolve(r.Permits);
            });
        }
        else {
            ThisProjectPermitSet = RESTClient._LoadedPermits[optionalProject];
            PPSDeferredResult.resolve(RESTClient._LoadedPermits[optionalProject]);
        }

        var finalCheck = [PPSDeferredResult, UCFKDeferredResult];
        
        $.when.apply($, finalCheck).done(function () {
            var finalPermit = 0;
            $.each(ThisProjectPermitSet, function OneCapabilityCheck(ThisUCFK, capabilitySet) {
                if (ThisUCFK === UCFK) {
                    $.each(capabilitySet, function OnePermitCheck(_n, p : IUCPermit) {
                        var thisPermitValue = 0;
                        if (p.isGlobal || RESTClient._PermitMatches(p, optionalDTK, optionalReference)) {
                            if (p.readOK) thisPermitValue += 1;
                            if (p.insOK) thisPermitValue += 2;
                            if (p.updOK) thisPermitValue += 4;
                            if (p.delOK) thisPermitValue += 8;
                            if (p.blanketOK) thisPermitValue += 16;
                        }
                        finalPermit |= thisPermitValue;
                        return (finalPermit !== 31);
                    });
                }
                return (finalPermit !== 31);
            });
            RESTClient._UserPermitResultCache.set(PermitCacheID, finalPermit);
            DeferredResult.resolve(finalPermit);
        });
        return permitCheck; // wait for .done, use (r)
    }

    // GetActionItems(key: any) : Defered {
    //     if (!key) key = this._EmptyKey;
    //     return this._GetRequest("actionitems?forUserKey={0}".sfFormat(key));
    // }
    // GetAlerts (key: any) {
    //     if (!key) key = this._EmptyKey;
    //     return this._GetRequest("alerts?forUserKey={0}".sfFormat(key));
    // }
    // GetContact (key: any) {
    //     return this._GetRequest("contact/{0}".sfFormat(key));
    // }
    GetDV  (displayName: any, keyValue: any, dependsOn: any, autoVary: any) : Promise<string | null> {
        // future: finish support for dependsOn list
        var DeferredResult: Promise<string>;
        var requestData = this._getRequestData(displayName, keyValue, dependsOn);
        var cacheKey : string = "getDV:L{0}H{1}".sfFormat(requestData.length, requestData.sfHashCode());
        if (autoVary)
            requestData += "?{0}".sfFormat(this._getVaryByQValue());
        else {
            try {
                var result : any = sessionStorage.getItem(cacheKey);
                if (result === null) result = false;
                else if (typeof result === "string") {
                    result = JSON.parse(result);

                    if (Date.now() - result.w < this._DVCacheLife) {
                        DeferredResult = new Promise<string>(() => {return result.v});
                        return DeferredResult;
                    }
                }
            }
            catch (err2) { console.log("getDV() cache error: " + err2.message); }
        }

        if (cacheKey in this._CachedDVRequests) {
            // console.log("getDV({0}:{1}) reused pending request ".format(displayName, keyValue, "request"));
            return this._CachedDVRequests.get(cacheKey)!; // already requested, still pending
        }

        var RESTClient :   sfRestClient = this;
        // future: add pd1...pd4
        var api : LookupClient = new LookupClient(sfApplicationRootPath);
        var apiResultPromise : Promise<string | null> = api.getDisplayValue(displayName,"",keyValue,dependsOn,"","","");
        if (apiResultPromise) {
             apiResultPromise.then(
                (dvResult: string | null) =>{
                    if (dvResult) {
                        sessionStorage.setItem(cacheKey, JSON.stringify({ v: dvResult, w: Date.now() }));
                        if (cacheKey in RESTClient._CachedDVRequests)   RESTClient._CachedDVRequests.delete(cacheKey);  
                    }
        
            }

            );
        }   

         
        this._CachedDVRequests.set(cacheKey, apiResultPromise);
        return apiResultPromise;
    }
    // deprecated: use LookupClient.getSuggestions()
    // GetSuggestions (lookupName: any, pageDSK: any, dependsOn: any) {      
    //     throw console.error("deprecated: use LookupClient.getSuggestions()");   
    //     //return this._GetRequest("suggestions/{0}/{1}/{2}".sfFormat(lookupName, pageDSK, this._formatDependsList(dependsOn)));
    // }
    LoadUCFunctionMap () {
        var RESTClient :   sfRestClient = this;
        var DeferredResult = $.Deferred();
        var permitCheck = DeferredResult.promise();

        if (RESTClient._UCPermitMap._etag.w === 0) {
            // see about localStorage
            var ls = JSON.parse(localStorage.getItem(RESTClient._z.lsKeys.api_session_permits_map)!);
            if (ls && typeof ls._etag.w === "number") {
                console.log("Loaded Function Map from localStorage...");
                RESTClient._UCPermitMap = ls;
            }
        }
        if ((Date.now() - RESTClient._UCPermitMap._etag.w) < (this._DVCacheLife * 4)) {
            DeferredResult.resolve(RESTClient._UCPermitMap);
            return permitCheck;
        }

        var GetPermitMapRequest = RESTClient._GetRequest("session/permits/map?etag=" + Object.keys(RESTClient._UCPermitMap._etag)[0]).done(function DoneGetPermitMapRequest(r) {
            if (GetPermitMapRequest.status !== 304) {
                if (typeof r === "object" && typeof r._etag === "object") {
                    r._etag.w = Date.now();
                    console.log("Loaded Function Map from server...");
                    localStorage.setItem(RESTClient._z.lsKeys.api_session_permits_map, JSON.stringify(r));
                    RESTClient._UCPermitMap = r;
                }
                else {
                    console.log("LoadUCFunctionMap() could not load Function Map from server...", GetPermitMapRequest);
                }
            } else {
                console.log("LoadUCFunctionMap() resolved as not modified...");
            }

            DeferredResult.resolve(RESTClient._UCPermitMap);
        });

        return permitCheck;
    }
    LoadUserSessionInfo() {
        var RESTClient :   sfRestClient = this;
        var DeferredResult = $.Deferred();
        var ResultCheck = DeferredResult.promise();

        return RESTClient._GetRequest("session/who").done(function (r: any) {
            if (typeof r === "object") {
                $.each(r, function SetWCCProperties(pname : string | number, pvalue) {
                    RESTClient._WCC[pname] = pvalue;
                });
                RESTClient._z.WCCLoaded = true;
                RESTClient.LoadUCFunctionMap();
            }
        });
    }
    _DVCacheLife: number = 16 * 60000; // 16 minutes

    protected _addQueryValue (asPath : boolean, priorList: string | string[], idx : number, dv : any) : string {
        if (dv) {
            if (typeof dv === "string")
                if (dv.indexOf("$") >= 0) dv = dv.replaceAll("$DTK", this._WCC.DocTypeKey);
        }
        if (asPath) asPath = (priorList.indexOf("?") < 0);
        var parmSep : string = '&';
        if ((asPath) && ((dv === "?") || (dv === "&") || (dv === "%"))) {
            asPath = false;
            parmSep = '?';
        }
        return priorList + (asPath ? "/" : parmSep + "d" + (idx) + "=") + encodeURIComponent(dv);
    }
    protected _formatDependsList(asPath: any, depends1: string | string[], dep2?: string, dep3?: string, dep4?: string) : string {
        var dependsList = "";
        var RESTClient = this;
        if (Array.isArray(depends1)) {
            $.each(depends1, function (i, v) { dependsList = RESTClient._addQueryValue(asPath, dependsList, i + 1, v); });
        }
        else {
            //if (typeof depends1 !== "string" && typeof depends1 !== "undefined" && depends1 !== null) depends1 = depends1.toString();
            if (depends1 || typeof depends1 === "boolean") {
                dependsList = RESTClient._addQueryValue(asPath, dependsList, 1, depends1);
                if (dep2 || typeof dep2 === "boolean") dependsList = RESTClient._addQueryValue(asPath, dependsList, 2, dep2);
                if (dep3 || typeof dep2 === "boolean") dependsList = RESTClient._addQueryValue(asPath, dependsList, 3, dep3);
                if (dep4 || typeof dep2 === "boolean") dependsList = RESTClient._addQueryValue(asPath, dependsList, 4, dep4);
            }
        }
        return dependsList;
    }
    _getRequestData(displayName: string, pv: string | number | boolean, dependsOn: string | string[]) : string {
        // consolidate request components into a single string - dv/displayName/pv/d1/d2/d3
        var url = 'dv/' + displayName + "/" + encodeURIComponent(pv);
        url += this._formatDependsList(true, dependsOn);

        return url;
    }
    _getVaryByQValue() {
        return "zvqms={0}".sfFormat(new Date().valueOf());
    }
    _GetRequest(url: any) {
        url = this._APIURL(url);
        console.log(url);
        return $.getJSON(url);
    }
    _APIURL(suffix: any) {
        if (this._BaseURL.length === 0) this._BaseURL = sfApplicationRootPath + '/api/';
        return this._BaseURL + suffix;
    }

    _BaseURL : string = "";

    _LoadedParts : PartStorageList = new Map<string,PartStorageData>();

    _LoadedPermits : any = {};
   
    _ApplyUICFGtoRawData(this:PartStorageData, item: { DV: any, LookupName: any, OtherProperties: { DataType: string }, DataField: string }, idx: any, ui: any) {
        var thisPart : PartStorageData = this;

        if (item.DV || item.LookupName ||
            (item.OtherProperties && item.OtherProperties.DataType && item.OtherProperties.DataType === "Guid")) {
            console.log(item);
            if (item.DV) {
                thisPart.DataModels.get(thisPart._CurrentContext!).forEach(function (rawRow: { [x: string]: any; }, rawIdx: number, qq: any) {
                    thisPart._PromiseList!.push(thisPart.RestClient.GetDV(item.DV, rawRow[item.DataField],undefined,undefined).then(function (r: any) {
                       // I don't know how to do this yet
                       throw new Error("Not Implimented!!!");
                        // thisPart.DataModels.set(thisPart._CurrentContext!)[rawIdx][item.DataField + "_dv"] = r;
                    }));
                });
            }
            // future: finish support for resolution using LookupName ...
        }
    }
    readonly _EmptyKey: GUID = "00000000-0000-0000-0000-000000000000";
    _CachedDVRequests: Map<string,Promise<string | null>>  = new Map<string,Promise<string | null>>();
    _UserPermitResultCache: Map<string,number> = new Map<string,number>();
    _UCPermitMap: any = {
        _etag : { empty : 0,
             w  : 0
             }
    };

    _PermitMatches(permit: IUCPermit, optionalDTK: GUID, optionalReference: GUID) : boolean {
        // project match is assumed by this point (cached is by project)
        var result = true;
        if (permit.docTypeKey) {
            if (!optionalDTK || optionalDTK !== permit.docTypeKey) result = false;
        }
        if (permit.docReference) {
            if (!optionalReference || optionalReference !== permit.docReference) result = false;
        }

        return result;
    }
    _WCC: any = {
        DocSessionKey: "00000000-0000-0000-0000-000000000000",
        DocTypeKey: "00000000-0000-0000-0000-000000000000",
        DevMode: false,
        dsCacheKey: "1",
        UserKey: "00000000-0000-0000-0000-000000000000"
    }
    _z: any = {
        lsKeys: {
            api_session_permits_map:  "sfUCFunctionNameMap"
            },
        WCCLoaded : false
    }
};

// top.sfRestClient.GetActionItems().done(function(a) { top.sfRestClient.BuildViewModel("ActionItems",top.sfRestClient._EmptyKey,a).done(function(v){ console.log(v); });});
// top.sfRestClient.GetAlerts().done(function(a) { top.sfRestClient.BuildViewModel("AlertList",top.sfRestClient._EmptyKey,a).done(function(v){ console.log(v); });});