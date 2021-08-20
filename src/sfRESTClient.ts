//import { contains } from "jquery";
import { GUID } from "./globals";
import  { sfApplicationRootPath } from "./string.extensions";
import { ActionItemsClient, AlertsClient, ContactClient, ContactFilters, IUCPermit, LookupClient, ProjectTeamClient, ProjectsClient, QueryFilters, SessionClient, Suggestion, UCPermitSet, UICFGClient, UIDisplayConfig, UIDisplayPart } from "./SwaggerClients"
import * as _SwaggerClientExports from "./SwaggerClients";
import * as $ from 'jquery';
import { BrowserExtensionChecker } from "./BrowserExtensionChecker";
import { contains } from "jquery";
//import {dialog}    from "jquery-ui";

//export type GUID = string //& { isGuid: true };
/* eslint-disable prefer-template */
/* eslint-disable no-extend-native */
/* eslint-disable prefer-spread */
/* eslint-disable no-undef */
/* eslint-disable prefer-arrow-callback */
/* eslint-disable vars-on-top */
/* eslint-disable no-var */

// script created by Stan York and modified for typescript and linter requirements by Uladzislau Kumakou

export enum LoggingLevels {
    None,
    Normal,
    Verbose,
    Debug
}

type PartStorageList = Map<PartContextKey, PartStorageData>;
type DVCacheEntry = { w: number, v: string };
type RRCacheEntry = { w: number, v: string | number | boolean };
class _SessionClientGetWCCShare {
    APIResult: Promise<WCCData | null> | null = null;
    ForNavHash: number | undefined;
    public constructor( apiPromise: Promise<WCCData | null>,forPageHash : number) {
        this.APIResult = apiPromise;
        this.ForNavHash = forPageHash;
    }
}
class PartStorageData {

    CFG: UIDisplayPart | null;
    DataModels: Map<string, DataModelCollection>;
    RestClient: sfRestClient;
    _PromiseList: Promise<any>[] | null;
    protected _InitializationResultPromise: Promise<UIDisplayPart | null> | null;
    protected _ReferenceKey: PartContextKey;
    protected static _SiteURL: string;
    protected static _DMCount: number = 0;

    public CFGLoader(): Promise<UIDisplayPart | null> {
        if (!this._InitializationResultPromise) throw new Error("This part was never initialized: " + this._ReferenceKey);
        return this._InitializationResultPromise;
    }

    static _LoadedParts: PartStorageList = new Map<PartContextKey, PartStorageData>();
    public static PartStorageDataFactory(client: sfRestClient, partName: string, forDocType: GUID | undefined, context: string | undefined): PartStorageData {
        var ReferenceKey: PartContextKey = PartStorageData.GetPartContextKey(partName, forDocType, context);
        var thisPart: PartStorageData;
        if (PartStorageData._LoadedParts.has(ReferenceKey)) thisPart = PartStorageData._LoadedParts.get(ReferenceKey)!
        else {
            thisPart = new PartStorageData(client, partName, forDocType, context);
            var api: UICFGClient = new UICFGClient(PartStorageData._SiteURL);
            thisPart._InitializationResultPromise = api.getLiveDisplay(partName, forDocType, context);
            if (thisPart._InitializationResultPromise) {
                thisPart._InitializationResultPromise.then((r) => {
                    thisPart!.CFG = r;
                });
            }
        }
        return thisPart;
    }
    public static PartStorageDataLookupFactory(client: sfRestClient, lookupName: string): PartStorageData {
        var ReferenceKey: PartContextKey = PartStorageData.GetPartContextKey(lookupName,  "lookup", "lookup");
        var thisPart: PartStorageData;
        if (PartStorageData._LoadedParts.has(ReferenceKey)) thisPart = PartStorageData._LoadedParts.get(ReferenceKey)!
        else {
            thisPart = new PartStorageData(client, lookupName, "lookup", "lookup");
            var api: UICFGClient = new UICFGClient(PartStorageData._SiteURL);
            thisPart._InitializationResultPromise = api.getLookupDisplay(lookupName );
            if (thisPart._InitializationResultPromise) {
                thisPart._InitializationResultPromise.then((r) => {
                    thisPart!.CFG = r;
                });
            }
        }
        return thisPart;
    }

    public static GetPartContextKey(partName: string, forDocType: GUID | undefined, context: string | undefined): PartContextKey {
        return "{0}[{2}]::{1}".sfFormat(partName, forDocType, context);
    }

    public static GetDataModelBuildContextKey(): string {
        this._DMCount++;
        return "DVM#{0}".sfFormat(this._DMCount);
    }

    protected constructor(client: sfRestClient, partName: string, forDocType: GUID | undefined, context: string | undefined) {
        this.CFG = null;
        this.DataModels = new Map<string, any[]>();
        this.RestClient = client;
        this._PromiseList = null;
        this._ReferenceKey = PartStorageData.GetPartContextKey(partName, forDocType, context);
        PartStorageData._LoadedParts.set(this._ReferenceKey, this);
        this._InitializationResultPromise = null;

        if (!PartStorageData._SiteURL) {
            var ApplicationPath = window.location.pathname.substr(1, window.location.pathname.substr(1).indexOf("/"));
            PartStorageData._SiteURL = `${window.location.origin}/${ApplicationPath || 'sfPMS'}`;
        }
    }

}

/**
 * Options for Query Alias Popup ( QAPopInfo )
 */
class QAInfoOptions {
    /**
     * Title for JQueryUI dialog, eg "Routes that Reference Role: $V"; $V is replace by value text (see ValueCSS)
     */
    DialogTitle: string;
    /**
     * Applied to DIV around table.  Default is sfUIShowInfo
     */
    DialogCSS: string;
    /**
     * Shown if no results.  Example: "No route references were found."  Default: Nothing to see here...
     */
    EmptyDialogText: string ;
    /**
     * HTTP GET query that returns JSON; $K is replaced by key from callback
     */
    QueryURL:string // "util/jstNodes.ashx/qa/RoleMemberInfo/$K
    /**
     * When not empty, used to find value for $V
     */
     ValueCSS: string | undefined;

    // URLCallback: () => string
    //dvFor:string // "*";

/**
 *  Finds closest element with .sfUIPopQA and its matching .uiQA-xxx and creates options class from CSS -- attributes
 *
 *
 *  .sfQA-RoleRouteInfo {
 *
 *      --dialog-title:"Routes that Reference Role" ;
 *      --dialog-class:sfUIShowInfo;
 *      --dialog-value-class: false
 *      --dialog-empty-text:"No route references were found." ;
 *      --dialogQueryL:"util/jstNodes.ashx/qa/RoleMemberInfo/$K";
 *  }
 */
 public static QAInfoOptionsFromCSSFactory(forElement: JQuery<HTMLElement>): QAInfoOptions | null {
        var thisPart: QAInfoOptions;
        var title: string="", cssClass: string="sfUIShowInfo", emptyText: string="Nothing to see here!", queryURL: string="",ValueCSS="";
        if (!forElement.hasClass("sfUIPopQA") )         forElement = forElement.closest(".sfUIPopQA")
        if (forElement.length === 0) {
            console.log("QAInfoOptionsFromCSSFactory() could not find .sfUIPopQA ");
            return null;
        }

        title = QAInfoOptions.CSSPropertyValueOrEmpty(forElement,"--dialog-title");
        cssClass = QAInfoOptions.CSSPropertyValueOrEmpty(forElement,"--dialog-class",cssClass);
        ValueCSS = QAInfoOptions.CSSPropertyValueOrEmpty(forElement,"--dialog-value-class");
        emptyText = QAInfoOptions.CSSPropertyValueOrEmpty(forElement,"--dialog-empty-text",emptyText);
        queryURL = QAInfoOptions.CSSPropertyValueOrEmpty(forElement,"--dialog-query");

        thisPart = new QAInfoOptions(title, cssClass, emptyText, queryURL);
        if (ValueCSS) thisPart.ValueCSS = ValueCSS.trim();
        thisPart.LoadFromDataAttributes(forElement);
        return thisPart;
    }

    /**
     *
     * @param fromElement
     * @param cssName
     * @param defaultValue Specify if default is not empty string
     * @returns
     */
    protected static CSSPropertyValueOrEmpty(fromElement:JQuery<HTMLElement> , cssName:string, defaultValue?: string) : string{
        var CSSValue;
        CSSValue= fromElement.css(cssName);
        if (CSSValue) {
            CSSValue = CSSValue.trim();
            if (CSSValue.startsWith("'") || CSSValue.startsWith("\"")) {
                try {
                    CSSValue = eval(CSSValue);
                    CSSValue = CSSValue.trim();
                } catch (ex) {
                    console.warn("CSSPropertyValueOrEmpty could not EVAL {0}".sfFormat(CSSValue));
                }
            }
        }
        else if (defaultValue) CSSValue = defaultValue;
        else if (!defaultValue) CSSValue = "";
        return CSSValue;
    }

    LoadFromDataAttributes( fromElement : JQuery<HTMLElement>):void {
        var elementData = fromElement.data();
        if ("dialogtitle" in elementData) this.DialogTitle = elementData.dialogtitle;
        if ("dialogcss" in elementData) this.DialogCSS = elementData.dialogcss.trim();
        if ("valuecss" in elementData) this.ValueCSS = elementData.valuecss.trim();
        if ("emptydialogtext" in elementData) this.EmptyDialogText = elementData.emptydialogtext.trim();
        if ("dialogtitle" in elementData) {
            this.DialogTitle = elementData.dialogtitle;
        }
    }

    constructor(title: string, cssClass: string, emptyText: string, queryURL: string) {
//, urlCallback: () => string ) {
        this.DialogTitle = title;  // "Routes that Reference Role" ;
        this.DialogCSS = "sfUIShowInfo";
        if (cssClass) this.DialogCSS = cssClass.trim(); // "sfUIShowInfo";
        this.EmptyDialogText = emptyText; // "No route references were found." ;
        //this.dvFor = "*";
        //this.URLCallback = urlCallback;
        this.QueryURL = queryURL;
         if (!this.DialogCSS) this.DialogCSS = "sfUIShowInfo";
         if (!this.EmptyDialogText) this.EmptyDialogText = "Nothing to see here...";
    }
}

export class NVPair { [key: string]: any; }
export class WCCData { [key: string]: any; }
export class DataModelRow { [key: string]: any; };
export class DataModelCollection { [key: string]: any; } [];
export type PartContextKey = string // PartName[context]::dtk
export type Permits = number; // 0...31, see PermissionFlags
/** See sfRestClient.PageTypeNames */
export type PageTypeName = number; // see PageTypeNames
export type PagePartList= {[key: string]: Permits};


export class sfRestClient {
    version: string = "2020.0.7899";
    /**
     * Helps decode Permit flags
     */
     public readonly PermissionFlags = {
        Read: 1,
        Insert:  2,
        Update:  4,
        Delete:  8,
        Special:  16
    }

    /** For identifying the type of page/dashboard */
    public readonly PageTypeNames = {
        HomeDashboard: 1,
        ProjectDashboard: 2,
        Catalog: 4,
        ExecutiveDashboard: 8,
        AdminDashboard:16,
        ManageDashboard: 32,
        Contacts: 64,
        Document: 1024,
        Unknown: 8092
    }

    /**
     * Applies removals, then changes, then additions
     * @param rawData array of Data Model or View Model
     * @param keyName name of key field in this data model
     * @param changes (Add,Change,Remote)
     * @returns merged rawData
     */
    ApplyDataChanges(rawData: DataModelCollection, keyName: string, changes: _SwaggerClientExports.DataDifferential) : DataModelCollection {
        var RESTClient = this;
        var StartAtTicks = Date.now();
        var RemoveCount = 0, ChangeCount = 0, AddCount = 0;
        if (!rawData) rawData = [];
        if (changes.Remove) {
            changes.Remove.forEach(element => {
                var foundRow = RESTClient.FindRowIndexByKey(rawData,keyName,element);
                if (typeof foundRow === "number" && foundRow >= 0) {
                    rawData.splice( foundRow,1);
                    RemoveCount ++;
                }
                else  if (RESTClient._Options.LogLevel >= LoggingLevels.Verbose) console.log("ApplyDataChanges(REMOVE) did not find a row with key {0}".sfFormat(element));
            } );
        }

        if (changes.Change) {
            changes.Change.forEach( (element:DataModelRow) => {
                var thisKey : string = element[keyName];
                var foundRow = RESTClient.FindRowIndexByKey(rawData,keyName,thisKey);
                if (typeof foundRow === "number" && foundRow >= 0){
                    rawData[foundRow] = element;
                    ChangeCount ++;
                }
                else {
                    if (RESTClient._Options.LogLevel >= LoggingLevels.Verbose) console.log("ApplyDataChanges(CHANGE) did not find a row with key {0} (changed to add)".sfFormat(element));
                    changes.Add?.push( element); // !!! does this work?
                }
            } );
        }
        if (changes.Add) {
            changes.Add.forEach(element=>  rawData.push(element));
            AddCount += changes.Add.length;
        }
        if (RESTClient._Options.LogLevel >= LoggingLevels.Verbose) console.log("ApplyDataChanges({0}) removed {1}, changed {2}, added {3} in {4}t ".sfFormat(keyName,
                                                                            RemoveCount , ChangeCount , AddCount,            Date.now() - StartAtTicks));
        return rawData;
    }

    /**
     * Extracts key, etag pairs from a set of data
     * @param rawData array of Data Models or View Models, must have etag
     * @param keyName
     * @returns array of key, etag pairs, suitable for passing to getChange* API endpoints
     */
    BuildDataSummary( rawData: DataModelCollection, keyName: string) : _SwaggerClientExports.CurrentDataSummary[] {
        var result : _SwaggerClientExports.CurrentDataSummary[] = [];
        if (!rawData) return result;
        if (!Array.isArray(rawData)) {
            var SingleElementArrayOfRawData : DataModelRow[]  = [];
            SingleElementArrayOfRawData.push(rawData);
            rawData = SingleElementArrayOfRawData;
        }
        else {
            if (rawData.length === 0) return result;
        }
        if (!(keyName in rawData[0])) {
            console.warn("BuildDataSummary() - rawData does not include keyName {0} ".sfFormat(keyName));
            return result;
        }
        if (!("ETag" in rawData[0])) {
            console.warn("BuildDataSummary() - rawData does not include ETag".sfFormat(keyName));
            return result;
        }
        var RESTClient = this;
        rawData.forEach(function(row:DataModelRow) {
            if ( row[keyName]) {
                result.push(new _SwaggerClientExports.CurrentDataSummary({"RowKey":row[keyName], "ETag": row["ETag"]}));
            }
        });

        return result;
    }


    /**
      *  Async builds a View Model for the rawData, given part context.  - use .then()
      */
    BuildViewModelForContext(partName: string, context: string, forDocType: GUID | undefined, rawData: [{}] | {}): Promise<DataModelCollection> {
        if (!this._z.WCCLoaded) this.LoadUserSessionInfo();
        var thisPart: PartStorageData | undefined = PartStorageData.PartStorageDataFactory(this, partName, forDocType, context);
        if (!thisPart) {
            console.warn("Count not resolve part {0}".sfFormat(PartStorageData.GetPartContextKey(partName, forDocType, context)));
            var EmptyPromise: Promise<DataModelCollection> = new Promise<DataModelCollection>((resolve) => resolve(rawData));
            return EmptyPromise;
        }
        var FinalViewModelPromise: Promise<DataModelCollection> = new Promise<DataModelCollection>((finalResolve) => {
            thisPart!.CFGLoader().then(() => {
                var ViewModelPromise: Promise<DataModelCollection> = this._ConstructViewModel(thisPart!, rawData);
                ViewModelPromise.then((r) => finalResolve(r));
            });
        });
        return FinalViewModelPromise;
    }

    /**
     *  Legacy version of BuildViewModelForContext  - use .done()
     */
    BuildViewModel(partName: string, context: string, rawData: any, unusedCfgData: undefined, forDocType: GUID | undefined): JQueryPromise<any> {
        if (!this._z.WCCLoaded) this.LoadUserSessionInfo();
        var thisPart: PartStorageData | undefined = PartStorageData.PartStorageDataFactory(this, partName, forDocType, context);
        var darnSoon = $.Deferred();
        var ResultReady = darnSoon.promise();
        // what purpose would this serve?? if (cfg) thisPart.CFGLoader = cfg;
        thisPart.CFGLoader().then(() => {
            this._ConstructViewModel(thisPart!, rawData)
                .then((r) => darnSoon.resolve(r))
        }
        );
        return ResultReady;
    }

    /**
     * Updates row visibility on the server and updates the in-memory flags for display of this row
     * @param partName ProjTeam or ProjectPublicInfo
     * @param rawData ViewModel containing raw row data
     */
    ToggleRowVisibility( partName: string, rawData: DataModelRow) : Promise<boolean> {

        var DataField : string = "TeamList";
        var api : ProjectTeamClient | ProjectsClient;
        const FlagVisibleFieldName = "_DefaultRowVisible";
        var ServerUpdatePromise :Promise<string> | undefined;
        var RowKey = ""
        var NewValue = false;
        var APIContext : string = "";

        if (partName === "ProjTeam") {
            DataField = "TeamList";
            api = new ProjectTeamClient(this._SiteURL);
            NewValue = !(rawData[FlagVisibleFieldName]);
            RowKey = rawData["UserProjectKey"];
            APIContext = this.GetPageProjectKey();
            ServerUpdatePromise = api.patchProjectTeam(APIContext,RowKey,DataField, NewValue.toString());
        }
        else if (partName === "ProjectPublicInfo") {
            DataField = "UserList";
            api = new ProjectsClient(this._SiteURL);
            NewValue = !(rawData[FlagVisibleFieldName]);
            RowKey = rawData["UserProjectKey"];
            APIContext = this.EmptyKey; // future! get current user key
            ServerUpdatePromise = api.patchUserProjectList(APIContext,RowKey,DataField, NewValue.toString());
        }
        else {
            console.warn("ToggleRowVisibility - Unsupported: ",partName)
            ServerUpdatePromise = undefined;
        }



        var FinalPromise: Promise<boolean> = new Promise<boolean>((finalResolve) => {
            if (!ServerUpdatePromise) {
                finalResolve(false);
                return;
            }
            ServerUpdatePromise.then(()=>{
                    rawData[FlagVisibleFieldName] = NewValue;
                    rawData[DataField] = NewValue;
                    finalResolve(true);
                }).catch( (reason) =>{
                console.warn("ToggleRowVisibility({0},{1}) Failed persist {2} to {3}, {4}".sfFormat(partName,RowKey,DataField,NewValue,reason));
                finalResolve(false);
            });
        });
        return FinalPromise;
    }

    /**
     *  Applies CFG data to raw Data Model, returns promise that resolves when View Model is ready
     */
    protected _ConstructViewModel(thisPart: PartStorageData, rawData: any): Promise<DataModelCollection> {
        if (!thisPart || !thisPart.CFG || !thisPart!.CFG.UIItems) new Error("Cannot construct this ViewModel");
        var StartAtTicks: number = Date.now();
        var DataModelBuildKey: string = PartStorageData.GetDataModelBuildContextKey();
        var FailCount: number= 0;
        var SingleInstanceMode = false;
        if (!Array.isArray(rawData)) {
            SingleInstanceMode = true;
            var SingleElementArrayOfRawData  = [];
            SingleElementArrayOfRawData.push(rawData);
            rawData = SingleElementArrayOfRawData;
        }
        thisPart!.DataModels.set(DataModelBuildKey, rawData);

        thisPart!._PromiseList = [];

        // this loop builds PromiseList
        thisPart!.CFG!.UIItems!.forEach(element => thisPart!.RestClient._ApplyUICFGtoRawData(element, thisPart!, DataModelBuildKey));

        var ViewModelPromise: Promise<DataModelCollection> = new Promise<DataModelCollection>((resolve) => {
            $.when.apply($, thisPart!._PromiseList!)
                .done(function () {
                    var FinalData =thisPart!.DataModels.get(DataModelBuildKey!)!;
                    if (SingleInstanceMode) FinalData = FinalData[0];
                    resolve(FinalData);
                    thisPart!.DataModels.delete(DataModelBuildKey);
                    if (thisPart!.RestClient._Options.LogLevel >= LoggingLevels.Verbose) console.log("ViewModel {0} complete in {1}t".sfFormat(DataModelBuildKey, Date.now() - StartAtTicks));
                }).fail(function(jqXHR, textStatus, errorThrown) {
                    if (FailCount === 0) {
                        var FinalData =thisPart!.DataModels.get(DataModelBuildKey!)!;
                        if (SingleInstanceMode) FinalData = FinalData[0];
                        resolve(FinalData);
                        thisPart!.DataModels.delete(DataModelBuildKey);
                        FailCount++;
                    }
                    console.warn("ViewModel {0} failed to complete cleanly; {2} fails; {1}t".sfFormat(DataModelBuildKey, Date.now() - StartAtTicks,FailCount));
                });
        });
        return ViewModelPromise;

    }

    /**
    * async: returns an numerc bit-flag indicating the user's permission level (R=1,I=2,U=4,D=8,S=16)
    * When the user has admin permissions, these are blended (unless ucModule = WORK)
    * @param ucModule WORK,SYS, PAGE, PART,LIST
    * @param ucFunction see xsfUCFunction
    * @param optionalDTK guid or undefined
    * @param optionalProject
    */
    CheckPermit(ucModule: string, ucFunction: string, optionalDTK?: string, optionalProject?: string, optionalReference?: string): Promise<Permits> {
        var RESTClient: sfRestClient = this;
        //was $.Deferred();
        var DeferredPermitResult : Promise<Permits> = new Promise<Permits>(async (ResolveThisPermit) => {
            if (!RESTClient._z.WCCLoaded) await RESTClient.LoadUserSessionInfo();
            if (typeof optionalDTK !== "string") optionalDTK = "";
            if (typeof optionalReference !== "string") optionalReference = "";
            if (typeof optionalProject !== "string" || !optionalProject) optionalProject = "0";
            var PermitCacheID = ucModule + "_" + ucFunction
                + "_T" + optionalDTK.replaceAll("-", "")
                + "_R" + optionalReference
                + "_P" + optionalProject;
            var ValueFromCache = RESTClient._UserPermitResultCache.get(PermitCacheID);
            if (typeof ValueFromCache === "number") {
                ResolveThisPermit(ValueFromCache);
                return;
            }

            var UCFK = "";
            var ThisProjectPermitSet: UCPermitSet | undefined;
            var UCFKDeferredResult = $.Deferred();
            var UCFKPromise = UCFKDeferredResult.promise();
            var PPSDeferredResult = $.Deferred();
            var PPSPromise = PPSDeferredResult.promise();
            if (!sfRestClient.PermitMapLoaded()) {
                // new approach, lets wait for a map
                await RESTClient.LoadUCFunctionMap();
                if (!sfRestClient.PermitMapLoaded()) {
                    // still no map!?
                    console.warn("CheckPermits() could not load Permit Map!!");
                }
            }
            if (ucModule.length === 36) {
                UCFK = ucModule;
                UCFKDeferredResult.resolve(UCFK);
            }
            else if (sfRestClient._UCPermitMap && ucModule in sfRestClient._UCPermitMap
                        && ucFunction in sfRestClient._UCPermitMap[ucModule] ) {
                    UCFK = sfRestClient._UCPermitMap[ucModule][ucFunction];
                    UCFKDeferredResult.resolve(UCFK);
            }
            else UCFKDeferredResult.resolve(RESTClient.EmptyKey);

            if (!UCFK) {
                if (RESTClient._WCC.UserKey == RESTClient.EmptyKey)
                    console.warn("CheckPermit(): >>>> No user/session!! <<<< Therefore no permission for {0}|{1}!  LOGIN AGAIN!".sfFormat(ucModule, ucFunction))
                else console.warn("CheckPermit could not find {0}|{1} - verify proper case/trim!".sfFormat(ucModule, ucFunction));
                ResolveThisPermit(0);
                return;
            }

            if (!(RESTClient._LoadedPermits.has("0"))) { // global permissions
                var api = new SessionClient(this._SiteURL);
                var apiResult: Promise<UCPermitSet | null> = api.getProjectPermits("0");
                if (apiResult) {
                    apiResult.then((r) => {
                        if (r) {
                            console.log("Loaded Global Permits from server...");
                            RESTClient._LoadedPermits.set("0", r);
                        }
                    });
                    await apiResult;
                }
            }


            if (!(RESTClient._LoadedPermits.has(optionalProject))) {
                var api = new SessionClient(this._SiteURL);
                var apiResult: Promise<UCPermitSet | null> = api.getProjectPermits(optionalProject);
                if (apiResult) {
                    apiResult.then((r) => {
                        if (r) {
                            console.log("Loaded Project {0} Permits from server...".sfFormat(optionalProject));
                            RESTClient._LoadedPermits.set(optionalProject!, r);
                            ThisProjectPermitSet = r!;
                            PPSDeferredResult.resolve(r);
                        }
                    });
                }
            }
            else {
                ThisProjectPermitSet = RESTClient._LoadedPermits.get(optionalProject);
                PPSDeferredResult.resolve(ThisProjectPermitSet);
            }

            var finalCheck = [PPSPromise, UCFKPromise];

            $.when.apply($, finalCheck).done(function () {
                var finalPermit : Permits = 0;
                var GlobalPermits = RESTClient._LoadedPermits.get("0")?.Permits;
                $.each([ThisProjectPermitSet?.Permits,GlobalPermits],function CheckOneSource(sourceIdx, thisSource) {
                    $.each(thisSource, function OneCapabilityCheck(ThisUCFK, capabilitySet) {
                        if (ThisUCFK === UCFK) {
                            $.each(capabilitySet, function OnePermitCheck(_n, p: IUCPermit) {
                                var thisPermitValue : Permits = 0;
                                if (p.IsGlobal || RESTClient._PermitMatches(p, optionalDTK!, optionalReference)) {
                                    if (p.ReadOK) thisPermitValue += RESTClient.PermissionFlags.Read;
                                    if (p.InsOK) thisPermitValue += RESTClient.PermissionFlags.Insert;
                                    if (p.UpdOK) thisPermitValue += RESTClient.PermissionFlags.Update;
                                    if (p.DelOK) thisPermitValue += RESTClient.PermissionFlags.Delete;
                                    if (p.BlanketOK) thisPermitValue += RESTClient.PermissionFlags.Special;
                                }
                                finalPermit |= thisPermitValue;
                                return (finalPermit !== 31);
                            });
                        }
                        return (finalPermit !== 31);
                    });
                });

                if (ucModule !== "WORK") finalPermit = finalPermit |  RESTClient._WCC.AdminLevel;
                RESTClient._UserPermitResultCache.set(PermitCacheID, finalPermit);
                ResolveThisPermit(finalPermit);
                // we do have global permits above: what use case was this for???
                // if (finalPermit === 31) {
                //     RESTClient._UserPermitResultCache.set(PermitCacheID, finalPermit);
                //     ResolveThisPermit(finalPermit);
                // }
                // else {
                //     // not ideal: future we need a way to hold global permits here too
                //     var api : SessionClient = RESTClient.NewAPIClient("SessionClient");
                //     api.getCapabilityPermits(ucModule,ucFunction.replaceAll(".","!").replaceAll("/","@"),optionalProject,optionalDTK).then((r)=>{
                //         RESTClient._UserPermitResultCache.set(PermitCacheID, r);
                //         ResolveThisPermit(r);
                //     });
                // }

            });
        });
        return DeferredPermitResult; // wait for .then, use (r)
    }

    /**
     * Resolves list of part names with permissions
     * @returns object with part names and permission flags
     */
    GetPagePartPermits(forPageName? : PageTypeName  , pageKey? : string) : Promise<PagePartList> {
        if (typeof pageKey === "undefined") pageKey =  "0";
        if (typeof forPageName === "undefined") {
            forPageName = this.ResolvePageTypeName();
        }
        var DeferredPermitResult : Promise<PagePartList> = new Promise<PagePartList>((ResolveList) => {
            var finalCheck : JQuery.Promise<any,any,any>[] = [] ;
            var PartNameList: string[] = [];
            var PageParts: PagePartList = {};
            if (forPageName === this.PageTypeNames.HomeDashboard ) { PartNameList = ["ActionItems","ProjectList","AlertList"];}
            else if (forPageName === this.PageTypeNames.ProjectDashboard) {
                PartNameList = ["ProjTeam","ProjectKPI","ProjLinks","ProjectCA","ProjNote","ProjPhoto","ProjWeather"];
                if (pageKey!.length <= 1) pageKey = this.GetPageProjectKey();
                // special case for project dashboards: ProjDocMenu
                PageParts["ProjDocMenu"] = 1;
            }
            else {
                console.warn("GetPagePartPermits() does not (yet) support ",forPageName);
            }

            PartNameList.forEach(element  => {
                var OnePartPermitDeferred = $.Deferred();
                var OnePartPermitDeferredPromise = OnePartPermitDeferred.promise();
                finalCheck.push(OnePartPermitDeferredPromise);
                if (!pageKey && typeof pageKey === "string" ) pageKey = undefined;
                this.CheckPermit("PART",element,undefined,pageKey).then((r)=>{
                    PageParts[element] = r;
                    OnePartPermitDeferred.resolve(r);
                });
            });

            $.when.apply($, finalCheck).done(function () {
                ResolveList(PageParts)
            });
        });
        return DeferredPermitResult;
    }

    /**
     * Returns set of choices for an auto-complete based on the seed value
     * @param lookupName
     * @param seedValue 0 or more characters which will limit the suggestions
     * @param dependsOn 0 to 4 values required by the lookup for context
     * @param limit a reasonable number of suggestions to be returned
     * @returns
     */
    GetLookupSuggestions(lookupName : string, seedValue: string,
          /**
         * either a string or string array (up to 4 elements);
        */
           dependsOn: string | string[] | undefined,
          limit: number) : Promise<Suggestion[] | null> {

            var apiResultPromise: Promise<Suggestion[] | null>

            //var RESTClient: sfRestClient = this;
            var api: LookupClient = new LookupClient(this._SiteURL);
            var DependsOnSet: string[] = ["", "", "", "",""];
            if (Array.isArray(dependsOn)) {
                $.each(dependsOn, function (i, v) { DependsOnSet[i] = v; });
            }
            else if (dependsOn) {
                DependsOnSet[0] = dependsOn;
            }


            //var apiResultPromise: Promise<Suggestion[] | null> = api.getSuggestions4(lookupName, "1", DependsOnSet[0], DependsOnSet[1], DependsOnSet[2], DependsOnSet[3],seedValue,limit);
            var SuggestionContext = new _SwaggerClientExports.QueryFilters();
            SuggestionContext.DependsOn = DependsOnSet;
            SuggestionContext.MatchingSeed = seedValue;
            SuggestionContext.ResultLimit = limit;
            var apiResultPromise : Promise<Suggestion[] | null> = api.getSuggestionsWithContext(lookupName,"1",SuggestionContext)

            return apiResultPromise;
    }

    /**
     * Returns a View Model constructured for the result rows matching specified lookup context and filters
     * @param lookupName
     * @param dependsOn 0 to 4 values required by the lookup for context
     * @param filterValues  default to {}
     * @returns
     */
    GetLookupResults(lookupName : string,
        /**
       * either a string or string array (up to 4 elements);
      */
         dependsOn: string | string[] | undefined,
         filterValues: QueryFilters
         ) : Promise<DataModelCollection> {

          var apiResultPromise: Promise<{[key:string]:any}[] | null>;


          //var RESTClient: sfRestClient = this;
          var api: LookupClient = new LookupClient(this._SiteURL);
          var DependsOnSet: string[] = ["", "", "", "",""];
          if (Array.isArray(dependsOn)) {
              $.each(dependsOn, function (i, v) { DependsOnSet[i] = v; });
          }
          else if (dependsOn) {
              DependsOnSet[0] = dependsOn;
          }


          var FinalViewModelPromise: Promise<DataModelCollection> = new Promise<DataModelCollection>((finalResolve) => {
            apiResultPromise  = api.getLookupResultBase(lookupName, "1", DependsOnSet[0], DependsOnSet[1], DependsOnSet[2], DependsOnSet[3],filterValues);

            apiResultPromise.then((lookupResultData) => {
                  var thisPart : PartStorageData = PartStorageData.PartStorageDataLookupFactory(this,lookupName);
                  thisPart!.CFGLoader().then(() => {
                    var ViewModelPromise: Promise<DataModelCollection> = this._ConstructViewModel(thisPart!, lookupResultData);
                    ViewModelPromise.then((r) => finalResolve(r));
                });
            });


        });
        return FinalViewModelPromise;
  }


    /**
     * Get Display Value using DV-Name and key value, with 0 to 4 dependencies.
     * @param displayName the name of a display value rule (eg sfUser, RoleName, etc)
     * @param keyValue the primary or most significant key
     * @param dependsOn optional array of context values (multi-part key); 0 to 4 elements allowed
     * @param autoVary force bypass of cache
     * @returns Promise for String
     */
    GetDV(displayName: string, keyValue: string,
        /**
         * either a string or string array (up to 4 elements)
        */
        dependsOn: string | string[] | undefined,
        /**
         * when true, a unique value is added to defeat cache
        */
        autoVary?: boolean | undefined): Promise<string | null> {
        // future: finish support for dependsOn list
        var apiResultPromise: Promise<string | null>
        if (!keyValue) return new Promise<string | null>((resolve) => resolve(""));

        var requestData = this._getDVRequestString(displayName, keyValue, dependsOn);
        if (autoVary) requestData += "?{0}".sfFormat(this._getVaryByQValue());
        var cacheKey: string = "GetDV:L{0}H{1}".sfFormat(requestData.length, requestData.sfHashCode());

        try {
            var result: string | null = sessionStorage.getItem(cacheKey);
            if (!result) {
                // continues below - must get value
            }
            if (typeof result === "string") {
                var CacheResult: DVCacheEntry = JSON.parse(result);

                if ((Date.now() - CacheResult.w) < this._Options.DVCacheLife) {
                    apiResultPromise = new Promise<string | null>((resolve) => resolve(CacheResult.v));
                    return apiResultPromise;
                }
            }
            // if falls through, we get a fresh value
        }
        catch (err2) {
            new Error("GetDV() cache error: " + err2.message);
        }


        if (this._CachedDVRequests.has(cacheKey)) {
            if (this._Options.LogLevel >= LoggingLevels.Debug) console.log("GetDV({0}:{1}) reused pending request ".sfFormat(displayName, keyValue, "request"));
            return this._CachedDVRequests.get(cacheKey)!; // already requested, still pending or not doesn't matter
        }

        var RESTClient: sfRestClient = this;
        var api: LookupClient = new LookupClient(this._SiteURL);
        var DependsOnSet: string[] = ["undefined", "undefined", "undefined", "undefined"];
        if (Array.isArray(dependsOn)) {
            $.each(dependsOn, function (i, v) {
                 if ( v !== undefined) DependsOnSet[i] = v;
            });
        }
        else if (dependsOn) DependsOnSet[0] = dependsOn;
        var apiResultPromise: Promise<string | null> = api.getDisplayValue(displayName, "1", keyValue, DependsOnSet[0], DependsOnSet[1], DependsOnSet[2], DependsOnSet[3]);
        if (apiResultPromise) {
            apiResultPromise.then(
                (dvResult: string | null) => {
                    if (dvResult) {
                        sessionStorage.setItem(cacheKey, JSON.stringify({ v: dvResult, w: Date.now() }));
                        if (RESTClient._CachedDVRequests.has(cacheKey)) RESTClient._CachedDVRequests.delete(cacheKey);
                    }

                }
            );
        }
        this._CachedDVRequests.set(cacheKey, apiResultPromise);
        return apiResultPromise;
    }
    /**
     * Async Get Part Configuration Data given part name, doc type and context
    */
    GetPartCFG(partName: string, forDocType?: GUID, partContext?: string): Promise<UIDisplayPart | null> {
        var thisPart: PartStorageData | undefined = PartStorageData.PartStorageDataFactory(this, partName, forDocType, partContext);
        return thisPart.CFGLoader();
    }

    /**
     * Async Get of Lookup column configuration data
     * @param lookupName name of required Lookup
     * @returns UIDisplayPart with relevant UIItems and UIFilters
     */
    GetLookupCFG(lookupName: string) : Promise<UIDisplayPart | null > {
        var thisPart: PartStorageData | undefined = PartStorageData.PartStorageDataLookupFactory(this, lookupName);
        return thisPart.CFGLoader();
    }

    RuleResult(ruleName : string, testValue : string, filterValue : string | undefined, defaultValue: string | number | boolean) : Promise<string | number | boolean | null> {
        var apiResultPromise: Promise<string | number | boolean | null>
        var cacheKey: string = "GetRR:{0}T{1}F".sfFormat(ruleName, testValue.sfHashCode(), filterValue?.sfHashCode());

        try {
            var result: string | null = sessionStorage.getItem(cacheKey);
            if (!result) {
                // continues below - must get value
            }
            if (typeof result === "string") {
                var CacheResult: RRCacheEntry = JSON.parse(result);

                if ((Date.now() - CacheResult.w) < this._Options.DVCacheLife) {
                    apiResultPromise = new Promise<string | number | boolean | null>((resolve) => {
                        console.log("Rule Result from Cache {0}|{1}[{2}] = {3}".sfFormat(ruleName,testValue,filterValue,CacheResult.v));
                        resolve(CacheResult.v);
                    });
                    return apiResultPromise;
                }
            }
            // if falls through, we get a fresh value
        }
        catch (err2) {
            new Error("RuleResult() cache error: " + err2.message);
        }

        // rule checks are not so numerous that we worry about in process requests
        // if (this._CachedDVRequests.has(cacheKey)) {
        //     if (this._Options.LogLevel >= LoggingLevels.Debug) console.log("GetDV({0}:{1}) reused pending request ".sfFormat(displayName, keyValue, "request"));
        //     return this._CachedDVRequests.get(cacheKey)!; // already requested, still pending or not doesn't matter
        // }

        var RESTClient: sfRestClient = this;
        var api: UICFGClient = new UICFGClient(this._SiteURL);

        apiResultPromise  = new Promise<string | number | boolean | null>((resolve) => {
            if (typeof defaultValue === "number") {
                api.getRuleResultAsNumber(ruleName,testValue,filterValue,defaultValue).then(r=>resolve(r));
            }
            else if (typeof defaultValue === "boolean") {
                api.getRuleResultAsBoolean(ruleName,testValue,filterValue,defaultValue).then(r=>resolve(r));
            }
            else {
                api.getRuleResult(ruleName,testValue,filterValue,defaultValue).then(r=>resolve(r));
            }
        });

        if (apiResultPromise) {
            apiResultPromise.then(
                (rr: string | number | boolean | null) => {
                    if (rr) {
                        sessionStorage.setItem(cacheKey, JSON.stringify({ v: rr, w: Date.now() }));
                       // if (RESTClient._CachedDVRequests.has(cacheKey)) RESTClient._CachedDVRequests.delete(cacheKey);
                    }
                }
            );
        }
        //this._CachedDVRequests.set(cacheKey, apiResultPromise);
        return apiResultPromise;
    }

    /**
     * Pops up a dialog showing result of a qAlias query
     *
     * @param forElement either an JQuery element or QAInfoOptions object
     * @param queryOptions? if specified, passes Query URL, title and other options
     * @param resolveKey callback function that resolves $K for the URL
     * @param onPostback not currently used, typically (t,a)=> __doPostback(t,a);
     * @returns forElement (which may now have a .dialog)
     *
    */
    PopQAInfo( forElement : JQuery<HTMLElement> , queryOptions?: QAInfoOptions,
        resolveKey?: (forElement: JQuery<HTMLElement>) => string,
        resolveValue?: (forElement: JQuery<HTMLElement>, queryOptions: QAInfoOptions) => string,
        onPostback?: (eventTarget: string, eventArgs: string) => void                ) : JQuery<HTMLElement> {

    var RESTClient : sfRestClient = this;
    if (typeof queryOptions === "undefined")
     {
        var TempOptions : QAInfoOptions | null;
        TempOptions =   QAInfoOptions.QAInfoOptionsFromCSSFactory(forElement);
        if (!TempOptions) return forElement;
        queryOptions =   TempOptions;
    }

    queryOptions.LoadFromDataAttributes(forElement);
    var url = queryOptions.QueryURL;
    if (!url) {
        if (this._Options.LogLevel > LoggingLevels.None) console.log("PopQAInfo() - no query resolved");
        return forElement;
    }
    if (url.indexOf("$K")) {
        if (typeof resolveKey === "undefined") throw new Error("PopQAInfo requires resolveKey callback when URL includes $K");
        url = url.replaceAll("$K", resolveKey(forElement));
    }
    if (queryOptions.DialogTitle.indexOf("$V")) {
        if (typeof resolveValue === "undefined") throw new Error("PopQAInfo requires resolveValue callback when options include $V");
        queryOptions.DialogTitle = queryOptions.DialogTitle.replaceAll("$V",resolveValue(forElement,queryOptions));
    }

    // search for already open popup querys
    var $GCI : JQuery<HTMLElement> = $('.{0}'.sfFormat(queryOptions.DialogCSS.replace(' ', '.')));
    if ($GCI.length > 0) {
        $GCI.dialog('close');
        $GCI[0].remove();
    }

    // open div in the top window, not the current dialog (no nesting)
    $GCI = window.top.$("<div class='{0}' />".sfFormat(queryOptions.DialogCSS));
    $GCI.html("Loading....");
    // //width: window.top.$(window.top).width() * 0.88

    //this.AssureJQUITools($GCI).then((unused) => {

        $GCI.dialog({
            title: queryOptions?.DialogTitle, height: "auto", width: "auto", position: "top center"
            , show: { effect: "blind", duration: 100 }
            , close: function (event?:any, ui?:any) {
                $GCI.dialog('destroy');
                }
            }
        );
        if (RESTClient._Options.LogLevel > LoggingLevels.None) console.log("PopQAInfo() loading {0}".sfFormat(url));
        if (!url.startsWith(".")) url = this.MakeSiteRelativeURL(url);
        $GCI.load(url, function (responseText, textStatus, jqXHR: JQuery.jqXHR) {
            var isEmpty = false;
            if (responseText.startsWith("[{")) {
                var ldata = JSON.parse(responseText);
                var table = RESTClient.MakeTable(ldata);
                $GCI.html(table.prop("outerHTML"));
                isEmpty = ($GCI.html() == "" || $GCI.html() == "[]")
            }
            else if (jqXHR.status !== 200 && textStatus) {
                $GCI.html("{0}</hr>{1}".sfFormat(textStatus , jqXHR.responseText));
                if (jqXHR.responseText.length > 1234) $GCI.css("width",$(window.top).width()! - 48);
            }
            else if (!responseText || (typeof responseText === "string" && responseText === "[]")) isEmpty = true;
            if (isEmpty) {
                $GCI.html(queryOptions?.EmptyDialogText!);
            }
        });
   // });

    return forElement;
    }

    /**
     * Maps .NET placeholders (dn) to webix placeholders (dx)
     * Important: order matters (eg: dd must be remapped before d, or the d map would be used)
     */
    protected readonly _DateFormatMap: {dn:string,dx:string}[] = [
            {"dn":"dddd","dx":"%l"} // Tuesday
        ,   {"dn":"ddd","dx":"%D"}  // Tue
        ,   {"dn":"dd","dx":"%d"}   // 08
        ,   {"dn":"d","dx":"%j"}    // 8
        ,   {"dn":"MMMM","dx":"%F"} // March
        ,   {"dn":"MMM","dx":"%M"}  // Mar
        ,   {"dn":"MM","dx":"%m"}   // 03
        ,   {"dn":"M","dx":"%n"}    // 3
        ,   {"dn":"yyyy","dx":"%Y"}
        ,   {"dn":"yy","dx":"%y"}
        ,   {"dn":"hh","dx":"%h"}   // 12 hour clock
        ,   {"dn":"h","dx":"%g"}
        ,   {"dn":"HH","dx":"%H"}   // 24 hour clock
        ,   {"dn":"H","dx":"%G"}
        ,   {"dn":"mm","dx":"%i"}
        ,   {"dn":"m","dx":"%i"}
        ,   {"dn":"ss","dx":"%s"}
        ,   {"dn":"s","dx":"%s"}
        ,   {"dn":"ffff","dx":"%S"}
        ,   {"dn":"fff","dx":"%S"}
        ,   {"dn":"ff","dx":"%S"}
        ,   {"dn":"f","dx":"%S"}
        ,   {"dn":"tt","dx":"%A"}   // AM/PM
        ,   {"dn":"t","dx":"%a"}    // am/pm
        ];

    /**
     * Converts traditional .NET date formats to Webix formats
     * @param dotNetFormat something like d or m/d/yyyy
     * See https://support.spitfirepm.com/kba-01132/ and https://docs.webix.com/helpers__date_formatting_methods.html
     *
     * test: ["MMM d, yyyy","MM d, yy","M dd, yyyy","MMM d, yyyy HH:mm:ss","d/m/yyyy","H:mm:ss","h:mm:ss tt"].forEach(test=> console.log(test.padEnd(25),"\t",sfClient.ConvertDotNetDateTimeFormatToWebix(test)))
     */
    public ConvertDotNetDateTimeFormatToWebix( dotNetFormat : string ): string {
        var result : string | null;
        var DefaultCulture : string = navigator.language;
        if (!dotNetFormat || dotNetFormat === "d") {
            if (DefaultCulture.length < 4) dotNetFormat = "d MMM yyyy";
            else if (DefaultCulture = "en-US") dotNetFormat = "M/d/yyyy";
            else dotNetFormat = "d MMM yyyy";
        }
        var cacheKey : string = "ZDFMT2WX:" + dotNetFormat;
        result = sessionStorage.getItem(cacheKey)
        if (result) return result;
        result = dotNetFormat;
        this._DateFormatMap.forEach((mapx,idx) => {
            result = result!.replaceAll(mapx.dn,"{"+idx+"}");
        });
        this._DateFormatMap.forEach((mapx,idx) => {
            result = result!.replaceAll("{"+idx+"}",mapx.dx);
        });
        sessionStorage.setItem(cacheKey,result);
        return result;

    }

    /**
     * Converts a JSON set into rows of an HTML Table.
     * @param mydata an array of JSON objects
     * @returns JQuery<HTMLTableElement> TABLE that has not been inserted into DOM
     */
    MakeTable = function (mydata : JSON[]) : JQuery<HTMLTableElement > {
        var table: JQuery<HTMLTableElement> = $('<table border="1px">');
        var tblHeader = "<tr>";
        for (var k in mydata[0]) tblHeader += "<th>" + k.replaceAll("_", " ") + "</th>";
        tblHeader += "</tr>";
        $(tblHeader).appendTo(table);
        $.each(mydata, function (index, value) {
            var TableRow = "<tr>";
            $.each(value, function (key, val : any) {
                if ((typeof (val) === "string")  ) {
                    var when = new Date(val);
                    if (val.length > 3 && when.isDate()) {
                        TableRow += "<td >{0} {1}</td>".sfFormat($.datepicker.formatDate('M d yy', when),
                                                                when.isMidnight() ? "" : when.toLocaleTimeString());

                    }
                    else {
                        TableRow += "<td>{0}</td>".sfFormat(val);
                    }

                }
                else if (typeof val === "number") {
                    if (val == 0) TableRow += "<td></td>";
                    else {
                        var dPlaces = ((val % 1 != 0) ? 2 : 0);
                        var NumericValue = val;
                        TableRow += "<td class='clsNumericReadOnly'>{0}</td>".sfFormat(NumericValue.toFixed(dPlaces) ) ;
                    }
                }
                else if (typeof val === "object" && val === null) {
                    TableRow += "<td></td>";
                }
                else {
                    console.log("makeTable processed type {0}".sfFormat(typeof (val)));
                    TableRow += "<td>{0}</td>".sfFormat( val );
                }
            });
            TableRow += "</tr>";
            $(table).append(TableRow);
        });
        return table;
    };



 /**
     * Make sure the URL starts with application root path
    */
    MakeSiteRelativeURL(url:string):string {
        if (typeof sfApplicationRootPath !== 'undefined') {
            if (url.startsWith("../")) url = url.substring(3);
            if (url.toUpperCase().startsWith(sfApplicationRootPath.toUpperCase())) return url;
            url = sfApplicationRootPath + '/' + url;
        }
        return url;
    }

    /**
     * Loads UC Function Keys and corresponding Module/System Names
    */
    protected LoadUCFunctionMap(): JQueryPromise<any> {
        var RESTClient: sfRestClient = this;
        var DeferredResult = $.Deferred();
        var permitCheck = DeferredResult.promise();

        if (sfRestClient._UCPermitMap._etag.w === 0) {
            // see about localStorage
            var ls = JSON.parse(localStorage.getItem(RESTClient._z.lsKeys.api_session_permits_map)!);
            if (ls && typeof ls._etag.w === "number") {
                console.log("Loaded Function Map from localStorage...");
                sfRestClient._UCPermitMap = ls;
            }
        }

        if ("WORK" in sfRestClient._UCPermitMap) {
            // we have a map, lets see if we should use it as-is
            if ((this._WCC.UserKey === this.EmptyKey)) {
                // no session? So, now is not a good time to refreh the map, just use what we have
                DeferredResult.resolve(sfRestClient._UCPermitMap);
                return permitCheck;
                }

            if ((Date.now() - sfRestClient._UCPermitMap._etag.w) < (this._Options.DVCacheLife * 4)   ) {
                // great: we have a map and it isn't old
                DeferredResult.resolve(sfRestClient._UCPermitMap);
                return permitCheck;
            }
        }


        var GetPermitMapRequest = RESTClient._GetAPIXHR("session/permits/map?etag=" + Object.keys(sfRestClient._UCPermitMap._etag)[0]).done(function DoneGetPermitMapRequest(r) {
            if (GetPermitMapRequest.status !== 304) {
                if (typeof r === "object" && typeof r._etag === "object") {
                    r._etag.w = Date.now();
                    console.log("Loaded Function Map from server...");
                    localStorage.setItem(RESTClient._z.lsKeys.api_session_permits_map, JSON.stringify(r));
                    sfRestClient._UCPermitMap = r;
                }
                else {
                    console.log("LoadUCFunctionMap() could not load Function Map from server...", GetPermitMapRequest);
                }
            } else {
                console.log("LoadUCFunctionMap() resolved as not modified...");
                sfRestClient._UCPermitMap._etag.w = Date.now();
            }

            DeferredResult.resolve(sfRestClient._UCPermitMap);
        }).fail(function GetPermitMapFailed(jqXHR, textStatus, errorThrown) {
            if (jqXHR.status == 403) {
                console.log("LoadUCFunctionMap() ...forbidden; likely not logged in " );
            }
            else {
                console.warn("LoadUCFunctionMap() failed ", textStatus,errorThrown,jqXHR);
            }
            DeferredResult.resolve(sfRestClient._UCPermitMap); // will make do for now
        });

        return permitCheck;
    }
    /**
     * Loads or Updates WCC session attributes (api/session/who)
    */
    LoadUserSessionInfo(): Promise<WCCData> {
        var RESTClient: sfRestClient = this;
        var api: SessionClient ;
        var apiResult: Promise<WCCData | null> | null = null;
        if (sfRestClient._SessionClientGetWCC) {
            if (sfRestClient._SessionClientGetWCC.ForNavHash === location.toString().sfHashCode()) {
                //console.log("Reusing ongoing getWCC!....",sfRestClient._SessionClientGetWCC.ForNavHash);
                apiResult = (<Promise<WCCData>> sfRestClient._SessionClientGetWCC.APIResult!);
            } else sfRestClient._SessionClientGetWCC = null;
        }
        if (!apiResult) {
            var ForPageHash =location.toString().sfHashCode();
            api = new SessionClient(this._SiteURL);
            //console.log("Creating getWCC request!....",ForPageHash);
            apiResult = <Promise<WCCData | null>> api.getWCC()
            sfRestClient._SessionClientGetWCC = new _SessionClientGetWCCShare(apiResult!,  ForPageHash);
        }
        if (!apiResult) console.warn("LoadUserSessionInfo failed to getWCC");
        apiResult.then((r: WCCData | null) => {
            if (r) this.UpdateWCCData(r);
        });
        return <Promise<WCCData>> apiResult;
    }

    protected static _SessionClientGetWCC : _SessionClientGetWCCShare | null;


    UpdateWCCData( newWCC: WCCData ) : WCCData {
        var RESTClient: sfRestClient = this;
        var ChangeList: Map<string, any> = new Map<string,any>();
        $.each(newWCC, function SetWCCProperties(pname: string  , pvalue) {
            var HasChanged = typeof RESTClient._WCC[pname] === "undefined" || RESTClient._WCC[pname] != pvalue;
            if (HasChanged) {
                RESTClient._WCC[pname] = pvalue;
                ChangeList.set(pname,pvalue);
            }
        });
        RESTClient._WCC.PageName = RESTClient.ResolvePageName();
        RESTClient._z.WCCLoaded = true;
        ChangeList.forEach((value,keyName) => {
            var eventName = "sfClient.SetWCC_{0}".sfFormat(keyName);
            if (RESTClient._Options.LogLevel >= LoggingLevels.Verbose) console.log("sfClient.UpdateWCCData() raising {0} = [{1}]".sfFormat(eventName,value));
            if (eventName === "sfClient.SetWCC__DynamicJS") console.log("sfClient.UpdateWCCData() raising {0} = [{1}]".sfFormat(eventName,value));
            $("body").trigger(eventName,[RESTClient,keyName,value]);
        });

        return newWCC
    }

    /**
     * For each passed URI, If page does not already have a matching SCRIPT element, adds one
     * @param jsResourceList array of source uri
     */
    LoadDynamicJS( jsResourceList: string[]) : void{
        // var $Target : JQuery<HTMLElement>
        // if (this.IsPowerUXPage()) {
        //     $Target = $("head");
        // }
        // else {
        //     $Target = $("form");
        // }

        var AnyLoaded: boolean = false;
        if (top.sfClient !== this) return;
        jsResourceList.forEach(scriptSrc => {
            var src = scriptSrc;
            if (src.indexOf("?")>0) src= src.substring(0,src.indexOf("?"));
            var js : JQuery<HTMLScriptElement> = $("script[src^='{0}']".sfFormat(src));
            if (js.length === 0) {
                var RESTClient: sfRestClient = this;
                if (this._Options.LogLevel >= LoggingLevels.Verbose) console.log("Dynamically Loading ",src);
                this.AddCachedScript(scriptSrc).then( ()=> {
                        if (RESTClient._Options.LogLevel >= LoggingLevels.Verbose) console.log("Loaded.", scriptSrc);
                    });
                AnyLoaded = true;
            }
        });

     /*    if (AnyLoaded ) {
             this.AssureJQUITools($("<div />"));
        } */
    }


    public AssureJQUITools($element : JQuery<HTMLElement>  ) : Promise<boolean> {
        var XToolLoadPromise : Promise<boolean> = new Promise<boolean>((resolve) => {
            if (self !== top) {console.log("AssureJQUITools() only applicable for global/top"); return false;}
            if (this._z.XternalScriptsLoaded ) {console.log("AssureJQUITools() already done"); return false;}
            this._z.XternalScriptsLoaded = true;
            if (!$element) $element = $("<div />");
            if (typeof $element.dialog !== "function") {
                // fighting with webpack here which obfuscates simpler: if (!window.jQuery) window.jQuery = $;
                if (!eval("window.jQuery") ) eval("window.jQuery = $;");
                this.AddCSSResource("//ajax.googleapis.com/ajax/libs/jqueryui/1.12.1/themes/base/jquery-ui.css");
                this.AddCSSResource("{0}/theme-fa/styles.css?v={1}".sfFormat(this._SiteURL,this._WCC.Version));
                if ($("LINK[rel='stylesheet'][href*='{0}']".sfFormat("fontawesome.com")).length===0)
                    $("head").prepend('<link rel="stylesheet" href="https://kit-free.fontawesome.com/releases/latest/css/free.min.css" media="all" id="font-awesome-5-kit-css">');

                    this.AddCachedScript('{0}/Scripts/jquery.signalR-2.4.2.min.js'.sfFormat(this._SiteURL),true).then((likelyTrue) => {
                        this.AddCachedScript('{0}/signalR/hubs'.sfFormat(this._SiteURL),true);
                    });
                    this.AddCachedScript('//ajax.googleapis.com/ajax/libs/jqueryui/1.12.1/jquery-ui.min.js',true).then( (likelyTrue) => {
                        console.log("jQuery UI extensions loaded.");
                        resolve(true);
                    // })
                    // .fail(function(jqXHR, textStatus, errorThrown) {
                    //     console.warn("jQueryUI did not load", errorThrown)
                    //     resolve(true);
                    });


            }
            else resolve(true);
       });
       return XToolLoadPromise;
    }

    public  AddCachedScript(  url: string,headScript?: boolean,context?: Window | undefined,): Promise<boolean> {
        if (!context) context = self;

        var ScriptPromise : Promise<boolean> = new Promise<boolean>((resolve) => {
            var PreSearch = "{0}[src='{1}']".sfFormat(headScript ? "HEAD" : "BODY",url);
            if ($(PreSearch).length > 0) {
                console.log('AddCachedScript() found {0} has already been added'.sfFormat(url));
                resolve(true);
            }
            var script = context!.document.createElement('script');
            script.src = url;
            script.type = "text/javascript"
            script.defer = true;
            script.async = false;
            script.onload = function _scriptloaded() {
                    resolve(true);
                };
            if (!headScript) document.body.appendChild(script)
            else document.head.appendChild(script);
            console.log("Added:",url);
        // it will start to load right after appended, and execute of course
        });

        return ScriptPromise;
        // return $.ajax({
        //     url: url,
        //     dataType: "script",
        //     cache: true
        // });
    }

    /**
     * Adds a link to a stylesheet for the page
     * @param cssRef if includes a slash(/), must be full URL, otherwise  site-url/wv.aspx/js/ is prepended
     * @returns nothing
     */
    public AddCSSResource(cssRef : string): void {
        if (!cssRef) return;
        if (cssRef.indexOf("/") < 0) cssRef = "{0}/wv.aspx/js/{1}.css".sfFormat(sfApplicationRootPath, cssRef);
        if ($('head').find('link[type="text/css"][href="{0}"]'.sfFormat(cssRef)).length > 0) return;

        $('head').append('<link rel="stylesheet" href="{0}" type="text/css" />'.sfFormat(cssRef));
    }

    /** Returns a guid/uuid
     *  @returns something in the form xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
     * */
    async NewGuid() : Promise<GUID> {
        if (sfRestClient._NewGuidList.length == 0) {
            var api = new SessionClient(this._SiteURL);
            await api.getNewGuid(3).then(r => {
                if (!r || r == null) {
                    console.warn("API failed to return GUIDs!!");
                    sfRestClient._NewGuidList.push(
                        'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                            var r = Math.random() * 16 | 0,
                              v = c == 'x' ? r : (r & 0x3 | 0x8);
                            return v.toString(16);
                          })
                    );
                }
                r!.forEach(element => {
                    sfRestClient._NewGuidList.push(element);
                });

            });
        }

        var NextGuid : string = sfRestClient._NewGuidList.pop()!;
        return NextGuid;
    }

 /**
     * Opens a new tab with URL specified based on Document Type Key and UI version
     * @param dtk the guid document type
     * @param project the project ID to be assigned to the new document
     * @param options might include &UseID= to specify a key for the new document or &mode=np
     */
    PopNewDoc(dtk : GUID, project: string, options? : string) : Promise<Window | null> {
        if (!options) options = "";
        if (!project) project = this.GetPageProjectKey();
        if (options.length > 0 && !options.startsWith("&")) console.warn("PopNewDoc() options should start with &...");
        return new Promise<Window | null>((resolve) => {
            this.GetDV("DocType",dtk,undefined).then(async (thisDocTypeSiteName) => {
                var thisRestClient = this;
                if (!thisDocTypeSiteName) {
                    console.warn("Document type not found"); //hmmm maybe a popup?
                    resolve(null);
                    return;
                }
                //todo: determine if we should use the new or old UI based on the document type of this document
                //todo: generate a GUID if one was not provided
                var UseID : string;
                var url : string =  thisRestClient._Options.PopNewDocLegacyURL;
                if (options?.indexOf("&UseID")) {
                    UseID = options.substr(options?.indexOf("&UseID")+7,36);
                }
                else UseID = await this.NewGuid();  // todo: fix this!!!
                if (thisRestClient._Options.PopDocForceXBUI) url =  thisRestClient._Options.PopNewDocXBURL;
                url  =  url.sfFormat(thisRestClient._SiteURL, dtk,project,options) ;
                if (this._Options.LogLevel >= LoggingLevels.Verbose) console.log("PopNewDoc opening {0} DTK {1} using {2}".sfFormat(UseID, dtk,url));

                var TargetTab =  UseID.substr(UseID.lastIndexOf("-") + 1).toLowerCase();
                //todo: determine if we need the "how many tabs" logic and dialog
                if (!window) {
                    console.error("PopNewDoc() Must be called from a browser window");
                    resolve(null);
                    return;
                }
                var PW = window.open(url, TargetTab);
                resolve(PW);
            });
        });
    }

  /**
     * Opens a new tab with location specified based on Document Key and UI version
     * @param id the guid DocMasterKey for the document to be opened
     */
   PopDoc(id : GUID) : Promise<Window | null>
   {
       return new Promise<Window | null>((resolve) => {
           this.GetDV("DocMasterType",id,undefined).then((thisDocType) => {
               var thisRestClient = this;
               if (!thisDocType) {
                   console.warn("Document not found"); //hmmm maybe a popup?
                   resolve(null);
                   return;
               }
               //todo: determine if we should use the new or old UI based on the document type of this document
               var url : string =  thisRestClient._Options.PopDocLegacyURL;
               if (thisRestClient._Options.PopDocForceXBUI) url =  thisRestClient._Options.PopDocXBURL;
               url  =  url.sfFormat(thisRestClient._SiteURL, id) ;
               if (this._Options.LogLevel >= LoggingLevels.Verbose) console.log("PopDoc opening DMK {0} DTK {1} using {2}".sfFormat(id, thisDocType,url));

               var TargetTab =  url.substr(url.lastIndexOf("-") + 1).toLowerCase();
               //todo: determine if we need the "how many tabs" logic and dialog
               if (!window) {
                   console.error("PopDoc() Must be called from a browser window");
                   resolve(null);
                   return;
               }
               var PW = window.open(url, TargetTab);
               resolve(PW);
           });
       });
   }
    /**
     * Sets sfRestClient Options
     *
     * Example: SetOptions() { LogLevel: LoggingLevel.Verbose, DVCacheLife: 22*60000, PopDocForceXBUI: true, PopDocXBURL: "{0}#!/doc/home?id={1}"});
     *
     * PopDocXBURL can use {0} place holder for site path and {1} placeholder for document ID
    */
    public SetOptions(options: NVPair): void {
        if (!options) {
            console.warn("No options passed. Use JSON object");
            return;
        }
        Object.keys(options).forEach((key) => {
            var PropName : any = '_' + key;
            //    if ((typeof this[PropName] !== "undefined"  &&  typeof this[key] === typeof options[key] ) {
            //         this[PropName] = options[key];
            //    }
            if (key === "DVCacheLife" && typeof this._Options.DVCacheLife === typeof options[key]) this._Options.DVCacheLife = options[key]
            else if (key === "LogLevel" && typeof this._Options.LogLevel === typeof options[key]) this._Options.LogLevel = options[key]
            else if (key === "PopDocForceXBUI" && typeof this._Options.PopDocForceXBUI === typeof options[key]) this._Options.PopDocForceXBUI = options[key]
            else if (PropName in this && typeof eval("this." + PropName) === typeof options[key]) this._Options[PropName] = options[key];
        });
    }

    protected _Options : NVPair  = {
    /**
     * How long (in milliseconds) should a DV result be cached for reuse
    */
        BlankPageURI: "ABOUT:blank",
        DVCacheLife:  16 * 60000, // 16 minutes
        LogLevel:  LoggingLevels.None,
        NonPostbackEventID: "DNPB",
        /**
         * When true PopDoc() will always use new UI
         */
        PopDocForceXBUI :  false,
        PopDocLegacyURL:   '{0}/DocDetail.aspx?id={1}',
        PopDocXBURL:  "{0}#!/document?id={1}",
        PopNewDocLegacyURL:   '{0}/DocDetail.aspx?add={1}&project={2}{3}',
        PopNewDocXBURL:  "{0}#!/document?add={1}&project={2}{3}",
    }
    /**
     * Builds a query friendly string, also great for hashing or cache keys
    */
    protected _addQueryValue(
        /**
 * When true, query string is in form a/b/c, when false Aand priorList contains a ?, then &d1=a&d2=b&d3=c
*/
        asPath: boolean, priorList: string | string[], idx: number, dv: any): string {
        if (dv) {
            if (typeof dv === "string")
                if (dv.indexOf("$") >= 0) dv = dv.replaceAll("$DTK", this._WCC.DocTypeKey);
        }
        if (asPath) asPath = (priorList.indexOf("?") < 0);
        var parmSep: string = '&';
        if ((asPath) && ((dv === "?") || (dv === "&") || (dv === "%"))) {
            asPath = false;
            parmSep = '?';
        }
        return priorList + (asPath ? "/" : parmSep + "d" + (idx) + "=") + encodeURIComponent(dv);
    }
    /**
     * Builds a query friendly string 1 to 4 inputs by using _addQueryValue
    */
    protected _formatDependsList(asPath: boolean, depends1: string | string[], dep2?: string, dep3?: string, dep4?: string): string {
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
    /**
     *  consolidate request components into a single string - dv/displayName/pv/d1/d2/d3
     */
    protected _getDVRequestString(displayName: string, pv: string | number | boolean, dependsOn: string | string[] | undefined): string {
        var url = 'dv/' + displayName + "/" + encodeURIComponent(pv);
        if (dependsOn) url += this._formatDependsList(true, dependsOn);
        return url;
    }

    /**
     *  Returns query-suitable string to make HTTP GET defeat cache
     */
    _getVaryByQValue(): string {
        return "zvqms={0}".sfFormat(new Date().valueOf());
    }

    protected _GetAPIXHR(url: string): JQueryXHR {
        url = this._APIURL(url);
        if (this._Options.LogLevel >= LoggingLevels.Verbose) console.log(url);
        return $.getJSON(url);
    }
    protected _APIURL(suffix: any) {
        return this._SiteURL + '/api/' + suffix;
    }

    /**
     * For example: http://server.domain.com/sfPMS  (does not include ending slash)
     */
    protected _SiteURL: string;


    /**
     * Collections of permits by project.  Internally, global permits are stored under project (GLOBAL)
     */
    _LoadedPermits: Map<string, UCPermitSet> = new Map<string, UCPermitSet>();

    /**
     *  Returns value from object that matches the field/property name
     */
    FieldValueFromRow(rawRow: any, fieldName: string): any {
        if (!(fieldName in rawRow)) {
            fieldName = fieldName.substring(0, 1).toLowerCase() + fieldName.substring(1);
            if (!(fieldName in rawRow)) return undefined;
        }
        return rawRow[fieldName];
    }

    /**
     * Finds a row using a string key match
     * @param rawData array of rows
     * @param keyName required key field name
     * @param keyValue value of key in desired row
     * @returns index of row (0-based)
     */
    FindRowIndexByKey( rawData: DataModelCollection, keyName: string, keyValue : string) : number | undefined {
        if (!(keyName in rawData[0])) {
            console.warn("FindRowIndexByKey data does not include keyName " + keyName);
            return undefined;
        }

        for (const [index, candidateRow] of rawData.entries()) {
            if (candidateRow[keyName] === keyValue) return index;
          }
        return undefined;
    }

    /**
     * Builds a string array of values that help define the context of a lookup or evaluation
     * @param dependsOnList semicolon separated list of related field and constants. eg #DocMasterDetail.Project;=Subtype
     * @param rawRow primary source of data
     */
    GatherDependsOnValues(dependsOnList:string, rawRow: any) : string[] | undefined {
        if (!dependsOnList) return undefined;
        var result: string[] = [];

        dependsOnList.split(";").forEach(element => {
            if (element.startsWith("=")) result.push(element.substring(1));
            if (element.startsWith("#")) {
                element = element.substring(1);
                if (element.indexOf(".")> 0 ) {
                    var ElementNameParts :string[] = element.split(".");
                    var TableName : string = ElementNameParts[0];
                    var FieldName : string = ElementNameParts[1];
                    var SourceResolved: boolean = false;
                    var UseRow = rawRow;
                    //todo: resolve alternate UseRow based on tablename...
                    if (FieldName in UseRow ) {
                        SourceResolved = true;
                        result.push(this.FieldValueFromRow(rawRow,FieldName));
                    }
                    else {
                        if (FieldName in this._WCC) {
                            SourceResolved = true;
                            result.push(this._WCC[FieldName]);
                        }
                    }
                    if (!SourceResolved) {
                        console.error("Not implemented yet: Depends on data: " + element);
                    }
                }
                else {
                    result.push(this.FieldValueFromRow(rawRow,element));
                }
            }
        });
        return result;
    }

    /**
     * Allows a page to update the _WCC context data
     * @param contextData object of Name-Value pairs, such as {DataPK: keyvalue, DocRevKey: keyvalue, etc: etc}
     * @returns true if successful usually sychronously
     */
    public  async SharePageContext( contextData: NVPair) : Promise<boolean> {
        if (!this._z.WCCLoaded) await this.LoadUserSessionInfo();
        if (!this._WCC ) {
            console.warn("SharePageContext() _WCC missing?");
            return false;
        }

        Object.keys(contextData).forEach((key) => {
            if (key.startsWith("Doc")) {
                if (!this.IsDocumentPage()) {
                    console.warn("Not a document");
                    return false;
                }
                this._WCC[key] = contextData[key];
            }
            else if (key === "DataPK" && typeof this._WCC.DataPK === typeof contextData[key]) this._WCC.DataPK = contextData[key]
            else if (key === "dsCacheKey" ) this._WCC.dsCacheKey = contextData[key]
            else if (key in this._WCC && typeof this._WCC[key]  === typeof contextData[key]) this._WCC[key] = contextData[key] // update if same type
            else if (!(key in this._WCC)) this._WCC[key] = contextData[key]
            else console.warn("SharePageContext() rejected {0}={1} due to a type mismatch".sfFormat(key,contextData[key]));
        });

        return true;

    }
    public IsDocExclusiveToMe() : boolean {
        return ((!this.IsDocumentPage()) || (this._WCC.DataLockFlag >= "2"));
    }

    public IsPowerUXPage() : boolean {
        return location.hash.startsWith("#!")
    }

    public IsHomeDashboardPage() : boolean {
        return this.IsPageOfType(this.PageTypeNames.HomeDashboard) ;
    }


    public IsDocumentPage() : boolean {
        return this.IsPageOfType(this.PageTypeNames.Document);// "DocDetail") ;
    }
    public IsProjectPage() : boolean {
        return this.IsPageOfType("ProjectDetail");
    }
    /** @deprecated use IsPageOfType() */
    public IsPageOfTypeByName(pageWanted: string) : boolean {
        if (!this._WCC ) { console.warn("_WCC missing?"); return false; }
        if (!this._WCC.PageName) this._WCC.PageName = this.ResolvePageName();
        var XBUIPageName : string = this.XBVariantOfPageName(this.ResolveStringPageNametoPageTypeName(pageWanted));
        return (    (this._WCC.PageName == pageWanted)  ||
                    (this._WCC.PageName == XBUIPageName)
                );
    }

    public IsPageOfType(pageWanted: string | PageTypeName) : boolean {
        if (typeof pageWanted === "string") {
            pageWanted = this.ResolveStringPageNametoPageTypeName(pageWanted);
        }

        return ( this.ResolvePageTypeName() === pageWanted);
    }

    public ResolvePageTypeName() : PageTypeName {
        return this.ResolveStringPageNametoPageTypeName(this.ResolvePageName());
    }

    protected ResolveStringPageNametoPageTypeName( pageNameString: string): PageTypeName {
        var result: PageTypeName;
        switch (pageNameString) {
            case "DocDetail": case "document":
                result = this.PageTypeNames.Document;
                break;
            case "ProjectDetail": case "projectDashboard":
                result = this.PageTypeNames.ProjectDashboard;
                break;
            case "Dashboard": case "home":
                result = this.PageTypeNames.HomeDashboard;
                break;
            case "users":
                result = this.PageTypeNames.Contacts;
                break;
            case "libview":
                result = this.PageTypeNames.Catalog;
                break;
            case "cusysm":
                result = this.PageTypeNames.AdminDashboard;
                break;
            case "cuManager":
                    result = this.PageTypeNames.ManageDashboard;
                    break;

            default:
                console.warn("Unexpected page type: ", pageNameString);
                result = this.PageTypeNames.Unknown;
                break;
        }
        return result;
    }

    protected ResolvePageName() : string {
        var pgname : string = location.pathname;
        var pgHash : string = location.hash;
        if (pgHash.length > 0) pgname = pgHash; // for xb style
        if (pgname.indexOf("/") >= 0) pgname = pgname.substr(pgname.lastIndexOf("/") + 1)
        if (pgname.indexOf("?") >= 0) pgname = pgname.substr(0,pgname.indexOf("?") )
        if (pgname.indexOf(".") >= 0) pgname = pgname.substr(0,pgname.indexOf(".") )
        return pgname;
    }

    protected XBVariantOfPageName( classicPageName : PageTypeName ) : string {
        var result: string;
        switch (classicPageName) {
            case this.PageTypeNames.Document:
                result = "document";
                break;
            case this.PageTypeNames.ProjectDashboard:
                result = "projectDashboard";
                break;
            case this.PageTypeNames.HomeDashboard:
                    result = "home";
                    break;

            default:
                console.warn("Unexpected page type: ", classicPageName);
                result = classicPageName.toString();
                break;
        }
        return result;
    }

    /**
     * applies a mask like xxx-xx-xxxx to a string, each x consumes an input character, all others are copied
     * @param inputString
     * @param inputMask
     * @returns
     */
     public CEFormatStringValue(inputString : string, inputMask : string ): string {
        if (!inputString) return "";
        if (!inputMask) return inputString;
        if (inputMask.startsWith("K")) inputMask = inputMask.substring(1);
        var result : string = "";
        inputString = inputString.trimEnd();
        var MaskLength =inputMask.length;
        for (var i = 0; i < MaskLength; i++) {
            var MaskChar = inputMask.charAt(0);
            inputMask = inputMask.substring(1);
            if (MaskChar === "x" && inputString.length > 0){
                result = result + inputString.charAt(0);
                inputString = inputString.substring(1);
                if (inputString.length ===  0 ) break;
            }
            else if (MaskChar === "x") result = result + " ";
            else result = result + MaskChar;
        }
        result = result + inputString;
        return result;
    }

    public GetPageQueryParameterByName(name:string):string {
        name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
        var QPSource = location.search;
        if (!QPSource) QPSource = location.hash;
        var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
            results = regex.exec(QPSource);
        return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
    }

    public GetPageProjectKey(pageTypeName?: PageTypeName) :string {
        var Context = location.href;
        if (typeof pageTypeName ==="undefined") pageTypeName = this.PageTypeNames.Unknown;
        if (pageTypeName == this.PageTypeNames.Document || this.IsDocumentPage()) {
            //console.warn("GetPageProjectKey() does not *really* support doc pages yet");
            Context = this._WCC.Project;
        }
        else {
            Context = this.GetPageQueryParameterByName(this.IsPowerUXPage() ? "project" : "id");
            var PageTypeName : string = this.ResolvePageName();
            if (!Context && !this.IsHomeDashboardPage()) console.warn("GetPageProjectKey() could not resolve project key for page ",PageTypeName);
        }
        return Context;
    }

    /**
     * Parses and performs an action
     * @param actionString often in the form javascript:something(args)
     * @param rowData optional collection of data
     *
     * Actions Supported
     * - vPgPopup(...)
     * - PopDoc(...)
     * - PopTXHistory(...)
     * - Nav To (dcmodules and admin tools)
     */
    public InvokeAction(actionString: string | _SwaggerClientExports.MenuAction, rowData? : DataModelRow) : void {
        var ActionString : string = "";
        if (typeof actionString === "string") ActionString = actionString;
        if ( actionString instanceof _SwaggerClientExports.MenuAction ) {
            if (actionString.HRef)         ActionString = actionString.HRef;
        }
        if (!ActionString) {
            if (this._Options.LogLevel >= LoggingLevels.Verbose) console.warn("InvokeAction ignoring empty action");
            return;
        }
        if (ActionString.startsWith(this._SiteURL)) {
            if (ActionString.indexOf("?") >0 && ActionString.indexOf("xbia") < 0) ActionString += "&xbia=1";
            if (ActionString.indexOf("libview.aspx") > 1) {
                var ActionOptions : string = "";
                if (ActionString.indexOf("?") > 0) {
                    ActionOptions = "&"+  ActionString.substring(ActionString.indexOf("?")+1);
                }
                ActionString = "javascript:vPgPopup('v/LibView.aspx', '{0}', 850, 950);".sfFormat(ActionOptions); // ... w,h
            }
            else {
                this.ModalDialog(ActionString, ActionString.sfHashCode().toString(), "", window);
                return;
            }

        }
        var match : RegExpExecArray | null = null;;
        var rxIsVPgPop =  new RegExp(/vPg(Popup|Dialog)\(['"](?<vpgName>[\w\/\.]+)['"],\s*(?<argslit>['"])(?<args>.*)['"],\s*(?<width>\d+),\s*(?<height>(\d+|null|undefined))(,\s*(?<default>.+)|)\)/gm);
        match = rxIsVPgPop.exec(ActionString);
        if (match) {
            if ( match.groups) {
                if (this._Options.LogLevel >= LoggingLevels.Verbose) console.log("InvokeAction::VPg({0}}) {1}".sfFormat(match.groups!.vpgName , match.groups.args));
                var ActionArgs : string = this.ExpandActionMarkers(match.groups.args,rowData);
                this.VModalPage(match.groups!.vpgName,ActionArgs,parseInt(match.groups.width),parseInt(match.groups.height),match.groups.default);
            }
            else {
                console.warn("InvokeAction::VPg failed match",ActionString);
            }
        }
        else if (ActionString.indexOf("top.location.reload(") >= 0) {
            top.location.reload(); // per https://developer.mozilla.org/en-US/docs/Web/API/Location/reload including (true) or (false) is ignored.
        }
        else if (ActionString.indexOf("PopDoc(") >= 0) {
            var rxPopDoc = /javascript:PopDoc\(['"](?<idguid>[0-9a-fA-F\-]{36})['"]/gm;
            var match = rxPopDoc.exec(ActionString);
            if (match && match.groups) {
                if (this._Options.LogLevel >= LoggingLevels.Verbose) console.log("InvokeAction::Doc({0}})".sfFormat(match.groups!.idguid ));
                this.PopDoc( match.groups.idguid );
            }
            else {
                console.warn("InvokeAction::Doc failed match",actionString);
            }
        }
        else if (ActionString.indexOf("PopNewDoc(") >= 0) {
            var rxPopDoc = /javascript:PopDoc\(['"](?<idguid>[0-9a-fA-F\-]{36})['"]/gm;
            var match = rxPopDoc.exec(ActionString);
            if (match && match.groups) {
                if (this._Options.LogLevel >= LoggingLevels.Verbose) console.log("InvokeAction::Doc({0}})".sfFormat(match.groups!.idguid ));
                var Project = this.GetPageProjectKey();
                this.PopNewDoc( match.groups.idguid ,Project);
            }
            else {
                console.warn("InvokeAction::PopNewDoc failed match",actionString);
            }
        }
        else if (ActionString.indexOf("PopTXHistory(") >= 0) {
            console.warn("InvokeAction::TXH not really done",ActionString);
            // sample action: javascript:PopTXHistory(\"TranHistory\", ifByTask() ? Row.task.trim() : \"%\", ifByAcct() ? Row.acct.trim() :\"%\" );
            // sample http://stany2017/SFPMS/pvp.aspx?vpg=TranHistory&project=GC003&ds=1f573cce-ddd8-4463-a6a6-40c641357f47_ProjectCA_dsData&task=01000&acct=%25&period=%
            var Project = this.GetPageProjectKey();
            var Task:string = "%",Acct : string = "%";
            if (rowData && rowData["task"]) Task = rowData["task"];
            if (rowData && rowData["acct"]) Acct = rowData["acct"];
            this.VModalPage("TranHistory","&project={0}&task={1}&acct={2}&period=%".sfFormat(Project,Task,Acct),999,444,undefined);
        }
        else if (ActionString.indexOf("/dcmodules/") >= 0  || ActionString.indexOf("/admin/") >= 0 ) {
            console.warn("InvokeAction::tools not really done",ActionString);
            top.location.href = ActionString;
        }
        else {
            this.DisplayUserNotification("Coming soon: could not invoke requested action.",9999);
            console.warn("InvokeAction() could not handle ",actionString);
        }
    }


    /** Finds $$ and other replacable values */
    protected ExpandActionMarkers(rawAction: string, rowData? : DataModelRow) : string {
        if (rawAction.indexOf("$$PROJECT") >= 0) {
            rawAction = rawAction.replaceAll("$$PROJECT",this.GetActionMarkerReplacement("$$PROJECT",rowData));
        }
        // general case: regex??
        return rawAction;
    }

    protected GetActionMarkerReplacement(markerName: string, rowData? : DataModelRow) : string {
        var result: string = "";
        if (markerName.startsWith("$$")) {
            markerName = markerName.substr(2,1) + markerName.substr(3).toLowerCase();
        }

        if (rowData ) result = this.FieldValueFromRow(rowData,markerName);
        if (!result) {
            if (markerName === "Project") {
                result = this.GetPageProjectKey();
            }
        }
        return result;
    }

    /**
     * Figures out the type of page and the amount of viewable height (without scrolling)
     * @returns height of top frame
     */
    UsablePageHeight() : number {
        var RunHeight = top.$("BODY").height()!;
        var $FooterInfo = top.$('TD#sfUIShowClientInfo');
        if ($FooterInfo.length === 0) $FooterInfo = top.$("DIV.project-dashboard__footer-buttons");
        if ($FooterInfo.length > 0) RunHeight =$FooterInfo.position().top + $FooterInfo.height()! + 16;
        return RunHeight;
    }

    protected   notificationMsgTimeoutHandle: number | undefined;
    WasNotificationShown(notificationMsg : string) : boolean {
        var result = false;
        var msgHash = "sfNoted:L{0}H{1}".sfFormat(notificationMsg.length, notificationMsg.sfHashCode());
            try {
                var cacheResult : string | null =sessionStorage.getItem(msgHash)
                if ( cacheResult === null) result = false ;
                else if (typeof cacheResult === "string") result = JSON.parse(cacheResult);
            }
            catch (e) {
               console.warn(e);
            }
        return result;
    }
    MarkNotificationAsShown(notificationMsg: string) : void {
        var msgHash = "sfNoted:L{0}H{1}".sfFormat(notificationMsg.length, notificationMsg.sfHashCode());
        try {
            top.sessionStorage.setItem(msgHash, "true");
        }
        catch (e) {
            console.warn(e);
        }
        return;
    }
    /**
     * See DisplayUserNotification() and DisplaySysNotification()
     * @param templateURL div content source - See DisplayUserNotification() and DisplaySysNotification()
     * @param notificationText message to display
     * @param timeOutMS if specified, message auto-clears in this many milliseconds.  Which does not count as dismissed.
     * @returns the DIV containing the message, .data("alreadyshown") = true if already shown.
     */
    DisplayThisNotification(templateURL : string, notificationText : string, timeOutMS? : number) : Promise<JQuery<HTMLElement>>{
        $("DIV#SNotificationContainerHolder").remove();

        var RESTClient = this;
        var msgReady : Promise<JQuery<HTMLElement>> = new Promise<JQuery<HTMLElement>>( (msgDisplayResolved) => {
            if (this.notificationMsgTimeoutHandle) {
                clearTimeout(this.notificationMsgTimeoutHandle);
                this.notificationMsgTimeoutHandle = undefined;
            }
            var $MsgDiv = $('<div />');
            if ((!notificationText) || (this.WasNotificationShown(notificationText))) {
                if (notificationText) console.log("Notification Already Shown: {0}".sfFormat(notificationText));
                $MsgDiv.data("alreadyshown",true);
                msgDisplayResolved( $MsgDiv );
                return msgReady;
            }
            // snhc is included for legacy use cases
            $MsgDiv.data('snhc', notificationText).data('notification', notificationText).data("snhash", notificationText.sfHashCode()).load(this.MakeSiteRelativeURL(templateURL), function (loadedHtml) {
                var $BTN = $MsgDiv.find("BUTTON.sfNotificationDismiss");
                msgDisplayResolved( $MsgDiv );
                $BTN.on("click",function () {
                    RESTClient.MarkNotificationAsShown($MsgDiv.data("snhc"));
                    $MsgDiv.remove();
                });
            }).appendTo('BODY').first().on("click",function () { $(this).remove(); });

        });
        if (timeOutMS) msgReady.then(function () {
            RESTClient.notificationMsgTimeoutHandle = setTimeout("notificationMsgTimeoutHandle = null; top.sfClient.DisplayThisNotification('{0}');".sfFormat(templateURL),timeOutMS);
        });
        return msgReady;

    }

    DisplaySysNotification(responseText: string | number, timeOutMS:number) : Promise<JQuery<HTMLElement>>{
        if (typeof responseText === "number") responseText = responseText.toString();
        if (responseText.startsWith("SysNotification")) responseText = responseText.substring(16);
        return this.DisplayThisNotification("ajhx/sysnotification.html", responseText, timeOutMS);
    }

    /** Displays a simple user notification, with "dismiss" session memory
     * @param notificationText The message.  Message is skipped if the same exact message has already been dismissed.
     */
    DisplayUserNotification(notificationText : string, timeOutMS: number): Promise<JQuery<HTMLElement>> {
        return this.DisplayThisNotification("ajhx/UsrNotification.html", notificationText, timeOutMS);
    }


    /**
     * Opens a Modal dialog with an iFrame and loads pvp.aspx?vpg=your-vpg-id /
     * @param vpg ReportBrowser,;
     * @param opts Should begin with an ampersand(&)
     * @param w
     * @param h
     * @param defaultResponse
     */
    public VModalPage( vpg: string, opts: string, w:number, h:number, defaultResponse: string | undefined ): void{
        if (!defaultResponse ) defaultResponse = "";
        var context : Window = window;
        var innerContext = window;
        if (parent != window) {
           // if (typeof context["sfRestClient"] == "undefined") context = parent as Window;
           // if (sfWCC.isAsyncPart) context = parent;
        }

        var UIPromise: Promise<boolean | undefined> = this.ModalDialog('/pvp.aspx?vpg={0}'.sfFormat(vpg) + opts, vpg, defaultResponse, innerContext);

        UIPromise.then((unused) => {
        // if (w != null) context.sfLookupWidthChangeTo( w);
        if (h != null) this.sfLookupHeightChangeTo(h + this._LookupViewPortAdjustments.outsidExtraH);
        // else {
        //     var $FRAME = $LookupDialog.find("IFRAME");
        //     if (typeof ($FRAME) === "undefined") {
        //         console.log("vPgDialog iFrame not found!");
        //     }
        //     else {
        //         $FRAME.off("load.vPgDialog").on("load.vPgDialog", function () {
        //             resizeDialogInFrame(this, context);
        //         });
        //     }
        // }
        });

    }

    ModalDialog(url: string, eventId: string, eventArg: string, eventContext: Window) : Promise<boolean|undefined>  {
        var newValue;
        var formName = "0";


        if (eventId == null) eventId = 'mDialog';
        if (eventArg == null) eventArg = url;
        if (!window) {
            console.warn("ModalDialog() must be called in a browser window!", url);
            return new Promise<boolean>((b) => {  b(false)});;
        }
        if (eventContext == null) eventContext = window;

        sfRestClient.ExternalToolsLoadedPromise.then((unused)=>{
            var DefaultWidth = $("body").width();
            if (typeof DefaultWidth === "number") DefaultWidth = Math.round(DefaultWidth / 2.2);
            if (!DefaultWidth || DefaultWidth < 500) DefaultWidth = 500;
            if (!this.$LookupDialog) {
                this.$LookupDialog =  $("<div class='clsJQLookup' autofocus='autofocus' ><iframe src='{0}}' style='width: 100%; height: 150px;border:0;' seamless='seamless' autofocus='autofocus' /></div>"
                .sfFormat(this._Options.BlankPageURI))
                .dialog(        { autoOpen: false, modal: true, title: 'Lookup Dialog', width: DefaultWidth, height: 200,
                        close: this.sfModalDialogClosed,
                        dialogClass: "lookup",
                        resizeStop:  this.sfModelDialogResizedHandler
                    });
            }

            var  OpenUrl = url;
            if (!OpenUrl.startsWith(sfApplicationRootPath)) OpenUrl = sfApplicationRootPath + url;
            //LookupOpenUrl = LookupOpenUrl + '&lookupName=' + lookupName +
            //	        '&resultName=' + resultName +
            //	        '&postBack=' + postBack + fromPage + dependsList;
            if (!this.$LookupDialog) {
                console.warn("Could not open dialog (missing DIV), lost",url);
                return false;
            }
            this.$LookupDialog.data("postbackEventId", eventId);
            this.$LookupDialog.data("postbackEventArg", eventArg);
            this.$LookupDialog.data("postback", (eventId != this._Options.NonPostbackEventID));
            this.$LookupDialog.data("postbackContext", eventContext);
            this.$LookupDialog.data("idName", url);
            this.$LookupDialog.data("newValue", eventArg);  // must reset to null or prior lookup result value may get used
            this.$LookupDialog.data("multiSelect", false);
            this.$LookupDialog.data("mode", 'modalDialog');

            this.$LookupDialog.data("windowWidth", $(window).width()!);
            this.$LookupDialog.data("windowHeight", $(window).height()!);
            this.$LookupDialog.data("documentWidth", $(document).width()!);
            this.$LookupDialog.data("documentHeight", $(document).height()!);
            this.$LookupDialog.data("vScrollPosition", $(document).scrollTop()!);
            this.$LookupDialog.data("hScrollPosition", $(document).scrollLeft()!);

            //if (isiPad) sfLookupHeightChangeTo( $(window).height());

            //load( LookupOpenUrl ); //...only works with div

            this.$LookupFrame   = this.ResolveLookupFrame();
            if (!this.$LookupFrame) {
                console.warn("Could not open dialog (missing IFRAME), lost",url);
                return false;
            }
            this.$LookupFrame!.attr('src', OpenUrl); // only w iframe
            this.SetModalDialogTitle(this.$LookupDialog,"");

            this.$LookupDialog.dialog('open');

                try {
                    var $LookupFrameDOM = this.$LookupFrame[0].contentDocument! || this.$LookupFrame[0].contentWindow!.document;
                    if ($LookupFrameDOM.location.href !== this.$LookupFrame.attr('src')) {
                        // we have confirmed that in a nested child frame, $LookupFrame is correct, but sometimes src does not update location
                        setTimeout("top.sfClient.RefreshiFrameSrc();", 1234);
                    }
                }
                catch (e) { console.warn("WARNING: mDialog() could not verify iFrame location uri"); }

        });

    return sfRestClient.ExternalToolsLoadedPromise;  // so anchor click event doesn't also do work
    }
    protected $LookupDialog : JQuery<HTMLElement> | undefined ;
    protected $LookupFrame : JQuery<HTMLIFrameElement> | undefined ;

    protected ResolveLookupFrame() : JQuery<HTMLIFrameElement> | undefined {
        if (!this.$LookupDialog) {
            return undefined;
        }
        return $(this.$LookupDialog.children("iframe").get(0)) as  JQuery<HTMLIFrameElement>;

    }

    SetModalDialogTitle(theDialog: JQuery<HTMLElement>, toText : string, ptSize?: string | number | undefined) {
        var $LookupTitle = theDialog.prev();               //fragile...another version might break this
        if (!ptSize) ptSize = ".7em";
        theDialog.dialog('option', 'title', toText);
        $LookupTitle.css('padding', '1px 1px 1px 4px');
        theDialog.css('padding', '0px 0px 0px 1px');
        theDialog.css('margin', '0');
        $LookupTitle.css('font-size', ptSize);
        return theDialog;
    }

    RefreshiFrameSrc() {
        if (!this.$LookupDialog) {
            this.$LookupDialog =  $("div.clsJQLookup");
            this.$LookupFrame   = this.ResolveLookupFrame();
        }

        if (!this.$LookupFrame) {
            console.warn("Could not refresh iframe SRC for dialog ");
            return false;
        }
        var RESTClient = this;
        var $LookupFrameDOM = this.$LookupFrame![0].contentDocument || this.$LookupFrame[0].contentWindow!.document;
        // last verified as needed w/Chrome  Feb 2017
        if (typeof ($LookupFrameDOM) != 'undefined') {
            var locNow = $LookupFrameDOM.location.href;
            var wantSrc = this.$LookupFrame.attr('src');
            if (!locNow.endsWith(wantSrc!)) {
                console.log("mDialog frame src re-get, is " + $LookupFrameDOM.location + '; want ' + this.$LookupFrame.attr('src') + '.');
                var DialogContext = window;
                try {
                    this.$LookupDialog!.find("IFRAME").on("load",  function () {
                        RESTClient.ResizeDialogInFrame(this, RESTClient);
                    });
                } catch (e) {
                        console.log("<!> refreshiFrameSrc could not find IFRAME" );
                        }
                $LookupFrameDOM.location.href = this.$LookupFrame.attr('src') as string;
            }
        }
    }

    ResizeDialogInFrame(FrameElement : HTMLElement, RESTClient : sfRestClient) : void {
        var $FrameElement = $(FrameElement);
        var RunHeight = $FrameElement.contents().find("html").outerHeight()! + 16;  // see also ResetPartFrameHeight() in sfPMS
        var MaxHeight :number = $(top).height()! - 64;
        if (!RunHeight) {
            console.log("ResizeDialogInFrame() could not find content height, using 65% of ",MaxHeight);
            RunHeight = Math.round(MaxHeight * 0.65);
        }
        if (RunHeight) {
            if (RunHeight > MaxHeight) RunHeight = MaxHeight;
            RESTClient.$LookupDialog!.dialog('option', 'height', RunHeight + 8).height(RunHeight + 16).find('iframe').height(RunHeight)
        }else
        var frameID = ($FrameElement.attr("id")) ? $FrameElement.attr("id") : $FrameElement.closest("[id]").attr("id");
        console.log("onLoad::resizeDialogInFrame({1}) h={0}".sfFormat(RunHeight, frameID));
    }

    LogMessageOnServer(msgText: string) : void {
        var api = new SessionClient(this._SiteURL);
        api.postToWebAppLog(new _SwaggerClientExports.APIData( {Data: msgText, IsURIEncoded: false}));
    }

    GetSFTabCount(tabName? : string) : number {
        var OpenWindowCount = 0;
        var ReUsingTab = false;
        var TabNameList = "";
        var OldestSaneTab = new Date().valueOf() - 36000000.0 // ten hours ago
        if (BrowserExtensionChecker.browser.isMacOS) return 3.14;
        for (const [k,idx] of Object.keys(top.localStorage)) {
            if (k.startsWith("sfWindow@")) {
                var TabAsOf = localStorage.getItem(k);
                if (parseFloat(TabAsOf!) < OldestSaneTab) {
                    console.log("GetSFTabCount() Forgetting tab: {0}, last loaded {1}".sfFormat(k, TabAsOf));
                    top.localStorage.removeItem(k);
                }
                else OpenWindowCount++;
                TabNameList += (OpenWindowCount > 1 ? "," : "") + k;
                if (k.endsWith(tabName!)) {
                    ReUsingTab = true;
                    break;
                }
            }
        }
        if (ReUsingTab) OpenWindowCount = 0;
        if (OpenWindowCount > 5) {
            var HighWater : string | number | null = sessionStorage.getItem("SFTabCountHW");
            HighWater = (typeof HighWater === "string") ? parseInt(HighWater) : 0;
            if (OpenWindowCount > HighWater) {
                this.LogMessageOnServer("{0} has {1} tabs: {2}".sfFormat(this._WCC.FullName,  OpenWindowCount, TabNameList));
                sessionStorage.setItem("SFTabCountHW", OpenWindowCount.toString());
            }
        }
        return OpenWindowCount;
    }

    LiveWatch() : string {

        var result = top.name + ' ';
        try {
            result += (top.WindowHasFocus ? "*" : "-") + '-> hub:' ;
            if (top.$.connection.sfPMSHub) {
                var sfPMSHub = top.$.connection.sfPMSHub
                result += ((sfPMSHub.connection && (sfPMSHub.connection.state === $.signalR.connectionState.connected)) ? sfPMSHub.connection.transport.name : "(not connected)") ;
            }
            else result += "NA";
            if (typeof this.GetSFTabCount === "function") result += '; Tabs:' + this.GetSFTabCount().toString();
        }
        catch (ex) {
            result += ex.message;
        }
        return result;
    }

    protected sfModalDialogClosed(_unusedEl? : any | undefined ) : void {
        if (!this.$LookupDialog) return;
        var postbackEventId = this.$LookupDialog.data("postbackEventId");
        var postbackEventArg = this.$LookupDialog.data("postbackEventArg");
        var postbackContext = this.$LookupDialog.data("postbackContext");
        var postBack = this.$LookupDialog.data("postback");
        var idName = this.$LookupDialog.data("idName");
        var newValue = this.$LookupDialog.data("newValue");
        var IsMultiSelect = this.$LookupDialog.data("multiSelect");
        var dialogMode = this.$LookupDialog.data("mode");
        var NewValueIsNew = true;

        if (typeof (postbackContext) == "undefined") postbackContext = window;
        this.$LookupFrame   = this.ResolveLookupFrame();
        this.$LookupFrame!.attr("src",this._Options.BlankPageURI);

        //sfLookupHeightChangeTo(201);
        //sfLookupWidthChangeTo( 301);
        //if (  ($(window).width()! > this.$LookupDialog.data("windowWidth"))) this.sfSetParentWindowSize(true, this.$LookupDialog.data("windowWidth") + $LookupViewPortAdjustments.outsidExtraW, -1);
        this.$LookupDialog.dialog('option', 'position', 'center');
        // $LookupDialog.dialog('option', 'zIndex', $.maxZIndex() + 1); neither this nor .dialog('moveToTop') helped


        if (dialogMode == 'modalDialog') {
            if (newValue == null) newValue = postbackEventArg;
            postbackEventArg = newValue;
        }

        if (newValue != null) {
            console.log(dialogMode +' result: ' + idName + ' = ' + newValue);
            if ((dialogMode == 'lookup') && (!IsMultiSelect)) {
                var $LookupInputSource = postbackContext.$('input[name="' + idName + '"]');
                NewValueIsNew = !($LookupInputSource.val() == newValue);
                if (NewValueIsNew) {
                    $LookupInputSource.val( newValue );
                    console.log(dialogMode + ' result stored into: ' + idName);
                    $LookupInputSource.trigger("sfLookup.Stored", [newValue]);
                }
                else {
                    if (postBack) postBack = false;
                    console.log(dialogMode + ' result - form ALREADY HAS NEW VALUE for ' + idName);
                }
            }

            if (postBack) {
                if (dialogMode == 'lookup') {
                    //notesay: if we decide we need validation here , we must also *not* block postback for GUID result values....or else they do not resolve
                    //USE CASE: approve CO, both names need to be selected, but neither can post back with this code
                    //console.log('lookup for ' + idName + ' -- pre postback, validation checks ');
                    //if (typeof(Page_ClientValidate) != 'undefined') {
                    //    postBack = Page_ClientValidate();
                    //    //note  $('#' + idName).change(); did not cause postbacks
                    //    console.log('lookup for ' + idName + ' -- Page Validation Result =  '+ postBack);
                    //}
                }
                if (postBack) {
                    var ctlID = postbackContext.$('input[name="' + idName + '"]').attr('id');
                    var theInput = postbackContext.$('#' + ctlID);
                    if (typeof postbackContext.ShowPleaseWaitUsingDialog != "undefined") postbackContext.ShowPleaseWaitUsingDialog();
                    if (theInput.hasClass('sfUI-UseChangeEventForPostbacks')) {
                        theInput.change();
                        //var inputs = theInput.closest('form').find('input').filter(':visible');
                        //inputs.eq(inputs.index(theInput[0]) + 1).focus();
                    }
                    else postbackContext.__doPostBack(postbackEventId, postbackEventArg);
                    console.log(dialogMode +' result: ' + idName + ' -- posting back [' + postbackEventId + '] / [' + postbackEventArg +']');
                    }
                }
            }
    }
    protected sfModelDialogResizedHandler() : void {
        if (!this.$LookupDialog) return;
        this.sfModelDialogResized(this.$LookupDialog)
    }

    protected sfSetParentWindowSize(canShrink : boolean, DesiredWidth: number, DesiredHeight: number) : void {
        console.warn("sfSetParentWindowSize not implemented");

        // if (top == window) {
        //     if (sfSmartSize != undefined) return sfSmartSize(canShrink, DesiredWidth, DesiredHeight);
        // }
        // else {
        //     return sfSetParentDialogSize(canShrink, DesiredWidth, DesiredHeight)
        // }

    }
     private  sfLookupHeightChangeTo(newValue : number):void {
        // here newValue represents the intended size for the inner iFrame's rending area
        var ld = this.$LookupDialog;
        if ($("HTML").css("font-size") > "16px") { newValue = newValue * 1.1; } //"Enlarged" theme is 18px
        if (($(window).height()! < (newValue + this._LookupViewPortAdjustments.outsidExtraH))) this.sfSetParentWindowSize(false, -1, newValue + this._LookupViewPortAdjustments.outsidExtraH);
        if (($(window).height()! < (newValue + this._LookupViewPortAdjustments.outsidExtraH))) {
            // requested size still too large
            var requestedH = newValue;
            newValue = $(window).height()! - this._LookupViewPortAdjustments.outsidExtraH;
            console.log('dialog height requested cannot be accomidated by window, reduce from ' + requestedH + ' to ' + newValue);
        }
        var tdh = newValue + this._LookupViewPortAdjustments.vpExtraH + this._LookupViewPortAdjustments.frameExtraH;
        ld!.dialog('option', "height", tdh);

        //var LookupFrame = $(ld.children("iframe").get(0))
        this.sfModelDialogResized(ld!);
        ld!.dialog('option', 'position', 'center');
        console.log('dialog height explicitly set to ' + newValue);
    }
    private _LookupViewPortAdjustments = { outsidExtraW: 65, outsidExtraH: 64, vpExtraW: 16, vpExtraH: 32, frameExtraH: 8 };

    private sfLookupWidthChangeTo( newValue:number):void {
        var ld = this.$LookupDialog;
        if (($(window).width()! < (newValue + this._LookupViewPortAdjustments.outsidExtraW))) this.sfSetParentWindowSize(false, newValue + this._LookupViewPortAdjustments.outsidExtraW + this._LookupViewPortAdjustments.vpExtraW, -1);
        if (($(window).width()! < (newValue + this._LookupViewPortAdjustments.outsidExtraW))) {
            // requested size still too wide
            var requestedW = newValue;
            newValue = $(window).width()! - this._LookupViewPortAdjustments.outsidExtraW;
            console.log('dialog width requested cannot be accomidated by window, reduce from ' + requestedW + ' to ' + newValue);
        }

        ld!.dialog('option', "width", newValue + this._LookupViewPortAdjustments.vpExtraW);
        this.sfModelDialogResized(ld!);
        setTimeout(function () { ld!.dialog('option', 'position', 'center'); }, 259); // need this to happen after above has all completed
        console.log('dialog width explicitly set to ' + newValue);
    }


    protected sfModelDialogResized(forDialog : JQuery) : void {

            // this is called after a user resizes the dialog
                var dg = forDialog
                if (!$(window)) return;
                var tdh = Math.floor(dg.dialog("option", "height"));
                var tdw = Math.floor(dg.dialog("option", "width"));
                var height = dg.height()!; // actual content area
                var width = Math.round(dg.width()! + 1);  // actual content area
                var fh = dg.height()! - this.DialogViewPortAdjustments.frameExtraH;
                console.log('sfDialogResized resized to {0}w, {1}h inside {2}x{3}, frame h={4}'.sfFormat( width ,height , tdw , tdh, fh));
                if ((($(window).width()! < (width + this.DialogViewPortAdjustments.outsidExtraW)) || ($(window).height()! < (height + this.DialogViewPortAdjustments.outsidExtraH)))) this.sfSetParentWindowSize(false, width + this.DialogViewPortAdjustments.outsidExtraW, height + this.DialogViewPortAdjustments.outsidExtraH);
                var $DFrame = $(dg.children("iframe").get(0)) // what if there is no frame???
                // $($DFrame).contents().find("html").outerHeight()  -- but not a good place to force the height
                $DFrame.css('height', fh); // also iframe
                $DFrame.css('width', '100%'); // also iframe

    }
//var $LookupFrame = $($LookupDialog.children("iframe").get(0))

     protected DialogViewPortAdjustments = { outsidExtraW: 65, outsidExtraH: 64, vpExtraW: 16, vpExtraH: 32, frameExtraH: 8 };

     /**
      * Applies UI CFG to all rows in a dataset
      * @param item a single UI Configuration item
      * @param thisPart Part, including reference to raw data being upscaled to match UI CFG
      * @param dataModelBuildKey allows thread-safe usage
      */
    _ApplyUICFGtoRawData(item: UIDisplayConfig, thisPart: PartStorageData, dataModelBuildKey: string) {

        if (item.CSS) {
            if (item.CSS.indexOf("sfRowVisibleWhen") >= 0){
                // handle row visibility based on value of column marked by sfRowVisibleWhen  (multiple columns are applied in order encountered)
                var IsWhenClear = (item.CSS.indexOf("WhenClear") >= 0);  // reverses visibility
                const FlagVisibleFieldName = "_DefaultRowVisible";
                if (this._Options.LogLevel >= LoggingLevels.Debug) console.log("_ApplyUICFGtoRawData {0} RowVis {1} ".sfFormat(item.ItemName, item.CSS));
                thisPart.DataModels.get(dataModelBuildKey)!.forEach(function DataModelRowVis(rawRow: any, index: number) : void{
                    var ShowRow = false;
                    var UpdateFlagProperty = !(FlagVisibleFieldName in rawRow);
                    if (!UpdateFlagProperty) ShowRow = rawRow[FlagVisibleFieldName];
                    if (!ShowRow) {
                        var FieldValue: any = thisPart.RestClient.FieldValueFromRow(rawRow, item.DataField!);
                        if (IsWhenClear) ShowRow = !(FieldValue)
                        else ShowRow = !(!(FieldValue));
                        if (!UpdateFlagProperty && ShowRow) UpdateFlagProperty = true;
                    }
                    if (UpdateFlagProperty) thisPart.RestClient._AddDVValueToDataModel(thisPart, dataModelBuildKey, index,FlagVisibleFieldName, "", ShowRow);
                });
            }
        }

        if (item.DV || item.LookupName ||
            (item.OtherProperties && item.OtherProperties.DataType && item.OtherProperties.DataType === "Guid")) {
            if (item.DV) {
                if (this._Options.LogLevel >= LoggingLevels.Debug) console.log("_ApplyUICFGtoRawData {0} DV {1} ".sfFormat(item.ItemName, item.DV));
                thisPart.DataModels.get(dataModelBuildKey)!.forEach(function DataModelRowDVApplication(rawRow: any, index: number) : void{
                    var ThisSuffix : string = "_dv";
                    if (item.DataField?.startsWith("cmp_")) {
                        // cmp_realfieldname_suffix
                        var RealFieldName = item.DataField.substr(4);
                        if (!(RealFieldName in rawRow)) {
                            if (RealFieldName.indexOf("_") > 0) RealFieldName = RealFieldName.substr(0,RealFieldName.indexOf("_"));
                            if ((RealFieldName in rawRow)) {
                                var FieldValue: any = thisPart.RestClient.FieldValueFromRow(rawRow, RealFieldName);
                                ///!!! future: handle depends on #DocMasterDetail.project
                                var DependsOn : string[] | undefined;
                                if (item.DependsOn) DependsOn = thisPart.RestClient.GatherDependsOnValues(item.DependsOn,rawRow);
                                thisPart._PromiseList!.push(thisPart.RestClient.GetDV(item.DV!, FieldValue, DependsOn, false).then(function then_AddDVToDModel(r) : void {
                                    thisPart.RestClient._AddDVValueToDataModel(thisPart, dataModelBuildKey, index, item.DataField!, "", r);
                                }));
                            }
                            else console.warn("_ApplyUICFGtoRawData(cmp) base field {0} not found in row".sfFormat(RealFieldName));
                        }
                    }
                    else if (!((item.DataField + ThisSuffix) in rawRow)) {
                        var FieldValue: any = thisPart.RestClient.FieldValueFromRow(rawRow, item.DataField!);
                        ///!!! future: handle depends on #DocMasterDetail.project
                        var DependsOn : string[] | undefined;
                        if (item.DependsOn) DependsOn = thisPart.RestClient.GatherDependsOnValues(item.DependsOn,rawRow);
                        thisPart._PromiseList!.push(thisPart.RestClient.GetDV(item.DV!, FieldValue, DependsOn, false).then(function then_AddDVToDModel(r) : void {
                            thisPart.RestClient._AddDVValueToDataModel(thisPart, dataModelBuildKey, index, item.DataField!, ThisSuffix, r);
                        }));
                    }
                });
            }
            if (item.UIType === "contact") {
                thisPart.DataModels.get(dataModelBuildKey)!.forEach(function DataModelRowDVContactActiveCheck(rawRow: any, index: number) : void {
                    var ThisSuffix : string = "_IsInactive";
                    if (!((item.DataField + ThisSuffix) in rawRow)) {
                        var FieldValue: any = thisPart.RestClient.FieldValueFromRow(rawRow, item.DataField!);
                        if (!FieldValue) return;
                        thisPart._PromiseList!.push(thisPart.RestClient.GetDV("sfUserActive", FieldValue, "", false).then(function then_AddDVActiveToDModel(r) {
                            if(!r)
                                thisPart.RestClient._AddDVValueToDataModel(thisPart, dataModelBuildKey, index, item.DataField!, ThisSuffix ,true);
                        }));
                    }
                });
            }
            // future: finish support for resolution using LookupName ...
        }
    }
    protected _AddDVValueToDataModel(thisPart: PartStorageData, dataModelBuildKey: string, index: number, dataField: string, suffix : string, newValue: string | boolean | null) {
        //if (this._Options.LogLevel >= LoggingLevels.Debug) console.log("Row {0}, adding {1}_dv = {2} ".sfFormat(index,DataField,newValue ));
        thisPart.DataModels.get(dataModelBuildKey)![index][dataField + suffix] = newValue;
    }

    /**
     * Returns a refernce that can be used to create instances of specific API clients
     * @returns object with exported resources constructorts
     */
    readonly exports : NVPair;

    /**
     * Creates an instance of the requested API controller with baseURL set appropriately
     * @param ofTypeName eg ActionItemsClient, DocumentToolsClient, LookupClient
     * @returns instance
     */
    public NewAPIClient( ofTypeName : string ) : any {
        var newController : any;
        if (ofTypeName in this.exports) {
            newController = new this.exports[ofTypeName](this._SiteURL);
        }
        else console.warn("NewAPIClient() does not recognized ",ofTypeName);
        return newController;
    }

    public ClearCache(alsoClearSessionStorage? : boolean):void {
        this._UserPermitResultCache.clear();
        this._LoadedPermits.clear();
        PartStorageData._LoadedParts.clear();
        if (alsoClearSessionStorage) sessionStorage.clear();
    }

    readonly EmptyKey: GUID = "00000000-0000-0000-0000-000000000000";
    protected _CachedDVRequests: Map<string, Promise<string | null>> = new Map<string, Promise<string | null>>();
    protected _UserPermitResultCache: Map<string, number> = new Map<string, number>();
    protected static PermitMapLoaded() :boolean {
        return sfRestClient._UCPermitMap && "WORK" in sfRestClient._UCPermitMap;
    }
    protected static _UCPermitMap: any = {
        _etag: {
            empty: 0,
            w: 0
        }
    };

    protected _PermitMatches(permit: IUCPermit, optionalDTK?: GUID, optionalReference?: GUID): boolean {
        // project match is assumed by this point (cached is by project)
        var result = true;
        if (permit.DocTypeKey) {
            if (!optionalDTK || optionalDTK !== permit.DocTypeKey) result = false;
        }
        if (permit.DocReference) {
            if (!optionalReference || optionalReference !== permit.DocReference) result = false;
        }

        return result;
    }
    _WCC: WCCData = {
        AdminLevel: 0,
        DataPK: "00000000-0000-0000-0000-000000000000", // set by SharePageContext()
        DocRevKey: "00000000-0000-0000-0000-000000000000", // set by SharePageContext()
        DocSessionKey: "00000000-0000-0000-0000-000000000000", // set by SharePageContext()
        DocTypeKey: "00000000-0000-0000-0000-000000000000", // set by SharePageContext()
        DevMode: false,
        dsCacheKey: "1",
        PageName: "", // see ResolvePageName()
        UserKey: "00000000-0000-0000-0000-000000000000",
        Version: "2020.0.7000.00000"
    }
    protected _z: any = {
        lsKeys: {
            api_session_permits_map: "sfUCFunctionNameMap"
        },
        WCCLoaded: false,
        XternalScriptsLoaded: false
    }
    protected static _GlobalClientConstructFlag : boolean = false;
    protected static ExternalToolsLoadedPromise: Promise<boolean | undefined>;
    protected static _NewGuidList : GUID[] = [];

    constructor() {
        if (typeof sfApplicationRootPath === "string") {
            this._SiteURL = sfApplicationRootPath;
        }
        else {
            var ApplicationPath = window.location.pathname.substr(1, window.location.pathname.substr(1).indexOf("/"));
            this._SiteURL = `${window.location.origin}/${ApplicationPath || 'sfPMS'}`;
        }
        this.exports = _SwaggerClientExports;
        this.exports.$ = $;
        // if the BrowserExtensionChecker has not been created, or if it is a legacy one (without .Version)....
        if ( document.body && (!window.ClickOnceExtension || !(window.ClickOnceExtension.Version))) window.ClickOnceExtension = new BrowserExtensionChecker();
        if (window.sfClient && window.sfClient._z.WCCLoaded) {
            var TargetClient = this;
            $.each(window.sfClient._WCC, function CopyWCC(pname: string  , pvalue) {
                var HasChanged = typeof TargetClient._WCC[pname] === "undefined" || TargetClient._WCC[pname] != pvalue;
                if (HasChanged) {
                    TargetClient._WCC[pname] = pvalue;
                }
            });
        }

        var WCCLoadPromise =this.LoadUserSessionInfo();
        WCCLoadPromise.then(() => {
            if (window.sfClient && window.sfClient === this) {
                var RESTClient = this;
                sfRestClient.ExternalToolsLoadedPromise = RESTClient.AssureJQUITools($("div").first());

                $(function DOMReadyNow() {
                    if (RESTClient._Options.LogLevel >= LoggingLevels.Verbose) console.log("sfClient: DOM Ready...");
                    $("body").on("sfClient.SetWCC__DynamicJS",function activateDJS() {
                        if (RESTClient._Options.LogLevel >= LoggingLevels.Verbose) console.log("Activating Dynamics JS")
                        if (typeof RESTClient._WCC._DynamicJS === "string" && RESTClient.IsPowerUXPage()) {
                            var djs: string[] = JSON.parse(RESTClient._WCC._DynamicJS);
                            if (djs) RESTClient.LoadDynamicJS(djs);
                        }
                    });
               });
            }
        });

        this.LoadUCFunctionMap().then(() =>{
            if (!window.sfClient && !sfRestClient._GlobalClientConstructFlag) {
                sfRestClient._GlobalClientConstructFlag = true;
                window.sfClient = new sfRestClient();
                if (!window.$) window.$ = $;
                if (!top.$) top.$ = $;
                sfRestClient._GlobalClientConstructFlag = false;
            }
        });
    }
};

