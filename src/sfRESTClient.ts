//import { contains } from "jquery";
import { GUID } from "./globals";
//import  { sfApplicationRootPath } from "./string.extensions";
import { ActionItemsClient, AlertsClient, ContactClient, ContactFilters, IUCPermit, LookupClient, ProjectTeamClient, ProjectsClient, QueryFilters, SessionClient, Suggestion, UCPermitSet, UICFGClient, UIDisplayConfig, UIDisplayPart } from "./SwaggerClients"
import * as _SwaggerClientExports from "./SwaggerClients";
import * as $ from 'jquery';
import { BrowserExtensionChecker } from "./BrowserExtensionChecker";
//import localForage from "localforage"; requires --allowSyntheticDefaultImports in tsconfig
import * as localForage from "localforage";
import { contains } from "jquery";
//import {dialog}    from "jquery-ui";

const ClientPackageVersion : string = "1.10.75";
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
    Debug=9,
    VerboseDebug=93
}

type PartStorageList = Map<PartContextKey, PartStorageData>;
type DVCacheEntry = { w: number, v: string };
type RRCacheEntry = { w: number, v: string | number | boolean };
type CoordinateWithSize = {top:number,left:number,width:number,height:number};



class _SessionClientGetWCCShare {
    APIResult: Promise<WCCData | null> | null = null;
    ForNavHash: number | undefined;
    AsOf:number  = Date.now();
    IsResolved= false;
    public constructor( apiPromise: Promise<WCCData | null>,forPageHash : number) {
        this.APIResult = apiPromise;
        this.ForNavHash = forPageHash;
        apiPromise.finally(()=>{
            this.IsResolved = true;
            this.AsOf = Date.now();
        });
    }
    public AppliesFor(testHash: number) {
        return !this.Expired() && (this.ForNavHash === testHash);

    }
    public Expired(): boolean {
        return (this.IsResolved && (Date.now() - this.AsOf) > 3210);
    }
}

class PartStorageData {

    CFG: UIDisplayPart | null;
    DataModels: Map<string, DataModelCollection>;
    RestClient: sfRestClient;
    _PromiseList: Promise<any>[] | null;
    protected _InitializationResultPromise: Promise<UIDisplayPart | null> | null;
    protected _ReferenceKey: PartContextKey;
    protected _ForPartName:string;
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
        return `${partName}[${context}]::${forDocType}`; //   "{0}[{2}]::{1}".sfFormat(partName, forDocType, context);
    }

    public GetDataModelBuildContextKey(): string {
        PartStorageData._DMCount++;
        return `DVM-${this._ForPartName}#${PartStorageData._DMCount}`;
    }

    protected constructor(client: sfRestClient, partName: string, forDocType: GUID | undefined, context: string | undefined) {
        this.CFG = null;
        this.DataModels = new Map<string, any[]>();
        this.RestClient = client;
        this._PromiseList = null;
        this._ReferenceKey = PartStorageData.GetPartContextKey(partName, forDocType, context);
        this._ForPartName = partName;
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
    ClientVersion: string = `${ClientPackageVersion}`;
    ServerVersion():string {
        var result ="2020.0.7919";
        if (sfRestClient._WCC.Version) result = sfRestClient._WCC.Version;
        return result;
    }
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
        Unknown: 8092,
        Login: 16384,
        DiagUtilities: 32768
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
                else  if (sfRestClient._Options.LogLevel >= LoggingLevels.Verbose) console.log("ApplyDataChanges(REMOVE) did not find a row with key {0}".sfFormat(element));
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
                    if (sfRestClient._Options.LogLevel >= LoggingLevels.Verbose) console.log("ApplyDataChanges(CHANGE) did not find a row with key {0} (changed to add)".sfFormat(element));
                    changes.Add?.push( element); // !!! does this work?
                }
            } );
        }
        if (changes.Add) {
            changes.Add.forEach(element=>  rawData.push(element));
            AddCount += changes.Add.length;
        }
        if (sfRestClient._Options.LogLevel >= LoggingLevels.Verbose) console.log("ApplyDataChanges({0}) removed {1}, changed {2}, added {3} in {4}t ".sfFormat(keyName,
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
        if (!sfRestClient._z.WCCLoaded) this.LoadUserSessionInfo();
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
     *  @deprecated use BuildViewModelForContext()
     */
    BuildViewModel(partName: string, context: string, rawData: any, unusedCfgData: undefined, forDocType: GUID | undefined): JQueryPromise<any> {
        if (!sfRestClient._z.WCCLoaded) this.LoadUserSessionInfo();
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
        var DataModelBuildKey: string = thisPart.GetDataModelBuildContextKey();
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
                    if (sfRestClient._Options.LogLevel >= LoggingLevels.Verbose) console.log("ViewModel {0} complete in {1}t".sfFormat(DataModelBuildKey, Date.now() - StartAtTicks));
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
        var DeferredPermitResult : Promise<Permits> = new Promise<Permits>(async (ResolveThisPermit,rejectThisPermit) => {
            if (!sfRestClient._z.WCCLoaded) try { await RESTClient.LoadUserSessionInfo();} catch (ex:any) {rejectThisPermit(ex.message);}
            if (typeof optionalDTK !== "string") optionalDTK = "";
            if (typeof optionalReference !== "string") optionalReference = "";
            if (typeof optionalProject !== "string" || !optionalProject) optionalProject = "0";
            var PermitCacheID = ucModule + "_" + ucFunction
                + "_T" + optionalDTK.replaceAll("-", "")
                + "_R" + optionalReference
                + "_P" + optionalProject;
            var ValueFromCache = sfRestClient._UserPermitResultCache.get(PermitCacheID);
            if (typeof ValueFromCache === "number") {
                if (sfRestClient._Options.LogLevel >= LoggingLevels.Debug) console.log(`CheckPermit#${RESTClient.ThisInstanceID}(${ucModule}:${ucFunction},${optionalProject}) = ${ValueFromCache}; from static cache  `);
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
                if (sfRestClient._WCC.UserKey === RESTClient.EmptyKey)
                    console.warn("CheckPermit(): >>>> No user/session!! <<<< Therefore no permission for {0}|{1}!  LOGIN AGAIN!".sfFormat(ucModule, ucFunction))
                else console.warn("CheckPermit could not find {0}|{1} - verify proper case/trim!".sfFormat(ucModule, ucFunction));
                ResolveThisPermit(0);
                return;
            }

            if (!(sfRestClient._LoadedPermits.has("0"))) { // global permissions
                var api = new SessionClient(this._SiteURL);
                sfRestClient._LoadedPermits.set("0",new _SwaggerClientExports.UCPermitSet()); // this prevents repeat requests
                var apiResult: Promise<UCPermitSet | null> = api.getProjectPermits("0");
                if (apiResult) {
                    apiResult.then((r) => {
                        if (r) {
                            console.log(`CheckPermit#${RESTClient.ThisInstanceID}() Loaded Global Permits from server...`);
                            sfRestClient._LoadedPermits.set("0", r);
                        }
                    });
                    await apiResult;
                }
            }

            if (!(sfRestClient._LoadedPermits.has(optionalProject))) {
                var apiResult: Promise<UCPermitSet | null>;
                var MyAPIRequest : boolean = false;
                if (!sfRestClient._LoadingPermitRequests.has(optionalProject)) {
                    var api = new SessionClient(this._SiteURL);
                    apiResult  = api.getProjectPermits(optionalProject);
                    sfRestClient._LoadingPermitRequests.set(optionalProject,apiResult);
                    MyAPIRequest = true;
                }
                else apiResult = sfRestClient._LoadingPermitRequests.get(optionalProject)!;
                if (apiResult) {
                    apiResult.then((r) => {
                        if (r) {
                            console.log(`CheckPermit#${RESTClient.ThisInstanceID}() Loaded Project ${optionalProject} Permits from server...`);
                            sfRestClient._LoadedPermits.set(optionalProject!, r);
                            ThisProjectPermitSet = r!;
                            PPSDeferredResult.resolve(r);
                            if (MyAPIRequest && optionalProject) sfRestClient._LoadingPermitRequests.delete(optionalProject!);
                        }
                    });
                }
            }
            else {
                ThisProjectPermitSet = sfRestClient._LoadedPermits.get(optionalProject);
                PPSDeferredResult.resolve(ThisProjectPermitSet);
            }

            var finalCheck = [PPSPromise, UCFKPromise];

            $.when.apply($, finalCheck).done(function () {
                var finalPermit : Permits = 0;
                var GlobalPermits = sfRestClient._LoadedPermits.get("0")?.Permits;
                $.each([ThisProjectPermitSet?.Permits,GlobalPermits],function CheckOneSource(sourceIdx, thisSource) {
                    if (sfRestClient._Options.LogLevel >= LoggingLevels.Debug) console.log(`CheckPermit#${RESTClient.ThisInstanceID}(${ucModule}:${ucFunction},${optionalProject}) checking ${thisSource===ThisProjectPermitSet?.Permits ? "project": "global"}`);

                    $.each(thisSource, function OneCapabilityCheck(ThisUCFK, capabilitySet) {
                        if (ThisUCFK === UCFK) {
                            if (sfRestClient._Options.LogLevel >= LoggingLevels.Debug) console.log(`CheckPermit#${RESTClient.ThisInstanceID}(${ucModule}:${ucFunction},${optionalProject}) UCFK ${UCFK}, cl:`,capabilitySet);
                            $.each(capabilitySet, function OnePermitCheck(_n, p: IUCPermit) {
                                if (sfRestClient._Options.LogLevel >= LoggingLevels.Debug) console.log(`CheckPermit#${RESTClient.ThisInstanceID}(${ucModule}:${ucFunction},${optionalProject}) UCFK ${UCFK}, p:`,p);
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

                if (ucModule !== "WORK") finalPermit = finalPermit |  sfRestClient._WCC.AdminLevel;
                sfRestClient._UserPermitResultCache.set(PermitCacheID, finalPermit);
                if (sfRestClient._Options.LogLevel >= LoggingLevels.Debug) console.log(`CheckPermit#${RESTClient.ThisInstanceID}(${ucModule}:${ucFunction},${optionalProject}) = Usr:${finalPermit},Adm:${sfRestClient._WCC.AdminLevel}; static cache set `);

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

                if ((Date.now() - CacheResult.w) < sfRestClient._Options.DVCacheLife) {
                    apiResultPromise = new Promise<string | null>((resolve) => resolve(CacheResult.v));
                    return apiResultPromise;
                }
            }
            // if falls through, we get a fresh value
        }
        catch (err2:any        ) {
            new Error("GetDV() cache error: " + err2.message);
        }

        if (this._CachedDVRequests.has(cacheKey)) {
            if (sfRestClient._Options.LogLevel >= LoggingLevels.VerboseDebug) console.log(`GetDV(${displayName}:${keyValue}) reused pending request `);
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

        //removed all "undefined" from the end, leaving at least one
        for (let index = DependsOnSet.length - 1; index >= 1; index--) {
            if (DependsOnSet[index - 1] != "undefined") break;
            if (DependsOnSet[index] == "undefined") DependsOnSet.pop();
          }

        var DVFilters : QueryFilters  = new QueryFilters();

        DVFilters.MatchingSeed = keyValue;
        DVFilters.DependsOn = DependsOnSet;
        var apiResultPromise: Promise<string | null> = api.getDisplayValueViaPost(displayName, "1", DVFilters);
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

    /** Async get of a non-user specific setting (always the same for all users) */
    RuleResult(ruleName : string, testValue : string, filterValue : string | undefined, defaultValue: string | number | boolean) : Promise<string | number | boolean | null> {
        var apiResultPromise: Promise<string | number | boolean | null>
        var cacheKey: string = `GetRR:${ruleName}T${testValue.sfHashCode()}F${filterValue?.sfHashCode()}`;

        try {
            var result: string | null = sessionStorage.getItem(cacheKey);
            if (!result) {
                // continues below - must get value
            }
            if (typeof result === "string") {
                var CacheResult: RRCacheEntry = JSON.parse(result);

                if ((Date.now() - CacheResult.w) < sfRestClient._Options.DVCacheLife) {
                    apiResultPromise = new Promise<string | number | boolean | null>((resolve) => {
                        if (sfRestClient._Options.LogLevel >= LoggingLevels.Debug) console.log(`Rule Result from Cache: ${ruleName}|${testValue}[${filterValue}] = ${CacheResult.v}`);
                        resolve(CacheResult.v);
                    });
                    return apiResultPromise;
                }
            }
            // if falls through, we get a fresh value
        }
        catch (err2:any) {
            new Error("RuleResult() cache error: " + err2.message);
        }

        // rule checks are not so numerous that we worry about in process requests
        // if (this._CachedDVRequests.has(cacheKey)) {
        //     if (sfRestClient._Options.LogLevel >= LoggingLevels.Debug) console.log("GetDV({0}:{1}) reused pending request ".sfFormat(displayName, keyValue, "request"));
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
                    if (sfRestClient._Options.LogLevel >= LoggingLevels.Debug) console.log(`Rule Result: ${ruleName}|${testValue}[${filterValue}] = ${rr}`);
                    if (typeof rr !== "undefined" && rr !== null) {
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
        if (sfRestClient._Options.LogLevel > LoggingLevels.None) console.log("PopQAInfo() - no query resolved");
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
    $GCI = window.top!.$("<div class='{0}' />".sfFormat(queryOptions.DialogCSS));
    $GCI.html("Loading....");
    // //width: window.top.$(window.top).width() * 0.88

    //this.AssureJQUITools($GCI).then((unused) => {

        $GCI.dialog({
            title: queryOptions?.DialogTitle, height: "auto", width: "auto", position: "top center"
            , show: { effect: "blind", duration: 100 }
            , close: function (event?:any, ui?:any) {
                console.log("PopQAInfo() Dialog Closing...",queryOptions?.QueryURL);
                $GCI.dialog('destroy');
                }
            }
        );
        if (sfRestClient._Options.LogLevel > LoggingLevels.None) console.log("PopQAInfo() loading {0}".sfFormat(url));
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
                if (jqXHR.responseText.length > 1234) $GCI.css("width",$(window.top!).width()! - 48);
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
        if (this.IsSiteURL(url)) return url;
        if (url.startsWith("../")) url = url.substring(3);
        url = `${this._SiteRootURL}/${url}`;
        return url;
    }

    /**
     * Loads UC Function Keys and corresponding Module/System Names
     * NOTE: returns a JQueryPromise
    */
    protected LoadUCFunctionMap(): JQueryPromise<any> {
        var RESTClient: sfRestClient = this;
        var DeferredResult = $.Deferred();
        var permitCheck = DeferredResult.promise();

        if (sfRestClient._UCPermitMap._etag.w === 0) {
            // see about localStorage
            var ls = JSON.parse(localStorage.getItem(sfRestClient._z.lsKeys.api_session_permits_map)!);
            if (ls && typeof ls._etag.w === "number") {
                console.log("Loaded Function Map from localStorage...");
                sfRestClient._UCPermitMap = ls;
            }
        }

        if ("WORK" in sfRestClient._UCPermitMap) {
            // we have a map, lets see if we should use it as-is
            if ((sfRestClient._WCC.UserKey === this.EmptyKey)) {
                // no session? So, now is not a good time to refreh the map, just use what we have
                DeferredResult.resolve(sfRestClient._UCPermitMap);
                return permitCheck;
                }

            if ((Date.now() - sfRestClient._UCPermitMap._etag.w) < (sfRestClient._Options.DVCacheLife * 4)   ) {
                // great: we have a map and it isn't old
                DeferredResult.resolve(sfRestClient._UCPermitMap);
                return permitCheck;
            }
        }


        if (!sfRestClient._SessionClientGetUCFKMap) sfRestClient._SessionClientGetUCFKMap = RESTClient._GetAPIXHR("session/permits/map?etag=" + Object.keys(sfRestClient._UCPermitMap._etag)[0]);
        sfRestClient._SessionClientGetUCFKMap.done(function DoneGetPermitMapRequest(r) {
            if (sfRestClient._SessionClientGetUCFKMap!.status !== 304) {
                if (typeof r === "object" && typeof r._etag === "object") {
                    r._etag.w = Date.now();
                    console.log("Loaded Function Map from server...");
                    localStorage.setItem(sfRestClient._z.lsKeys.api_session_permits_map, JSON.stringify(r));
                    sfRestClient._UCPermitMap = r;
                }
                else {
                    console.log("LoadUCFunctionMap() could not load Function Map from server...", sfRestClient._SessionClientGetUCFKMap);
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
    LoadUserSessionInfo(bypassCache?:boolean): Promise<WCCData> {
        var RESTClient: sfRestClient = this;
        var api: SessionClient ;
        var apiResult: Promise<WCCData | null> | null = null;
        sfRestClient._z.WCCLoaded = false; // required to make CheckPermit() (etc) wait for this to complete
        return new Promise<WCCData>( (resolve)  =>{
            if (sfRestClient._SessionClientGetWCC) {
                if (!bypassCache && sfRestClient._SessionClientGetWCC.AppliesFor(location.toString().sfHashCode())) {
                    if (sfRestClient._Options.LogLevel >= LoggingLevels.Debug) console.log(`LoadWCC(${RESTClient.ThisInstanceID}) Reusing ongoing getWCC for HREF hash ${sfRestClient._SessionClientGetWCC.ForNavHash}`);
                    apiResult = (<Promise<WCCData>> sfRestClient._SessionClientGetWCC.APIResult!);
                } else sfRestClient._SessionClientGetWCC = null;
            }
            if (!apiResult) {
                var ForPageHash =location.toString().sfHashCode();
                api = new SessionClient(this._SiteURL);
                if (sfRestClient._Options.LogLevel >= LoggingLevels.Debug) console.log(`LoadWCC(${RESTClient.ThisInstanceID}) Creating getWCC request for HREF hash ${ForPageHash}`);
                apiResult = <Promise<WCCData | null>> api.getWCC()
                sfRestClient._SessionClientGetWCC = new _SessionClientGetWCCShare(apiResult!,  ForPageHash);
            }
            if (!apiResult) console.warn("LoadUserSessionInfo failed to getWCC");
            apiResult.then((r: WCCData | null) => {
                if (r) {
                    this.UpdateWCCData(r);
                    resolve(r);
                }
                else {
                    //console.warn("SessionClient.getWCC() did not return data!");
                    if (sfRestClient._Options.LogLevel >= LoggingLevels.Debug) console.log(`SessionClient.getWCC() did not return data`);
                    let FakeWCC =new WCCData();
                    FakeWCC.AdminLevel = 0;
                    FakeWCC.DataPK= "00000000-0000-0000-0000-000000000000";
                    FakeWCC.DocRevKey= "00000000-0000-0000-0000-000000000000";
                    FakeWCC.DocSessionKey= "00000000-0000-0000-0000-000000000000";
                    FakeWCC.DocTypeKey= "00000000-0000-0000-0000-000000000000";
                    FakeWCC.UserKey = "00000000-0000-0000-0000-000000000000";
                    resolve(FakeWCC);
                }
            });
        });
    }

    protected static _SessionClientGetWCC : _SessionClientGetWCCShare | null;
    protected static _SessionClientGetUCFKMap : JQueryXHR | null;


    UpdateWCCData( newWCC: WCCData ) : WCCData {
        var RESTClient: sfRestClient = this;
        var ChangeList: Map<string, any> = new Map<string,any>();
        $.each(newWCC, function SetWCCProperties(pname: string  , pvalue) {
            var HasChanged = (typeof sfRestClient._WCC[pname] === "undefined") || (sfRestClient._WCC[pname] !== pvalue);
            if (HasChanged) {
                sfRestClient._WCC[pname] = pvalue;
                ChangeList.set(pname,pvalue);
            }
        });
        sfRestClient._WCC.PageName = RESTClient.ResolvePageName();
        sfRestClient._z.WCCLoaded = true;
        ChangeList.forEach((value,keyName) => {
            var eventName = "sfClient.SetWCC_{0}".sfFormat(keyName);
            if (sfRestClient._Options.LogLevel >= LoggingLevels.Debug) console.log("sfClient.UpdateWCCData() raising {0} = [{1}]".sfFormat(eventName,value));
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
        if (top!.sfClient !== this) return;
        jsResourceList.forEach(scriptSrc => {
            var src = scriptSrc;
            if (src.indexOf("?")>0) src= src.substring(0,src.indexOf("?"));
            var js : JQuery<HTMLScriptElement> = $("script[src^='{0}']".sfFormat(src));
            if (js.length === 0) {
                var RESTClient: sfRestClient = this;
                if (sfRestClient._Options.LogLevel >= LoggingLevels.Verbose) console.log("Dynamically Loading ",src);
                this.AddCachedScript(scriptSrc).then( ()=> {
                        if (sfRestClient._Options.LogLevel >= LoggingLevels.Verbose) console.log("Loaded.", scriptSrc);
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
            if (sfRestClient._z.XternalScriptsLoaded ) {console.log("AssureJQUITools() already done"); return false;}
            sfRestClient._z.XternalScriptsLoaded = true;
            if (!$element) $element = $("<div />");
            if (typeof $element.dialog !== "function") {
                // fighting with webpack here which obfuscates simpler: if (!window.jQuery) window.jQuery = $;
                if (!eval("window.jQuery") ) eval("window.jQuery = $;");
                this.AddCSSResource("//ajax.googleapis.com/ajax/libs/jqueryui/1.12.1/themes/base/jquery-ui.css");
                this.AddCSSResource(`${this._SiteURL}/theme-fa/styles.css?v=${sfRestClient._WCC.Version}`);
                if ($("LINK[rel='stylesheet'][href*='{0}']".sfFormat("fontawesome.com")).length===0)
                    $("head").prepend('<link rel="stylesheet" href="https://kit-free.fontawesome.com/releases/latest/css/free.min.css" media="all" id="font-awesome-5-kit-css">');

                    this.AddCachedScript(`${this._SiteURL}/Scripts/jquery.signalR-2.4.2.min.js`,true).then((likelyTrue) => {
                        this.AddCachedScript(`${this._SiteURL}/signalR/hubs`,true).then((likelyTrue)=>{
                            sfRestClient.StartSignalRClientHub();
                        });
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
        if (cssRef.indexOf("/") < 0) cssRef = `${this._SiteRootURL}/wv.aspx/js/${cssRef}.css`;
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
                var url : string =  sfRestClient._Options.PopNewDocLegacyURL;
                if (options?.indexOf("&UseID")) {
                    UseID = options.substr(options?.indexOf("&UseID")+7,36);
                }
                else UseID = await this.NewGuid();  // todo: fix this!!!
                if (sfRestClient._Options.PopDocForceXBUI) url =  sfRestClient._Options.PopNewDocXBURL;
                url  =  url.sfFormat(thisRestClient._SiteURL, dtk,project,options) ;
                if (sfRestClient._Options.LogLevel >= LoggingLevels.Verbose) console.log("PopNewDoc opening {0} DTK {1} using {2}".sfFormat(UseID, dtk,url));

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
       var RESTClient = this;
       return new Promise<Window | null>((resolve) => {
           if (!id.sfIsGuid()) {
                console.warn("PopDoc(): Document id expected; received",id);
                this.DisplayUserNotification("Document key expected",9876);
                resolve(null);
                return;
           }
           RESTClient.GetDV("DocMasterType",id,undefined).then(async (thisDocType) => {
               var thisRestClient = this;
               if (!thisDocType) {
                   console.warn("PopDoc(): Document not found"); //hmmm maybe a popup?
                   this.DisplayUserNotification("Document not found",9876);
                   resolve(null);
                   return;
               }
               //todo: determine if we should use the new or old UI based on the document type of this document
               var url : string =  sfRestClient._Options.PopDocLegacyURL;
               if (sfRestClient._Options.PopDocForceXBUI) url =  sfRestClient._Options.PopDocXBURL
               else {
                   if (await RESTClient.RuleResult("DocTypeConfig","WithPowerUX",thisDocType,false)) url =  sfRestClient._Options.PopDocXBURL;
               }

               url  =  url.sfFormat(thisRestClient._SiteURL, id) ;
               if (sfRestClient._Options.LogLevel >= LoggingLevels.Verbose) console.log("PopDoc opening DMK {0} DTK {1} using {2}".sfFormat(id, thisDocType,url));

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
     * Opens a new tab with location specified based on Document Key and UI version
     * @param id the guid DocMasterKey for the document to be opened
     */
   OpenProject(id : string) : Promise<Window | null>
   {
       var RESTClient = this;
       if (this.IsDocumentPage()) {
            $.connection.sfPMSHub.server.dashboardOpenLink("dashboard",`javascript:top.sfClient.OpenProject('${id}');`);
            return new Promise<null>((resolve)=> resolve(null));
       }
       return new Promise<Window | null>((resolve) => {

           this.GetDV("Project",id,undefined).then((thisProjectName) => {
               var thisRestClient = this;
               if (!thisProjectName) {
                   console.warn("Project not found");
                   this.DisplayUserNotification(`Project ${id} not found`,9876);
                   resolve(null);
                   return;
               }
               var url : string =  sfRestClient._Options.ProjectLegacyURL;
               if (RESTClient.IsPowerUXPage()) {
                    url = sfRestClient._Options.ProjectXBURL;
               }
               url  =  url.sfFormat(thisRestClient._SiteURL, id) ;
               if (sfRestClient._Options.LogLevel >= LoggingLevels.Verbose) console.log(`OpenProject opening ${id} using ${url}`);


               //todo: determine if we need the "how many tabs" logic and dialog
               if (!window) {
                   console.error("OpenProject() Must be called from a browser window");
                   resolve(null);
                   return;
               }
               self.location.href = url;
               resolve(self);
           });
       });
   }

   /** returns true if url starts with _SiteURL  */
   public IsSiteURL(url : string) : boolean {
    if (url.sfStartsWithCI(this._SiteURL)) return true;
    if (url.sfStartsWithCI(this._SiteRootURL)) return true;
    return false;
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
        if (sfRestClient._Options.LogLevel >= LoggingLevels.Verbose) console.log("sfRestClient.SetOptions() ",options);
        Object.keys(options).forEach((key) => {
            var PropName : any = '_' + key;
            //    if ((typeof this[PropName] !== "undefined"  &&  typeof this[key] === typeof options[key] ) {
            //         this[PropName] = options[key];
            //    }
            if (key === "DVCacheLife" && typeof sfRestClient._Options.DVCacheLife === typeof options[key]) sfRestClient._Options.DVCacheLife = options[key]
            else if (key === "LogLevel" && typeof sfRestClient._Options.LogLevel === typeof options[key]) sfRestClient._Options.LogLevel = options[key]
            else if (key === "PopDocForceXBUI" && typeof sfRestClient._Options.PopDocForceXBUI === typeof options[key]) sfRestClient._Options.PopDocForceXBUI = options[key]
            else if (PropName in this && typeof eval("this." + PropName) === typeof options[key]) sfRestClient._Options[PropName] = options[key];
        });
    }

    protected static _Options : NVPair  = {

        BasicPingServerInterval: 33*1000,
        BlankPageURI: "about:blank",
    /**
     * How long (in milliseconds) should a DV result be cached for reuse
    */
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
        PopupWindowLargeCWS: {top: -1, left: -1, width: 1000, height: 750},
        PopupWindowHelpMenuCWS: {top: -1, left: -1, width: 750, height: 700},
        PopupWindowUserSettingsCWS: {top: -1, left: -1, width: 830, height: 750},
        PopupWindowViewUserVWS:{top: -1, left: -1, width: 1000, height: 605},
        PopupWindowTop: 45,
        ProjectLegacyURL: '{0}/ProjectDetail.aspx?id={1}',
        ProjectXBURL: '{0}/spax.html#!/main/projectDashboard?project={1}'
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
                if (dv.indexOf("$") >= 0) dv = dv.replaceAll("$DTK", sfRestClient._WCC.DocTypeKey);
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
        if (sfRestClient._Options.LogLevel >= LoggingLevels.Verbose) console.log(url);
        return $.getJSON(url);
    }
    protected _APIURL(suffix: any) {
        return this._SiteURL + '/api/' + suffix;
    }

    /**
     * For example: http://server.domain.com/sfPMS  (does not include ending slash)
     */
    protected _SiteURL: string;
    protected _SiteRootURL: string;



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
     * @param dependsOnList semicolon separated list of related field and constants. eg #DocMasterDetail.Project;=Subtype (# is optional)
     * @param rawRow primary source of data
     */
    GatherDependsOnValues(dependsOnList:string, rawRow: any) : string[] | undefined {
        if (!dependsOnList) return undefined;
        var result: string[] = [];

        dependsOnList.split(";").forEach(element => {
            if (element.startsWith("=")) result.push(element.substring(1))
            else {
                if (element.startsWith("#")) element = element.substring(1);
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
                        if (FieldName in sfRestClient._WCC) {
                            SourceResolved = true;
                            result.push(sfRestClient._WCC[FieldName]);
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
        if (!sfRestClient._z.WCCLoaded) await this.LoadUserSessionInfo();
        if (!sfRestClient._WCC ) {
            console.warn("SharePageContext() _WCC missing?");
            return false;
        }

        Object.keys(contextData).forEach((key) => {
            if (key.startsWith("Doc")) {
                if (!this.IsDocumentPage()) {
                    console.warn("Not a document");
                    return false;
                }
                sfRestClient._WCC[key] = contextData[key];
            }
            else if (key === "DataPK" && typeof sfRestClient._WCC.DataPK === typeof contextData[key]) sfRestClient._WCC.DataPK = contextData[key]
            else if (key === "dsCacheKey" ) sfRestClient._WCC.dsCacheKey = contextData[key]
            else if (key in sfRestClient._WCC && typeof sfRestClient._WCC[key]  === typeof contextData[key]) sfRestClient._WCC[key] = contextData[key] // update if same type
            else if (!(key in sfRestClient._WCC)) sfRestClient._WCC[key] = contextData[key]
            else console.warn("SharePageContext() rejected {0}={1} due to a type mismatch".sfFormat(key,contextData[key]));
        });

        return true;

    }

    /**
     * Returns named value from Web Context (WCC)
     *
     * Example: GetPageContext("UserKey");
     *
     * @param key name of a context property
     */
    public GetPageContextValue( key : string, defaultValue? : any) : any {
        if (key in sfRestClient._WCC) {
            return sfRestClient._WCC[key];
        }
        console.warn("GetPageContext() no value known for key",key);
        return defaultValue;
    }

    public IsDocExclusiveToMe() : boolean {
        return ((!this.IsDocumentPage()) || (sfRestClient._WCC.DataLockFlag >= "2"));
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
        if (!sfRestClient._WCC ) { console.warn("_WCC missing?"); return false; }
        if (!sfRestClient._WCC.PageName) sfRestClient._WCC.PageName = this.ResolvePageName();
        var XBUIPageName : string = this.XBVariantOfPageName(this.ResolveStringPageNametoPageTypeName(pageWanted));
        return (    (sfRestClient._WCC.PageName == pageWanted)  ||
                    (sfRestClient._WCC.PageName == XBUIPageName)
                );
    }

    public IsPageOfType(pageWanted: string | PageTypeName) : boolean {
        if (typeof pageWanted === "string") {
            pageWanted = this.ResolveStringPageNametoPageTypeName(pageWanted);
        }

        return ( this.ResolvePageTypeName() === pageWanted);
    }

    protected IsGlobalInstance() : boolean {
        return (window.sfClient && window.sfClient === this );
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
            case "login":
                result = this.PageTypeNames.Login;
                break;
            case "dxutil":
                result = this.PageTypeNames.DiagUtilities;
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
            Context = sfRestClient._WCC.Project;
        }
        else {
            Context = this.GetPageQueryParameterByName(this.IsPowerUXPage() ? "project" : "id");
            var PageTypeName : string = this.ResolvePageName();
            if (!Context && !this.IsHomeDashboardPage()) console.warn("GetPageProjectKey() could not resolve project key for page ",PageTypeName);
        }
        return Context;
    }

    /** display support panel */
    public InvokeSupportPanel() : void {
        this.DisplaySysNotification("Coming soon...");
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
            if (sfRestClient._Options.LogLevel >= LoggingLevels.Verbose) console.warn("InvokeAction ignoring empty action");
            return;
        }
        if (!sfRestClient.ExternalToolsLoadedPromise) sfRestClient.ExternalToolsLoadedPromise = new Promise<boolean>(r=>{r(false);});
        if (ActionString.startsWith(this._SiteURL)) {

            //if (ActionString.indexOf("?") === -1 &&  ActionString.indexOf(".aspx&set") > 0 )  ActionString = ActionString.replaceAll("&set","?set");// kludge to fix ?set being &set
            if (ActionString.indexOf("?") < 0 && ActionString.indexOf("#") < 0) ActionString += "?fq=1"; //fake query parameter
            if (ActionString.indexOf("?") >0 && ActionString.indexOf("xbia") < 0 && this.IsPowerUXPage()) ActionString += "&xbia=1";
            if (ActionString.indexOf("libview.aspx") > 1) {
                var ActionOptions : string = "";
                if (ActionString.indexOf("?") > 0) {
                    ActionOptions = "&"+  ActionString.substring(ActionString.indexOf("?")+1);
                }
                ActionString = `javascript:vPgPopup('v/LibView.aspx', '${ActionOptions}', 850, 950);`; // ... w,h
            }
            else {
                this.ModalDialog(ActionString, undefined, undefined, window);
                return;
            }

        }
        var match : RegExpExecArray | null = null;;
        if (sfRestClient._Options.LogLevel >= LoggingLevels.Verbose) console.log("InvokeAction: ",ActionString);

        var rxIsVPgPop =  new RegExp(/vPg(Popup|Dialog)\(['"](?<vpgName>[\w\/\.]+)['"],\s*(?<argslit>['"])(?<args>.*)['"],\s*(?<width>\d+),\s*(?<height>(\d+|null|undefined))(,\s*(?<default>.+)|)\)/gm);
        match = rxIsVPgPop.exec(ActionString); // vpgName, args, width, height
        if (match) {
            if ( match.groups) {
                if (sfRestClient._Options.LogLevel >= LoggingLevels.Verbose) console.log(`InvokeAction::VPg(${match.groups!.vpgName}) ${match.groups.args} w${match.groups.width},h${match.groups.height}`);
                var ActionArgs : string = this.ExpandActionMarkers(match.groups.args,rowData);
                if (ActionArgs && ActionArgs.indexOf("&Project") < 0) ActionArgs += "&Project="+ this.GetPageProjectKey();
                this.VModalPage(match.groups!.vpgName,ActionArgs,parseInt(match.groups.width),parseInt(match.groups.height),match.groups.default);
            }
            else {
                console.warn("InvokeAction::VPg failed match",ActionString);
            }
        }
        else if (ActionString.indexOf("top.location.reload(") >= 0) {
            top!.location.reload(); // per https://developer.mozilla.org/en-US/docs/Web/API/Location/reload including (true) or (false) is ignored.
        }
        else if (ActionString.indexOf("PopDoc(") >= 0) {
            var rxPopDoc = /javascript:PopDoc\(['"](?<idguid>[0-9a-fA-F\-]{36})['"]/gm;
            var match = rxPopDoc.exec(ActionString);
            if (match && match.groups) {
                if (sfRestClient._Options.LogLevel >= LoggingLevels.Verbose) console.log("InvokeAction::Doc({0}})".sfFormat(match.groups!.idguid ));
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
                if (sfRestClient._Options.LogLevel >= LoggingLevels.Verbose) console.log("InvokeAction::Doc({0}})".sfFormat(match.groups!.idguid ));
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
        else if (   ActionString.indexOf("PopXLTool(") >= 0 ||
                    ActionString.indexOf("PopFVC(") >= 0 ||
                    ActionString.indexOf("PopMSWindowTool(") >= 0 ||
                    ActionString.indexOf("PopAuditTool(") >= 0) {
                var targetURL = "";
                if (ActionString.indexOf("PopFVC(") >= 0) {
                    var rx = /javascript:PopFVC\(['"`](?<URL>.*)[`'"],['"`](?<fileKey>.*)[`'"],['"`](?<idname>.*)[`'"],['"`](?<command>.*)[`'"]/gm;
                    var match = rx.exec(ActionString);
                    if (match && match.groups) {
                        targetURL = `${this._SiteRootURL}/cabs/FileVersion.application?key=${match.groups.fileKey}&id=${match.groups.idname}&cmd=${match.groups.command}`;
                    }
                    else console.warn("InvokeAction() could not parse PopFVC() ",actionString)
                    }
                else {
                        var rx = /javascript:(PopMSWindowTool|PopXLTool|PopAuditTool)\(['"`](?<URL>.*)[`'"]\)/gm;
                        var match = rx.exec(ActionString);
                        if (match && match.groups) {
                            targetURL = match.groups.URL
                        }
                        else console.warn("InvokeAction() could not parse",actionString);
                    }

                    this.FollowLinkViaSFLink(targetURL,false);
                }

            else if (ActionString.indexOf("/dcmodules/") >= 0  || ActionString.indexOf("/admin/") >= 0 ) {
            console.warn("InvokeAction::tools not really done",ActionString);
            top!.location.href = ActionString;
        }
        else if (ActionString.startsWith("javascript:")) {
            try {
                eval(ActionString.substr(11));
            }
            catch (ex:any) {
                console.warn("InvokeAction::failed javascript ",ActionString, ex.message);
                this.DisplayUserNotification("Coming soon: failed to invoke requested action.",9999);
            }

        }
        else if (ActionString.startsWith("http")) {
            window.open(ActionString);
        }
        else {
            this.DisplayUserNotification("Coming soon: could not invoke requested action.",9999);
            console.warn("InvokeAction() could not handle ",actionString);
        }
    }

    public FollowLinkViaSFLink(targetURL: string, afterOpenArg? : boolean | string | [string,string] | Function, autoCloseDoc?:boolean) : void {
        var RESTClient = this;
        if (targetURL.endsWith("&Project=")) targetURL += RESTClient.GetPageProjectKey();
        if (!top?.ClickOnceExtension.HasDotNetApplicationExtension()) {
            var RetryLater = `FollowLinkViaSFLink('${targetURL}'`;
            if (typeof afterOpenArg !== "undefined") {
                RetryLater = RetryLater + `,${afterOpenArg}`;
                if (typeof autoCloseDoc !== "undefined") RetryLater = RetryLater + `,${autoCloseDoc}`;
            }
            RetryLater = RetryLater + ");"
            setTimeout(RetryLater, 222);
            return;
        }
        if (!top.ClickOnceExtension.HasDotNetApplicationExtension() ) {
            var DialogButtons = [];
            DialogButtons.push(
                {
                    text: "Install",
                    "id": "btnOK",
                    click: function () {
                        RESTClient.InvokeAction(BrowserExtensionChecker.WRemixWebstoreLink);
                        $(this).dialog("close");
                    }
                });
            DialogButtons.push(
                {
                    text: "Ignore",
                    "id": "btnIgnore",
                    click: function () {
                        top?.ClickOnceExtension.IgnoreMissingExtension();
                        $(this).dialog("close");
                        RESTClient.jqAlert("Please try your action again.  If you see a prompt to keep or open (at the bottom), click to proceed!", ".NET Link Helper Recommended");
                        return;
                    }
                });
            var $A = RESTClient.jqAlert(`ClickOnce Helper is required.  Please install <a href='${BrowserExtensionChecker.WRemixWebstoreLink}' style='text-decoration: underline' target='_blank'>this extension</a>!`,
                             ".NET Link Helper Required");
            $A.dialog('option', 'buttons', DialogButtons);
            return;
        }
        if (sfRestClient._Options.LogLevel >= LoggingLevels.Verbose) console.log("FollowLinkViaSFLink() xt for: " + targetURL);

        var api =  new SessionClient(RESTClient._SiteURL);
        var tokeArgs = new _SwaggerClientExports.TokenRequest();
        tokeArgs.Args = targetURL;
        tokeArgs.UserKey = RESTClient.GetPageContextValue("UserKey");
        tokeArgs.LoginSessionKey = RESTClient.GetPageContextValue("LoginSessionKey");
        tokeArgs.DataLockFlag = RESTClient.GetPageContextValue("DataLockFlag");
        tokeArgs.DataPK = RESTClient.GetPageContextValue("DataPK");
        tokeArgs.DocSessionKey = RESTClient.GetPageContextValue("DocSessionKey");
        tokeArgs.dsCacheKey = RESTClient.GetPageContextValue("dsCacheKey");
        tokeArgs.SiteID = RESTClient.GetPageContextValue("SiteID");
        tokeArgs.PageName = RESTClient.GetPageContextValue("PageName");
        tokeArgs.PartName = RESTClient.GetPageContextValue("PartName");
        tokeArgs.TZOffset = RESTClient.GetPageContextValue("TZOffset");
        api.createExchangeToken(tokeArgs).then((xToken)=>{

            if (xToken && xToken?.length > 3) {
                if (!autoCloseDoc && typeof autoCloseDoc !== "boolean") autoCloseDoc = false;
                RESTClient.OpenWindowsLinkHelper(xToken, afterOpenArg, autoCloseDoc);
            }
            else {
                RESTClient.jqAlert("Could not get link exchange token - contact support");
            }
        });
    }

    /**
     *
     * @param et token passed to sfLink
     * @param afterOpenArg  boolean/true: closes document page; false/0: posts back default refresh; ['e','a']: posts back e with a;
     * @param autoCloseDoc
     */
    public OpenWindowsLinkHelper(et:string, afterOpenArg? : boolean | string | [string,string] | Function, autoCloseDoc?:boolean) : void {
        var RESTClient = this;
        var openURL = `${this._SiteURL}/cabs/sflink/sfLink.application?et=${et}&ak=${this.getCookie("ARRAffinity")}`;
        if (sfRestClient._Options.LogLevel >= LoggingLevels.Verbose) console.log("OpenWindowsLinkHelper() to: " + openURL);
        var xscript = "";
        var innerScript = "";
        var innerDelay = 255 + (BrowserExtensionChecker.browser.isEdge ? 789 : 0);
        xscript = `top.location.href = '${openURL}';`;
        // afterOpenArg: boolean/true: closes document page; false/0: posts back default refresh; ['e','a']: posts back e with a;
        if (RESTClient.IsDocumentPage() && typeof afterOpenArg === "boolean" && afterOpenArg) {
            innerScript = "top.ResetUnsavedChanges();";
            if (autoCloseDoc) {
                innerScript += 'setTimeout(\\\'top.location.href = "about:blank";\\\', 842);';
                innerScript += "window.top.close();"
            }
            xscript = `setTimeout(\'${innerScript};\', 242);` + xscript;
        }
        else if (!afterOpenArg || typeof afterOpenArg === "string" || (Array.isArray(afterOpenArg)  && afterOpenArg.length === 2)) {
            if (!afterOpenArg) afterOpenArg = "ibtnRefreshAttachList"
            var pbArg = 'AfterPopFVC';
            if (Array.isArray(afterOpenArg) && afterOpenArg.length === 2) {
                pbArg = afterOpenArg[1];
                afterOpenArg = afterOpenArg[0];
            }
            innerScript = `PostbackRefresh(\\\'${afterOpenArg}\\\',\\\'${pbArg}\\\');`;
        }
        else if (typeof afterOpenArg === "function") afterOpenArg(et)
        else console.log("OpenWindowsLinkHelper() - no post action", afterOpenArg);

        if (typeof innerScript === "string" && innerScript.length > 0) xscript = `setTimeout(\'${innerScript};\', ${innerDelay});`   + xscript;
        setTimeout(xscript, 211);
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

    protected getCookie(cname:string):string {
        var name = cname + "=";
        var ca = document.cookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i]; //.trim() did not work in IE
            while ( c.length > 0  &&  c.charAt(0) === ' ') c = c.substring(1, c.length);

            if (c.indexOf(name) === 0) return c.substring(name.length, c.length);
        }
        return "";
    }
    /**
     * Figures out the type of page and the amount of viewable height (without scrolling)
     * @returns height of top frame
     */
    UsablePageHeight() : number {
        var RunHeight = top!.$("BODY").height()!;
        var $FooterInfo = top!.$('TD#sfUIShowClientInfo');
        if ($FooterInfo.length === 0) $FooterInfo = top!.$("DIV.project-dashboard__footer-buttons");
        if ($FooterInfo.length > 0) RunHeight =$FooterInfo.position().top + $FooterInfo.height()! + 16;
        return RunHeight;
    }

    notificationMsgTimeoutHandle: number | undefined;
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
            top!.sessionStorage.setItem(msgHash, "true");
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
    DisplayThisNotification(templateURL : string, notificationText? : string, timeOutMS? : number) : Promise<JQuery<HTMLElement>>{
        $("DIV#SNotificationContainerHolder").remove();

        var RESTClient = this;
        var msgReady : Promise<JQuery<HTMLElement>> = new Promise<JQuery<HTMLElement>>( (msgDisplayResolved) => {
            if (RESTClient.notificationMsgTimeoutHandle) {
                clearTimeout(RESTClient.notificationMsgTimeoutHandle);
                RESTClient.notificationMsgTimeoutHandle = undefined;
            }
            var $MsgDiv = $('<div />');
            if ((!notificationText) || (RESTClient.WasNotificationShown(notificationText))) {
                if (notificationText) console.log("Notification Already Shown: {0}".sfFormat(notificationText));
                $MsgDiv.data("alreadyshown",true);
                msgDisplayResolved( $MsgDiv );
                return msgReady;
            }
            if (notificationText.indexOf("$PopDoc()") > 0 && notificationText.indexOf("data-key")) {
                var rx = /data-key=["'](?<idguid>[0-9a-fA-F\-]{36})['"]/gm;
                var match = rx.exec(notificationText);
                if (match) {
                    if ( match.groups && match.groups.idguid) {
                        if (sfRestClient._Options.LogLevel >= LoggingLevels.Verbose) console.log(`DisplayThis::key() {match.group.idguid}`);
                        notificationText = notificationText.replaceAll("$PopDoc();",`PopDoc('${match.groups.idguid}');`);
                    }
                }
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
            RESTClient.notificationMsgTimeoutHandle = setTimeout("top.sfClient.ClearNotificationMsgTimeoutHandle(); top.sfClient.DisplayThisNotification('{0}');".sfFormat(templateURL),timeOutMS);
        });
        return msgReady;

    }

    ClearNotificationMsgTimeoutHandle() : void {
        this.notificationMsgTimeoutHandle = undefined;
    }
    DisplaySysNotification(responseText: string | number, timeOutMS?:number) : Promise<JQuery<HTMLElement>>{
        if (typeof responseText === "number") responseText = responseText.toString();
        if (responseText.startsWith("SysNotification")) responseText = responseText.substring(16);
        return this.DisplayThisNotification("ajhx/sysnotification.html", responseText, timeOutMS);
    }

    /** Displays a simple user notification, with "dismiss" session memory
     * @param notificationText The message.  Message is skipped if the same exact message has already been dismissed.
     */
    DisplayUserNotification(notificationText? : string, timeOutMS?: number): Promise<JQuery<HTMLElement>> {
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
        if (!this.IsGlobalInstance()) {
            return top?.sfClient.VModalPage(vpg,opts,w,h,defaultResponse);
        }
        if (!defaultResponse ) defaultResponse = "";
        var context : Window = window;
        var innerContext = window;
        if (parent != window) {
           // if (typeof context["sfRestClient"] == "undefined") context = parent as Window;
           // if (sfWCC.isAsyncPart) context = parent;
        }

        var UIPromise: Promise<boolean | undefined> | undefined = this.ModalDialog(`pvp.aspx?vpg=${vpg}${opts}`, vpg, defaultResponse, innerContext);

        UIPromise?.then((unused) => {

            if (!this.$LookupDialog!.data("RestoredSize")) {
                if (w === 440) w = Math.round($(window).width()! * 0.5);
                if (w != null) top?.sfClient.sfLookupWidthChangeTo(this.$LookupDialog!, w);
                if (h != null) top?.sfClient.sfLookupHeightChangeTo( this.$LookupDialog!,h + this._LookupViewPortAdjustments.outsidExtraH);
            }
        });

    }

    static GAPageHitSent: boolean = false; // !!! this needs work
    static GAMonitorSendFailed: boolean = false;
    private GAMonitorPageHit(propertyID:string, clientID:string, url?:string, title?:string) {
        if (sfRestClient.GAPageHitSent) return;
        if (!url) {

            url = `${top?.location?.origin}${top?.location?.pathname}`;
            var s = top?.location.search;
            if (s && (!s.startsWith("?id=")) && (!s.startsWith("?add=")) ) url = url + s;
        }
        if (!title) title = $('title').text();
        var payload = {
            v: 1,
            t: "pageview",
            tid: propertyID,
            cid: clientID,
            dl: url,
            dt: title,
        }
        sfRestClient.GAPageHitSent = true;
        return this.GAMonitorSend(payload)
                         .done(function (data, textStatus, jqXHR) {
                             console.log(`GAMonitor(pageview:${top?.location.pathname}) ok`);
                         })
                        .fail(function (jqXHR, textStatus) {
                            sfRestClient.GAMonitorSendFailed = true;
                            console.warn(`GAMonitor(pgvw:${top?.location.pathname}) failed: ${jqXHR.responseText} ` );
                        });
    }


    private GAMonitorSend(payload:string | JQuery.PlainObject):JQuery.Promise<any> {
        //ref https://developers.google.com/analytics/devguides/collection/protocol/v1/devguide#page
        if ((typeof (sfRestClient.GAMonitorSendFailed) === "boolean") && (sfRestClient.GAMonitorSendFailed)) {
            var darnSoon = $.Deferred();
            var GASendDone = darnSoon.promise();
            darnSoon.resolve("fake");  //makes GASendDone be ready
            return GASendDone;
        }
        return $.ajax({
            type: "POST",
            url: "//www.google-analytics.com/collect",
            async: true,
            data: payload
        });
    }

    GAMonitorEvent(propertyID:string, clientID:string, category:string, action:string, label:string, value:number) {
        if (!sfRestClient.GAPageHitSent) this.GAMonitorPageHit(propertyID, clientID);

        var payload = {
            v: 1,
            t: "event",
            tid: propertyID,
            cid: clientID,
            ec: category,
            ea: action,
            el: label,
            ev: value
        }

        return this.GAMonitorSend(payload)
                        .done(function (data, textStatus, jqXHR) {
                            console.log(`GAMonitor(${category}:${action}) ok`);
                        })
                        .fail(function (jqXHR, textStatus) {
                            console.warn(`GAMonitor(${category}:${action}) failed: ${jqXHR.responseText}`);
                        });

    }

    sfGAEvent(category:string, action:string, label:string, value:number) {
        if (!value) value = 0;
        if (sfRestClient._WCC.GAFMOptOut) {
            console.log(`GA opt out: ${category} + ${action} '${label}' = ${value} `);
            return;
        }
        this.GAMonitorEvent('UA-6465434-4', sfRestClient._WCC.SiteID, category, action, label, value);
    }

    sfGADialogEvent(action:string, dialogName:string) {
        this.sfGAEvent("Dialog", action, dialogName, 1);
    }

    private ValueHasWildcard(theVal:string) :boolean {
        if (theVal.indexOf("%") >= 0) return true;
        if (theVal.indexOf("*") >= 0) return true;
        if (theVal.indexOf("_") >= 0) return true;
        if (theVal.indexOf("?") >= 0) return true;
        return false;
    }

    private sfClearACHeighLimit():void {
        var $ACList = $('ul.ui-autocomplete');
        $ACList.css("max-height", "");
    }

    /**
     * / Note: this only returns Async Frames, not frames for lookups and other dialog scenarios
     * @returns
     */
    private sfGetParentIFrame(): JQuery<HTMLElement> {
    // from INSIDE a frame, this returns the PARENT IFRAME
    if (window === parent || typeof window.parent.$ === "undefined") return $();
    return window.parent.$(`IFRAME.sfAsyncPartFrame[src='${location.pathname}${location.search}']`);
}

    private sfLimitACHeightInFrame($AnchorEL:JQuery):void {
        var $ACList = $('ul.ui-autocomplete');
        if ($ACList.length === 0) return;
        var $PFrame: JQuery<HTMLElement> = this.sfGetParentIFrame();
        if ((!$PFrame) || ($PFrame.length === 0)) return;
        var FrameHeightNow = $PFrame.height()!;
        var AnchorPos = $AnchorEL.position();
        var ListPos = $ACList.position();
        var ListNeeds = $ACList.height()!;
        var ListHeight = $AnchorEL.height();
        if (ListPos.top < 0) {
            ListHeight = AnchorPos.top - 30;  // + ListPos.top)
            var newTop = AnchorPos.top - ListHeight
            console.log(`sfLimitACHeightInFrame() list height reduced from ${ListNeeds} to ${ListHeight} for top of frame `);
            $ACList.css({ "max-height": `${Math.round(ListHeight)}px`, "top": `${newTop}px` });
        }
        else if (ListPos.top + ListNeeds > FrameHeightNow) {
            ListHeight = FrameHeightNow - ListPos.top;
            console.log(`sfLimitACHeightInFrame() list height limited to ${ListHeight} in ${FrameHeightNow}`);
            $ACList.css({ "max-height": `${ListHeight}px`});
        }
    }

    /**
     * Enhance an INPUT element with Autocomplete (classic UI)
     * @param $AC NAME attribute of INPUT or the Input Element
     * @param lookupName source of autocomplete choices
     * @param depends1
     * @param dep2
     * @param dep3
     * @param dep4
     */
    sfAC($AC: string | JQuery<HTMLInputElement>, lookupName:string, depends1:string|string[], dep2?:string, dep3?:string, dep4?:string) {
        if (typeof $AC === "string") $AC = $("#" + $AC);
        var RESTClient = this;
        var SourceURL = `${RESTClient._SiteRootURL}/api/suggestions/${lookupName}/${this.GetPageContextValue("dsCacheKey")}/${this._formatDependsList(true, depends1, dep2, dep3, dep4)}/`;
        $AC.data("sourceurl",SourceURL).autocomplete({
            source: SourceURL
            , minLength: 3
            , delay: 400
            , position: { collision: "flip" }
            , autoFocus: false
            , open: function (event:any, ui:any) {
                var $EL = $(this);
                $EL.data('acOpen', true);
                RESTClient.sfLimitACHeightInFrame($EL);
                // too late to increase frame height
            }
            //, search: function (event, ui) { $(this).autocomplete("option", "autoFocus", false); }
            , response: function (event:any, choices:any) {
                $AC = $(this);
                if (!$AC.hasClass("ui-autocomplete-input")) return;
                var enableAF = !RESTClient.ValueHasWildcard(<string>$AC.val());
                $AC.autocomplete("option", "autoFocus", enableAF);
                //hint: do not use $.each to modify choices.content, must update directly
                $AC.trigger("sfAutoCompleted.Response", choices); // yes is synchronous legacy name
                $AC.trigger("sfAC.response", [choices]); // yes is synchronous , normalized (event is always passed)
                if (sfRestClient._Options.LogLevel >= LoggingLevels.Debug)  console.log(`sfAC autofocus ${enableAF}`);
            }
            , close: function (event:any, ui:any) {
                var ib = $(this);
                RESTClient.sfClearACHeighLimit();
                ib.data('acOpen', false);
                if (ib.data("acChange")) {
                    var kv = ib.data("acKey");
                    if (kv) {
                        if (!ib.hasData('acPostbackKey') || ib.data('acPostbackKey')) {
                            ib.css('color', 'white');
                            this.value = kv;
                        }
                        ib.trigger("sfAutoCompletedKV", [kv]);  // legacy, pre 2019
                        ib.trigger("sfAC.KV", [kv]);            // normalized naming
                    }
                    ib.data("acChange", false).trigger("change");
                }
            }
            , select: function (event:any, ui:any) {
                var ib = $(this);
                ib.data("acChange", true);
                var kv = ui.item.key;
                if (kv) {
                    ib.data('acKey', kv)
                }
                ib.trigger("sfAC.AutoCompleteSelect", [ib]);  // legacy name, pre 2019
                ib.trigger("sfAC.select", [ui,ib]);    // normalized event name
                let ibValue = ib?.val() as string;
                if (typeof ibValue ===  "string" && ibValue.length === 0) {
                    // prevent auto-select if had data and is now empty (Provides way to "blank out" the selection)
                    if ((ib.hasData("ValLen")) && (ib.data("ValLen") ) ) {
                        // event.preventDefault();
                        return false;
                    }
                }
            }
            , change: function (event:any, ui:any) {
                if (ui.item === null) return;
                $(this).data("acChange", true);
            }
        });
        $AC.on("blur",function (e:any) {
            //if ($(this).data("acOpen")) { e.preventDefault(); return false
        }).on("keypress",function(e:any) {
            var ib = $(this);
            if (e.which === 13) return;
            let ibValue = ib?.val() as string;
            if (typeof ibValue ===  "string" && ibValue.length > 0) ib.data("ValLen",  ibValue.length);
            ib.autocomplete("option", "autoFocus", false);
            ib.autocomplete("close");
            if (sfRestClient._Options.LogLevel >= LoggingLevels.Debug)  console.log(`sfAC Key ${e.which}; autofocus off`);
        }).data("acOpen", false).data("acChange", false);

    }

    /** Displays a modal dialog and returns a reference to the dialog for further manipulation
     * @argument msg the text for the dialog message.  Can include html
     * @argument title optional title
     * @argument uiAlertIcon if specified, and not false, ui-icon class name (see https://api.jqueryui.com/theming/icons/)
     */
    jqAlert(msg: string, title?: string , uiAlertIcon?: string ) : JQuery<HTMLElement> {
        console.log("jqAlert: " + msg);
        var $ALERT: JQuery<HTMLElement> ;
        if (!title) title = "Message from Web Application";
        if ((typeof uiAlertIcon === "undefined") || (typeof uiAlertIcon === "boolean" && uiAlertIcon)) {
            uiAlertIcon = '<span class="ui-icon ui-icon-alert" style="float: left; margin: 0 7px 20px 0;"></span>';
        }
        else if ((typeof uiAlertIcon === "boolean" && !uiAlertIcon)) uiAlertIcon = "";
        else if ((typeof uiAlertIcon === "string") && (uiAlertIcon.length > 1))  uiAlertIcon = `<span class="ui-icon ${uiAlertIcon}" style="float: left; margin: 0 7px 20px 0;"></span>`;

        var fullMsg = `<div id="sfUI-Dialog-Alert" title="${title}" style="font-size: 0.8em">${uiAlertIcon}<span id="AlertMsgText">${msg}</span></div>`;
        var dialogOptions = {
            modal: true,
            minWidth: 250,
            width: "300",
            height: 'auto',
            show: {
                effect: "blind",
                duration: 444
            },
            hide: {
                effect: "puff",
                duration: 333
            },
            buttons: {
                Ok: function () {
                    $(this).dialog("close");
                }
            },
            open: function () {
                $(this).parent('DIV').find('.ui-dialog-buttonpane button:eq(0)').trigger("focus");
            }
        };
        if (msg.length > 20) dialogOptions.width = "auto";
        $ALERT = $(fullMsg).dialog(dialogOptions);
        return ($ALERT);
    }


    ModalDialog(url: string, eventId: string | undefined, eventArg: string | undefined, eventContext: Window) : Promise<boolean|undefined> | undefined {
        var newValue;
        var formName = "0";
        if (!this.IsGlobalInstance()) {
            return top?.sfClient.ModalDialog(url,eventId,eventArg,eventContext);
        }

        if (!eventId) eventId = 'mDialog';
        if (typeof eventArg === "undefined") eventArg = url;
        if (!window) {
            console.warn("ModalDialog() must be called in a browser window!", url);
            return new Promise<boolean>((b) => {  b(false)});;
        }
        if (eventContext == null) eventContext = window;
        var RESTClient = this;

        sfRestClient.ExternalToolsLoadedPromise.then((unused)=>{
            var DefaultWidth = $("body").width();
            if (typeof DefaultWidth === "number") DefaultWidth = Math.round(DefaultWidth / 2.2);
            if (!DefaultWidth || DefaultWidth < 500) DefaultWidth = 500;
            if (this.$LookupDialog) {
                sfRestClient.$LookupDialogStack.push(this.$LookupDialog);
                this.$LookupDialog = undefined;
            }

            if (!this.$LookupDialog) {
                this.$LookupDialog =  $(`<div class='clsJQLookup' autofocus='autofocus' ><iframe id='sfClassicUIHolder' src='${sfRestClient._Options.BlankPageURI}' style='width: 100%; height: 150px;border:0;' seamless='seamless' autofocus='autofocus' /></div>`)
                .dialog(        { autoOpen: false, modal: true, title: 'Lookup Dialog', width: DefaultWidth, height: 200,
                        close: top!.sfClient.sfModalDialogClosed,
                        dialogClass: "lookup",
                        resizeStop:  top?.sfClient.sfModelDialogResizedHandler,
                        dragStop: top?.sfClient.sfModelDialogResizedHandler
                    });
                top?.sfClient.AddDialogTitleButton(top.sfClient.$LookupDialog!,"btnMaximizeDialog","Maximize","ui-icon-arrow-4-diag").on("click",function() {
                    var $BTN = $(this);
                    var $DialogDiv = $(top!.sfClient.$LookupDialog!).closest("DIV.ui-dialog");
                    let PriorSizeData: CoordinateWithSize;
                    const RestoreSizeDataName = "restoresize";
                    if ($BTN.data(RestoreSizeDataName)) {
                        // "restore" prior size
                        PriorSizeData = $BTN.data(RestoreSizeDataName);
                        $DialogDiv.css({top:PriorSizeData.top,left:PriorSizeData.left});
                        top?.sfClient.sfLookupHeightChangeTo(top.sfClient.$LookupDialog!,PriorSizeData.height);
                        top?.sfClient.sfLookupWidthChangeTo(top.sfClient.$LookupDialog!,PriorSizeData.width);

                        $BTN.toggleClass("ui-icon-arrow-4-diag",true).toggleClass("ui-icon-arrow-4",false).data(RestoreSizeDataName,null);
                    }
                    else {
                        // "maximize"
                        $BTN.toggleClass("ui-icon-arrow-4-diag",false);
                        $BTN.toggleClass("ui-icon-arrow-4",true);
                        var PositionNow = $DialogDiv.position();
                        PriorSizeData = {top:PositionNow.top,
                                left : PositionNow.left,
                                width : $DialogDiv.width()!,
                                height : $DialogDiv.height()!
                        };
                        $DialogDiv.css({top:sfRestClient._Options.PopupWindowTop,left:14});
                        if (sfRestClient._Options.LogLevel >= LoggingLevels.Debug)  console.log(`ModalDialog() maximize; autofocus off`,PriorSizeData);
                        top?.sfClient.sfLookupHeightChangeTo(top.sfClient.$LookupDialog!,$(top).height()!-top.sfClient.DialogViewPortAdjustments.outsidExtraW);
                        top?.sfClient.sfLookupWidthChangeTo(top.sfClient.$LookupDialog!,$(top).width()!-top.sfClient.DialogViewPortAdjustments.outsidExtraW);
                        $BTN.toggleClass("ui-icon-arrow-4-diag",false).toggleClass("ui-icon-arrow-4",true).data(RestoreSizeDataName,PriorSizeData);
                        $DialogDiv.css({top:sfRestClient._Options.PopupWindowTop,left:14});
                    }
                });
            }

            var  OpenUrl = url;
            if (!RESTClient.IsSiteURL(OpenUrl)) OpenUrl = `${RESTClient._SiteRootURL}/${url}`;

            if (OpenUrl.indexOf("xbia=1") && top?.sfClient.IsPowerUXPage()) {
                //ui-icon-script
                top?.sfClient.AddDialogTitleButton(top.sfClient.$LookupDialog!,"btnToClassicUI","Classic UI","ui-icon-script").on("click",function() {
                    top!.location.href = OpenUrl.replace("xbia=1","xbia=0");
                });
            }

            //LookupOpenUrl = LookupOpenUrl + '&lookupName=' + lookupName +
            //	        '&resultName=' + resultName +
            //	        '&postBack=' + postBack + fromPage + dependsList;
            if (!this.$LookupDialog) {
                console.warn("Could not open dialog (missing DIV), lost",url);
                return false;
            }
            var ThisURLHash = OpenUrl.sfHashCode();
            var ApplySizeAndPosition:boolean = (sfRestClient._DialogCoordinateCache.has(ThisURLHash));
            var TargetSizeData: CoordinateWithSize | undefined;
            var $DialogDiv : JQuery<HTMLDivElement>;
            if (ApplySizeAndPosition) {
                this.$LookupDialog!.data("RestoredSize",true );
                this.$LookupDialog!.data("SizePending",true );
                TargetSizeData = sfRestClient._DialogCoordinateCache.get(ThisURLHash)!;
                if (sfRestClient._Options.LogLevel >= LoggingLevels.Verbose)  console.log('ModalDialog() Target size/loc',TargetSizeData);
            }
            else {
                if (url.indexOf("cuManager.aspx") > 0 ) TargetSizeData = sfRestClient._Options.PopupWindowLargeCWS
                else if (url.indexOf("cusysm.aspx") > 0 ) TargetSizeData = sfRestClient._Options.PopupWindowLargeCWS
                else if (url.indexOf("dxutil.aspx") > 0 ) TargetSizeData = sfRestClient._Options.PopupWindowViewUserCWS
                else if (url.indexOf("vpg=HelpMenu") > 0 ) TargetSizeData = sfRestClient._Options.PopupWindowHelpMenuCWS
                else if (url.indexOf("whoami.aspx") > 0 ) TargetSizeData = sfRestClient._Options.PopupWindowUserSettingsCWS
                else if (url.indexOf("viewuser.aspx") > 0 ) TargetSizeData = sfRestClient._Options.PopupWindowViewUserCWS
                else if (url.indexOf("users.aspx") > 0 ) TargetSizeData = sfRestClient._Options.PopupWindowLargeCWS;

                if (TargetSizeData) ApplySizeAndPosition = true
                else TargetSizeData = {top:0,left:0,width:0,height:0};
            }
            this.$LookupDialog.data("postbackEventId", eventId!);
            this.$LookupDialog.data("postbackEventArg", eventArg!);
            this.$LookupDialog.data("postback", (eventId != sfRestClient._Options.NonPostbackEventID));
            this.$LookupDialog.data("postbackContext", eventContext);
            this.$LookupDialog.data("urlHash", ThisURLHash);
            this.$LookupDialog.data("idName", url);
            this.$LookupDialog.data("newValue", eventArg!);  // must reset to null or prior lookup result value may get used
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
            this.$LookupFrame!.attr("src",sfRestClient._Options.BlankPageURI);
            this.SetModalDialogTitle(this.$LookupDialog,"");
            this.$LookupFrame!.attr('src', OpenUrl); // only w iframe


            this.$LookupDialog.dialog('open');
            $DialogDiv = $(top!.sfClient.$LookupDialog!).closest("DIV.ui-dialog");

            try {
                var $LookupFrameDOM = this.$LookupFrame[0].contentDocument! || this.$LookupFrame[0].contentWindow!.document;
                if ($LookupFrameDOM.location.href !== this.$LookupFrame.attr('src')) {
                    // we have confirmed that in a nested child frame, $LookupFrame is correct, but sometimes src does not update location
                    setTimeout("top.sfClient.RefreshiFrameSrc();", 1234);
                }

                if (ApplySizeAndPosition && TargetSizeData && $DialogDiv) {
                    this.$LookupDialog!.data("RestoredSize",true );
                    if (TargetSizeData.top < 0) {
                        var wh =$(window).height()!;
                        TargetSizeData.top = Math.round((wh - TargetSizeData.height) / 2.0);
                    }
                    if (TargetSizeData.left < 0) {
                        var ww =$(window).width()!;
                        TargetSizeData.left = Math.round((ww - TargetSizeData.width) / 2.0);
                    }

                    $DialogDiv.css({top:TargetSizeData.top,left:TargetSizeData.left});
                    top?.sfClient.sfLookupHeightChangeTo(top.sfClient.$LookupDialog!,TargetSizeData.height);
                    top?.sfClient.sfLookupWidthChangeTo(top.sfClient.$LookupDialog!,TargetSizeData.width);
                    $DialogDiv.css({top:TargetSizeData.top,left:TargetSizeData.left});
                    this.$LookupDialog!.data("SizePending",false );
                }
            }
            catch (e) { console.warn("WARNING: mDialog() could not verify iFrame location uri"); }

        });

    return sfRestClient.ExternalToolsLoadedPromise;  // so anchor click event doesn't also do work
    }
    protected $LookupDialog : JQuery<HTMLDivElement> | undefined ;
    static $LookupDialogStack  : JQuery<HTMLDivElement>[] = [];
    protected $LookupFrame : JQuery<HTMLIFrameElement> | undefined ;

    protected ResolveLookupFrame( forDialog?: JQuery<HTMLDivElement> | undefined) : JQuery<HTMLIFrameElement> | undefined {
        if (!forDialog) forDialog = this.$LookupDialog
        if (!forDialog) {
            console.log("sfClient ResolveLookupFrame() called without current Dialog, returning undefined");
            return undefined;
        }
        return $(forDialog.children("iframe").get(0)) as  JQuery<HTMLIFrameElement>;

    }

    SetModalDialogTitle(theDialog: JQuery<HTMLElement> | undefined, titleText : string, ptSize?: string | number | undefined) {

        if (!theDialog) {
            theDialog = top?.sfClient.$LookupDialog;
            if (!theDialog) {
                console.warn("SetModalDialogTitle could not resolve the current dialog");
                return;
            }
        }
        var $LookupTitle = theDialog.prev();               //fragile...another version might break this
        if (!ptSize) ptSize = ".7em";
        theDialog.dialog('option', 'title', titleText);
        $LookupTitle.css('padding', '1px 1px 4px 4px');
        theDialog.css('padding', '0px 0px 0px 1px');
        theDialog.css('margin', '0');
        $LookupTitle.css('font-size', ptSize);
        return theDialog;
    }


    AddDialogTitleButton($Dialog : JQuery<HTMLElement>, btnID: string, btnText: string, btnIcon?: string) {
        var $DialogTitleBar = $Dialog.parent().children(".ui-dialog-titlebar");
        var $LastButton = <JQuery<HTMLButtonElement>>$DialogTitleBar.find("BUTTON[type='button']:last");
        var $NewButton = $(`<button type='button' id='${btnID}' />`).text(btnText);
        //var ButtonCount = $DialogTitleBar.find("BUTTON[type='button']").length;
        var RightPosOfLeftmostButton = $LastButton.css("right");
        var WidthOfButtons = Math.ceil($LastButton!.width()! * 1.375);
        $DialogTitleBar.find(`BUTTON#${btnID}`).remove();
        $NewButton.button({ icons: { primary: btnIcon }, text: false })
            .addClass("ui-dialog-titlebar-close") // essential to get size
            .css("right", ((parseInt(RightPosOfLeftmostButton) + WidthOfButtons)  ) + "px")
            .appendTo($DialogTitleBar);


        return $NewButton;
    }

    AddDialogHelpButton($Dialog : JQuery<HTMLElement>, helpURL: string) {
        var $HelpButton = this.AddDialogTitleButton($Dialog,'btnHelp' ,"Help",'ui-icon-help');

        if (helpURL) $HelpButton.on("click",function () {
            top!.open(helpURL, 'sfHelp');
        });
        return $HelpButton;
    }


    RefreshiFrameSrc() {
        if (!this.IsGlobalInstance()) {
            top!.sfClient.RefreshiFrameSrc();
            return;
        }
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
        if (typeof ($LookupFrameDOM) !== 'undefined') {
            try {
                top?.sfClient.$LookupDialog!.find("IFRAME").on("load",  function () {
                    setTimeout("top.sfClient.ResizeDialogInFrame(undefined, top.sfClient);",1234);
                });
            } catch (e) {
                if (sfRestClient._Options.LogLevel >= LoggingLevels.Verbose) console.log("<!> refreshiFrameSrc could not find IFRAME" );
                    }
            var locNow = $LookupFrameDOM.location.href;
            var wantSrc = this.$LookupFrame.attr('src');
            if (!locNow.endsWith(wantSrc!)) {
                if (sfRestClient._Options.LogLevel >= LoggingLevels.Verbose) console.log("mDialog frame src re-get, is " + $LookupFrameDOM.location + '; want ' + this.$LookupFrame.attr('src') + '.');
                $LookupFrameDOM.location.href = this.$LookupFrame.attr('src') as string;
            }
        }
    }

    ResizeDialogInFrame(FrameElement : HTMLIFrameElement | undefined, RESTClient : sfRestClient) : void {
        var $FrameElement : JQuery<HTMLIFrameElement>
        if (FrameElement) $FrameElement = $(FrameElement)!;
        else   $FrameElement =  top?.sfClient.ResolveLookupFrame()!;

        var RunHeight = $FrameElement.contents().find("html").outerHeight()! + 16;  // see also ResetPartFrameHeight() in sfPMS
        var MaxHeight :number = $(top!).height()! - 64;
        if (!RunHeight) {
            if (sfRestClient._Options.LogLevel >= LoggingLevels.Verbose) console.log("ResizeDialogInFrame() could not find content height, using 65% of ",MaxHeight);
            RunHeight = Math.round(MaxHeight * 0.65);
        }

        var fh = $FrameElement.height()!;
        var frameID = ($FrameElement.attr("id")) ? $FrameElement.attr("id") : $FrameElement.closest("[id]").attr("id");
        if (RunHeight) {
            if (RunHeight > MaxHeight) RunHeight = MaxHeight;
            if (fh < RunHeight) {
                RESTClient.$LookupDialog!.dialog('option', 'height', RunHeight + 8).height(RunHeight + 16).find('iframe').height(RunHeight)
            }
            else RunHeight = fh;
        }
        if (sfRestClient._Options.LogLevel >= LoggingLevels.Verbose) console.log(`onLoad::resizeDialogInFrame(${frameID}) frame:${fh} set to=${RunHeight}`);
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
        for (const [k,idx] of Object.keys(top!.localStorage)) {
            if (k.startsWith("sfWindow@")) {
                var TabAsOf = localStorage.getItem(k);
                if (parseFloat(TabAsOf!) < OldestSaneTab) {
                    if (sfRestClient._Options.LogLevel >= LoggingLevels.Verbose) console.log("GetSFTabCount() Forgetting tab: {0}, last loaded {1}".sfFormat(k, TabAsOf));
                    top!.localStorage.removeItem(k);
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
                this.LogMessageOnServer("{0} has {1} tabs: {2}".sfFormat(sfRestClient._WCC.FullName,  OpenWindowCount, TabNameList));
                sessionStorage.setItem("SFTabCountHW", OpenWindowCount.toString());
            }
        }
        return OpenWindowCount;
    }

    /** For Chrome Debug watch */
    LiveWatch() : string {

        var result = top!.name + ' ';
        try {
            result += (top!.WindowHasFocus ? "*" : "-") + '-> hub:' ;
            if (top!.$.connection.sfPMSHub) {
                var sfPMSHub = top!.$.connection.sfPMSHub
                result += ((sfPMSHub.connection && (sfPMSHub.connection.state === $.signalR.connectionState.connected)) ? sfPMSHub.connection.transport.name : "(not connected)") ;
            }
            else result += "NA";
            if (typeof this.GetSFTabCount === "function") result += '; Tabs:' + this.GetSFTabCount().toString();
        }
        catch (ex: any) {
            result += ex.message;
        }
        return result;
    }

    protected sfModalDialogClosed(_unusedEl? : any | undefined ) : void {
        var $LookupDialog : JQuery<HTMLDivElement> = $(<HTMLDivElement><unknown>this );
        var RESTClient = top?.sfClient;
        if (sfRestClient._Options.LogLevel >= LoggingLevels.Verbose) console.log("sfModalDialogClosed() ....",$LookupDialog);
        var postbackEventId = $LookupDialog.data("postbackEventId");
        var postbackEventArg = $LookupDialog.data("postbackEventArg");
        var postbackContext = $LookupDialog.data("postbackContext");
        var postBack = $LookupDialog.data("postback");
        var idName = $LookupDialog.data("idName");
        var newValue = $LookupDialog.data("newValue");
        var IsMultiSelect = $LookupDialog.data("multiSelect");
        var dialogMode = $LookupDialog.data("mode");
        var NewValueIsNew = true;

        if (typeof postbackContext === "undefined") postbackContext = window;
        var $LookupFrame   = RESTClient?.ResolveLookupFrame();
        $LookupDialog.dialog('destroy');
        this.$LookupDialog?.remove();
        this.$LookupDialog = undefined;

        if (!Array.isArray(sfRestClient.$LookupDialogStack)) {
            console.warn("sfModalDialogClosed: re-init $LookupDialogStack");
            sfRestClient.$LookupDialogStack = [];
        }
        if (sfRestClient.$LookupDialogStack.length > 0) this.$LookupDialog = sfRestClient.$LookupDialogStack.pop();

        if (dialogMode == 'modalDialog') {
            if (newValue == null) newValue = postbackEventArg;
            postbackEventArg = newValue;
        }

        if (newValue != null) {
            if (sfRestClient._Options.LogLevel >= LoggingLevels.Verbose) console.log(dialogMode +' result: ' + idName + ' = ' + newValue);
            if ((dialogMode == 'lookup') && (!IsMultiSelect)) {
                var $LookupInputSource = postbackContext.$('input[name="' + idName + '"]');
                NewValueIsNew = !($LookupInputSource.val() == newValue);
                if (NewValueIsNew) {
                    $LookupInputSource.val( newValue );
                    if (sfRestClient._Options.LogLevel >= LoggingLevels.Verbose) console.log(dialogMode + ' result stored into: ' + idName);
                    $LookupInputSource.trigger("sfLookup.Stored", [newValue]);
                }
                else {
                    if (postBack) postBack = false;
                    if (sfRestClient._Options.LogLevel >= LoggingLevels.Verbose) console.log(dialogMode + ' result - form ALREADY HAS NEW VALUE for ' + idName);
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
                    var postedback = false;
                    if (typeof postbackContext.ShowPleaseWaitUsingDialog != "undefined") postbackContext.ShowPleaseWaitUsingDialog();
                    if (theInput.hasClass('sfUI-UseChangeEventForPostbacks')) {
                        theInput.change();
                        postedback = true;
                        //var inputs = theInput.closest('form').find('input').filter(':visible');
                        //inputs.eq(inputs.index(theInput[0]) + 1).focus();
                    }
                    else {
                        if (postbackContext.__hasPostBackTarget()) {
                            postbackContext.__doPostBack(postbackEventId, postbackEventArg);
                            postedback = true;
                        }
                        else  if (sfRestClient._Options.LogLevel >= LoggingLevels.Verbose) console.log(`${dialogMode} result: ${idName} has no post back target form `);
                    }
                    if (postedback && sfRestClient._Options.LogLevel >= LoggingLevels.Verbose) console.log(`${dialogMode} result: ${idName} -- posting back [${postbackEventId}] / [${postbackEventArg}]`);
                    }
                }
            }
    }

    /** Internal to the class
     * this is the lookup DIV
     */
    protected sfModelDialogResizedHandler() : void {
        var $LookupDialog : JQuery<HTMLDivElement> = $(<HTMLDivElement><unknown>this );
        var RESTClient = top?.sfClient;
        if (!$LookupDialog) {
            console.log("sfModelDialogResizedHandler() - no current dialog?");
            return;
        }
        top?.sfClient.sfModelDialogResized($LookupDialog)
    }

    /**
     * (OBSOLETE) Resize parent sfDash window
     * @deprecated sfDash relic:  we cannot change the size of the parent window
     * @param canShrink
     * @param DesiredWidth
     * @param DesiredHeight
     */
     protected sfSetParentWindowSize(canShrink : boolean, DesiredWidth: number, DesiredHeight: number) : void {
        console.warn("sfSetParentWindowSize not implemented");
    }

     private  sfLookupHeightChangeTo(ld: JQuery<HTMLDivElement>, newValue : number):void {
        // here newValue represents the intended size for the inner iFrame's rendering area
        if (!ld) return;
        if (typeof newValue === "undefined") newValue = 890;
        if (typeof newValue === "string") newValue = Number.parseInt(newValue);
        if (newValue === NaN) newValue = 789;
        if ($("HTML").css("font-size") > "16px") { newValue = newValue * 1.1; } //"Enlarged" theme is 18px
      //  if (($(window).height()! < (newValue + this._LookupViewPortAdjustments.outsidExtraH))) this.sfSetParentWindowSize(false, -1, newValue + this._LookupViewPortAdjustments.outsidExtraH);
        var PositionNow = ld.closest("DIV.ui-dialog").position();
        var wh : number =$(window).height()!;
        if ((wh < (newValue + this._LookupViewPortAdjustments.outsidExtraH + PositionNow.top))) {
            // requested size still too large
            var requestedH = newValue;
            newValue = wh - ( PositionNow.top + this._LookupViewPortAdjustments.outsidExtraH);
            if (sfRestClient._Options.LogLevel >= LoggingLevels.Verbose)  console.log(`dialog height requested ${requestedH} cannot be accomidated by window ${wh}, reduced to ${newValue}` );
        }
        var tdh = newValue + this._LookupViewPortAdjustments.vpExtraH + this._LookupViewPortAdjustments.frameExtraH;
        ld.dialog('option', "height", tdh);

        //var LookupFrame = $(ld.children("iframe").get(0))
        top?.sfClient.sfModelDialogResized(ld!);
        ld.dialog('option', 'position', 'center');
        if (sfRestClient._Options.LogLevel >= LoggingLevels.Debug) console.log('dialog height explicitly set to ' + newValue);
    }

    private _LookupViewPortAdjustments = { outsidExtraW: 48, outsidExtraH: 64, vpExtraW: 16, vpExtraH: 32, frameExtraH: 8 };

    private sfLookupWidthChangeTo(ld: JQuery<HTMLDivElement>, newValue:number):void {
      //  if (($(window).width()! < (newValue + this._LookupViewPortAdjustments.outsidExtraW))) this.sfSetParentWindowSize(false, newValue + this._LookupViewPortAdjustments.outsidExtraW + this._LookupViewPortAdjustments.vpExtraW, -1);
      var ww =$(window).width()!;
        if ( ww < (newValue + this._LookupViewPortAdjustments.outsidExtraW)) {
            // requested size still too wide
            var requestedW = newValue;
            newValue = ww - this._LookupViewPortAdjustments.outsidExtraW;
            if (sfRestClient._Options.LogLevel >= LoggingLevels.Verbose)  console.log(`Dialog width requested ${requestedW} cannot be accomidated by window ${ww}: reduced to ${newValue}` );
        }

        ld!.dialog('option', "width", newValue + this._LookupViewPortAdjustments.vpExtraW);
        top?.sfClient.sfModelDialogResized(ld!);
        setTimeout(function () { ld!.dialog('option', 'position', 'center'); }, 259); // need this to happen after above has all completed
        if (sfRestClient._Options.LogLevel >= LoggingLevels.Debug) console.log('dialog width explicitly set to ' + newValue);
    }

/**
 * Updates internal sizes after the dialog frame size is changed
 * @param forDialog reference to DIV with jQueryUI dialog widget
 * @returns
 */
    protected sfModelDialogResized(forDialog : JQuery<HTMLDivElement>) : void {

    // this is called after a user resizes or moves the dialog
        var dg = forDialog
        if (!$(window)) return;
        var tdh = Math.floor(dg.dialog("option", "height"));
        var tdw = Math.floor(dg.dialog("option", "width"));
        var height = dg.height()!; // actual content area
        var width = Math.round(dg.width()! + 1);  // actual content area
        var fh = dg.height()! - this.DialogViewPortAdjustments.frameExtraH;
        var $DFrame = $(dg.children("iframe").get(0));
        $DFrame.css('height', fh); // also iframe
        $DFrame.css('width', '100%'); // also iframe

        if (!dg.data("SizePending")) {
            var NewSizeData : CoordinateWithSize;
            var PositionNow = dg.closest("DIV.ui-dialog").position();
            NewSizeData = {top:PositionNow.top,
                    left : PositionNow.left,
                    width : dg.width()!,
                    height : dg.height()!
            };
            if(NewSizeData.top < sfRestClient._Options.PopupWindowTop) {
                NewSizeData.height -= ( sfRestClient._Options.PopupWindowTop - NewSizeData.top);
                NewSizeData.top =  sfRestClient._Options.PopupWindowTop;
            }
            var DialogURL:string = $DFrame.attr("src")!;
            var DialogURLHash = DialogURL.sfHashCode();
            sfRestClient._DialogCoordinateCache.set(DialogURLHash,NewSizeData);
            if (sfRestClient._Options.LogLevel >= LoggingLevels.Verbose)  console.log(`sfDialogResized(${width}w,${height}h) size cache `,NewSizeData);
        }
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
                if (sfRestClient._Options.LogLevel >= LoggingLevels.Debug) console.log("_ApplyUICFGtoRawData {0} RowVis {1} ".sfFormat(item.ItemName, item.CSS));
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
                if (sfRestClient._Options.LogLevel >= LoggingLevels.Debug) console.log("_ApplyUICFGtoRawData {0} DV {1} ".sfFormat(item.ItemName, item.DV));
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
                    else {
                        //if (!((item.DataField + ThisSuffix) in rawRow)) {
                        var FieldValue: any = thisPart.RestClient.FieldValueFromRow(rawRow, item.DataField!);
                        if (!((item.DataField + "_ov") in rawRow) || (FieldValue !== thisPart.RestClient.FieldValueFromRow(rawRow, item.DataField + "_ov")) ) {
                            ///!!! future: handle depends on #DocMasterDetail.project
                            var DependsOn : string[] | undefined;
                            if (item.DependsOn) DependsOn = thisPart.RestClient.GatherDependsOnValues(item.DependsOn,rawRow);
                            thisPart._PromiseList!.push(thisPart.RestClient.GetDV(item.DV!, FieldValue, DependsOn, false).then(function then_AddDVToDModel(r) : void {
                                thisPart.RestClient._AddDVValueToDataModel(thisPart, dataModelBuildKey, index, item.DataField!, "_ov", FieldValue);
                                thisPart.RestClient._AddDVValueToDataModel(thisPart, dataModelBuildKey, index, item.DataField!, ThisSuffix, r);
                            }));
                        }
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
    /**
     *
     * @param thisPart instance of PartStorageData
     * @param dataModelBuildKey unique per vm build
     * @param index row index into data
     * @param dataField base field name
     * @param suffix added to base name (_dv, _ov, _IsInactive, etc)
     * @param newValue value for the target
     */
    protected _AddDVValueToDataModel(thisPart: PartStorageData, dataModelBuildKey: string, index: number, dataField: string, suffix : string, newValue: string | boolean | null) {
        if (sfRestClient._Options.LogLevel >= LoggingLevels.Debug) console.log(`Row ${index}, setting ${dataField}${suffix} = ${newValue} `);
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

    /**
     * Call to reset the client state (important when changing users)
     * This method also clears static resources shared by all instances of sfRestClient
     *
     * @param alsoClearSessionStorage set true to also clear session storage (appropriate for logoffs)
     */
    public ClearCache(alsoClearSessionStorage? : boolean):void {
        var InGlobalInstance = this.IsGlobalInstance();
        console.log(`sfRestClient.ClearCache(${this.ThisInstanceID}), ${alsoClearSessionStorage ? " w/sessionStorage" : ""}, ${InGlobalInstance ? " Global" : ""}, UPRC:${sfRestClient._UserPermitResultCache.size}`);
        PartStorageData._LoadedParts.clear();
        try {$.connection.hub.stop(); } catch {}
        sfRestClient._UserPermitResultCache.clear();
        sfRestClient._LoadedPermits.clear();
        sfRestClient._LoadingPermitRequests.clear();
        sfRestClient._SessionClientGetWCC = null;
        sfRestClient._z.WCCLoaded = false;
        sfRestClient._WCC.AdminLevel = 0;
        this._CachedDVRequests.clear();
        if (!InGlobalInstance)
            window.sfClient.ClearCache(false);
        // note: _UCPermitMap does not need to be cleared, it is the same for all users
        if (alsoClearSessionStorage)
            sessionStorage.clear();
    }



    /**
     * Called by the global instance to connect to SignalR
     */
    protected static StartSignalRClientHub():void {
        if (self !== top) return;
        if (!$.connection || !$.connection.sfPMSHub) {
            setTimeout("top.sfClient.exports.sfRestClient.StartSignalRClientHub(); // retry",234)
            return;
        }
        if (top.sfClient.IsPowerUXPage() && !top.sfClient.IsPageOfType(top.sfClient.PageTypeNames.Document)) {
            if (!sfRestClient._NextPingTimerID)  sfRestClient._NextPingTimerID =    setTimeout("top.sfClient.pingServer();",234);
        }
        if ($.connection) {
            var sfHub = $.connection.sfPMSHub;
            if (top.sfPMSHub === sfHub) return;
            top.sfPMSHub = sfHub;
            sfHub.client.ReConnectDelay = 5000;
            sfHub.client.ForWindowRX = /^javascript.+-(?<WindowName>[a-z0-9]{12})'\);/
            sfHub.client.systemWideUserNotification = function (msgText:string) {
                top?.sfClient.DisplayUserNotification(msgText);
            };
            sfHub.client.systemNotificationHasChanged = function (sysNoticeHC:string) {
                top?.sfClient.DisplaySysNotification(sysNoticeHC);
            };

            sfHub.client.documentChangeBy = function (loginSessionKey:string, otherUserName:string, changeCount:number, refreshEvent:string) {
                console.log(`${new Date().toSFLogTimeString()} sfPMSHub: Signal.documentChangeBy ${otherUserName}, ${changeCount}`); // subscribed, not myself, offer reload

                if (top?.sfClient.GetPageContextValue("LoginSessionKey") === loginSessionKey) return;
                var HubEvent =  jQuery.Event("sfPMSHubSignal.documentChangeBy");
                $("body").trigger(HubEvent,  [otherUserName,changeCount,refreshEvent] );
                if (HubEvent.isDefaultPrevented()) return;
                if (typeof top?.DocumentChangedByAnotherUser === "function") top.DocumentChangedByAnotherUser(refreshEvent, otherUserName, changeCount);
            };

            sfHub.client.afterDocumentSaved = function (dtk:string, project: string) {
                console.log(`${new Date().toSFLogTimeString()} sfPMSHub: Signal.afterDocumentSaved dtk:${dtk}, project:${project}.`); // always myself, refresh related dashboards
                var HubEvent = jQuery.Event("sfPMSHubSignal.afterDocumentSaved");
                $("body").trigger(HubEvent,  [dtk,project] );
                if (HubEvent.isDefaultPrevented()) {
                    console.log("sfPMSHub afterDocumentSaved handled...");  // in general .preventDefault() was called
                    return;
                }

                if (!top?.sfClient.IsPowerUXPage()) {
                    if (top?.sfClient.IsProjectPage()) {
                        top?.refreshPartbyName('ProjDocSummary', 'refresh', 'afterDocumentSaved');
                        top?.refreshPartbyName('ProjTypedDocList', 'SlctDocType', dtk);
                }
                else if (top?.sfClient.IsHomeDashboardPage()) {
                        top?.refreshPartbyName('actionitems', 'refresh', 'afterDocumentSaved');
                    }
                }
            }

            sfHub.client.nowViewingDocument = function (target, loginSessionKey, request) {
                var RequestForWindowMatches = request.match(sfHub.client.ForWindowRX);
                console.log(`${new Date().toSFLogTimeString()} sfPMSHub: Signal.nowViewingDocument from ${loginSessionKey} to [${target}]:${request} Req4Window:${RequestForWindowMatches} `);
                if (top?.sfClient.GetPageContextValue("LoginSessionKey") !== loginSessionKey) {
                    var HubEvent = jQuery.Event("sfPMSHubSignal.nowViewingDocument");
                    $("body").trigger(HubEvent,  [target,loginSessionKey,request] );
                    if (HubEvent.isDefaultPrevented()) return;

                    request = request.substring(11);
                    try {
                        eval(request);
                    }
                    catch (ej:any) {
                        if (ej.name === "ReferenceError") {
                            console.log(`sfPMSHub ignored js - ${ej.message}  `);
                        }
                        else {
                            console.warn(`sfPMSHub js ${request} failed: ${ej}  `);
                        }
                    }
                }
            }

            sfHub.client.dashboardOpenLink = function (target, request) {
                console.log(`${new Date().toSFLogTimeString()} sfPMSHub: Signal.dashboardOpenLink to [${target}]:${request} `);

                var RequestForWindowMatches = request.match(sfHub.client.ForWindowRX);
                var HubEvent = jQuery.Event("sfPMSHubSignal.dashboardOpenLink");
                $("body").trigger(HubEvent,  [target,request,RequestForWindowMatches] );
                if (HubEvent.isDefaultPrevented()) return;

                if (top) {
                    var RESTClient = top.sfClient;
                    if (top.name!.length! > 0 && target.sfStartsWithCI(top?.name!)) {
                        if (request.startsWith("javascript:")) {
                            request = request.substring(11);
                            try {
                                eval(request);
                            }
                            catch (ej:any) {
                                if (ej.name === "ReferenceError") {
                                    console.log(`sfPMSHub ignored js - ${ej.message}  `);
                                }
                                else {
                                    console.warn(`sfPMSHub js ${request} failed: ${ej}  `);
                                }
                            }
                        }
                        else if (request.sfStartsWithCI("refresh")) {
                            if (RESTClient.IsProjectPage()) {
                            top.refreshPartbyName('DocSearch', request, 'signalR');
                                top.refreshPartbyName('ProjTypedDocList', request, 'signalR');
                            }
                            else if (RESTClient.IsHomeDashboardPage()) {
                                top.refreshPartbyName('actionitems', 'refresh', 'signalR');
                            }
                            else if (typeof top?.refreshPageParts === "function") {
                                top.refreshPageParts(request, 'signalR');
                            }
                        }

                        else if ( RESTClient.IsSiteURL(request)) {
                            top!.location.href = request;
                        }
                    }
                    else if (top?.name!.length! > 0 && RESTClient.GetPageContextValue("DataPK").endsWith(top.name)
                        && (RequestForWindowMatches) && typeof RequestForWindowMatches.groups === "object" && RequestForWindowMatches.groups.WindowName === top.name) {
                        // hey wait, this is about me!  Lets schedule a refresh that might get stomped by re-nav (which is ok)
                        console.log("sfPMSHub queing request RefreshAttachments in 1 second (belt and suspenders)");
                        setTimeout("top.sfDocDetailPostBack('RefreshAttachments','sfLink'); // signalr", 987);
                    }
                    else console.log(`sfPMSHub ignoring request to [${target}]:${request}`);
                }

            };
            sfHub.client.dashboardRefreshPartByName = function (target) {
                console.log(`${new Date().toSFLogTimeString()} sfPMSHub: Signal.dashboardRefreshPartByName for [${target}] `);
                var HubEvent = jQuery.Event("sfPMSHubSignal.dashboardRefreshPartByName");
                $("body").trigger(HubEvent,  [target] );
                if (HubEvent.isDefaultPrevented()) return;
                if (typeof top?.refreshPartbyName === "function") {
                    top?.refreshPartbyName(target);
                }
            };
            sfHub.client.onApplicationStart = function () {
                console.log(`${new Date().toSFLogTimeString()} sfPMSHub: Signal.OnApplicationStart ${self.location.pathname}`);
                if (!top?.sfClient.IsDocumentPage()) {
                    if (top?.location.pathname.endsWith("login.aspx")) {
                        self.location.href = self.location.pathname + "?rwapp=1";
                        return;
                    }
                    sfHub.server.sessionAlive();
                }
                sfHub.server.sessionAlive();
            }
            sfHub.client.tickleSession = function () {
                console.log(`${new Date().toSFLogTimeString()} sfPMSHub: Signal.tickleSession`);
                sfHub.client.ReConnectDelay = 5000;
                if (!top?.sfClient.IsDocumentPage()) {
                    sfHub.server.sessionAlive();
                }
            }

            sfHub.client.userLoggedOut = function () {
                console.log(`${new Date().toSFLogTimeString()} sfPMSHub: Signal.userLoggedOut`);
                var HubEvent = jQuery.Event("sfPMSHubSignal.userLoggedOut");
                $("body").trigger(HubEvent, [top?.sfClient.GetPageContextValue("UserKey")] );
                if (HubEvent.isDefaultPrevented()) return;

                top?.sfClient.DisplayUserNotification("You have been logged out!",8765);
                setTimeout(`top.location.href = '${sfRestClient.LoginPageURL("LoggedOut")}'; //signalr log out`, 3210);
            }
            if (top.localStorage.getItem("SignalR-Logging")) $.connection.hub.logging = true;

            $.connection.hub.connectionSlow(function () {
                console.log(`${new Date().toSFLogTimeString()} sfPMSHub: experiencing difficulties with the connection. `);
                $("SPAN.clsBrandingFooterText").append("<span id='spnDashOWarning' class='sfPingHealthTip' title='{1}'>Weak server connection. (Reported by Push Signal)</span>");
            });

            $.connection.hub.disconnected(function () {
                console.log(`${new Date().toSFLogTimeString()} sfPMSHub: disconnected.  Sleep ${sfHub.client.ReConnectDelay}ms;  Reconnect:${!sfHub.client.SkipAutoReconnect}`);
                if ($.connection.hub.lastError) {
                    console.log($.connection.hub.lastError.message);
                }
                if (!sfHub.client.SkipAutoReconnect)
                    setTimeout(function () {
                        $.connection.hub.start().done(function hubReStart() {
                            console.log(`${new Date().toLocaleTimeString()} sfPMSHub Hub has been re-started...`);
                            if (top?.sfClient.IsDocumentPage()) {
                                sfHub.server.subscribeToDocument(top.sfClient.GetPageContextValue("DataPK"));
                            }
                        });
                    }, sfHub.client.ReConnectDelay); // Restart connection after 5 seconds.
                if (sfHub.client.ReConnectDelay < 120000) sfHub.client.ReConnectDelay *= 2;
            });

            $.connection.hub.start().done(function () {
                console.log(`${new Date().toSFLogTimeString()} sfPMSHub: started...`);
                //if (typeof top.sfPMSHub === "undefined") top.sfPMSHub = $.connection.sfPMSHub; // $.connection.hub.proxies.sfpmshub;
                if (top?.sfClient.IsDocumentPage()) {
                    sfHub.server.subscribeToDocument(top.sfClient.GetPageContextValue("DataPK"));
                }
            });
        }
    }

    protected static LogoutPageURL(mValue: string) : string {
        var result = "admin/Logout.aspx";
        if (top) {
            var RESTClient = top.sfClient;
            var isPowerUX =RESTClient.IsPowerUXPage();
            isPowerUX = false;
            result = `${RESTClient._SiteRootURL}/${isPowerUX ? "spax.html#!/login" : "admin/Logout.aspx"}?m=${mValue}`;
        }
        return result;
    }
    protected static LoginPageURL(mValue: string) : string {
        var isPowerUX = top?.sfClient.IsPowerUXPage();
        var root = top?.sfClient._SiteRootURL;
        var result : string;
        if (isPowerUX) {
            result = `${root}/spax.html#!/login?m=${mValue}`;
        }
        else {
            result = `${root}/admin/SessionLost.aspx?m=${mValue}`;
        }
        return result;
    }

    protected static _NextPingTimerID :number | undefined= undefined;
    public async  pingServer(): Promise<void> {
        var id:string = "TBD";
        try {
            var RESTClient = this;
            if (!top?.sfPMSHub || top.sfPMSHub.connection.state !== $.signalR.connectionState.connected) {
                sfRestClient._NextPingTimerID = setTimeout("top.sfClient.pingServer(); // wait for hub ", 123);
                return;
            }
            if (this.IsPageOfType( this.PageTypeNames.Login ) ) {
                if (sfRestClient._Options.LogLevel >= LoggingLevels.Verbose)  console.log("pingServer() Log in pending (ignored)");
                sfRestClient._NextPingTimerID = setTimeout("top.sfClient.pingServer(); // wait for login ", 345);
                return;
            }

            var retryInterval = (sfRestClient._Options.BasicPingServerInterval * (1.1 + Math.random()));
            var $ALERT;
            var ActionAfterAlert = "";
            var MaxIdleTime = RESTClient.GetPageContextValue("IdleForce",33) * 59000;
            var id:string = RESTClient.GetPageContextValue("DocSessionKey","");
            if ($("DIV.ui-dialog-content.sfStopPingServer").length > 0) return;
            sfRestClient.PageServerPingAttempts ++;
            top.sfPMSHub.server.sessionAlive();

            top.sfPMSHub.server.dashboardHeartbeat(id,sfRestClient.PageNotificationCount)
                .then(async function (responseText) {
                if (responseText > "") {
                    var isOK = (responseText.startsWith("OK"));

                    //$(jqSelector).html(responseText);

                    if (isOK) {
                        if (typeof top?.clearHomeTabCount === "function") top.clearHomeTabCount(true);
                        //else { homeTab.text("Home"); }

                        retryInterval = (sfRestClient._Options.BasicPingServerInterval + ((top?.WindowHasFocus ? 10000 : 18000) * Math.random())); // ~32-50 secs;
                        sfRestClient.PageNotificationCount ++;
                        var d = new Date();
                        var hourNow = d.getHours();
                        if (((sfRestClient.PageNotificationCount > 33) && (hourNow < 2)) || (((sfRestClient.PageNotificationCount * retryInterval) > MaxIdleTime))) {
                            RESTClient.DisplaySysNotification("This window has been idle and will logoff in 1 minute.  ", 60000);
                            setTimeout(`location="${sfRestClient.LogoutPageURL('idle')}";` , 66000);
                            retryInterval = 99000;
                        }
                    }
                    else if (responseText === "NAK: Not Authenticated") {
                        // first try and repair
                        await top!.sfPMSHub.server.sessionAlive().then(async (isAlive:boolean)=>{
                            if (!isAlive) {
                                console.log("pingServer() signalR begin stop/start....");
                                try {
                                    top!.sfPMSHub.client.SkipAutoReconnect  = true;
                                    await $.connection.hub.stop();
                                    await $.connection.hub.start();
                                }
                                catch {
                                    console.warn("pingServer() signalR stop/start exception....");
                                }
                                finally {
                                    top!.sfPMSHub.client.SkipAutoReconnect = false;
                                }
                                console.log("pingServer() signalR after stop/start....",top!.sfPMSHub.connection.state);
                            }
                        });

                        await top!.sfPMSHub.server.sessionAlive().then(async (isAlive:boolean)=>{
                            if (!isAlive) {
                                console.log("pingServer() NAK persists....");
                                RESTClient.DisplaySysNotification("Lost authentication.  ", 65432);
                                setTimeout(`location="${sfRestClient.LogoutPageURL('auth-lost')}";` , 9753);
                            }
                            else {
                                responseText = "NAK:Rejuvinated";
                                retryInterval = 8642;
                            }
                        });

                    }
                    else {
                        var msgText : boolean | string = false;
                        if (responseText.startsWith("refresh")) {
                            console.log("pingServer() Classic Refresh ignored");
                        }

                        else if (responseText.startsWith('[{"DocMasterKey":')) {
                            var ldata = JSON.parse(responseText);
                            sfRestClient.PageNotificationCount ++
                            responseText = `OK w/${ldata.length} New Documents`;
                            if (!RESTClient.IsPowerUXPage() && RESTClient.IsHomeDashboardPage()) {
                                setTimeout("if (typeof top.refreshPartbyName === 'function') top.refreshPartbyName('actionitems'); // pingServer::dasho", 222);
                            }
                            // deprecated: used to put a number on the classic home tab


                        }
                        else if (responseText.sfStartsWithCI('{"link":')) {
                            var ldata = JSON.parse(responseText);
                            if ((location.pathname.toUpperCase() + location.search.toUpperCase()) == ldata.link.toUpperCase()) {
                                top?.__doPostBack("refresh", "dasho");  // this makes the pending window.close irrelavent....
                            }
                            else {
                                msgText = ldata.text;
                                retryInterval = retryInterval * 3;
                                ActionAfterAlert = ldata.link;
                            }
                        }

                        else {
                            msgText = responseText;
                            retryInterval = retryInterval * 2;
                        }
                        RESTClient.PageServerPingBackAlert(msgText, ActionAfterAlert);
                    }

                    retryInterval = Math.round(retryInterval);
                    RESTClient.PageServerPingBackOk("dasho", id, responseText, retryInterval);
                    if (retryInterval > 0) sfRestClient._NextPingTimerID = setTimeout(`top.sfClient.pingServer("${id}");`, retryInterval);
                }
                }).catch(function (failMessage) {
                    var retryNow = RESTClient.PageServerPingBackFailed("dasho", id, failMessage, retryInterval / 2,"pingServer");
                if (retryNow) setTimeout('pingServer("' + id + '"); // weak connection retry', retryInterval);
            });

        }
        catch (exx:any) {
            if (exx.message) {
                console.warn(`pingServer(${id}) - ${exx.message}`);
                this.DisplaySysNotification(`The server could not be contacted : ${exx.message}`,99999);
                // how to recover??
            }
            else  console.warn(`pingServer(${id}) - catch  ${typeof exx}`,exx);

        }
    }

    static PageServerPingAttempts = 0
    static PageServerPingOK = 0
    static PageServerPingFailRunCount = 0
    static PageServerPingFailThreshold = 6
    static PageServerPingUserNotificationShown = false;
    static PageNotificationCount = 0;


    protected PageServerPingBackAlert(msgText: string | boolean, actionAfterAlert:string) {
        if (typeof msgText === "string") {
            console.warn(`PageServerPingBackAlert ${msgText}`)
             //$ALERT = jqAlert(msgText,"Server Ping");
            }
        if (actionAfterAlert.length > 0) {
            console.warn(`PageServerPingBackAlert does not support actionAfterAlert ${actionAfterAlert}` );
            // retryInterval = -1;
            // //if (typeof (AllowToLeavePage) == "function") AllowToLeavePage();
            // $ALERT.bind('dialogclose', function (event) {
            //     if (actionAfterAlert == "Close") { window.top.close(); }
            //     else if (actionAfterAlert.length > 0) top.location = actionAfterAlert;
            // });
        }
    }

    protected PageServerPingBackOk(marker:string, id:string, responseText:string, nextMS:number) {
        sfRestClient.PageServerPingFailRunCount = 0;
        sfRestClient.PageServerPingOK ++;
        $("SPAN#spnDashOWarning.sfPingHealthTip").detach();
        if (sfRestClient.PageServerPingUserNotificationShown) {
            top?.sfClient.DisplayUserNotification();
            sfRestClient.PageServerPingUserNotificationShown = false;
        }
    if ((top?.sfClient.DevMode()) || sfRestClient.PageServerPingOK < 2 || ((top?.sfPMSHub) && top.sfPMSHub.connection.logging) || ((responseText) && (responseText != "OK")))
        console.log(`pingServer(${marker},${id},${Math.round((sfRestClient.PageServerPingOK / sfRestClient.PageServerPingAttempts) * 100).toFixed(2)}%) - ${responseText}; Next: ${nextMS}ms at ${new Date(new Date().valueOf() + nextMS).toLocaleTimeString()}`);
        sfRestClient.PageServerPingFailRunCount = 0;
        top!.sfPMSHub.client.ReConnectDelay = 2500;
        top!.sfPMSHub.client.SkipAutoReconnect = false;
}

    protected PageServerPingBackFailed(marker:string, id:string, jqXHR: string | JQueryXHR, nextMS:number, methodName:string) {
    var responseText;
    if (typeof jqXHR === "string") responseText = jqXHR;
    if (typeof jqXHR === "object") {
        responseText = jqXHR.responseText;
        if (typeof responseText !== "string") {
            console.log(jqXHR);
            responseText = "";
        }
        if ((responseText.length === 0) || (responseText.length > 200)) responseText = jqXHR.statusText;
    }
    if (responseText === "NAK: Not Authenticated") {
        var msgText = "You are no longer logged into this server.  This window will close when you click OK";
        //retryInterval = -1;
        var ActionAfterAlert = "about:blank"
        if ((typeof self.name === "string") && (self.name === "Dashboard")) {
            ActionAfterAlert = sfRestClient.LoginPageURL("lost");
            msgText = "You are no longer logged into this server.  You will be redirected back to the login page when you click OK";
        }
        this.PageServerPingBackAlert(msgText, ActionAfterAlert);
        return false;
    }

    var continueAutoRetry = true;
    sfRestClient.PageServerPingFailRunCount ++;

    if (sfRestClient.PageServerPingFailRunCount > (sfRestClient.PageServerPingFailThreshold * 0.75)) {
        if (sfRestClient.PageServerPingFailRunCount > sfRestClient.PageServerPingFailThreshold) {
            top?.sfClient.DisplaySysNotification(`Warning: Server not responding ${responseText}`);
            // $ALERT = jqAlert("Server is not responding. (" + responseText + ") Close dialog to retry","Connection Check");  // was jqAlert
            // $ALERT.bind('dialogclose', function (event) {
            //      setTimeout('{0}("{1}"); // manual retry '.format(methodName, id), 222);
            // });
            continueAutoRetry = false;
        }
        else {
            top?.sfClient.DisplayUserNotification("Warning: Ongoing Interuption of Server Connection...");
            sfRestClient.PageServerPingUserNotificationShown = true;
        }
    }
    $("SPAN#spnDashOWarning.sfPingHealthTip").detach();
    $("SPAN.clsBrandingFooterText")
        .append(`<span id='spnDashOWarning' class='sfPingHealthTip' title='${responseText}'>Weak server connection. (${(Math.round((sfRestClient.PageServerPingOK / sfRestClient.PageServerPingAttempts) * 100).toFixed(2))}% successful)</span>` );

    console.log(`pingServer(${marker},${id},${Math.round((sfRestClient.PageServerPingOK / sfRestClient.PageServerPingAttempts) * 100).toFixed(2)}%) - failed ${responseText}; Next ${nextMS}ms`);
    return continueAutoRetry;
}

    /** Returns current time in minutes */
    public TODInMinutes():number {
        var d = new Date();
        return (d.getHours() * 60) + d.getMinutes();
    }

    public DevMode() : boolean {
        return top?.sfClient.GetPageContextValue("DevMode",false);
    }


    /**
     * Not intended for production use: Clears cross-session storage
     */
    public QAClearEnvironment( ):void {
        var InGlobalInstance = this.IsGlobalInstance();
        console.warn("sfRestClient.QAClearEnvironment()",  InGlobalInstance ? " Global" : "",", UPRC:",sfRestClient._UserPermitResultCache.size);
        sessionStorage.clear();
        localStorage.clear()
        localForage.clear();
    }

    readonly EmptyKey: GUID = "00000000-0000-0000-0000-000000000000";
    protected _CachedDVRequests: Map<string, Promise<string | null>> = new Map<string, Promise<string | null>>();
    protected static _DialogCoordinateCache: Map<number, CoordinateWithSize> = new Map<number, CoordinateWithSize>();
    protected static _UserPermitResultCache: Map<string, number> = new Map<string, number>();
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
    protected static _WCC: WCCData = {
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
    protected static _z: any = {
        lsKeys: {
             api_session_permits_map: "sfUCFunctionNameMap"
        },
        WCCLoaded: false,
        XternalScriptsLoaded: false
    }
    protected static _GlobalClientConstructFlag : boolean = false;
    protected static ExternalToolsLoadedPromise: Promise<boolean | undefined>;
    protected static _NewGuidList : GUID[] = [];
    /**
     * Collections of permits by project.  Internally, global permits are stored under project (0)
     */
     protected static _LoadedPermits: Map<string, UCPermitSet> = new Map<string, UCPermitSet>();
     private static _LoadingPermitRequests: Map<string, Promise<UCPermitSet | null> > = new Map<string, Promise<UCPermitSet | null> >();
     private static InstanceSerialNumberSource: number=0;
     private ThisInstanceID: number;


    constructor() {
        this.ThisInstanceID = sfRestClient.InstanceSerialNumberSource++;


            var ApplicationPath = window.location.pathname.substr(1, window.location.pathname.substr(1).indexOf("/"));
            this._SiteURL = `${window.location.origin}/${ApplicationPath || 'sfPMS'}`;
            this._SiteRootURL = `/${ApplicationPath || 'sfPMS'}`;

        this.exports = _SwaggerClientExports;
        this.exports.$ = $;
        this.exports.sfRestClient = sfRestClient;
        this.exports.LoggingLevels = LoggingLevels;
        var MyHostName = window.location.host;
        if ((MyHostName === "scm.spitfirepm.com" || MyHostName === "stany2017" || MyHostName.startsWith("sf")) && sfRestClient._Options.LogLevel < 2 ) this.SetOptions({ LogLevel: 2 }); // verbose

        // if the BrowserExtensionChecker has not been created, or if it is a legacy one (without .Version)....
        if ( document.body && (!window.ClickOnceExtension || !(window.ClickOnceExtension.Version))) window.ClickOnceExtension = new BrowserExtensionChecker();
        // if (window.sfClient && window.sfClient._z.WCCLoaded) {
        //     var TargetClient = this;
        //     $.each(sfRestClient._WCC, function CopyWCC(pname: string  , pvalue) {
        //         var HasChanged = typeof TargetClient._WCC[pname] === "undefined" || TargetClient._WCC[pname] != pvalue;
        //         if (HasChanged) {
        //             TargetClient._WCC[pname] = pvalue;
        //         }
        //     });
        // }

        var WCCLoadPromise =this.LoadUserSessionInfo();
        WCCLoadPromise.then(() => {
            var ThisIsGlobal = this.IsGlobalInstance();
            if (sfRestClient._Options.LogLevel >= LoggingLevels.Verbose) console.log(`sfClient#${this.ThisInstanceID} ${this.ClientVersion}; Window[${window.name}];  ${ThisIsGlobal ? "Global" : ""}`);
            if (ThisIsGlobal) {
                var RESTClient = this;
                sfRestClient.ExternalToolsLoadedPromise = RESTClient.AssureJQUITools($("div").first());
                if ($("title").text().length === 0 ) $("title").text("Spitfire PM");
            }
        });

        this.LoadUCFunctionMap().then(() =>{
            if (!window.sfClient && !sfRestClient._GlobalClientConstructFlag) {
                sfRestClient._GlobalClientConstructFlag = true;
                window.sfClient = new sfRestClient();
                if (!window.$) window.$ = $;
                if (!top!.$) top!.$ = $;
                var RESTClient = window.sfClient;
                $("body").on("sfClient.SetWCC__DynamicJS",function activateDJS() {
                    if (sfRestClient._Options.LogLevel >= LoggingLevels.Verbose) console.log("Activating Dynamics JS")
                    if (typeof sfRestClient._WCC._DynamicJS === "string" && RESTClient.IsPowerUXPage()) {
                        var djs: string[] = JSON.parse(sfRestClient._WCC._DynamicJS);
                        if (djs) RESTClient.LoadDynamicJS(djs);
                    }
                });
                $(function DOMReadyNow() {
                    if (sfRestClient._Options.LogLevel >= LoggingLevels.Verbose) console.log("sfClient: DOM Ready...");
                    if (!RESTClient.IsDocumentPage() && top && !(top?.name)) top.name = "Dashboard";
               });

               sfRestClient.StartSignalRClientHub(); // for classic pages, XB pages are started after lazy load of SignalR
               sfRestClient._GlobalClientConstructFlag = false;
            }
        });
    }
};