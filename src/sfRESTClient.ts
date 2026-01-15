import { GoogleAnalyticPayload, GUID } from "./globals";
import {  IUCPermit, LookupClient, ProjectTeamClient, ProjectsClient, QueryFilters, SessionClient, Suggestion, UCPermitSet, UICFGClient, UIDisplayConfig, UIDisplayPart } from "./SwaggerClients"
import * as _SwaggerClientExports from "./SwaggerClients";
import { BrowserExtensionChecker } from "./BrowserExtensionChecker";
//import localForage from "localforage"; requires --allowSyntheticDefaultImports in tsconfig
import * as localForage from "localforage";
import  * as RESTClientBase from "./APIClientBase"; // avoid conflict with same in SwaggerClient when loaded by classic UI
import { sfApplicationRootPath, sfProcessDTKMap } from "./string.extensions";
//import {dialog}    from "jquery-ui";

const ClientPackageVersion : string = "23.9500.01";

// originally modified for typescript and linter requirements by Uladzislau Kumakou of XB Software

export enum LoggingLevels {
    None,
    Normal,
    Verbose,
    Debug=9,
    VerboseDebug=92
}
export enum ValidationMode {
    none='0',
    /** 1,T*,Y* are true, empty, 0,F*,N* are false */
    boolean="1",
    numeric="2",
    positive= "5",
    integer="6",
    positiveinteger= "7",
    date= "3",
    futuredate="4",
    /** sort of like past date */
    untildate= "8",
    /** non empty, can be combined with other validations */
    required="16",
    filename="32",
    url="64"
}

type PartStorageList = Map<PartContextKey, PartStorageData>;
type DVCacheEntry = { w: number, v: string };
type RRCacheEntry = { w: number, v: string | number | boolean };
export type CoordinateWithSize = {top:number,left:number,width:number,height:number};

export type UploadMode = "catalog"|"ContactData"|"ContactPhoto"|"doc"|"SitePhoto"|"template";
export type SFRESTClientOptions = {
    /** @default  33000 (about 33 seconds) */
    BasicPingServerInterval: number,
    /** @default "about:blank" */
    BlankPageURI: string,
    CatalogFolderRoot: GUID,
     /**
     * How long (in milliseconds) should a DV result be cached for reuse
     * @default 16 minutes
    */
    DVCacheLife:  number,
    /** Adjusts logging; 2 is verbose, 9 is lots
     * @default None (0)
     */
    LogLevel:  LoggingLevels.None,
    NonPostbackEventID: string,
    /**
     * When true PopDoc() will always use new UI
     */
    PopDocForceXBUI :  boolean,
    /** @default '{0}/DocDetail.aspx?id={1}', */
    PopDocLegacyURL:   string, 
    /** 
     * @abstract  PopDocXBURL can use {0} place holder for site path and {1} placeholder for document ID
     * @default "{0}/wx/#!/document?id={1}" */
    PopDocXBURL:  string ,
    /** @default  '{0}/DocDetail.aspx?add={1}&project={2}{3}' */
    PopNewDocLegacyURL:  string,
    /** @default "{0}/wx/#!/document?add={1}&project={2}{3}"  */
    PopNewDocXBURL:  string ,
    PopupWindowLargeCWS: CoordinateWithSize,
    PopupWindowHelpMenuCWS: CoordinateWithSize,
    PopupWindowUserSettingsCWS: CoordinateWithSize,
    PopupWindowViewUserCWS: CoordinateWithSize,
        PopupWindowTop: number,
        /** @default '{0}/ProjectDetail.aspx?id={1}' */
    ProjectLegacyURL: string ,
    /** @default '{0}/wx/#!/main/projectDashboard?project={1}' */
    ProjectXBURL: string ,
    UseClassicCatalog: boolean  ,
    SuggestionLimit: number,
    SuggestionCacheLifespanMs: number,
    /** @default 999, // about 1 second */
    TaskStatePollInterval: number,
    /** @default 1048000, // about 1 minute */
    UploadChunkSize: number,
    /** in Bytes.  Default is about 8MB (Box.com uses 20)  Files smaller than this are uploaded in a single request */
    UploadDirectLimit: number,
    /** Use -1 to disable, 1 to enable and 0 (default) to defer to DevMode */
    WxEventTraceMode: -1 | 1 | 0,
    /** matches are ignored, default is to ignore onMouseM* 
     * @default /on(?!MouseM|Destruct)([\w]+)$/gmi,
    */
    WxEventFilter:  RegExp, 
    /** When TRUE, Grids on Home (Action Items, Alerts), and Project Dashboard render using original XB logic 
     * @default false ....  set with top.sfClient.SetOptions().WxUseXBGrid = true
    */
    WxUseXBGrid: boolean,

    [key: string]:  string | number | RegExp | boolean | CoordinateWithSize | LoggingLevels | NVPair
}


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

export class SFFileUploadContext {
    /** upload mode */
    mode: UploadMode  ;
    /** key for a document  */
    DMK: GUID | undefined;
    /** key, for an item on the document (requires DMK) */
    itemKey: GUID| undefined;
    /** key for a folder */
    cfk: GUID| undefined;
    /** key for a template (required for mode=template) */
    fk: GUID| undefined;
    /** key, such as for  a user/contact (required for mode=ContactPhoto) */
    pk: GUID| undefined;
    /** project */
    project: string | undefined;
    /** data cache key */
    fromDS: string | undefined;
    public constructor(mode: UploadMode) {
        this.mode = mode;
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
    /** Use sfApplicationRootPath instead of _SiteURL */
    protected static _SiteURL: string;
    protected static _DMCount: number = 0;

    public CFGLoader(): Promise<UIDisplayPart | null> {
        if (!this._InitializationResultPromise) throw new Error("This part was never initialized: " + this._ReferenceKey);
        return this._InitializationResultPromise;
    }

    static _LoadedParts: PartStorageList = new Map<PartContextKey, PartStorageData>();
    public static ClearCache() { this._LoadedParts = new Map<PartContextKey, PartStorageData>(); }
    /**
     * 
     * @param client sfRestClient
     * @param partName something like ActionItems or ProjectCA
     * @param forDocType GUID
     * @param forProject project ID; if empty client.GetPageProjectKey() is used
     * @param context 
     * @returns true if the CFG had been in the cache
     * @see RegisterRestoredCFG
     */
    public static ClearCachedCFG(client: sfRestClient, partName: string, 
                                        forDocType: GUID | undefined, forProject: GUID | undefined, 
                                        context: string | undefined):boolean {
        if (this._LoadedParts?.size === 0) return false;
        if (!forProject) forProject = client.GetPageProjectKey();
        const ReferenceKey: PartContextKey = PartStorageData.GetPartContextKey(partName, forDocType, forProject, context);
        let thisPart: PartStorageData;
        let result =             PartStorageData._LoadedParts.delete(ReferenceKey);
        return result;
    }

    /**
     * 
     * @param client sfRestClient
     * @param partName something like ActionItems or ProjectCA
     * @param forDocType GUID
     * @param forProject project ID; if empty client.GetPageProjectKey() is used
     * @param context 
     * @param usingCfg if supplied, stored, otherwise resolved
     * @returns 
     * @see RegisterRestoredCFG
     */
    public static PartStorageDataFactory(client: sfRestClient, partName: string, 
                                        forDocType: GUID | undefined, forProject: GUID | undefined, 
                                        context: string | undefined,
                                        usingCfg?: UIDisplayPart): PartStorageData {
        if (!forProject) forProject = client.GetPageProjectKey();
        const ReferenceKey: PartContextKey = PartStorageData.GetPartContextKey(partName, forDocType, forProject, context);
        let thisPart: PartStorageData;
        if (PartStorageData._LoadedParts.has(ReferenceKey)) thisPart = PartStorageData._LoadedParts.get(ReferenceKey)!
        else {
            thisPart = new PartStorageData(client, partName, forDocType, forProject, context);
            if (usingCfg && usingCfg.PartName === partName ) {
                thisPart._InitializationResultPromise = new Promise<UIDisplayPart>((preloaded)=>{
                    thisPart!.CFG = usingCfg;
                    preloaded(usingCfg);
                })
                return thisPart;
            }
            const api: UICFGClient = new UICFGClient(PartStorageData._SiteURL);
            try {
                thisPart._InitializationResultPromise = api.getLiveDisplay(partName, forDocType,forProject, context);
                if (thisPart._InitializationResultPromise) {
                    thisPart._InitializationResultPromise.then((r) => {
                        thisPart!.CFG = r;
                    });
                }
            } catch (error) {
                console.warn(error);
                thisPart!.CFG = new UIDisplayPart();
                throw error;
            }
        }
        return thisPart;
    }
    /**
     * 
     * @param client 
     * @param lookupName 
     * @param usingCfg 
     * @returns 
     * @see RegisterRestoredLookupCFG
     */
    public static PartStorageDataLookupFactory(client: sfRestClient, lookupName: string, usingCfg?:UIDisplayPart): PartStorageData {
        var ReferenceKey: PartContextKey = PartStorageData.GetPartContextKey(lookupName, "lookup", "lookup", "lookup");
        var thisPart: PartStorageData;
        if (PartStorageData._LoadedParts.has(ReferenceKey)) thisPart = PartStorageData._LoadedParts.get(ReferenceKey)!
        else {
            thisPart = new PartStorageData(client, lookupName, "lookup","lookup", "lookup");
            if (usingCfg && usingCfg.PartName === lookupName ) {
                thisPart._InitializationResultPromise = new Promise<UIDisplayPart>((preloaded)=>{
                    thisPart!.CFG = usingCfg;
                    preloaded(usingCfg);
                })
                return thisPart;
            }
            
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

    public static GetPartContextKey(partName: string, forDocType: GUID | undefined, forProject: GUID | undefined, context: string | undefined): PartContextKey {
        return `${partName}[${context}]::${forDocType}#${forProject}`; //   "{0}[{2}]::{1}".sfFormat(partName, forDocType, context);
    }

    public GetDataModelBuildContextKey(): string {
        PartStorageData._DMCount++;
        return `DVM-${this._ForPartName}#${PartStorageData._DMCount}`;
    }

    protected constructor(client: sfRestClient, partName: string, forDocType: GUID | undefined, forProject: GUID | undefined, context: string | undefined) {
        this.CFG = null;
        this.DataModels = new Map<string, any[]>();
        this.RestClient = client;
        this._PromiseList = null;
        this._ReferenceKey = PartStorageData.GetPartContextKey(partName, forDocType, forProject, context);
        this._ForPartName = partName;
        PartStorageData._LoadedParts.set(this._ReferenceKey, this);
        this._InitializationResultPromise = null;

        if (!PartStorageData._SiteURL) {
            var ApplicationPath = window.__HTTPApplicationName();
            if (ApplicationPath.toLocaleLowerCase() === "powerux") ApplicationPath = 'sfPMS';
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
        let CSSValue: string = fromElement.css(cssName);
        if (CSSValue) {
            CSSValue = CSSValue.trim();
            if (CSSValue.startsWith("'") || CSSValue.startsWith("\"")) {
                try {
                    // CSSValue = eval(CSSValue);
                    // Instead of eval, use string replace
                    CSSValue = CSSValue.replace(/['"]/g, '').trim();
                    CSSValue = CSSValue.trim();
                } catch (ex) {
                    console.warn("CSSPropertyValueOrEmpty could not EVAL {0}".sfFormat(CSSValue));
                }
            }
        }
        return CSSValue?.trim() ?? defaultValue ?? "";
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
export type DataModelRow = Record<string,any>;
export type DataModelCollection = DataModelRow[];
export class InvokeOptions { ByTask?: boolean | undefined; ByAcct?: boolean | undefined; targetWindow?:string; wxpPopup?: '1'|'0'|'doc';};
export type TableAndFieldInfo = {table:string, field:string, dbf:string, isRO:boolean, isValid:boolean};
export type PartContextKey = string // PartName[context]::dtk
export type Permits = number; // 0...31, see PermissionFlags
/** See sfRestClient.PageTypeNames */
export type PageTypeName = number; // see PageTypeNames
export type PagePartList= {[key: string]: Permits};

export interface iRaiseDocSaveFinished { (eventData: SaveEventData, whatChanged: _SwaggerClientExports.DocFieldChange, newChangeStamps?: { [key: string]: number }):void };
export interface iDocumentModel extends    iDocumentModelBase { 
    DocHeaderData: _SwaggerClientExports.DocMasterDetail;
    CurrentRouteRow: _SwaggerClientExports.DocRoute;
    CurrentAttachments: _SwaggerClientExports.DocAttachment[];
    SaveDocumentPatch: {(deltas:_SwaggerClientExports.IDocFieldChange[],isDone: true | iRaiseDocSaveFinished):Promise<NVPair>}

    getExclusivityMode: {():number};
    // and much more!
    [key:string]: any;
}
export type SaveEventState =     'queue' | 'saving' | 'done' | 'trouble';
export interface changeStampSet { [key: string]: number }
export type SaveEventData = {
    state: SaveEventState  
    pending: number,
    message: string;
    createdAt: number;
    promiseAt?: number;
    backendPromise?: Promise<NVPair>
    priorChangeStamps?: changeStampSet;
    newChangeStamps?: changeStampSet;
};


/** Spitfire PM Client
 * @example top.sfClient.GetDV(...)
 * @example Access static methods or shared properties from console: top.staticBase._IconMap */
export class sfRestClient {
    readonly ClientVersion: string = `${ClientPackageVersion}`;
    ServerVersion():string {
        var result ="";
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
        Report: 128,
        PivotTool: 128,
        Document: 1024,
        Unknown: 8092,
        Unauthenticated: 16384,
            UnauthenticatedLogin: 16385,
            UnauthenticatedWizard: 16386,
            UnauthenticatedLink: 16388,
            /** app root still not redirected to a specific page */
            UnauthenticatedDefault: 16392,  
        UserAccountRecovery: 16387,
        DiagUtilities: 32768,
        PopupAdminTool: 131072,
        PopupUserTool: 131073,
        RichTextEdit: 262144
    }

    /**
     * Applies removals, then changes, then additions
     * @param rawData array of Data Model or View Model
     * @param keyName name of key field in this data model
     * @param changes (Add,Change,Remote)
     * @returns merged rawData
     * @see BuildDataSummary
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
                else  if (sfRestClient._Options.LogLevel >= LoggingLevels.Verbose) console.log(`ApplyDataChanges(REMOVE) did not find a row with key ${element}`);
            } );
        }

        if (changes.Change) {
            changes.Change.forEach( (element:DataModelRow) => {
                var thisKey : string = element[keyName] as string;
                var foundRow = RESTClient.FindRowIndexByKey(rawData,keyName,thisKey);
                if (typeof foundRow === "number" && foundRow >= 0){
                    rawData[foundRow] = element;
                    ChangeCount ++;
                }
                else {
                    if (sfRestClient._Options.LogLevel >= LoggingLevels.Verbose) console.log(`ApplyDataChanges(CHANGE) did not find a row with key ${element} (changed to add)`);
                    changes.Add?.push( element); // !!! does this work?
                }
            } );
        }
        if (changes.Add) {
            changes.Add.forEach((element)=>  {
                var thisKey : string = element[keyName] as string;
                var foundRow = RESTClient.FindRowIndexByKey(rawData,keyName,thisKey);
                if (typeof foundRow !== "number" || foundRow < 0) {
                    rawData.push(element)
                    AddCount ++;
                } 
                else  {
                    rawData[foundRow] = element;
                    ChangeCount ++;
                }
            });
        }
        if (sfRestClient._Options.LogLevel >= LoggingLevels.Verbose) 
            console.log(`ApplyDataChanges(${keyName}) removed ${RemoveCount}, changed ${ChangeCount}, added ${AddCount} in ${Date.now() - StartAtTicks}t `);
        return rawData;
    }

    /**
     * Extracts key, etag pairs from a set of data
     * @param rawData array of Data Models or View Models, must have etag
     * @param keyName
     * @returns array of key, etag pairs, suitable for passing to getChange* API endpoints
     * @see ApplyDataChanges
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
            console.warn(`BuildDataSummary() - rawData does not include keyName ${keyName} `);
            return result;
        }
        if (!("ETag" in rawData[0])) {
            console.warn(`BuildDataSummary() - rawData does not include ETag (key ${keyName})`);
            return result;
        }
        var RESTClient = this;
        rawData.forEach(function(row:DataModelRow) {
            if ( row[keyName] && !result.find(el=> el.RowKey === row[keyName])) {
                result.push(new _SwaggerClientExports.CurrentDataSummary({"RowKey":row[keyName], "ETag": row["ETag"]}));
            }
        });

        return result;
    }


    /**
      *  Async builds a View Model for the rawData, given part context.  - use .then()
      */
    BuildViewModelForContext(partName: string, context: string, forDocType: GUID | undefined, rawData: DataModelCollection | DataModelRow): Promise<DataModelCollection> {
        if (!sfRestClient._z.WCCLoaded) this.LoadUserSessionInfo();
        var RESTClient = this;
        var thisPart: PartStorageData | undefined = PartStorageData.PartStorageDataFactory(this, partName, forDocType, "",context);
        if (!thisPart) {
            console.warn("Count not resolve part {0}".sfFormat(PartStorageData.GetPartContextKey(partName, forDocType, "",context)));
            var EmptyPromise: Promise<DataModelCollection> = new Promise<DataModelCollection>((resolve) => resolve(rawData as DataModelCollection));
            return EmptyPromise;
        }
        var FinalViewModelPromise: Promise<DataModelCollection> = new Promise<DataModelCollection>((finalResolve) => {
            thisPart!.CFGLoader().then(() => {
                var ViewModelPromise: Promise<DataModelCollection> = this._ConstructViewModel(thisPart!, rawData);
                ViewModelPromise.then((r) => {
                    finalResolve(r);
                    const RawResultIsArray = (r && Array.isArray(r));
                    let rowCount = 1;
                    if (!RawResultIsArray) {
                        if (sfRestClient._Options.LogLevel >= LoggingLevels.VerboseDebug)  console.log(`BuildViewModelForContext GA ${partName} ${typeof r} isArray ${Array.isArray(r)} - single row` ,r);
                    }
                    else rowCount = r.length;
                    RESTClient.GAViewModelEvent(partName,rowCount);
                });
            });
        });
        return FinalViewModelPromise;
    }

    // /**
    //  *  Legacy version of BuildViewModelForContext  - use .done()
    //  *  @deprecated use BuildViewModelForContext()
    //  */
    // BuildViewModel(partName: string, context: string, rawData: any, unusedCfgData: undefined, forDocType: GUID | undefined): JQueryPromise<any> {
    //     if (!sfRestClient._z.WCCLoaded) this.LoadUserSessionInfo();
    //     var thisPart: PartStorageData | undefined = PartStorageData.PartStorageDataFactory(this, partName, forDocType, "",context);
    //     var darnSoon = $.Deferred();
    //     var ResultReady = darnSoon.promise();
    //     // what purpose would this serve?? if (cfg) thisPart.CFGLoader = cfg;
    //     thisPart.CFGLoader().then(() => {
    //         this._ConstructViewModel(thisPart!, rawData)
    //             .then((r) => darnSoon.resolve(r))
    //     }
    //     );
    //     return ResultReady;
    // }

    /**
     * Updates row visibility on the server and updates the in-memory flags for display of this row
     * @param partName ProjTeam or ProjectPublicInfo
     * @param rawData ViewModel containing raw row data
     */
    ToggleRowVisibility( partName: "ProjTeam" | "ProjectPublicInfo" | string, rawData: DataModelRow) : Promise<boolean> {

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
            RowKey = rawData["UserProjectKey"] as string;
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

    /** Writes to console log
     * @argument msg text to write
     * @argument level msg is suppressed if logging level is less than specified, default is verbose
     */
    Log(msg: string, level: LoggingLevels = LoggingLevels.Verbose    ) : void {
        if (sfRestClient._Options.LogLevel >= level) console.log(msg);

    }

    /**
     *  Applies CFG data to raw Data Model, returns promise that resolves when View Model is ready
     */
    protected _ConstructViewModel(thisPart: PartStorageData, rawData: any): Promise<DataModelCollection> {
        if (!thisPart || !thisPart.CFG || !thisPart!.CFG.UIItems) {
            console.error('_ConstructViewModel requires CFG and UI', thisPart);
            throw `Cannot construct requested ViewModel`;
        }
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
                    if (SingleInstanceMode) FinalData = FinalData[0] as DataModelCollection;
                    resolve(FinalData);
                    thisPart!.DataModels.delete(DataModelBuildKey);
                    if (sfRestClient._Options.LogLevel >= LoggingLevels.Verbose) console.log("ViewModel {0} complete in {1}t".sfFormat(DataModelBuildKey, Date.now() - StartAtTicks));
                }).fail(function(jqXHR, textStatus, errorThrown) {
                    if (FailCount === 0) {
                        var FinalData =thisPart!.DataModels.get(DataModelBuildKey!)!;
                        if (SingleInstanceMode) FinalData = FinalData[0] as DataModelCollection;
                        resolve(FinalData);
                        thisPart!.DataModels.delete(DataModelBuildKey);
                        FailCount++;
                    }
                    console.warn("ViewModel {0} failed to complete cleanly; {2} fails; {1}t".sfFormat(DataModelBuildKey, Date.now() - StartAtTicks,FailCount));
                });
        });
        return ViewModelPromise;

    }

    async WaitForSessionLoaded(): Promise<void> {
        if (!sfRestClient._z.WCCLoaded) try { await this.LoadUserSessionInfo();} catch (ex:any) {console.warn('IsSessionLoaded()',ex);}
    }

    /**
    * async: returns an numeric bit-flag indicating the user's permission level (R=1,I=2,U=4,D=8,S=16)
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
            if (!sfRestClient._z.WCCLoaded)  {
                let retryCount = 0;
                while (!sfRestClient._z.WCCLoaded && retryCount < 9)  try { 
                    const usePageName = ((retryCount++ < 3) && 
                                        (sfRestClient.ResolvedPageInfo.LastResolvedPageTypeName & RESTClient.PageTypeNames.Unauthenticated) === RESTClient.PageTypeNames.Unauthenticated) 
                                        ? `${sfApplicationRootPath}/wx/#!/main/home` : undefined;
                    await RESTClient.LoadUserSessionInfo(false,usePageName); 
                } catch (ex:any) {
                    rejectThisPermit(ex.message);
                    return;
                }
            }
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
                    console.warn(`CheckPermit(): >>>> No user/session!! <<<< Therefore no permission for ${ucModule}|${ucFunction}!  LOGIN AGAIN!`)
                else {
                    console.warn(`CheckPermit() could not find ${ucModule}|${ucFunction} - verify proper case/trim!`);
                    if (!RESTClient._LoadUCFunctionMapHasBeenForced) {
                        console.log(`CheckPermit() is reloading the permit map...`);
                        await RESTClient.LoadUCFunctionMap(true);
                        const retryPromise = RESTClient.CheckPermit(ucModule,ucFunction,optionalDTK,optionalProject,optionalReference);
                        retryPromise.then((p)=>{
                            ResolveThisPermit(p);
                        })
                        .catch((r)=>{
                            console.warn(`CheckPermit() retry failed...`,r);
                            ResolveThisPermit(0);
                        });
                        return;
                    }
                }

                ResolveThisPermit(0);
                return;
            }

            if (!sfRestClient.GlobalPermitAPIPromise) {
                if (!(sfRestClient._LoadedPermits.has("0"))) { // global permissions
                    var api = new SessionClient(this._SiteURL);
                    sfRestClient.GlobalPermitAPIPromise  = api.getProjectPermits("0");
                    sfRestClient._LoadedPermits.set("0",new _SwaggerClientExports.UCPermitSet()); // this prevents repeat requests
                    if (sfRestClient.GlobalPermitAPIPromise) {
                        sfRestClient.GlobalPermitAPIPromise.then((r) => {
                            if (r) {
                                //if (sfRestClient._Options.LogLevel >= LoggingLevels.Debug) console.log(`CheckPermit#${RESTClient.ThisInstanceID}() Received Global Permits from server...`);
                                sfRestClient._LoadedPermits.set("0", r);
                                if (sfRestClient._Options.LogLevel >= LoggingLevels.Verbose) console.log(`CheckPermit#${RESTClient.ThisInstanceID}() Loaded Global Permits from server...`);
                            }
                        });
                    }
                }
            }
            if (sfRestClient.GlobalPermitAPIPromise) {
                //if (sfRestClient._Options.LogLevel >= LoggingLevels.Debug) console.log(`CheckPermit#${RESTClient.ThisInstanceID}() Waiting for Global Permits from server...`);
                await sfRestClient.GlobalPermitAPIPromise;
                if (sfRestClient._Options.LogLevel >= LoggingLevels.VerboseDebug) console.log(`CheckPermit#${RESTClient.ThisInstanceID}() Global Permits ready() `,sfRestClient._LoadedPermits.get(optionalProject));
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
                            if (sfRestClient._Options.LogLevel >= LoggingLevels.Debug) console.log(`CheckPermit#${RESTClient.ThisInstanceID}() Loaded Project ${optionalProject} Permits from server...`);
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
                                if (sfRestClient._Options.LogLevel >= LoggingLevels.VerboseDebug) console.log(`CheckPermit#${RESTClient.ThisInstanceID}(${ucModule}:${ucFunction},${optionalProject}) UCFK ${UCFK}, p:`,p);
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
            else if (forPageName === this.PageTypeNames.ExecutiveDashboard) {
                PartNameList = ["ProjectRES"];
                //if (pageKey!.length <= 1) pageKey = this.GetPageProjectKey();
                // special case for project dashboards: ProjDocMenu
            }
            else if (forPageName === this.PageTypeNames.Catalog) {
                PartNameList = ["DocSearch","CatVersions","Folders"];
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
     * @param dependsOn 0 to 4 values required by the lookup for context;  @see sfRestClient.GatherDependsOnValues to process string
     * @param limit a reasonable number of suggestions to be returned; zero or negative replaced with option.SuggestionLimit
     * @returns promise of suggestions.  reuses a matching promise from withing about 4 minutes
     * @description context is provided from GetPageContextValue("dsCacheKey")
     */
    GetLookupSuggestions(lookupName : string, seedValue: string,
                         dependsOn: string | string[] | undefined,
                         limit: number = -1) : Promise<Suggestion[] | null>  {

            var apiResultPromise: Promise<Suggestion[] | null> | undefined ;
            var RESTClient: sfRestClient = this;
            var api: LookupClient = new LookupClient();
            var DependsOnSet: string[] = ["", "", "", "",""];

            if (limit <= 0) limit = sfRestClient._Options.SuggestionLimit;
            if (Array.isArray(dependsOn)) {
                $.each(dependsOn, function (i, v) { DependsOnSet[i] = v; });
            }
            else if (dependsOn) {
                DependsOnSet[0] = dependsOn;
            }
            //DependsOnSet = [1, "a", 2.5, true, null, undefined, {key: "value"}];
            DependsOnSet = DependsOnSet.map(String); // makes sure all the elements are strings
            const suggestionGroupKey = `${lookupName}[${seedValue.sfHashCode()}]@${DependsOnSet[0].sfHashCode()}x${DependsOnSet[1].sfHashCode()}x${DependsOnSet[2].sfHashCode()}x${DependsOnSet[3].sfHashCode()}x`
            const TimeNow = Date.now();
            
            if (sfRestClient.RecentSuggestionAsOf.has(suggestionGroupKey)) {
                if (sfRestClient.RecentSuggestionAsOf.get(suggestionGroupKey)! < TimeNow) {
                    // expired
                    sfRestClient.RecentSuggestionAsOf.delete(suggestionGroupKey);
                }
                else {
                    if (sfRestClient.RecentSuggestionResultMap.has(suggestionGroupKey)) {
                        apiResultPromise = sfRestClient.RecentSuggestionResultMap.get(suggestionGroupKey);
                        if (apiResultPromise ) return apiResultPromise;
                    }
                }
            }

            //var apiResultPromise: Promise<Suggestion[] | null> = api.getSuggestions4(lookupName, "1", DependsOnSet[0], DependsOnSet[1], DependsOnSet[2], DependsOnSet[3],seedValue,limit);
            var SuggestionContext = new _SwaggerClientExports.QueryFilters();
            SuggestionContext.DependsOn = DependsOnSet;
            SuggestionContext.MatchingSeed = seedValue;
            SuggestionContext.ResultLimit = limit;
            apiResultPromise = api.getSuggestionsWithContext(lookupName,RESTClient.GetPageDataContext(),SuggestionContext)
            sfRestClient.RecentSuggestionAsOf.set(suggestionGroupKey,TimeNow + sfRestClient.suggestionCacheLifespan );
            sfRestClient.RecentSuggestionResultMap.set(suggestionGroupKey,apiResultPromise);

            return apiResultPromise;
    }

    /** returns GetPageContextValue("dsCacheKey") */
    public GetPageDataContext():string{
        let result = this.GetPageContextValue("dsCacheKey");

        return result;
    }

    static readonly suggestionCacheLifespan =  246800; // about 4.11 minutes in ms
    /** maps Suggestion Group key to when expires */
    private static  RecentSuggestionAsOf:  Map<string,number> = new Map();;
    /** maps Suggestion Group key to promise result */
    private static  RecentSuggestionResultMap:   Map<string,Promise<Suggestion[] | null>> = new Map();
    private static  RecentDocumentList :_SwaggerClientExports.MenuAction[];
    /** Returns list of recent documents from server as updated by PopDoc() calls */
    GetRecentDocuments() : _SwaggerClientExports.MenuAction[] {
        return sfRestClient.RecentDocumentList;
    }
    /**
     * Returns a View Model constructured for the result rows matching specified lookup context and filters
     * @param lookupName
     * @param filterValues  default to {} can include NVPs and zero to 4 dependsOn strings
     * @returns
     */
    GetLookupResults(lookupName : string,
        /**
       * either a string or string array (up to 4 elements);
      */
         filterValues: QueryFilters
         ) : Promise<DataModelCollection> {

          var apiResultPromise: Promise<{[key:string]:any}[] | null>;
          var RESTClient: sfRestClient = this;
          var api: LookupClient = new LookupClient( );


          var FinalViewModelPromise: Promise<DataModelCollection> = new Promise<DataModelCollection>((finalResolve) => {
            apiResultPromise  = api.getLookupResultAll(lookupName, RESTClient.GetPageDataContext() ,  filterValues);

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

    /** removes an exact match from the session DV cache */
    ClearDV(displayName: string, keyValue: string,
        /**
         * either a string or string array (up to 4 elements)
        */
        dependsOn: string | string[] | undefined): boolean {
            const requestData = this._getDVRequestString(displayName, keyValue, dependsOn);
            const cacheKey: string = `GetDV:L${requestData.length}H${requestData.sfHashCode()}`;
            try {
                var result: string | null = sessionStorage.getItem(cacheKey);
                if (typeof result === "string") {
                    sessionStorage.removeItem(cacheKey);
                    return true;
                }
            }
            catch (err2:any        ) {
                throw `ClearDV() cache error: ${err2.message}`;
            }

            return false;
        }

    /**
     * Get Display Value using DV-Name and key value, with 0 to 4 dependencies.
     * @param displayName the name of a display value rule (eg sfUser, RoleName, etc)
     * @param keyValue the primary or most significant key
     * @param dependsOn optional array of context values (multi-part key); 0 to 4 elements allowed; hint: use 'empty' for an empty value
     * @param autoVary force bypass of cache
     * @returns Promise for String
     */
    GetDV(displayName: string, keyValue: string,
        /**
         * either a string or string array (up to 4 elements)
        */
        dependsOn?: string | string[] | undefined,
        /**
         * when true, a unique value is added to defeat cache
        */
        autoVary?: boolean | undefined): Promise<string | null> {

        var apiResultPromise: Promise<string | null>
        if (!keyValue || keyValue === this.EmptyKey) return new Promise<string | null>((resolve) => resolve(""));
        if (displayName === "0") return new Promise<string | null>((resolve) => resolve(keyValue));

        var requestData = this._getDVRequestString(displayName, keyValue, dependsOn);
        if (autoVary) requestData += `?${this._getVaryByQValue()}`;
        const cacheKey: string = `GetDV:L${requestData.length}H${requestData.sfHashCode()}`;

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
        var api: LookupClient = new LookupClient();
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

        var DVFilters : _SwaggerClientExports.DVRequest  = new _SwaggerClientExports.DVRequest();
        DVFilters.DVName = displayName;
        DVFilters.MatchingValue = keyValue;
        DVFilters.DependsOn = DependsOnSet;
        DVFilters.RequestID = cacheKey;
        //DVFilters.DataContext = "1";
        var apiResultPromise: Promise<string | null> = this._ThrottleDVRequests(api,DVFilters);
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
     * Throttles and batches requests for display values (DVs) to improve performance.
     * If there are pending DV requests, it adds the new request to a queue and sets up a timer to batch the requests.
     * Otherwise, it directly calls the `getDisplayableValue` method on the `LookupClient` API.
     * 
     * @param api - The `LookupClient` API instance to use for making DV requests.
     * @param dvRequest - The DV request object containing the necessary parameters.
     * @returns A Promise that resolves to the requested display value, or `null` if the request fails.
     */
        private _ThrottleDVRequests(api : LookupClient, dvRequest : _SwaggerClientExports.DVRequest) : Promise<string|null> {
        var DVResultPromise: Promise<string | null>;
        var RESTClient = this;
        if (sfRestClient._Options.LogLevel >= LoggingLevels.VerboseDebug) console.log(`ThrottleDV(${dvRequest.DVName}:${dvRequest.MatchingValue}) with ${this._CachedDVRequests.size} pending `);

        if (this._CachedDVRequests.size > 0) {
            DVResultPromise = new Promise<string|null>((resolvedTo)=> {
                if (!RESTClient._DVRequestTimerHandle) {
                    if (sfRestClient._Options.LogLevel >= LoggingLevels.VerboseDebug) console.log(`ThrottleDV() created BatchDV  `);
                    RESTClient._DVRequestTimerHandle = setTimeout(() => {
                        var thisGroup : _SwaggerClientExports.DVRequest[] = [];
                        Object.assign(thisGroup,RESTClient._DVRequestQueue);
                        RESTClient._DVRequestQueue = [];
                        RESTClient._DVRequestTimerHandle = undefined;
                        if (sfRestClient._Options.LogLevel >= LoggingLevels.VerboseDebug) console.log(`BatchDV() with ${thisGroup.length} in group `);
                        api.getDisplayValueCollection(thisGroup)
                        .then( (dvList:Suggestion[] | null): void => {
                            if (sfRestClient._Options.LogLevel >= LoggingLevels.VerboseDebug) console.log(`BatchDV().THEN  `,dvList);
                            if (dvList)
                                dvList.forEach(element => {
                                    if (element.value) {
                                        var DVDonePromise = this._DVThrottledResolvers.get(element.value);
                                        if (DVDonePromise)  {
                                            DVDonePromise(element.label!);
                                            this._DVThrottledResolvers.delete(element.value);
                                        }
                                        else console.warn("Batch DV could not find element",element);
                                    }
                                    else console.warn("Batch DV could not find cacheId",element);
                                });
                        })
                        .catch(err => {
                            console.error("Batch DV failed",err);
                        });
                    }, 321);
                }
                RESTClient._DVRequestQueue.push(dvRequest);
                this._DVThrottledResolvers.set(dvRequest.RequestID,resolvedTo);
            });
        }
        else DVResultPromise = api.getDisplayableValue(dvRequest.DVName,dvRequest ,RESTClient.GetPageDataContext());
        return DVResultPromise;
    }
    private _DVRequestQueue : _SwaggerClientExports.DVRequest[] = [];
    //private _DVThrottledResolvers1 : {[key:string]:(params:string)=>void; }
    private _DVThrottledResolvers : Map<string,(v:string|null)=>void>  = new Map<string,(v:string|null)=>void>();
    private _DVRequestTimerHandle: number | undefined = undefined;

    /**
     * Async Get Part Configuration Data given part name, doc type and context
     * @param partName DocRoute or ActionItems etc
     * @param forDocType guid
     * @param forProject 
     * @param partContext 
     * @returns CFG object
     */
    GetPartCFG(partName: string, forDocType?: GUID, forProject?:string, partContext?: string): Promise<UIDisplayPart | null> {
        var thisPart: PartStorageData | undefined = PartStorageData.PartStorageDataFactory(this, partName, forDocType,forProject, partContext);
        return thisPart.CFGLoader();
    }

 /**
     * Tell the cfg manager about a CFG that should be discarded
     * @param partName 
     * @param forDocType 
     * @param forProject 
     * @param partContext 
     * @returns  true if removed
     * @see GetPartCFG
     */
    DiscardPartCFGCache(partName: string, forDocType?: GUID, forProject?:string, partContext?: string): boolean {
        return PartStorageData.ClearCachedCFG(this,partName,forDocType,forProject,partContext);
    }

    /**
     * Tell the cfg manager about a CFG that was recovered from local storage
     * @param partName 
     * @param forDocType 
     * @param forProject 
     * @param partContext 
     * @param recoveredCFG  NOT optional, you are responsible for it being current
     * @returns  the cfg object
     * @see GetPartCFG
     */
    RegisterRestoredCFG(partName: string, forDocType?: GUID, forProject?:string, partContext?: string,recoveredCFG?: UIDisplayPart): UIDisplayPart {
        if (!recoveredCFG)  throw new Error(`RegisterRestoredCFG(${partName}) requires recoveredCFG object ` );
        const thisPart: PartStorageData | undefined = PartStorageData.PartStorageDataFactory(this, partName, forDocType,forProject, partContext,recoveredCFG);
        return recoveredCFG;
    }

 /**
     * Tell the cfg manager about a lookup that was recovered from local storage
     * @param lookupName
     * @param recoveredCFG  NOT optional, you are responsible for it being current
     * @returns  the cfg object
     * @see GetPartCFG
     */
    RegisterRestoredLookupCFG(lookupName: string, recoveredCFG: UIDisplayPart): UIDisplayPart {
        if (!recoveredCFG)  throw new Error(`RegisterRestoredCFG(${lookupName}) requires recoveredCFG object ` );
        const thisPart: PartStorageData | undefined = PartStorageData.PartStorageDataLookupFactory(this, lookupName,recoveredCFG);
        return recoveredCFG;
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

    /** Returns URL for a file */
    GetFileURL( fileKey: GUID | _SwaggerClientExports.FileInformation, fn?: string, fileRev?: number,forDownload?: boolean) : string {
        if (fileKey instanceof _SwaggerClientExports.FileInformation) {
            fn = fileKey.value;
            fileRev = fileKey.LatestRevision;
            fileKey = fileKey.FileKey as string;
        }
        ["&",'/','?','+','*'].forEach((v)=>{fn = fn?.replaceAll(v,"" )});
        return `${this._SiteRootURL}/sfImg.ashx/ck/${fileKey}/${fn}?cd=${forDownload ? "1":"0"}${fileRev ? `&rv=${fileRev}`:""}`;
    }

    /** Returns URL for a file preview (given size) */
    GetFilePreviewURL( fileKey: GUID | _SwaggerClientExports.FileInformation, width: number, height:number,
                        fn?: string,
                         fileRev?: number) : string {
        if (fileKey instanceof _SwaggerClientExports.FileInformation) {
            fileRev = fileKey.LatestRevision;
            fn = fileKey.value;
            fileKey = fileKey.FileKey as string;
        }
        return `${this._SiteRootURL}/sfImg.ashx/ck/${fileKey}/preview-${fn}?w=${width}&h=${height}${fileRev ? `&rv=${fileRev}`:""}`;
    }

        /** Returns URL for the appropriate icon given a file type
         * @param fileType jpg, xml, docx, etc.  Do not include the leading period
         * @returns site root relative URL, something like /sfPMS/images/iconname.png
        */
    GetIconURL( fileType: string, iconSizeIgnored?: number) : string {

        var iconURL : string | Date | undefined;
        let start = Date.now();
        if (!iconSizeIgnored) iconSizeIgnored = 24;
        fileType = fileType.toLocaleLowerCase();

        if (!sfRestClient._IconMap && ((Date.now() - start)  < 5432)) {
            this._LoadIconMap();
            console.log("YIKES!!!....waiting for icon map!");  // do not use loop
        }

        if (sfRestClient._IconMap) iconURL = sfRestClient._IconMap[ ( (fileType in sfRestClient._IconMap) ?  fileType : 'default')];
        if (!iconURL) iconURL = `${this._SiteRootURL}/images/OtherFilesIcon.svg?ne=${fileType}`;

        return <string>iconURL;
        }

    /** Returns information about a document process */
    GetDocProcessTypeInfo(forDocType: GUID): Promise<_SwaggerClientExports.ProcessDocumentType | undefined> {
        let systemClient = new _SwaggerClientExports.SystemClient();
        const findProcess = function FindRequestedProcessInList(pl:_SwaggerClientExports.ProcessDocumentType[], forDocType:GUID):_SwaggerClientExports.ProcessDocumentType | undefined {
            return pl.find(pdt => pdt.DocTypeKey.localeCompare(forDocType,undefined,{sensitivity:'accent'}) === 0);
        };
        let processPromise =  new Promise<_SwaggerClientExports.ProcessDocumentType | undefined>(resolvedPromise=>{
            if (sfRestClient.LocalProcessTypeInfo) {
                resolvedPromise(findProcess(sfRestClient.LocalProcessTypeInfo ,forDocType));
            }
            else {
                let result : _SwaggerClientExports.ProcessDocumentType | undefined;
                if (!sfRestClient.LocalProcessTypeInfoPromise)  sfRestClient.LocalProcessTypeInfoPromise = systemClient.getProcessList(this.EmptyKey);
                sfRestClient.LocalProcessTypeInfoPromise.then(pl => {
                    if (pl) {
                        sfRestClient.LocalProcessTypeInfo = pl;
                        result =  findProcess(pl ,forDocType);
                    }
                    else console.warn("GetDocProcessTypeInfo() could not load process type data");
                }).catch(reason=>{
                    console.warn("GetDocProcessTypeInfo() failed to load process type data",reason);
                }).finally(()=>{
                    resolvedPromise(result);
                });
            }
        });

        return processPromise;
    }
    private static LocalProcessTypeInfo: _SwaggerClientExports.ProcessDocumentType[];
    private static LocalProcessTypeInfoPromise: Promise<_SwaggerClientExports.ProcessDocumentType[] | null>;

    /**
     * Displayable size
     * @param size integer size in bytes
     * @returns size scaled to KB, MB or GB
     */
    public BytesToSizeString(size : number) :string {
        let result = '';
        if (size <= 0)              result = '';
        else if (size < 1024)       result = "< 1KB";
        else if (size < 1048576)    result = `${(size/1024).toFixed(0)}KB`;
        else if (size < 1073741824) result = `${(size/1048576).toFixed(1)}MB` ;
        else                        result = `${(size/1073741824).toFixed(2)}MB` ;  
        return result;
    }


    /** Async get of a non-user specific setting (always the same for all users) */
    RuleResult(ruleName : string, testValue : string, filterValue : string | undefined, defaultValue: string | number | boolean) : Promise<string | number | boolean | null> {
        var apiResultPromise: Promise<string | number | boolean | null>
        var cacheKey: string = `GetRR:${ruleName}T${testValue.sfHashCode()}F${filterValue?.sfHashCode()}`;
        this.heartbeat();
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
    var $GCI : JQuery<HTMLElement> = self.$('.{0}'.sfFormat(queryOptions.DialogCSS.replace(' ', '.')));
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
                if (jqXHR.responseText.length > 1234) $GCI.css("width",self.$(window.top!).width()! - 48);
            }
            else if (!responseText || (typeof responseText === "string" && responseText === "[]")) isEmpty = true;
            if (isEmpty) {
                $GCI.html(queryOptions?.EmptyDialogText!);
            }
        });
   // });

    return forElement;
    }

    private AdjustFluidDialog(dialog :  any,$this:JQuery<HTMLElement>):void {
        if (!$this) $this = dialog.closest("ui-dialog");
        var $DialogContent = $this.find(".ui-dialog-content");
            // if fluid option == true
        if (dialog.options.fluid) {
            dialog.option("width", "auto"); // temp...to calc required size
                var wWidth = self.$(window).width()!;
                var dWidth = $DialogContent.width()!;
                // check window width against dialog width
                if (wWidth < (dWidth + 50)) {
                    // keep dialog from filling entire screen
                    $this.css("max-width", "90%");
                } else {
                    // fix maxWidth bug
                    dialog.option("width", dWidth);
                }
                //reposition dialog
                dialog.option("position", dialog.options.position);
            }
        }

    UpdateFluidDialogs():void {
        var RESTClient = this;
        var $visible = self.$(".ui-dialog:visible");
        if ($visible.length === 0) $visible = self.top!.$(".ui-dialog:visible");
        // each open dialog
        $visible.each(function () {
            var $this = self.$(this);
            var dialog = $this.find(".ui-dialog-content").data("ui-dialog");
            RESTClient.AdjustFluidDialog(dialog, $this);
        });

    }


    AutoSizeDialog($D : JQuery<HTMLElement>): JQuery<HTMLElement> {
        var RESTClient = this;
        var dialogOptions = {
            width: 400,
            minWidth: 250,
            height: "auto",
            fluid: true
        };
        $D.dialog(dialogOptions);
        //$D.dialog("options","width", $D.width());
        RESTClient.UpdateFluidDialogs();
        return $D;
    }

    public GetFileUploadURL(uploadContext: SFFileUploadContext) : string {
        return this._BuildFileUploadURL("upload",uploadContext);
    }
    public GetFileChunkUploadURL(uploadContext: SFFileUploadContext) : string {
        return this._BuildFileUploadURL("stream/chunk",uploadContext);
    }

    private _BuildFileUploadURL(uploadType: "upload" | "stream/chunk",uploadContext: SFFileUploadContext) : string {
        var urlOptions : string = "";
        if (uploadContext.DMK) {
            urlOptions = `${urlOptions}&dmk=${uploadContext.DMK}`;
            if (uploadContext.itemKey) {
                urlOptions = `${urlOptions}&itemKey=${uploadContext.itemKey}`;
            }
        }
        if (uploadContext.cfk) {
            urlOptions = `${urlOptions}&cfk=${uploadContext.cfk}`;
        }
        if (uploadContext.fk) {
            urlOptions = `${urlOptions}&fk=${uploadContext.fk}`;
        }
        if (uploadContext.fromDS) {
            urlOptions = `${urlOptions}&fromDS=${uploadContext.fromDS}`;
        }
        if (uploadContext.pk) {
            urlOptions = `${urlOptions}&pk=${uploadContext.pk}`;
        }
        if (uploadContext.project) {
            urlOptions = `${urlOptions}&proj=${uploadContext.project}`;
        }

        return `${this._SiteURL}/api/catalog/${uploadType}?xm=${uploadContext.mode}${urlOptions}`;

    }

    /** Uploads a file of up to Options.UploadDirectLimit Bytes (around 8MB) in a single request, then falls back to 1MB chunks
     *
     *  @returns promise that resolves on upload complete
      */
    public UploadFile(blobFile: File, uploadContext: SFFileUploadContext,progressCallback?: (state:_SwaggerClientExports.XferFilesStatus) => boolean) : Promise<_SwaggerClientExports.XferFilesStatus | _SwaggerClientExports.HttpResponseJsonContent> {
        this.heartbeat();

        var fd = new FormData();
        var ff =  new _SwaggerClientExports.FileInformation();
        var RESTClient = this;
        ff.FileType = blobFile.type; // actually the mimeType
        ff.value = blobFile.name;
        ff.size = blobFile.size;
        if (uploadContext.project) ff.Project = uploadContext.project;
        ff.ReferenceDate = new Date(blobFile.lastModified);
        (<any>ff).ETag = "na";

        return new Promise<_SwaggerClientExports.XferFilesStatus >(async result =>  {
            var taskResult : _SwaggerClientExports.XferFilesStatus  = new  _SwaggerClientExports.XferFilesStatus();
            let UploadURL = '';
            let FileUploadKey: string| null = '';
            let UseChunkMode: boolean = false;

            const SendToServer = async function UploadFileSendData(sendFD:FormData, headers?:{[key:string]:string} ): Promise<_SwaggerClientExports.XferFilesStatus[]> {
                // sends the current contents of the FormData in the data:fd object
                let uploadxhr = $.ajax({
                    url: UploadURL,
                    type: "POST",
                    data: sendFD,
                    processData: false,
                    contentType: false,
                    headers: headers,
                    success: function(response:_SwaggerClientExports.XferFilesStatus[]) {
                        if (!Array.isArray(response)) response = [response];
                        response.forEach(fileResponse => {
                            console.log(`${fileResponse.name} @ ${fileResponse.progress}`);
                        });
                    },
                    error: function(jqXHR, textStatus, errorMessage) {
                        console.log(errorMessage); // Optional
                        taskResult.error = errorMessage;
                        taskResult.name = ff.value;
                        result(taskResult);
                    }
                 });
                 uploadxhr.progress(function(e){
                     console.log(`sfRestClient.UploadFile.xhr.progress`,e);  // never fires :-()
                 });
                 return uploadxhr;
            }
            taskResult.name = ff.value;
            if (ff.size! > sfRestClient._Options.UploadDirectLimit) {
                let CatAPI = new _SwaggerClientExports.CatalogClient();
                UploadURL = RESTClient.GetFileChunkUploadURL(uploadContext);
                UseChunkMode = true;
                // taskResult.error = "File too large for single upload";

                // result(taskResult);
                CatAPI.beginUpload(ff).then((unusedUploadKey) =>{
                    if (unusedUploadKey) FileUploadKey = unusedUploadKey['f'];
                    const chunkSize = sfRestClient._Options.UploadChunkSize;
                    const chunksQuantity = Math.ceil(ff.size! / chunkSize);
                    const chunkQueue:number[] =  Array.from(Array(chunksQuantity).keys()).reverse(); // Array.from({length: chunksQuantity}, (_, i) => i + 1);
                    const SendNext = function SendNextChunk() {
                          const chunkId = chunkQueue.pop()!;
                          const begin = chunkId * chunkSize;
                          const chunk = blobFile.slice(begin, begin + chunkSize, blobFile.type);
                          (<any>chunk).name = blobFile.name;
                          let UploadHeaders:{[key:string]:string} = {};
                          UploadHeaders['Content-Disposition'] = `attachment; filename="${ff.value}"`;
                          UploadHeaders['Content-Range'] = `bytes ${begin}-${(begin + chunk.size - 1)}/${ff.size}`
                            fd.append("files[]",chunk,blobFile.name);
                            let response: _SwaggerClientExports.XferFilesStatus;
                            SendToServer(fd,UploadHeaders)
                            .then((chunkResponse:_SwaggerClientExports.XferFilesStatus[]) => {
                                if (Array.isArray(chunkResponse) && chunkResponse.length > 0)  response =  chunkResponse[0];
                                else response = <any>chunkResponse;
                                //     chunkResponse
                                // if (chunkXHR.responseText){
                                //     response = JSON.parse(chunkXHR.responseText);
                                //     console.log(`UploadFile ${ff.value} Chunk ${chunkId}`,chunkXHR);
                                // }
                                // else {
                                //     console.log('UploadFile Chunk Response Check ', chunkXHR);
                                //     // response = taskResult;
                                //     // response.error = `Upload File: No response from chunk ${chunkId}!`
                                // }
                                if (chunkQueue.length === 0) {
                                    console.log("All parts uploaded");
                                    result(response);
                                    return;
                                }
                                else {
                                    if (progressCallback) progressCallback(response);
                                }
                                fd = new FormData();
                                SendNext();
                            }).catch((e) => {
                                console.error('UploadFile() Chunk Error',e);
                                response = taskResult;
                                response.error = `Upload File: Error during chunk ${chunkId}!`;
                                result(response);
                            });
                    }
                    SendNext();
                });

            }
            else {
                UploadURL = RESTClient.GetFileUploadURL(uploadContext);
                fd.append("fileMeta", JSON.stringify(ff) );
                fd.append("fileToUpload", blobFile);
                SendToServer(fd)
                .then( finalResponse => {
                    if (Array.isArray(finalResponse) && finalResponse.length > 0) result(finalResponse[0])
                    else result(<_SwaggerClientExports.XferFilesStatus><unknown>finalResponse);
                });
            }
            console.log(`UploadFile ${ff.value} ${Math.round(ff.size!/1024.0)}K ${UseChunkMode ? 'in chunks' : 'using a single request'}`)
            //ff.MetaData = [{"UploadMode": uploadContext.mode}]; causes ETag error



        });


    }

    /** checks with server up to 3 times a second.  promise resolves when task has ended or callback returns true;
     * @param taskKey guid key for task
     * @param sessionClient optional existing SessionClient
     * @param progressCallback optional callback for when task status is not 200;  if this callback returns true, promise is resolved
     */
    public async WaitForTask( taskKey: GUID,sessionClient? : SessionClient, progressCallback?: (state:_SwaggerClientExports.HttpResponseJsonContent) => boolean ) : Promise<_SwaggerClientExports.HttpResponseJsonContent> {
        if (!sessionClient) sessionClient = new SessionClient();
        var RESTClient = this;
        if (sfRestClient._Options.TaskStatePollInterval < 300) sfRestClient._Options.TaskStatePollInterval = 300;
        return new Promise<_SwaggerClientExports.HttpResponseJsonContent>(async result =>  {
            var taskResult : _SwaggerClientExports.HttpResponseJsonContent, waitResult : _SwaggerClientExports.HttpResponseJsonContent;
            taskResult = new _SwaggerClientExports.HttpResponseJsonContent( {ThisStatus: 202});
            var aborted= false;
            while (!aborted && taskResult.ThisStatus == 202) {
                await new Promise(r => setTimeout(r, sfRestClient._Options.TaskStatePollInterval));
                var taskCheck =   sessionClient!.getTaskState(taskKey).then(t=>taskResult = t).catch(x=>{taskResult = x;});
                await taskCheck;

                if (taskResult!.ThisStatus == 202) {
                    if (progressCallback) {
                        if (progressCallback(taskResult)) {
                            result(taskResult);
                            aborted = true;
                        }
                    }
                    else if (taskResult.ThisReason) {
                         RESTClient.DisplayUserNotification(taskResult.ThisReason, 9876);
                    }
                }
            }
            result(taskResult);
        });
    }



    public  ExportCompetitiveBidData():void {
        var PostBackArgs = "";
        var TemplateTypeCode = "BA";
        var RESTClient = this;

        console.log(`sfExportCobra(${TemplateTypeCode}) ${PostBackArgs}`);
        self.$("DIV#divDialogExportGrid").remove();
        var $Box = self.$("<div id='divDialogExportGrid' />");
        var $Dialog : JQuery;
        $Dialog = $Box.load(`${RESTClient._SiteURL}/ajhx/ExportGridDialog.html`, function PopFromParentDialogLoaded() {
            // after loaded
            var $TemplateDocument: JQuery<HTMLInputElement> = <JQuery<HTMLInputElement>>$Box.find("#txtTemplate")!;
            var $ButtonPane = $Box.parent().find(".ui-dialog-buttonpane");
            var $CancelBTN = $ButtonPane.find("#btnDismiss");


            RESTClient.sfAC($TemplateDocument, "TemplateFor", TemplateTypeCode);
            $TemplateDocument.autocomplete("option", "minLength", 0).autocomplete("option", "delay", 200);
            $TemplateDocument.data("acPostbackKey", false); // prevent Auto complete from stuffing the key into our input field
            $TemplateDocument.on("sfAC.KV sfLookup.Stored", function (e, kv) {
                console.log(`ExportGrid Template-on:${e.type} = ${kv}`);
                $TemplateDocument.data("TemplateKey", kv);
                PostBackArgs = kv;
            }).on("sfAC.response", function (e, choices) {
                if (choices.content.length === 1) {
                    var newChoice = choices.content[0];
                    $TemplateDocument.val(newChoice.value).data("acKey", newChoice.key).data("acChange", true);
                }
            }).on("focus", () => {
                $TemplateDocument.autocomplete("search", $TemplateDocument.val());
                $TemplateDocument.trigger("select");
            });

            $TemplateDocument.trigger("focus");
            RESTClient.AutoSizeDialog($Dialog);
            return false;
        }).dialog({
            title: "Export Competitive Bid Data...",
            close: function () { $Dialog.dialog('destroy'); }
        });
        var DialogButtons = [{
            text: "Export",
            "id": "btnExport",
            click: function () {

                RESTClient.GADialogEvent("Completed", "ExportCobra");
                $Dialog.dialog("close");
                RESTClient.HeyPleaseWait();
                var api = new _SwaggerClientExports.ExcelToolsClient();
                api.getCobraExport(PostBackArgs,RESTClient.GetPageDataContext()).then( crt => {
                    RESTClient.WaitForTask(crt).then( (crtResult : any) => {
                        RESTClient.ClearPleaseWaitDialog();
                        let thisReason = (crtResult!.ThisReason) ? crtResult!.ThisReason : "Failed! Contact Help Desk (see server logs)";
                        if (thisReason.indexOf("Failed!") >= 0) {
                            RESTClient.DisplayUserNotification(thisReason);
                        }
                        else {
                            console.log(thisReason);
                            var fn = "CobraExport.xlsx";
                            if (thisReason.startsWith("{")) {
                                var result = JSON.parse(thisReason);
                                if (result.fn) fn = result.fn;
                            }
                            RESTClient.DisplayUserNotification();
                            window.open(`${top!.sfClient._SiteURL}/sfImg.ashx/CRT/${crt}/${fn}`);
                        }
                    });
                });
                //setTimeout("top.sfClient.ClearPleaseWaitDialog(); if (top.sfClient.ClearInClientSidePostbackFlag) top.sfClient.ClearInClientSidePostbackFlag(); //ExportCobra", 2345);
            }
        }, {
            "id": "btnDismiss",
            text: "Dismiss",
            click: function () {
                $Dialog.dialog("close");
            }
        }];


        $Dialog.dialog('option', 'buttons', DialogButtons);

        //return false; // do not return false, IE anchor href issue

    }



    static $CurrentPleaseWaitDialog : JQuery<HTMLDivElement> | null;
    HeyPleaseWait() {
        // this variant applies inside a frame
        if (sfRestClient.$CurrentPleaseWaitDialog && sfRestClient.$CurrentPleaseWaitDialog.is(":visible")) return sfRestClient.$CurrentPleaseWaitDialog;

        sfRestClient.$CurrentPleaseWaitDialog = this.jqAlert("Please wait...", "Working", "ui-icon-locked").addClass("sfPleaseWait");
        var DialogButtons = {};
        if (DialogButtons) sfRestClient.$CurrentPleaseWaitDialog .dialog('option', 'buttons', DialogButtons);
        return sfRestClient.$CurrentPleaseWaitDialog;
    }
    ClearPleaseWaitDialog():void {

        if (sfRestClient.$CurrentPleaseWaitDialog ) {
            sfRestClient.$CurrentPleaseWaitDialog.dialog("close")
            sfRestClient.$CurrentPleaseWaitDialog  = null;
        }
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
     * test: ["d","t","d t","MMM d, yyyy","MM d, yy","M dd, yyyy","MMM d, yyyy HH:mm:ss","d/m/yyyy","H:mm:ss","h:mm:ss tt"].forEach(test=> console.log(test.padEnd(25),"\t",sfClient.ConvertDotNetDateTimeFormatToWebix(test)))
     */
    public ConvertDotNetDateTimeFormatToWebix( dotNetFormat : string ): string {
        var result : string | null;
        var DefaultCulture : string = navigator.language;
        let addShortTime: boolean = false;
        let usCulture: boolean = false;
        if (DefaultCulture) usCulture = (DefaultCulture === "en-US");

        // special handling for d and/or t on their own
        if (!dotNetFormat) dotNetFormat = "d";
        if (dotNetFormat?.endsWith(" t")) addShortTime = true;
        if (dotNetFormat === "d" || dotNetFormat === "d t") {
            dotNetFormat = (usCulture) ?  "M/d/yyyy" : "d MMM yyyy";
        }
        if (addShortTime || dotNetFormat === "t") {
            if (dotNetFormat.endsWith(" t")) dotNetFormat = dotNetFormat.substring(0,dotNetFormat.length - 2);
            dotNetFormat =  ((dotNetFormat === "t") ? "" : dotNetFormat + " ") + ((usCulture) ?  "h:mm tt" : "HH:mm");
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

    /** returns true if the passed value is effectively empty
     *  @see  basically the same as Route.helpers.isEmptyValue() */
    public IsEmptyValue (value:any): boolean {
        let result = !!value; // false if empty...we flip on return
        if (result && value === this.EmptyKey) result = false;
        if (result && (
            (typeof value === "string" && value === this.EmptyDate) ||
            (typeof value === "object" && value instanceof Date && value.getTime() === this.EmptyTime))
        ) result = false;
        return !result;
    }

    /**
     * Converts a JSON set into rows of an HTML Table.
     * @param mydata an array of JSON objects
     * @returns JQuery<HTMLTableElement> TABLE that has not been inserted into DOM
     */
    MakeTable = function (mydata : JSON[]) : JQuery<HTMLTableElement > {
        var table: JQuery<HTMLTableElement> = self.$('<table border="1px">');
        var tblHeader = "<tr>";
        for (var k in mydata[0]) tblHeader += "<th>" + k.replaceAll("_", " ") + "</th>";
        tblHeader += "</tr>";
        self.$(tblHeader).appendTo(table);
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
            self.$(table).append(TableRow);
        });
        return table;
    };



 /**
     * Make sure the URL starts with application root path
    */
 public MakeSiteRelativeURL(url:string):string {
        if (this.IsSiteURL(url)) return url;
        if (url.startsWith("~")) url = url.substring(1);
        if (url.startsWith("../")) url = url.substring(3);
        url = `${this._SiteRootURL}/${url}`;
        return url;
    }

    /** scans for IMG tags with class sfUIMakeSrcSiteRelative  */
    public makeResourceURIsSiteRelative($DOM: JQuery<HTMLElement>):void {
        let thisClient:sfRestClient = this;
        var $Targets;
        if (!$DOM) $Targets = self.$("img.sfUIMakeSrcSiteRelative");
        else $Targets = $DOM.find("img.sfUIMakeSrcSiteRelative");
        $.each($Targets, function (i, img) {
            thisClient.setImgSrc(self.$(img)  as JQuery<HTMLImageElement> ) ;
        });
    }

    /** resolves full path (for current theme) and sets sfImg flag */
    protected setImgSrc($T: JQuery<HTMLImageElement>): JQuery.jqXHR<any> |JQuery.Promise<string>  {
        if ($T.data('sfimg')) {
            let darnSoon = $.Deferred();
            let ImgReady = darnSoon.promise();
            darnSoon.resolve($T.attr("src"));  //makes ImgReady be ready
            return ImgReady;
        }
        var imgName = $T.attr("src");
        if ((!imgName) || (imgName.length === 0)) {
            imgName = $T.data("src");
        }
        else $T.attr("src", ""); // avoid 404
        if (!imgName) {
            let darnSoon = $.Deferred();
            let ImgReady = darnSoon.promise();
            darnSoon.resolve("");  //makes ImgReady be ready
            return ImgReady;
        }
        var arq = this.requestImgPath(imgName);
        arq.done(function (dvResponse:string, txtStatus:string, _XHR : any) {
            if (dvResponse.length > 260) {
                console.log("setImgSrc() done: response too long");
                return arq;
            }
            $T.attr("src", dvResponse).data("src", "").data('sfimg', true);
        }).fail(function () {
            console.warn("setImgSrc() failed for " + imgName);
        });
    
        return arq;
    }

    protected requestImgPath(imgName:string): JQuery.jqXHR<any> | JQuery.Promise<string> {
        var imgRequest = this.SessionStorageKeyForImageName(imgName );
        var cacheResult = this.SessionStoragePathForImageName(imgRequest); 
        if (cacheResult) imgName = cacheResult;
        if (imgName.startsWith('/')) {
            var darnSoon = $.Deferred();
            var ImgReady = darnSoon.promise();
            darnSoon.resolve(imgName);  //makes ImgReady be ready
            return ImgReady  ;
        }
        var url = this.MakeSiteRelativeURL(`px.ashx/${imgRequest}`);  // classic getPXURL
        return $.ajax({ url: url, dataType: 'html' }).done(function (imgPath) {
            if ((typeof imgPath === "string") && (imgPath.startsWith("/"))) {
                    sessionStorage.setItem(imgRequest, imgPath);
                }
        });
    }

    
    protected SessionStorageKeyForImageName( imgName:string ):string {
    return `img/${imgName}?zv=${sfRestClient._WCC.uiVaryBy}`; 
}
protected SessionStoragePathForImageName( imgStorageKey:string ):string | false {
    if (typeof sessionStorage !== "object") return false;
    let cacheResult:string | false | null = sessionStorage.getItem(imgStorageKey); 
    if (typeof cacheResult !== "string" || !cacheResult.startsWith("/")) {
       cacheResult = false;
    }
    return cacheResult;
}

    private _LoadUCFunctionMapHasBeenForced = false;

    /**
     * Loads UC Function Keys and corresponding Module/System Names
     * NOTE: returns a JQueryPromise
    */
    protected LoadUCFunctionMap(force?:boolean): JQueryPromise<any> {
        let RESTClient: sfRestClient = this;
        let DeferredResult = $.Deferred();
        let permitCheck = DeferredResult.promise();
        if (force) RESTClient._LoadUCFunctionMapHasBeenForced = true;

        if (sfRestClient._UCPermitMap._etag.w === 0 && !force) {
            // see about localStorage
            var ls = JSON.parse(localStorage.getItem(sfRestClient._z.lsKeys.api_session_permits_map)!);
            if (ls && typeof ls._etag.w === "number") {
                console.log("Loaded Function Map from localStorage...");
                sfRestClient._UCPermitMap = ls;
            }
            this._LoadIconMap();
        }
        else if (!sfRestClient._IconMap) this._LoadIconMap();

        if ("WORK" in sfRestClient._UCPermitMap) {
            // we have a map, lets see if we should use it as-is
            if ((sfRestClient._WCC.UserKey === this.EmptyKey)) {
                // no session? So, now is not a good time to refreh the map, just use what we have
                DeferredResult.resolve(sfRestClient._UCPermitMap);
                return permitCheck;
                }

            if (!force && (Date.now() - sfRestClient._UCPermitMap._etag.w) < (sfRestClient._Options.DVCacheLife * 4))   {
                // great: we have a map and it isn't old
                DeferredResult.resolve(sfRestClient._UCPermitMap);
                return permitCheck;
            }
        }

        if (!sfRestClient._SessionClientGetUCFKMap)            sfRestClient._SessionClientGetUCFKMap = RESTClient._GetAPIXHR("session/permits/map?etag=" + Object.keys(sfRestClient._UCPermitMap._etag)[0]);

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

    protected _LoadIconMap(): void {
        if (sfRestClient._IconMap) return;
        const RESTClient = this;
        let ls = localStorage.getItem(sfRestClient._z.lsKeys.api_icon_map);
        if (ls) sfRestClient._IconMap = JSON.parse(ls);
        if (!sfRestClient._IconMap || typeof sfRestClient._IconMap !== "object") sfRestClient._IconMap = {};
        if (typeof sfRestClient._IconMap!["_ts"] === "string") sfRestClient._IconMap!["_ts"] = new Date(sfRestClient._IconMap!["_ts"]);
        let etag : string = "undefined";
        let AsOf = <Date>sfRestClient._IconMap!["_ts"];
        if (!AsOf || !(AsOf instanceof Date)) AsOf = new Date(0);
        if (sfRestClient._IconMap) etag = <string>sfRestClient._IconMap["_etag"];
        let getIconMapXHR = this._GetAPIXHR(`catalog/icon/list?etag=${etag}`);
        getIconMapXHR.done(function _doneGetIcomMap(imap) {
            if (getIconMapXHR.status === 200) {
                if (imap && typeof imap === "object" && typeof imap._etag === "string") {
                    sfRestClient._IconMap = <{[key:string]: string | Date}>imap;
                    sfRestClient._IconMap["_ts"] = new Date();
                    console.log(`Loaded ${Object.keys(sfRestClient._IconMap).length} Icon Map entries from server...`);
                    for (var key in sfRestClient._IconMap) {
                        if (sfRestClient._IconMap.hasOwnProperty(key)) {
                            if (typeof sfRestClient._IconMap[key] === "string" &&  !((sfRestClient._IconMap[key] as string).startsWith("/"))) 
                                sfRestClient._IconMap[key] = `${RESTClient._SiteRootURL}/${sfRestClient._IconMap[key]}`;
                        }
                    }
                    localStorage.setItem(sfRestClient._z.lsKeys.api_icon_map, JSON.stringify(sfRestClient._IconMap));
                }
                else {
                    console.warn("_LoadIconMap() could not load Function Map from server...", getIconMapXHR);
                }
            } else if (getIconMapXHR.status === 304) {
                console.log(`_LoadIconMap(${AsOf.toISOString()}) resolved icon map as not modified...`);
                //sfRestClient._IconMap!["_ts"] = new Date();
            } else {
                console.log(`_LoadIconMap(${AsOf.toISOString()}) using ${Object.keys(sfRestClient._IconMap!).length} old map data...`);
                if (Object.keys(sfRestClient._IconMap!).length < 5) sfRestClient._IconMap = null;
            }
        });
    }

    /** Simple test for an authenticated session
     *  - Use await or .then()
     */
    async IsLoggedIn() : Promise<boolean> {
        await this.WaitForSessionLoaded();
        return new Promise<boolean>( (resolve)  =>{
            if (!sfRestClient._z.WCCLoaded) resolve(false);
            resolve( (typeof sfRestClient._WCC.SessionID === "string"));
        });
    }

    /**
     * Loads or Updates WCC session attributes (api/session/who)
     * @param bypassCache 
     * @param locationHash when omitted, location.toString is used
    */
    LoadUserSessionInfo(bypassCache?:boolean, newHref?:string): Promise<WCCData> {
        const RESTClient: sfRestClient = this;
        var api: SessionClient ;
        var apiResult: Promise<WCCData | null> | null = null;
        sfRestClient._z.WCCLoaded = false; // required to make CheckPermit() (etc) wait for this to complete
        return new Promise<WCCData>( (resolve)  =>{
            if (!newHref) newHref =    location.toString();
            let locationHash = newHref.sfHashCode();
             
            let ThisPageType =  this.ResolveStringPageNametoPageTypeName(this.ResolvePageNameFromURL(newHref)); 
            if ((ThisPageType &  RESTClient.PageTypeNames.Unauthenticated ) ===  RESTClient.PageTypeNames.Unauthenticated  ){
                if (sfRestClient._Options.LogLevel >= LoggingLevels.Verbose) console.log("LoadUserSessionInfo() FYI: Not logged in.");
                resolve(sfRestClient._MakeFakeWCC());
                return;
            }
            if (sfRestClient._SessionClientGetWCC) {
                if (!bypassCache && sfRestClient._SessionClientGetWCC.AppliesFor(locationHash)) {
                    //if (sfRestClient._Options.LogLevel >= LoggingLevels.VerboseDebug) console.log(`LoadWCC(${RESTClient.ThisInstanceID}) Reusing ongoing getWCC for HREF hash ${sfRestClient._SessionClientGetWCC.ForNavHash}`);
                    apiResult = (<Promise<WCCData>> sfRestClient._SessionClientGetWCC.APIResult!);
                } else sfRestClient._SessionClientGetWCC = null;
            }
            if (!apiResult) {
                let ForPageHash = locationHash;
                api = new SessionClient(this._SiteURL);
                if (sfRestClient._Options.LogLevel >= LoggingLevels.Debug) console.log(`LoadWCC(${RESTClient.ThisInstanceID}) Creating getWCC request for HREF hash ${ForPageHash}`);
                apiResult = <Promise<WCCData | null>> api.getWCC(RESTClient.GetPageQueryContent(newHref));
                sfRestClient._SessionClientGetWCC = new _SessionClientGetWCCShare(apiResult!,  ForPageHash);
                sfRestClient.RecentDocumentList = [ new _SwaggerClientExports.MenuAction()];
                sfRestClient.RecentDocumentList[0].Enabled=false;
                sfRestClient.RecentDocumentList[0].ItemText=' (still loading...)';
                if (!RESTClient.IsDocumentPage())
                    api.getRecentDocs()
                    .then((recentList)=>{
                        if (recentList) sfRestClient.RecentDocumentList = recentList
                        else sfRestClient.RecentDocumentList[0].ItemText='Documents will appear here as you open them';
                    })
                    .catch((reason)=>{
                        console.warn('LoadUserSessionInfo().getRecentDocs()',reason);
                        sfRestClient.RecentDocumentList[0].ItemText='None available';
                    });
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
                    resolve(sfRestClient._MakeFakeWCC());
                }
            }).catch(x=>{
                console.log(`LoadUserSessionInfo(getWCC) catch`,x);
                if (RESTClient.IsRESTErrorResponse(x) ) {
                    if (x.ThisStatus === 401 ) {
                        let  IsLoginRelatedPage = RESTClient.IsLoginRelatedPage()  
                        if (!IsLoginRelatedPage &&(  top?.name==="Dashboard" || this.IsHomeDashboardPage())) { // do we need more here?  
                            // goal is to not redirect document pages, etc
                            if (sfRestClient._Options.LogLevel >= LoggingLevels.None) console.log(`SessionClient.getWCC() redirecting to login`);
                            RESTClient.DisplayUserNotification("Redirecting for authentication...");
                            RESTClient.NavigateToLogout("LoadUserSessionInfo",3210);
                        }
                    }
                }
                resolve(sfRestClient._MakeFakeWCC());
            });
        });
    }

    public IsLoginRelatedPage():boolean {
        const RESTClient: sfRestClient = this;

        let  IsLoginRelatedPage = sfRestClient.NextHrefIsPending && sfRestClient.NextHrefIsUnauthenticated;
        if (!IsLoginRelatedPage && RESTClient.IsPageOfType( RESTClient.PageTypeNames.UnauthenticatedLogin )) IsLoginRelatedPage = true; 
        if (!IsLoginRelatedPage && RESTClient.IsPageOfType( RESTClient.PageTypeNames.UserAccountRecovery ) ) IsLoginRelatedPage = true;
        if (!IsLoginRelatedPage && RESTClient.IsPageOfType( RESTClient.PageTypeNames.UnauthenticatedDefault ) ) IsLoginRelatedPage = true
        return IsLoginRelatedPage;
    }

    protected static _SessionClientGetWCC : _SessionClientGetWCCShare | null;
    protected static _SessionClientGetUCFKMap : JQueryXHR | null;

    private static _MakeFakeWCC() : WCCData {
        let FakeWCC =new WCCData();
        FakeWCC.AdminLevel = 0;
        FakeWCC.DataPK= "00000000-0000-0000-0000-000000000000";
        FakeWCC.DocRevKey= "00000000-0000-0000-0000-000000000000";
        FakeWCC.DocSessionKey= "00000000-0000-0000-0000-000000000000";
        FakeWCC.DocTypeKey= "00000000-0000-0000-0000-000000000000";
        FakeWCC.LoginSessionKey = undefined;
        FakeWCC.SessionID = undefined;
        FakeWCC.UserKey = "00000000-0000-0000-0000-000000000000";
        return FakeWCC;
    }

    /** applies changes to connection properties 
     * @see SharePageContext
    */
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
            self.$("body").trigger(eventName,[RESTClient,keyName,value]);
            if (eventName === "sfClient.SetWCC_SiteID") this.GAMonitorEvent(  value ,sfRestClient.IsPowerUXPage() ?  "PowerUX" : "ClassicUI", "Init", "WCC", 0);
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
            var js : JQuery<HTMLScriptElement> = self.$("script[src^='{0}']".sfFormat(src));
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
            if (!$element) $element = self.$("<div />");
            //if (typeof $element.dialog !== "function") {
                if (!window.jQuery) window.jQuery = window.$;
                
                this.AddCSSResource("//ajax.googleapis.com/ajax/libs/jqueryui/1.14.1/themes/cupertino/jquery-ui.css");
                this.AddCSSResource(`${this._SiteURL}/theme-fa/styles.css?v=${sfRestClient._WCC.Version}`);
                if (self.$("LINK[rel='stylesheet'][href*='fontawesome.com']").length + self.$("SCRIPT[src*='fontawesome.com']").length ===0)
                    self.$("head").prepend('<script src="https://kit.fontawesome.com/c6020291c5.js" crossorigin="anonymous"></script>');

                this.AddCachedScript(`${this._SiteURL}/Scripts/jquery.signalR-2.4.3.min.js`,true).then((likelyTrue) => {
                    this.AddCachedScript(`${this._SiteURL}/signalR/hubs`,true).then((likelyTrue)=>{
                        sfRestClient.StartSignalRClientHub();
                    });
                });
                this.AddCachedScript('//ajax.googleapis.com/ajax/libs/jqueryui/1.14.1/jquery-ui.min.js',true).then( (likelyTrue) => {
                    console.log("jQuery UI extensions loaded.");
                    resolve(true);
                });


            //}
            //else resolve(true);
       });
       return XToolLoadPromise;
    }

    /**
     * @param url 
     * @param headScript true to place the script in the head section
     * @param [useAsync=false] true to load async
     * @param [context=self] 
     * @returns promise - use .then for code after the script has loaded
     * 
     */
    public  AddCachedScript(  url: string,headScript?: boolean,context: Window | undefined = self,useAsync = false): Promise<boolean> {
        if (!context) context = self;

        var ScriptPromise : Promise<boolean> = new Promise<boolean>((resolve) => {
            var PreSearch = "{0} script[src*='{1}']".sfFormat(headScript ? "HEAD" : "BODY",url.substring(url.lastIndexOf("/")));
            if (self.$(PreSearch).length > 0) {
                console.log('AddCachedScript() found {0} has already been added'.sfFormat(url));
                resolve(true);
                return;
            }
            var script = context!.document.createElement('script');
            script.src = url;
            script.type = "text/javascript"
            script.defer = true;
            script.async = useAsync;
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
        if (self.$('head').find('link[type="text/css"][href="{0}"]'.sfFormat(cssRef)).length > 0) return;

        self.$('head').append('<link rel="stylesheet" href="{0}" type="text/css" />'.sfFormat(cssRef));
    }

    /** Returns a guid/uuid
     * @param [fetchCount=3] number of keys to request
     *  @returns something in the form xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
     * */
    async NewGuid(fetchCount = 3) : Promise<GUID> {
        if (sfRestClient._NewGuidList.length < fetchCount) {
            var api = new SessionClient(this._SiteURL);
            await api.getNewGuid(fetchCount).then(r => {
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
        var RESTClient = this;
        if (!options) options = "";
        if (!project) project = this.GetPageProjectKey();
        if (options.length > 0 && !options.startsWith("&")) console.warn("PopNewDoc() options should start with &...");
        this.heartbeat();

        return new Promise<Window | null>((resolve) => {
            this.GetDV("DocType",dtk,undefined).then(async (thisDocTypeSiteName) => {
                const thisRestClient = this;
                const isProjectSetupDocType = (dtk.toLowerCase() === sfProcessDTKMap.ProjectSetup );
                if (!thisDocTypeSiteName) {
                    console.warn("Document type not found"); //hmmm maybe a popup?
                    resolve(null);
                    return;
                }
                var UseID : string;
                var url : string =  sfRestClient._Options.PopNewDocLegacyURL;
                if (!isProjectSetupDocType) {
                    if (sfRestClient._Options.PopDocForceXBUI ) url =  sfRestClient._Options.PopNewDocXBURL
                    else {
                        if (await RESTClient.RuleResult("DocTypeConfig","WithPowerUX",dtk,false)) url =  sfRestClient._Options.PopNewDocXBURL;
                    }
                }
                if (options?.includes("&UseID")) {
                    UseID = options.substring(options?.indexOf("&UseID")+7,36);
                }
                else {
                    UseID = await this.NewGuid();
                    if (!options) options = "";
                    options += `&UseID=${UseID}`;
                } 
                let includeProjectID : boolean = !isProjectSetupDocType
                // note: for new project setup, send project id as the first option
                url  =  url.sfFormat(thisRestClient._SiteURL, dtk, includeProjectID ? project : "",options) ;
                if (sfRestClient._Options.LogLevel >= LoggingLevels.Verbose) console.log(`PopNewDoc opening ${UseID} DTK ${dtk} using ${url}`);

                var TargetTab =  UseID.substring(UseID.lastIndexOf("-") + 1).toLowerCase();
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

    /** search supplied object for a key reference */
    sfRowKey($For: JQuery<HTMLElement>):GUID {
        var result;
        if ($For instanceof HTMLElement) $For = self.$($For);
        if (typeof $For?.data === 'function') {
            result = $For.data('key');
            if (!result) {
                var $TR = $For.closest("TR");
                result = $TR.find("INPUT.clsEnabledEdit[type='image'][data-pk]").data('pk');
                if (!result) result = $TR.find("INPUT[type='hidden'][name$='Key']").val();
                if (!result) result = $TR.find("TD DIV.clsEnabledEdit[data-pk]").data('pk');
                if (!result) result = $TR.find("TD:first DIV[data-pk]").data('pk');
                if (!result) result = $For.closest("DIV#PanelItems").find("TR.clsGridMasterSelectedItem").find("TD DIV[data-pk]").data('pk');
                if (!result) result = $For.closest("TABLE.clsDetailLayout[data-pk]").data('pk');
            }
        }
        
        return result;
    }

  /**
     * Opens a new tab with location specified based on Document Key and UI version
     * @param id the guid DocMasterKey for the document to be opened
     * @comment Adds document to the Recent Document List
     */
   PopDoc(id : GUID | JQuery<HTMLElement>) : Promise<Window | null>
   {
       var RESTClient = this;
       RESTClient.heartbeat();
       if (!id) id = self.$(self.document.activeElement as any) as unknown as JQuery<HTMLElement>;
       if (typeof id !== 'string') id = this.sfRowKey(id);

       return new Promise<Window | null>((resolve) => {
            if (!id || typeof id !== 'string') {
                console.warn("PopDoc(): Document id expected; received",id);
                RESTClient.DisplayUserNotification("Document key not found",9876);
                resolve(null);
                return;
            }
            const DocKey: string = `${id}`;

           if (!DocKey.sfIsGuid()) {
                console.warn(`PopDoc(): Document id expected; received: ${DocKey}`);
                RESTClient.DisplayUserNotification("Document key expected",9876);
                resolve(null);
                return;
           }
           RESTClient.GetDV("DocMasterType",id,undefined).then(async (thisDocType) => {
               if (!thisDocType) {
                   console.warn("PopDoc(): Document not found"); //hmmm maybe a popup?
                   RESTClient.DisplayUserNotification("Document not found",9876);
                   resolve(null);
                   return;
               }
               RESTClient.GetDV("DocTitleLong",DocKey,undefined)
               .then((title)=>{
                    RESTClient.UpdateRecentDocumentList(DocKey,title);
               })
               .catch((reason)=>{
                    console.warn(`PopDoc(${DocKey}).DocTitleLong`,reason);
               });

               var url : string =  sfRestClient._Options.PopDocLegacyURL;
               if (sfRestClient._Options.PopDocForceXBUI) url =  sfRestClient._Options.PopDocXBURL
               else {
                   if (await RESTClient.RuleResult("DocTypeConfig","WithPowerUX",thisDocType,false)) url =  sfRestClient._Options.PopDocXBURL;
               }

               url  =  url.sfFormat(RESTClient._SiteURL, DocKey) ;

               var TargetTab =  url.substring(url.lastIndexOf("-") + 1).toLowerCase();
               //todo: determine if we need the "how many tabs" logic and dialog
               if (!window) {
                   console.error("PopDoc() Must be called from a browser window");
                   resolve(null);
                   return;
               }
               if (sfRestClient._Options.LogLevel >= LoggingLevels.Verbose) 
                        console.log(`PopDoc opening DMK ${DocKey} DTK ${thisDocType} tab [${TargetTab}] using ${url}`);
               var PW = window.open(url, TargetTab);
               resolve(PW);
           });
       });
   }

   /** Adds (or relocates) the specified document to the top of the recent document list
    * @param dmk guid of the document
    * @param title text to show in menu, typically result of DocTitleLong
    */
   public UpdateRecentDocumentList(dmk: GUID, title: string | null ): void {
    if (title) {
        if (dmk) dmk = dmk.toLocaleLowerCase();
        let recent = sfRestClient.RecentDocumentList.find(ma=>{return ma.CommandArgument === dmk;});
        if (!recent) {
            const MostRecent =new _SwaggerClientExports.MenuAction();
            MostRecent.CommandArgument = dmk;
            MostRecent.ItemText = title;
            MostRecent.HrefTarget="_blank";
            MostRecent.HRef = `javascript:top.sfClient.PopDoc('${dmk}');`;
            MostRecent.Enabled = true;
            sfRestClient.RecentDocumentList.unshift(MostRecent);
            if (sfRestClient.RecentDocumentList.length === 10) sfRestClient.RecentDocumentList.pop();
            else if (sfRestClient.RecentDocumentList.length === 2 && !sfRestClient.RecentDocumentList[1].Enabled) sfRestClient.RecentDocumentList.pop();
        }
        else {
            sfRestClient.RecentDocumentList.splice(sfRestClient.RecentDocumentList.indexOf(recent),1);
            sfRestClient.RecentDocumentList.unshift(recent);
        }
    }
    else {
        console.warn(`UpdateRecentDocumentList(${dmk}) - requires title`);
    }
   }

  /**
     * Opens a new dashboard tab with project specified 
     * @param id the project ID without mask 
     */
   OpenProject(id : string) : Promise<Window | null>
   {
       var RESTClient = this;
       RESTClient.heartbeat();
       if (this.IsDocumentPage()) {
            //... next line tells the DASHBOARD tab to navigate to the project
            self.$.connection.sfPMSHub.server.dashboardOpenLink("dashboard",`javascript:top.sfClient.OpenProject('${id}');`);
            return RESTClient.SwitchToDashboardTab();
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
               if (sfRestClient.IsPowerUXPage()) {
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

   /** switches to the peer tab with Name=Dashboard 
    *   @returns  self if window.name === Dashboard */
   public SwitchToDashboardTab() : Promise<Window | null> {
    var RESTClient = this;
    RESTClient.heartbeat();
    return new Promise<Window | null>((resolve)=>{
            if (self.name.sfStartsWithCI("Dashboard")) {
                resolve(self);
                return;
            }
            const DashboardWindow = window.open("","Dashboard");
            if (DashboardWindow) {
                console.log(`SwitchToDashboardTab ${DashboardWindow.name} at ${DashboardWindow.location.href}`, DashboardWindow);
                if (DashboardWindow.location.href === 'about:blank') {
                    DashboardWindow.location.href = sfApplicationRootPath;
                }
            } 
        resolve(DashboardWindow);
        });
   }


   /** returns true if url starts with _SiteURL  */
   public IsSiteURL(url : string) : boolean {
    if (url.sfStartsWithCI(this._SiteURL)) return true;
    if (url.sfStartsWithCI(this._SiteRootURL)) return true;
    return false;
   }

   public IsRESTErrorResponse(testObject: _SwaggerClientExports.HttpResponseJsonContent | any) : boolean {
    if (!testObject) return false;
    if (testObject instanceof _SwaggerClientExports.HttpResponseJsonContent) return true;
    if (testObject.ThisStatus && testObject.ThisReason) return true;
    return false;
    }


    /**
     * Sets sfRestClient Options
     *
     * @returns copy of current options
     * @example SetOptions( { LogLevel: LoggingLevel.Verbose, DVCacheLife: 22*60000, PopDocForceXBUI: true, PopDocXBURL: "{0}#!/doc/home?id={1}"});
     * @example SetOptions().LogLevel =  LoggingLevel.Verbose;
     * 
     * @see GetStringOption @see GetBooleanOption @see  GetNumericOption
     *
     * 
    */
    public SetOptions(options?: NVPair): SFRESTClientOptions {
        if (!options) {
            return sfRestClient._Options;
        }
        if (sfRestClient._Options.LogLevel >= LoggingLevels.Verbose) console.log("sfRestClient.SetOptions() ",options);
        const thisClient: sfRestClient = this;
        Object.keys(options).forEach((key) => {
            var PropName : string = '_' + key;



            if (key === "DVCacheLife" && typeof sfRestClient._Options.DVCacheLife === typeof options[key]) sfRestClient._Options.DVCacheLife = options[key]
            else if (key === "LogLevel" && typeof sfRestClient._Options.LogLevel === typeof options[key]) sfRestClient._Options.LogLevel = options[key]
            else if (key === "PopDocForceXBUI" && typeof sfRestClient._Options.PopDocForceXBUI === typeof options[key]) sfRestClient._Options.PopDocForceXBUI = options[key]
            else if (key in sfRestClient._Options && typeof sfRestClient._Options[key] === typeof options[key]) sfRestClient._Options[key] = options[key];
            else if (PropName in thisClient && typeof (thisClient as any)[PropName] === typeof options[key]) sfRestClient._Options[PropName] = options[key];
        });
        return  sfRestClient._Options;
    }
    public GetBooleanOption(optionName : string) : boolean {
        return sfRestClient._Options[optionName] as boolean;
    }
    public GetNumericOption(optionName : string) : number {
        return sfRestClient._Options[optionName] as number;
    }

    public GetStringOption(optionName : string) : string {
        return sfRestClient._Options[optionName] as string;
    }

/** Predefined Default Options
 * This object is static and shared by all instances of sfRESTClient
 * 
 */
    protected static _Options : SFRESTClientOptions  = {

        BasicPingServerInterval: 33*1000,
        BlankPageURI: "about:blank",
        CatalogFolderRoot: '6F62DD86-91F1-4B73-98F5-34BDA6BDBA08',
        DVCacheLife:  16 * 60000, // 16 minutes
        LogLevel:  LoggingLevels.None,
        NonPostbackEventID: "DNPB",
        PopDocForceXBUI :  false,
        PopDocLegacyURL:   '{0}/DocDetail.aspx?id={1}',
        PopDocXBURL:  "{0}/wx/#!/document?id={1}",
        PopNewDocLegacyURL:   '{0}/DocDetail.aspx?add={1}&project={2}{3}',
        PopNewDocXBURL:  "{0}/wx/#!/document?add={1}&project={2}{3}",
        PopupWindowLargeCWS: {top: -1, left: -1, width: 1000, height: 750},
        PopupWindowHelpMenuCWS: {top: -1, left: -1, width: 750, height: 700},
        PopupWindowUserSettingsCWS: {top: -1, left: -1, width: 830, height: 750},
        PopupWindowViewUserCWS:{top: -1, left: -1, width: 1000, height: 605},
        PopupWindowTop: 45,
        ProjectLegacyURL: '{0}/ProjectDetail.aspx?id={1}',
        ProjectXBURL: '{0}/wx/#!/main/projectDashboard?project={1}',
        UseClassicCatalog: ((location.host.indexOf(".9") < 0) &&
                             location.host.indexOf(".") > 0 &&
                             location.host !== "scm.spitfirepm.com" &&
                             location.host !== "portal.spitfirepm.com" &&
                             location.host !== "try.spitfirepm.com"),
        SuggestionLimit: 11,
        SuggestionCacheLifespanMs: 246800, // about 4.11 minutes
        TaskStatePollInterval: 999,
        UploadChunkSize: 1048000, // about 1M
        UploadDirectLimit: 8388000, // about 8M (Box uses 20M);
        WxEventTraceMode: -1,
        WxEventFilter: /on(?!MouseM|Destruct)([\w]+)$/gmi,
        WxUseXBGrid: false
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
     * @description consumers of this class should use sfApplicationRootPath
     */
    protected readonly _SiteURL: string;
    /** for example: /sfPMS */
    protected readonly _SiteRootURL: string;

    /** copied to instance vars above */
    private static __SiteURL: string;
    private static __SiteRootURL: string;

    /** returns something like /sfPMS */
    protected static ResolveSiteRootURLs():string {
        if (!sfRestClient.__SiteRootURL)  {
            var ApplicationPath = window.__HTTPApplicationName();
            if (ApplicationPath.toLocaleLowerCase() === "powerux") ApplicationPath = 'sfPMS';
            sfRestClient.__SiteURL = `${window.location.origin}/${ApplicationPath || 'sfPMS'}`;
            sfRestClient.__SiteRootURL = `/${ApplicationPath || 'sfPMS'}`;
        }
        return sfRestClient.__SiteRootURL;
    }

    /**
     *  Returns value from object that matches the field/property name
     */
    FieldValueFromRow(rawRow: any, fieldName: string): any {
        if (!rawRow) return undefined;
        if (!(fieldName in rawRow)) {
            fieldName = fieldName.substring(0, 1).toLowerCase() + fieldName.substring(1);
            if (!(fieldName in rawRow)) return undefined;
        }
        if (`${fieldName}_ov` in rawRow) fieldName = `${fieldName}_ov`;
        return rawRow[fieldName];
    }

    /**
     * Finds a row using a string key match
     * @param rawData array of rows
     * @param keyName required key field name
     * @param keyValue value of key in desired row
     * @returns index of row (0-based); undefined if not found 
     */
    FindRowIndexByKey( rawData: DataModelCollection, keyName: string, keyValue : string) : number | undefined {
        if (!Array.isArray(rawData) || rawData.length === 0) return undefined;
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
            if (!element) element=""
            else if (element.startsWith("=")) result.push(element.substring(1))
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
                        else if (TableName === "DocMasterDetail") {
                            const headerData = this.GetPageDocumentModel()?.DocHeaderData;
                            if (headerData && FieldName in headerData) {
                                SourceResolved = true;
                                result.push(this.FieldValueFromRow(headerData,FieldName));
                            }
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
        this.heartbeat();

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

/** returns INPUT element(s) inside the data-dbf marked element
 *  @param tableDotField something like DocMasterDetail.ContractType (case sensetive)
 * 
*/
    public GetDBFInputElement(tableDotField: string): JQuery<HTMLInputElement> | undefined  {
        const isPowerUX = sfRestClient.IsPowerUXPage();
        let $I: JQuery<HTMLInputElement> | undefined = this.GetDBFElement(tableDotField);
        if (isPowerUX) {
             $I = $I?.find("INPUT") as JQuery<HTMLInputElement>;
        }
        return $I;
    }
    
/** returns the  element  with the data-dbf attribute
 *  @param tableDotField something like DocMasterDetail.ContractType (case sensetive)
 * 
*/
public GetDBFElement(tableDotField: string): JQuery<HTMLInputElement> | undefined {
    const isPowerUX = sfRestClient.IsPowerUXPage();
    let $I: JQuery<HTMLInputElement> | undefined;
    if (isPowerUX) {
         $I = $("DIV[data-dbf='{0}'] ".sfFormat(tableDotField));
    }
    else {
        const classicDocWindow:Window &   {$HdrFrame:JQuery<HTMLIFrameElement>,$BodyFrame:JQuery<HTMLIFrameElement>,$AIRFrame:JQuery<HTMLIFrameElement>} = self as any;
        const searchContexts: Window[] = [classicDocWindow,classicDocWindow.$HdrFrame[0].contentWindow!,
                                                classicDocWindow.$BodyFrame[0].contentWindow!,
                                                classicDocWindow.$AIRFrame[0].contentWindow!];
        searchContexts.filter(sw =>{
            if (typeof sw?.$ === 'function')
                $I = sw.$("INPUT[data-dbf='{0}'], SELECT[data-dbf='{0}'], DIV[data-dbf='{0}'] TABLE.sfUIMiniIgWe INPUT[type='hidden'][name$='_t_a'], DIV[data-dbf='{0}'] ".sfFormat(tableDotField));
            return ($I && $I.length > 0);
        });
    } 
    return $I;
}

/** returns an INPUT element 
 *  @param tableDotField something like DocMasterDetail.ContractType (case sensetive)
 * 
*/
public GetInputValue(inputView:  any): string | number | undefined {
    let result : string | number | undefined = undefined;
    let what: string = 'UNK';
    if (inputView.config) {
        const inputConfig = inputView.config;
        if (inputConfig.dbf) what = inputConfig.dbf;
        if (inputConfig.customGetValue) result = inputConfig.customGetValue()
        else if (inputView.getValue) result = inputView.getValue()
        else {
            console.log(`GetInputValue(${what}) - could not find value `,inputView);
        }

    }
    return result;
}

public SetInputValue(inputView:  any, newValue: string | number | DataModelRow | undefined) {
    let what: string = 'UNK';
    if (inputView.config) {
        const inputConfig = inputView.config;
        if (inputConfig.dbf) what = inputConfig.dbf;
        if (inputConfig.customSetValue)  inputConfig.customSetValue(newValue)
        else if (inputView.getValue) inputView.setValue(newValue)
        else {
            console.log(`SetInputValue(${what}) - could not set value `,inputView);
        }

    }
}

/**
 * 
 * @param withClass "fa-fighter-jet czUIMyBtn" (automatically includes clsEnabledImgBtn and fas)
 * @param withTip tool tip
 * @param $AppendTo default to status cell; use $(0) or false to prevent DOM insertion
 * @param withSRC when specified, use just the image name (delete.gif); when string is passed an <IMG> tag is used instead of <i> and the image them/path is resolved 
 * @returns 
 */
public CreateButtonElement(withClass: undefined | string, withTip:string|undefined, $AppendTo?:JQuery<HTMLElement>, withSRC?:string): JQuery<HTMLElement> {
    
    var BtnType = !withSRC ? "i" : "img";
    if (typeof withClass === "undefined") {
        withClass = "";
        if (!withSRC) withClass = "fa-fighter-jet";
    }
    if (withClass.startsWith("fa")) withClass = "fas " + withClass;
    if (typeof withTip === "undefined") withTip = "";
    if (typeof $AppendTo === "undefined") $AppendTo = this.GetDBFInputElement("DocMasterDetail.status")?.closest("TD");
    var ButtonTemplate = `<${BtnType} class='${withClass} clsEnabledImgBtn clsDynamicBtn' title='${withTip}'></${BtnType}>`;
    let $BTN = $(ButtonTemplate);
    if (withSRC) {
        console.warn("CreateButtonElement does not yet support IMG src")
        // ResolveThemeIconImgSrc(withSRC).done(function IMGSrcReady(r) {
        //     $BTN.attr("src", r);
        // });
    }

    if ($AppendTo) $AppendTo.append($BTN);
    return $BTN;
}

    /**
     * Returns named value from Web Context (WCC)
     *
     * Example: GetPageContext("UserKey");
     *
     * @param key name of a context property
     * @param defaultValue returned if the requested value is not available
     * @param silentDefault when true, suppresses console warning about use of default value
     */
    public GetPageContextValue( key : string, defaultValue? : any, silentDefault?: boolean) : any {
        if (key in sfRestClient._WCC) {
            return sfRestClient._WCC[key];
        }
        console.warn("GetPageContext() no value known for key",key);
        return defaultValue;
    }

      /**
     * Returns named value from Web Context (WCC)
     *
     * Example: SetPageContext("UserKey");
     *
     * @param key name of a context property
     */
    public SetPageContextValue( key : string, newValue? : any) : void {
            sfRestClient._WCC[key] = newValue;
    }

    /** returns a references to the WX page document model, including the data and state */
    public GetPageDocumentModel() : iDocumentModel | undefined {
        let UI = this.GetPowerUXDocumentUI();
        if (!UI) return  undefined;
        return UI.documentModel as iDocumentModel;
    }
    /** returns a references to the page document UI, including header */
    public GetPowerUXDocumentUI() : iPowerUXDocumentUI | undefined {
            if (typeof self.$$ !== "function") return undefined;
            let header = self.$$("spitfireDocumentHeader") as iWebixObjectSkeleton;
            if (!header || !header.$scope) return undefined;
            return header.$scope  as iPowerUXDocumentUI;
        }

    public isWebix(): boolean {
        return typeof self.$$ === "function";
    }

    /** requires isWebix() to be true */
    public GetPowerUXRouteHelper():iRouteHelperService {
        const view_id = $("div[view_id]").first().attr("view_id") as string;
        return self.$$(view_id).$scope.app._services.routetools
    }

    public IsDocExclusiveToMe() : boolean {
        return ((!this.IsDocumentPage()) || (sfRestClient._WCC?.DataLockFlag >= "2"
            || this.GetPageDocumentModel()?.getExclusivityMode() == 2
        ));
    }

    public static IsPowerUXPage() : boolean {
        return location.hash.startsWith("#!") || location.pathname === "/wx/";
    }
    public IsPowerUXPage() : boolean {
        return sfRestClient.IsPowerUXPage();
    }

    public IsHomeDashboardPage() : boolean {
        const result = this.IsPageOfType(this.PageTypeNames.HomeDashboard) ;
        if (result && top && !(top?.name) ) { 
            const forUID =  this.GetPageQueryParameterByName("uid");
            top.name = forUID ? forUID : "Dashboard"; 
            console.log(`IsHomeDashboardPage() - Asserting window name == ${top.name}`);
        } 
        return result;
    }
    public IsCatalogPage() : boolean {
        return this.IsPageOfType(this.PageTypeNames.Catalog) ;
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
        const pageType = this.ResolvePageTypeName();
        let result = (pageType === pageWanted);
        if (!result && pageWanted ===  this.PageTypeNames.Unauthenticated) result = (( this.ResolvePageTypeName() & pageWanted) === pageWanted);
        return result;
    }

    protected IsGlobalInstance() : boolean {
        return (window.sfClient && window.sfClient === this );
    }

    public ResolvePageTypeName() : PageTypeName {
        const locationHash = location.href.sfHashCode();
        if (sfRestClient.ResolvedPageInfo.isHashMatch(locationHash)) return sfRestClient.ResolvedPageInfo.LastResolvedPageTypeName;
        const pgName = this.ResolvePageName();
        const result = this.ResolveStringPageNametoPageTypeName(pgName);
        sfRestClient.ResolvedPageInfo.setInfo(locationHash,pgName,result);
        return result;
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
            case "users": case "contacts":
                result = this.PageTypeNames.Contacts;
                break;
            case "libview": case "LibView": case "catalog":
                result = this.PageTypeNames.Catalog;
                break;
            case "cusysm": case "system-admin":
                result = this.PageTypeNames.AdminDashboard;
                break;
            case "cuManager":
                result = this.PageTypeNames.ManageDashboard;
                break;
            case "login": case "Logout": case "loginRequired":  
                result = this.PageTypeNames.UnauthenticatedLogin;
                break;
            case "arr":
            case "sscontent":
                    result = this.PageTypeNames.UnauthenticatedWizard;
                break;
            case "go":
                result = this.PageTypeNames.UnauthenticatedLink;
                break; 

            case "dxutil": case "diagnostic-tools":
                result = this.PageTypeNames.DiagUtilities;
                break;
            case "SSPWR":
                result = this.PageTypeNames.UserAccountRecovery;
                break;
            case "PLVP":
                result = this.PageTypeNames.PopupAdminTool;
                break;
            case "PUP":
            case "PVP":
            case "pup":
            case "pvp":
                result = this.PageTypeNames.PopupUserTool;
                break;
            case "sfReportViewer":
                result = this.PageTypeNames.Report;
                break;
            case 'ExecutiveInfo':      case 'executive':           case 'executiveClassic': case 'executiveDashboard':                     
            case 'project-summary':                    case 'projects-summary':
                result = this.PageTypeNames.ExecutiveDashboard;
                break;
            case 'pivot':
                    result = this.PageTypeNames.PivotTool;
                   break;
           case "popTinymce5": case "popEdit":
                    result = this.PageTypeNames.RichTextEdit;
                    break;

            case "default":
                result = this.PageTypeNames.UnauthenticatedDefault;
                break;

            default:
                if (pageNameString) console.warn("Unrecognized page type: ", pageNameString);
                //debugger;
                result = this.PageTypeNames.Unknown;
                break;
        }
        return result;
    }

    /** uses browser location object to resolve page name */
    protected ResolvePageName() : string {
        const topLocation = top!.location;
        return this.ResolvePageNameFromURL(topLocation.href);
    }

    /** uses URL to find path and query hash 
     * @argument fromHref must be fully qualified
    */
    protected ResolvePageNameFromURL(fromHref: string) : string {
        const locationHash = fromHref.sfHashCode();
        if (sfRestClient.ResolvedPageInfo.isHashMatch(locationHash)) return sfRestClient.ResolvedPageInfo.LastResolvedPageName;
        const prefixLength = sfRestClient.__SiteRootURL.length + self.location.hostname.length + 1
        const hashPos  =  fromHref.indexOf("#");

        let pgname : string = fromHref.substring(prefixLength,hashPos);
        let pgHash : string = fromHref.substring( hashPos);
        if (pgHash.length > 0)            pgname = pgHash; // for xb style
        if (pgname.includes("ReturnUrl")) pgname = this.SetNameValuePairInString(pgname,"ReturnUrl","1");
        if (pgname.endsWith("pvp.aspx"))  pgname = this.GetPageQueryParameterByName("vpg");
        const lowerPG = pgname.toLowerCase()
        if (lowerPG.includes("arr.aspx",)) pgname = "arr";// maps to RouteWizard
        else if (lowerPG.includes("sscontent.aspx",)) pgname = "sscontent"; // maps to RouteWizard
        else if (lowerPG.includes("go.aspx",)) pgname = "go"; // external
        if (pgname.indexOf("/") >= 0) pgname = pgname.substring(pgname.lastIndexOf("/") + 1)
        if (pgname.indexOf("?") >= 0) pgname = pgname.substring(0,pgname.indexOf("?") )
        if (pgname.indexOf(".") >= 0) pgname = pgname.substring(0,pgname.indexOf(".") );

        sfRestClient.ResolvedPageInfo.setInfo(locationHash,pgname, this.ResolveStringPageNametoPageTypeName(pgname));
        if (this.DevMode(LoggingLevels.Verbose)) console.log(`ResolvePageName(${fromHref},${locationHash} ) --> ${pgname}`);
        return pgname;
    }


   // private static NextHref:string|undefined;
    private static NextHrefIsPending:boolean;
    private static NextHrefIsUnauthenticated:boolean;

    /** asserts a new url to resolve the new page type.  Stays in effect until the location hash next changes */
    public urlChange(newURL:string,newHref:string) {
        this.heartbeat();
        let urlWas = location.href;
        const newPageName = this.ResolvePageNameFromURL(newURL);
        // do not set validHash - but reset the pagetype and pagename
        sfRestClient.ResolvedPageInfo.setInfo(0,newPageName,this.ResolveStringPageNametoPageTypeName(newPageName));
        let newLocationHash = newHref.sfHashCode();
        if (this.DevMode(LoggingLevels.Verbose)) console.log(`sfClient.urlChange(${newURL} ) --> ${sfRestClient.ResolvedPageInfo.LastResolvedPageTypeName}`);
        // too soon to do a fresh this.LoadUserSessionInfo(true); (URL context is still wrong)
        if (location.href === newHref) urlWas = "";
        else {
            sfRestClient.NextHrefIsPending  = true;
            sfRestClient.NextHrefIsUnauthenticated  = newHref.includes("login");
        };
        // tried jan 2024 - some pages do not rebuild x< else location.href = newHref;  >x
        const expireNextHref = (depth:number) => {
            if (depth < 19 && urlWas === location.href) {
                console.log(`urlChange ${depth} pending from ${urlWas.replaceAll(this._SiteURL,"~" )} to ${newHref.replaceAll(this._SiteURL,"~" )}, current ${location.href.replaceAll(this._SiteURL,"~" )}`);
                setTimeout(()=>{ expireNextHref(depth+1); },222);        
                return;
            }
            sfRestClient.NextHrefIsPending  = false;
            sfRestClient.NextHrefIsUnauthenticated  = false;
        }
        expireNextHref(0); 
        this.LoadUserSessionInfo(true, newHref); 
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
                console.warn("No XB varient for page type: ", classicPageName);
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

    /** finds value of name= in location.search (or location.hash) */
    public GetPageQueryParameterByName(name:string):string {
        name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
        var QPSource = this.GetPageQueryContent();
        return this.GetQueryParameterValueByName(QPSource,name);
    }

    /** finds value of name= in the supplied string
     * @argument source the string to be searched for name; delimited by ampersand or #
     * @argument name the id of the value wanted
     * @see GetPageQueryParameterByName() calls this method with location.search (or location.hash)
    */
    public GetQueryParameterValueByName(source: string, name:string):string {
        name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");

        var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
            results = regex.exec(source);
        return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
    }

    /** Returns the search or hash portion of the page location */
    public GetPageQueryContent(fromHref?:string):string {
        var QPSource = "";
        if (!fromHref) {
            QPSource = location.search;
            if (!QPSource) QPSource = location.hash;
        } 
        else {
            QPSource = fromHref.substring(location.href.indexOf("#"));
            if (!QPSource && fromHref.includes("?")) QPSource = fromHref.substring(location.href.indexOf("?"));
        }
        
        return QPSource;
    }

    /** returns the primary key for this page  */
    public GetPagePK(): string {
        let result = "";
        let noResultOK = false;
        if (this.IsDocumentPage()) {
            result = sfRestClient._WCC.DataPK;
            if (result === this.EmptyKey) result = this.GetPageDocumentModel()?._DMK;
        }
        else if (this.IsHomeDashboardPage()) {
            result = this.GetPageQueryParameterByName("u");
            if (!result) result = sfRestClient._WCC.UserKey;
        }
        else if (this.IsProjectPage()) 
            result = sfRestClient._WCC.Project;
        else {
                const pageName = this.ResolvePageName();
                if (["executiveDashboard","catalog","contacts","home","pivot","diagnostic-tools","go","pup"].find(el=>el=== pageName) ) noResultOK = true;
            }
        if (!result && !noResultOK) console.warn(`GetPagePK could not resolve key for [${this.ResolvePageName()}]`);
        return result;
    }

    public GetPageProjectKey(pageTypeName?: PageTypeName) :string {
        var Context = location.href;
        if (typeof pageTypeName ==="undefined") pageTypeName = this.PageTypeNames.Unknown;
        if (pageTypeName == this.PageTypeNames.Document || this.IsDocumentPage()) {
            //console.warn("GetPageProjectKey() does not *really* support doc pages yet");
            Context = sfRestClient._WCC.Project;
        }
        else {
            Context = this.GetPageQueryParameterByName(sfRestClient.IsPowerUXPage() ? "project" : "id");
            var PageTypeName : string = this.ResolvePageName();
            if (!Context && this.DevMode() && (!this.IsHomeDashboardPage && PageTypeName !== "Catalog")) console.log("GetPageProjectKey() could not resolve project key for page ",PageTypeName);
        }
        return Context;
    }

    /** display support panel */
    public InvokeSupportPanel() : void {
        this.heartbeat();

        var RESTClient = this;
        if (!top) this.DisplayUserNotification("Missing Window Context...");
        
        var $DVI : JQuery<HTMLDivElement> = self.$("<div class='sfUIShowDevInfo'  style='font-size:0.9em'/>");
        $DVI.html("Loading....");
        //width: window.top.$(window.top).width() * 0.88
        $DVI.dialog({
            title: 'WCC Info', height: "auto", width: "auto", position: "bottom of window"
            , show: { effect: "blind", duration: 100 }
        });

        var $tbl = self.$("<ul class='WCCList' />");
        var sortPad = "";
        self.$.each(sfRestClient._WCC, function (index:string, rItemRaw:number | string | boolean) {
            var isJS = false;
            var isGuid = false;
            var isSkipped = false;
            var rItem : string;
            if  (typeof rItemRaw === "string") {
                isJS = rItemRaw.startsWith("javascript:");
                isGuid = rItemRaw.length === 36;
                rItem = rItemRaw;
            }
            else if (typeof rItemRaw === "boolean")  rItem = <boolean>rItemRaw ? "true" : "false";
            else if (typeof rItemRaw === "number")  rItem = `${rItemRaw}`;
            else rItem = `Unexpected ${typeof rItemRaw}`;
            sortPad = ((isGuid || (index.endsWith("ID")) || isJS) ? "" : " ");
            if (isJS) {
                rItem = `<i class="fas fa-boxes sfShowPointer" data-js="${rItem.substring(11)}"></i>`;
            }
            else if (isGuid && rItem !== RESTClient.EmptyKey ) {
                rItem = `${rItem} &nbsp;<i class="far fa-clipboard clsEnabledImgBtn" title="Copy" data-text="${rItem}"></i>`;
            }
            else if (index === "Likeness") isSkipped = true;
            if (!isSkipped) $tbl.append("<li>" + sortPad + `${index} = ${rItem}</li>`); // avoid trim of sortPad
        });
        //$tbl.append(`<li><i class="fas fa-pump-soap  clsEnabledImgBtn" title="Clear cache (safe)"></i>Clear local cache</li>`);
        RESTClient.AddDialogTitleButton($DVI,"btnDeleteLocalDB","Discard Local Configuration","ui-icon-trash").on("click",function() {
            var $A = RESTClient.jqAlert("Warning!  This blows away all user settings, including grid columns, home dashboard layout, etc)!","Discard User Settings");
            var DialogButtons = [];
            DialogButtons.push(
                {
                    text: "Discard",
                    "id": "btnOK",
                    click: function () {
                        RESTClient.QAClearEnvironment();
                        self.$(this).dialog("close");
                    }
                });
            DialogButtons.push(
                {
                    text: "Cancel",
                    "id": "btnIgnore",
                    click: function () {
                        self.$(this).dialog("close");
                    }
                });
            $A.dialog('option', 'buttons', DialogButtons);
        });
        RESTClient.AddDialogTitleButton($DVI,"btnClearLocalCache","Clear Cache","ui-icon-arrowrefresh-1-n").on("click",()=>{
            this.ClearCache(true);
            this.DisplayUserNotification("Cache has been cleared",4321);
        });

        var SortedList = (<any>($tbl.find("li"))).sort(function (a:any, b:any) { return (self.$(b).text().toUpperCase()) < (self.$(a).text().toUpperCase()) ? 1 : -1; });
        $tbl.html("").append(SortedList);
        //$tbl.append(`<li><i class="fas fa-dumpster-fire clsEnabledImgBtn" title="Warning!"></i> Discard all settings</li>`);
        $DVI.html("");

        $tbl.appendTo($DVI);
        $tbl.find("i.fa-clipboard").on("click",(event)=>{
            var $btn = self.$(event.currentTarget);
            var text = $btn.data('text');
            if (text.length > 0)  RESTClient.SetClipboard(text);
        });
        // $tbl.find("i.fa-pump-soap").on("click",(event)=>{
        //     this.ClearCache(true);
        //     this.DisplayUserNotification("Cache has been cleared");
        // });


        $tbl.find("i.fa-boxes").on("click",function (event) {
            var js = self.$(event.currentTarget).data("js")
            if (!js) return;
            eval(js); // see                ShowPageResourceString
        });
    }

    /** sets the OS clipboard 
     * @description navigator.clipboard only works for https and localhost
    */
    async SetClipboard(text:string): Promise<boolean> {
        this.heartbeat();

        const clipPromise = new Promise<boolean>(resolved=>{
            if (navigator.clipboard) {
                const nativePromise =  navigator.clipboard.writeText(text);
                nativePromise
                    .then(()=>{
                        resolved(true);
                    })
                    .catch(()=>{
                        resolved(false);
                    });
            }
            else {
                var textArea = document.createElement("textarea");
                var result = false;
                textArea.value = text;
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
        
                try {
                    var successful = document.execCommand('copy');
                    result = successful;
                } catch (err) {
                    console.error('Fallback: Oops, unable to copy', err);
                }
        
                document.body.removeChild(textArea);
        
                resolved(result);   
            }
    
        });
        return clipPromise;
    }

    /**
     * Parses and performs an action
     * @param actionString often in the form javascript:something(args)
     * @param rowData optional collection of data
     * @param options InvokeOptions including targetWindow. targetWindow of H is replaced with hash of action
     *
     * Actions Supported
     * - vPgPopup(...)
     * - PopDoc(...) and PopNewDoc
     * - PopTXHistory(...) and PopBFAHistory()
     * - Nav To (dcmodules and admin tools)
     */
    public InvokeAction(actionString: string | _SwaggerClientExports.MenuAction, rowData? : DataModelRow, options? : InvokeOptions ) : void {
        this.heartbeat();

        var ActionString : string = "";
        var UseNewTabWithName : string = "";
        var RESTClient = this;
        if (typeof actionString === "string") ActionString = actionString;
        if ( actionString instanceof _SwaggerClientExports.MenuAction ) {
            if (actionString.HRef)         ActionString = actionString.HRef;
        }
        if (!ActionString) {
            if (sfRestClient._Options.LogLevel >= LoggingLevels.Verbose) console.warn("InvokeAction ignoring empty action");
            return;
        }
        if (!sfRestClient.ExternalToolsLoadedPromise) sfRestClient.ExternalToolsLoadedPromise = new Promise<boolean>(r=>{r(false);});
        if (ActionString.sfStartsWithCI(this._SiteURL) || ActionString.sfStartsWithCI(this._SiteRootURL)) {

            const actionHasQueryParameters = ActionString.includes("?");
            if (actionHasQueryParameters && ActionString.includes("#") ) ActionString += "?fq=1"; //fake query parameter
            if (actionHasQueryParameters  && !ActionString.includes("xbia") && sfRestClient.IsPowerUXPage()) {
                let classicInvokeActionType = "1"; // a popup inside a webix page
                ActionString += `&xbia=${classicInvokeActionType}`;
            }
            if (ActionString.includes("libview.aspx") ) {
                var ActionOptions : string = "";
                if (actionHasQueryParameters ) {
                    ActionOptions = "&"+  ActionString.substring(ActionString.indexOf("?")+1);
                }
                ActionString = `javascript:vPgPopup('v/LibView.aspx', '${ActionOptions}', 850, 950);`; // ... w,h
                UseNewTabWithName = `LibView@${RESTClient.GetQueryParameterValueByName(ActionOptions,"set")}`;
            }
            else if (/.*?(cusysm|cuManager|ExecutiveInfo).aspx/gmi.exec(ActionString)) {
                //ActionString = ActionString.replaceAll("xbia=1","xbia=2");
                UseNewTabWithName = ActionString.indexOf("cusysm.aspx") > 0 ? "SysAdmin" : "ManageTools";
            }
            else if (ActionString.includes("sfReportViewer.aspx")) {
                UseNewTabWithName = `RV${ActionString.sfHashCode()}`
            }
            else if (options?.targetWindow === "H") {
                UseNewTabWithName  = `W${ActionString.sfHashCode()}`;
            }
            else {
                if (sfRestClient._Options.LogLevel >= LoggingLevels.Verbose) console.log("InvokeAction(modal): ",ActionString);
                this.ModalDialog(ActionString, undefined, undefined, window);
                return;
            }
            if (UseNewTabWithName) ActionString = ActionString.replaceAll("xbia=1","xbia=2");
        }
        let matchVPgName : RegExpExecArray | null = null;
        let matchPopWhat : RegExpExecArray | null = null;
        let matchPopWhatVPG: RegExpExecArray | null = null;
        let matchPopOffice : RegExpExecArray | null = null;
        let matchPopWhatURL : RegExpExecArray | null = null;
        let matchPopWindowName : RegExpExecArray | null = null;
        if (sfRestClient._Options.LogLevel >= LoggingLevels.Verbose) console.log("InvokeAction: ",ActionString);

        this.rxIsVPgPop.lastIndex = 0; // reset global search to start of string 
        matchVPgName = this.rxIsVPgPop.exec(ActionString); // vpgName, args, width, height
        if (!matchVPgName) {
            this.rxOfficeLink.lastIndex = 0;
            this.rxPopWhat.lastIndex = 0;
            this.rxPopWhatURL.lastIndex = 0;
            this.rxPopWindowName.lastIndex = 0;
            this.rxPopWhatVPG.lastIndex = 0;
            matchPopOffice =  this.rxOfficeLink.exec(ActionString);
            matchPopWhat =  this.rxPopWhat.exec(ActionString);
            matchPopWhatURL = this.rxPopWhatURL.exec(ActionString);
            if (matchPopWhatURL) {
                matchPopWindowName = this.rxPopWindowName.exec(ActionString);
                if (matchPopWindowName && matchPopWindowName.groups){
                    UseNewTabWithName = matchPopWindowName.groups.WindowName;
                    ActionString = matchPopWindowName.groups.URL;
                }
            }
        }
        
        if (matchVPgName) {
            if ( matchVPgName.groups) {
                if (sfRestClient._Options.LogLevel >= LoggingLevels.Verbose) console.log(`InvokeAction::VPg(${matchVPgName.groups!.vpgName}) ${matchVPgName.groups.args} w${matchVPgName.groups.width},h${matchVPgName.groups.height}`);
                var ActionArgs : string = this.ExpandActionMarkers(matchVPgName.groups.args,rowData);
                if (ActionArgs) {
                    if (!ActionArgs.includes("&Project")) ActionArgs += "&Project="+ this.GetPageProjectKey();
                    if (ActionArgs.includes("&ds=PDSID") ) ActionArgs = ActionArgs.replaceAll("&ds=PDSID",`&ds=${this.GetActionMarkerReplacement("Pdskey")}`);
                }  
                
                if (UseNewTabWithName) {
                    var url = `${RESTClient._SiteRootURL}/pvp.aspx?vpg=${matchVPgName.groups!.vpgName}${ActionArgs}`;

                    self.open(url,UseNewTabWithName);
                }
                else
                this.VModalPage(matchVPgName.groups!.vpgName,ActionArgs,parseInt(matchVPgName.groups.width),parseInt(matchVPgName.groups.height),matchVPgName.groups.default);
            }
            else {
                console.warn("InvokeAction::VPg failed match",ActionString);
            }
        }
        else if (matchPopOffice && matchPopOffice.groups) {
            // Office and OS Links
            // ??? do we need autocloseDoc or afterOpenArg
            let popWhat = matchPopOffice.groups.popWhat;
            let targetURL = ActionString;
            if (popWhat === "PopFVC(") {
                var rx = /javascript:PopFVC\(['"`](?<URL>.*)[`'"],['"`](?<fileKey>.*)[`'"],['"`](?<idname>.*)[`'"],['"`](?<command>.*)[`'"]/gm;
                let matchFVC = rx.exec(ActionString);
                if (matchFVC && matchFVC.groups) {
                    targetURL = `${this._SiteRootURL}/cabs/FileVersion.application?key=${matchFVC.groups.fileKey}&id=${matchFVC.groups.idname}&cmd=${matchFVC.groups.command}`;
                }
                else console.warn("InvokeAction() could not parse PopFVC() ",actionString)
                }
        
            else if (popWhat === "OfficeLink.application") {
                    console.log(popWhat);
                }
            else {
                    var rx = /javascript:(PopMSWindowTool|PopXLTool|PopAuditTool)\(['"`](?<URL>.*)[`'"]\)/gm;
                    var matchMSLinkTool = rx.exec(ActionString);
                    if (matchMSLinkTool && matchMSLinkTool.groups) {
                        targetURL = this.ExpandActionMarkers(matchMSLinkTool.groups.URL,rowData);
                    }
                    else console.warn("InvokeAction() could not parse",actionString);
                }

            this.FollowLinkViaSFLink(targetURL,false);
            return;
        }
        else if (UseNewTabWithName) {
            self.open(ActionString,UseNewTabWithName);
        }
        else if (ActionString.indexOf("top.location.reload(") >= 0) {
            top!.location.reload(); // per https://developer.mozilla.org/en-US/docs/Web/API/Location/reload including (true) or (false) is ignored.
        }
        else if (ActionString.indexOf("PopDoc(") >= 0) {
            var rxPopDoc = /(javascript:)?(top.sfClient)?PopDoc\(['"](?<idguid>[0-9a-fA-F\-]{36})['"]/gm;
            let match = rxPopDoc.exec(ActionString);
            if (match && match.groups) {
                if (sfRestClient._Options.LogLevel >= LoggingLevels.Verbose) console.log("InvokeAction::Doc({0}})".sfFormat(match.groups!.idguid ));
                this.PopDoc( match.groups.idguid );
            }
            else {
                console.warn("InvokeAction::Doc failed match",actionString);
            }
        }
        else if (ActionString.indexOf("PopNewDoc(") >= 0) {
            //let rxPopDoc = /(javascript:)?(top.sfClient)?PopDoc\(['"](?<idguid>[0-9a-fA-F\-]{36})['"]/gm;
            //let match = this.rxPopWhatURL.exec(ActionString);
            if (matchPopWhatURL && matchPopWhatURL.groups) {
                let dtk: GUID | undefined = undefined;
                let Project:string | undefined= undefined;
                if (matchPopWhatURL.groups.URL) dtk = matchPopWhatURL.groups.URL;
                if (matchPopWhatURL.groups.OPTIONS) {
                    let rxProjectFromOptions = /^(?<projID>\w*)&/gmi;
                    let ProjectMatch = rxProjectFromOptions.exec(matchPopWhatURL.groups.OPTIONS);
                    if (ProjectMatch && ProjectMatch.groups?.projID) Project = ProjectMatch.groups?.projID;
                }
                else {
                    Project = this.GetPageProjectKey();
                }
                if (sfRestClient._Options.LogLevel >= LoggingLevels.Verbose) console.log(`InvokeAction::PopNewDoc(${dtk},${Project},...)`);
                this.PopNewDoc(dtk!, Project!,matchPopWhatURL.groups.OPTIONS);
            }
            else {
                console.warn("InvokeAction::PopNewDoc failed match",actionString);
            }
        }
        else if (matchPopWhat && matchPopWhat.groups) {
            //console.warn("InvokeAction::TXH not really done",ActionString);
            var rx : RegExp;
            var vpgName : string;
            let popWhat = matchPopWhat.groups.popWhat;

            var Project = this.GetPageProjectKey();
            var Task:string = "%",Acct : string = "%", Period:string="%";
            var BFAMode : boolean = false;
            var mode : string = "";
            var PageDSK : string = "";
            let width = 987; 
            let height = 444;
            if (!options) options = {ByTask: true, ByAcct: true};
            if ( popWhat === "PopBFAHistory")   {
                rx = /PopBFAHistory\(['"](?<PGDSK>.*?)['"],\s*?(?<project>.*?),\s*?(?<task>.*?),\s*?(?<acct>.*?),['"](?<mode>.*?)['"]\s*?\)/gm;
                vpgName = "BFANotes";
                BFAMode = true;
            }
            else if (popWhat === "GetOptionsViaPopup") {
                matchPopWhatVPG = this.rxPopWhatVPG.exec(ActionString);
                vpgName = matchPopWhatVPG?.groups?.vpg as string;
                 rx = /ds=(?<pdsid>\w*['"],(?<width>\d*),(?<height>\d*))/gm;
            }
            else if (popWhat.sfStartsWithCI("sf") &&  popWhat.substring(2) in RESTClient) {
                const ff:Function  = (RESTClient as unknown as {[key:string]: Function})[popWhat.substring(2)] as unknown as Function;
                ff.call(RESTClient);   
                return;
            }
            else {
                // this rx does not remove quotes from period
                let rxString = `${popWhat}\(\\?['"](?<pgname>.*?)\\?['"],\s*?(?<task>.*?),\s*?(?<acct>.*?) (,\s*?(?<period>.*?)|\));`
                rx = new RegExp(rxString,"gm"); 
                //rx =  /PopTXHistory\(\\?['"](?<pgname>.*?)\\?['"],\s*?(?<task>.*?),\s*?(?<acct>.*?) (,\s*?(?<period>.*?)|\));/gm;
                vpgName = popWhat === "PopCommitDetail" ? "CommitDetail" :  "TranHistory";
            }
            let matchCall = rx.exec(ActionString);
            if (matchCall && matchCall.groups) {
                // we ignore the task and account in the invoice action string - see InvokeOptions
                if (matchCall.groups.project) Project = matchCall.groups.project;
                if (matchCall.groups.mode) mode = matchCall.groups.mode;
                if (matchCall.groups.PGDSK) PageDSK = matchCall.groups.PGDSK;
                if (matchCall.groups.period) Period = matchCall.groups.period;
                if (matchCall.groups.pdsid) PageDSK = this.GetPageDataContext();
                if (matchCall.groups.width && this.IsNumber(matchCall.groups.width)) width = Number.parseInt(matchCall.groups.width);
                if (matchCall.groups.height && this.IsNumber(matchCall.groups.height)) height = Number.parseInt(matchCall.groups.height);
            }
            var ModalOptions : string;
            if (options && options.ByTask && rowData && rowData["task"]) Task = rowData["task"];
            if (options && options.ByAcct && rowData && rowData["acct"]) Acct = rowData["acct"];
            if (BFAMode) {
                ModalOptions = `&project=${Project}&ds=1&task=${Task}&acct=${Acct}&period=${Period}`
            }
            else {
                ModalOptions = `&project=${Project}&task=${Task}&acct=${Acct}&period=%`
            }
            if (PageDSK) ModalOptions = `${ModalOptions}&ds=${PageDSK}`;
            if (options.wxpPopup) ModalOptions = `${ModalOptions}&wxp=${options.wxpPopup}`;
            // sample action: javascript:PopTXHistory(\"TranHistory\", ifByTask() ? Row.task.trim() : \"%\", ifByAcct() ? Row.acct.trim() :\"%\" );
            // sample javascript:PopBFAHistory('$$PDSID$$',row.Project, ifByTask() ? Row.task.trim() : \"%\", ifByAcct() ? Row.acct.trim() :\"%\" ,'PA');
            // sample http://stany2017/SFPMS/pvp.aspx?vpg=TranHistory&project=GC003&ds=1f573cce-ddd8-4463-a6a6-40c641357f47_ProjectCA_dsData&task=01000&acct=%25&period=%
           
            if (sfRestClient._Options.LogLevel >= LoggingLevels.Normal) console.log(`InvokeAction: VModalPage(${vpgName})`,ModalOptions);
            this.VModalPage(vpgName,ModalOptions,width,height,undefined);
        }
        else if (ActionString.indexOf("/dcmodules/") >= 0  || ActionString.indexOf("/admin/") >= 0 ) {
            console.warn("InvokeAction::tools not really done",ActionString);
            top!.location.href = ActionString;
        }
       
        else if (ActionString.startsWith("javascript:sfExportCompetitiveBidData")) {
            this.ExportCompetitiveBidData();
        }

        else if (ActionString.startsWith("javascript:")) {
            try {
                eval(ActionString.substring(11));
            }
            catch (ex:any) {
                console.warn("InvokeAction::failed javascript ",ActionString, ex.message);
                this.DisplayUserNotification("Coming soon: failed to invoke requested action.",9999);
            }

        }
        else if (ActionString.startsWith("http")) {
            if (options?.targetWindow === "H") options.targetWindow = `T${ActionString.sfHashCode()}`;
            window.open(ActionString, options?.targetWindow);
        }
        else {
            this.DisplayUserNotification("Coming soon: could not invoke requested action.",9999);
            console.warn("InvokeAction() could not handle ",actionString);
        }
    }

    private rxIsVPgPop =  new RegExp(/vPg(Popup|Dialog)\(\s*['"](?<vpgName>[\w\/\.]+)['"]\s*,\s*(?<argslit>['"])(?<args>.*)['"]\s*,\s*(?<width>\d+)\s*,\s*(?<height>(\d+|null|undefined))(,\s*(?<default>.+)|)\)/gm);
    private rxPopWhat = new RegExp(/javascript:(?<popWhat>\w*)\(/gm);
    private rxPopWhatURL = new RegExp(/javascript:(?<popWhat>PopMSWindowTool|PopXLTool|PopAuditTool|popWin|popNewDoc)\(['"`](?<URL>.+?)[`'"](,|\))(['"`](?<TARGET>.+?)[`'"](,|\)))?(['"`](?<OPTIONS>.+?)[`'"](,|\)))?/gmi);
    private rxPopWindowName = new RegExp(/javascript:(?<popWhat>popWin)\(['"`](?<URL>.+?)[`'"],\s?['"`](?<WindowName>.+?)[`'"],.*\)/gmi);
    private rxOfficeLink = new RegExp(/(?<popWhat>OfficeLink.application|(PopXLTool|PopFVC|PopMSWindowTool|PopAuditTool)\()/gmi);
    private rxPopWhatVPG = new RegExp(/javascript:(?<popWhat>\w*)(\(['"](?<vpg>\w+){0,1}['"])/gm);

    /** @returns true if this is a Microsoft Windows OS device */
    public IsWindowsOS(): boolean {
        return BrowserExtensionChecker.browser.isWindowsOS;
    }

    /** @returns true if this is browser can open .Application links  */
    public HasDotNetApplicationExtension(): boolean {
        if (!top?.ClickOnceExtension) top!.ClickOnceExtension = new BrowserExtensionChecker();
        return top?.ClickOnceExtension.HasDotNetApplicationExtension()!;
    }

    /** Creates an exchange token and calls OpenWindowsLinkHelper() */
    public FollowLinkViaSFLink(targetURL: string, afterOpenArg? : boolean | string | [string,string] | Function, autoCloseDoc?:boolean) : void {
        this.heartbeat();

        var RESTClient = this;
        if (targetURL.endsWith("&Project=")) targetURL += RESTClient.GetPageProjectKey();
        console.log(`sfLink(${targetURL})`);
        if (targetURL.indexOf("$$") > 0) targetURL = this.ExpandActionMarkers(targetURL);
        if (self !== top) {
            var RetryLater = `top.sfClient.FollowLinkViaSFLink('${targetURL}'`;
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
                        RESTClient.InvokeAction(BrowserExtensionChecker.SuggestedExtensionLink());
                        self.$(this).dialog("close");
                    }
                });
            DialogButtons.push(
                {
                    text: "No Extension",
                    "id": "btnIgnore",
                    click: function () {
                        top?.ClickOnceExtension.IgnoreMissingExtension();
                        self.$(this).dialog("close");
                        let msg = "Please try your original action again and we will continue without an extension. ";
                        
                        if (BrowserExtensionChecker.browser.isEdge) msg += " When prompted, click <b>Open</b> for sfLink.application!"
                        else msg+= " If you see a prompt to keep or open sfLink.application, click to proceed!";
                        RESTClient.jqAlert(msg, ".Application Links");
                        return;
                    }
                });
            let m = 'Using a ClickOnce Helper Extension is recommended; click the Install button to add one. ';
             m +='<br/><br/>Otherwise, if you cannot install an extension, use the No Extension button. '; 
            var $A = RESTClient.jqAlert(m,
                             ".Application Link Helper Recommended");
            $A.dialog('option', 'buttons', DialogButtons);
            return;
        }
        if (sfRestClient._Options.LogLevel >= LoggingLevels.Verbose) console.log("FollowLinkViaSFLink() xt for: " + targetURL);

        var api =  new SessionClient(RESTClient._SiteURL);
        var tokeArgs = new _SwaggerClientExports.TokenRequest();
        tokeArgs.Args = targetURL;
        tokeArgs.UserKey = RESTClient.GetPageContextValue("UserKey");
        tokeArgs.LoginSessionKey = RESTClient.GetPageContextValue("LoginSessionKey");
        tokeArgs.DataLockFlag = RESTClient.GetPageContextValue("DataLockFlag",undefined,true);
        tokeArgs.DataPK = RESTClient.GetPageContextValue("DataPK");
        tokeArgs.DocSessionKey = RESTClient.GetPageContextValue("DocSessionKey");
        tokeArgs.dsCacheKey = RESTClient.GetPageContextValue("dsCacheKey");
        tokeArgs.SiteID = RESTClient.GetPageContextValue("SiteID");
        tokeArgs.PageName = RESTClient.GetPageContextValue("PageName");
        tokeArgs.PartName = RESTClient.GetPageContextValue("PartName",undefined,true);
        tokeArgs.TZOffset = RESTClient.GetPageContextValue("TZOffset",undefined,true);
        RESTClient.DisplayUserNotification("Working...",3333);
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

    public getAffinityInfo() : {at:string| undefined,ak:string| undefined} {
        let cName: string | undefined, cValue:string | undefined;

        ["ARRAffinity","AWSALB"].some((cookieName)=>{
            cName = cookieName;
            cValue = this.getCookie(cName);
            if (cValue) return true;
        });
        if (cValue) return {at:cName, ak:cValue}
        return {at:undefined,ak:undefined}
    }

    /**
     *
     * @param et token passed to sfLink
     * @param afterOpenArg  boolean/true: closes document page; false/0: posts back default refresh; ['e','a']: posts back e with a; callback function is passed et
     * @param autoCloseDoc
     */
    public OpenWindowsLinkHelper(et:string, afterOpenArg? : boolean | string | [string,string] | Function, autoCloseDoc?:boolean) : void {
        var RESTClient = this;
        let openURL = `${this._SiteURL}/cabs/sflink/sfLink.application?et=${et}`;
        const affinityInfo = RESTClient.getAffinityInfo();
        if (affinityInfo.at) openURL += `&acn=${affinityInfo.at}&ak=${affinityInfo.ak}`;
        if (sfRestClient._Options.LogLevel >= LoggingLevels.Verbose) console.log("OpenWindowsLinkHelper() to: " + openURL);
        var xscript = "";
        var innerScript = "";
        var innerDelay = 255 + (BrowserExtensionChecker.browser.isEdge ? 789 : 0);
        xscript = `top.location.href = '${openURL}';`;
        // afterOpenArg: boolean/true: closes document page; false/0: posts back default refresh; ['e','a']: posts back e with a;
        if (RESTClient.IsDocumentPage() && typeof afterOpenArg === "boolean" && afterOpenArg) {
            innerScript = "top.ResetUnsavedChanges();";
            if (autoCloseDoc) {
                innerScript += "setTimeout('top.location.href = \"about:blank\";', 842);";
                innerScript += "window.top.close();"
            }
            xscript = `setTimeout('${innerScript};', 242);` + xscript;
        }
        else if (typeof self.PostbackRefresh === "function" &&  !afterOpenArg || typeof afterOpenArg === "string" || (Array.isArray(afterOpenArg)  && afterOpenArg.length === 2)) {
            if (!afterOpenArg) afterOpenArg = "ibtnRefreshAttachList"
            var pbArg = 'AfterPopFVC';
            if (Array.isArray(afterOpenArg) && afterOpenArg.length === 2) {
                pbArg = afterOpenArg[1];
                afterOpenArg = afterOpenArg[0];
            }
            innerScript = `PostbackRefresh("${afterOpenArg}","${pbArg}");`;
        }
        else if (typeof afterOpenArg === "function") afterOpenArg(et)
        else console.log("OpenWindowsLinkHelper() - no post action", afterOpenArg);

        if (typeof innerScript === "string" && innerScript.length > 0) xscript = `setTimeout('${innerScript};', ${innerDelay});`   + xscript;
        try{
            RESTClient.DisplayUserNotification("Opening...",2345);

            self.$.connection.sfPMSHub.server.activateExchangeToken(openURL).then( ok =>{
                if (!ok) setTimeout(xscript, 211)
                else {
                    console.log("Activated via SignalR");
                    if (typeof innerScript === "string" && innerScript.length > 0) {
                        console.log("Post Activation, Scheduled",innerScript);
                        setTimeout(innerScript ,innerDelay);
                    }
                }
            }).catch(r=>{
                setTimeout(xscript, 211);
            });
        }
        catch(x){
            console.warn(x);
            setTimeout(xscript, 211);
         }
    }


    /** Finds $$ markers and other replacable values.
     * Markers are case sensative
     */
    protected ExpandActionMarkers(rawAction: string, rowData? : DataModelRow) : string {
        if (rawAction.includes("$$PROJECT") ) {
            rawAction = rawAction.replaceAll("$$PROJECT",this.GetActionMarkerReplacement("$$PROJECT",rowData));
        }
        if (rawAction.includes("$$PDSKEY") ) {
            rawAction = rawAction.replaceAll("$$PDSKEY",this.GetActionMarkerReplacement("$$PDSKEY",rowData));
        }
        // general case: regex??
        return rawAction;
    }

    /** given a mark name, returns the replacement value
     * @see ExpandActionMarkers()
     * @argument markerName such as $$Project or $$PDSKEY
     * @argument rowData object containing row data - first source for value to replace the marker
     */
    protected GetActionMarkerReplacement(markerName: string, rowData? : DataModelRow) : string {
        var result: string = "";
        if (markerName.startsWith("$$")) {
            markerName = markerName.substring(2,3) + markerName.substring(3).toLowerCase();
        }

        if (rowData ) result = this.FieldValueFromRow(rowData,markerName);
        if (!result) {
            if (markerName === "Project") {
                result = this.GetPageProjectKey();
            }
            if (markerName === "Pdskey") {
                result = this.GetPageDataContext() ;
            }
        }
        return result;
    }

    /** returns the value of a browser cookie */
    public getCookie(cookieName:string):string | undefined{
        const decodedCookie = decodeURIComponent(document.cookie);
        const cookiePrefix = `${cookieName}=`;
        const start = decodedCookie.indexOf(cookiePrefix);
        if (start < 0) return undefined;
        let  value =  decodedCookie.substring(start + cookiePrefix.length);
        const end = value.indexOf(";");
        if (end >= 0) value = value.substring(0,end);
        return decodeURIComponent(value);
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
        self.$("DIV#SNotificationContainerHolder, DIV.sNotificationTarget").remove();

        var RESTClient = this;
        var msgReady : Promise<JQuery<HTMLElement>> = new Promise<JQuery<HTMLElement>>( (msgDisplayResolved) => {
            if (RESTClient.notificationMsgTimeoutHandle) {
                clearTimeout(RESTClient.notificationMsgTimeoutHandle);
                RESTClient.notificationMsgTimeoutHandle = undefined;
            }
            var $MsgDiv = self.$('<div class="sNotificationTarget" />');
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
            $MsgDiv.data('snhc', notificationText.sfHashCode()).data('notification', notificationText).data("snhash", notificationText.sfHashCode()).load(this.MakeSiteRelativeURL(templateURL), function (loadedHtml) {
                var $BTN = $MsgDiv.find("BUTTON.sfNotificationDismiss");
                msgDisplayResolved( $MsgDiv );
                $BTN.on("click",function () {
                    RESTClient.MarkNotificationAsShown($MsgDiv.data("notification"));
                    $MsgDiv.remove();
                });
            }).appendTo('BODY').first().on("click",function () { self.$(this).remove(); });

        });
        if (timeOutMS) msgReady.then(function () {
            RESTClient.notificationMsgTimeoutHandle = setTimeout("top.sfClient.ClearNotificationMsgTimeoutHandle(); top.sfClient.DisplayThisNotification('{0}');".sfFormat(templateURL),timeOutMS);
        });
        return msgReady;

    }

    ClearNotificationMsgTimeoutHandle() : void {
        this.notificationMsgTimeoutHandle = undefined;
    }
    /** Use DisplayUserNotification()  This method displays a message from the server!!!
     * @param hashCode help with getting freshest
    */
    DisplaySysNotification(hashCode: string | number, timeOutMS?:number) : Promise<JQuery<HTMLElement>>{
        if (typeof hashCode === "undefined") hashCode = "";
        if (typeof hashCode === "number") hashCode = hashCode.toString();
        if (hashCode.startsWith("SysNotification")) hashCode = hashCode.substring(16);
        return this.DisplayThisNotification("ajhx/sysnotification.html", hashCode, timeOutMS);
    }

    private lastNotificationCheckPromise: Promise<string|null> | null = null;
    private notificationCheckIntervalMS: number = 32517;
    private notificationForcedCheckIntervalMS: number = 567;
    private lastNotificationHashCode: string = "";

    /** Checks backend for a new system notification and displays it */
    CheckForSystemNotification(force=false) {
        const SystemAPI = new _SwaggerClientExports.SystemClient();
        const thisRestClient = this;
        if ( (Date.now() - sfRestClient.lastNotificationCheck) < this.notificationCheckIntervalMS) {
            // pretty soon...
            if  (!force || (Date.now() - sfRestClient.lastNotificationCheck) < this.notificationForcedCheckIntervalMS) return;
            this.notificationForcedCheckIntervalMS *= 2; // prevent over use of forced checks
            if (this.notificationForcedCheckIntervalMS > this.notificationCheckIntervalMS) this.notificationForcedCheckIntervalMS = this.notificationCheckIntervalMS / 2;
        } 
        if (thisRestClient.lastNotificationCheckPromise !== null) {
            if (thisRestClient.DevMode() ) console.log("Prior notification check still pending...");
            return;
        };
        thisRestClient.lastNotificationCheckPromise = SystemAPI.getSystemNotification(force ? Math.random().toString() : '');
        thisRestClient.lastNotificationCheckPromise
        .then((theNotification)=>{
            if (theNotification) {
                //useless to include the hash - it is old news, does not help get a new notification
                this.lastNotificationHashCode = theNotification.sfHashCode().toString();
                thisRestClient.DisplaySysNotification(this.lastNotificationHashCode);
            }
            else {
                this.lastNotificationHashCode = "";
                thisRestClient.DisplaySysNotification("");
            }
        })
        .catch((reason) => {
            const showMsg = `${reason.message} [${reason.status}]`;
            if ("status" in reason) {
                if (reason.status === 304)  {
                    thisRestClient.DisplaySysNotification(this.lastNotificationHashCode);
                    return;
                }
                console.warn('CheckForSystemNotification() failed', reason);
                if (reason.status > 500) {
                    // DisplayThisNotification() requires a functional server
                    if (thisRestClient.isWebix()) {
                        if (this.IsLoginRelatedPage()) thisRestClient.NavigateToServerUnavailable(showMsg);
                        const HubEvent =  jQuery.Event("sfPMSHubSignal.serverUnavailable");
                        self.$("body").trigger(HubEvent,  [reason] );
                        const m = {
                            text: showMsg,
                            type: 'debug',
                            expire: 1345 + (showMsg.length * 50) + 1,
                            id: `sfCheckForSystemNotificationMessage`
                        }
                        self.webix?.message(m as unknown as any);
                    }
                    else {
                        thisRestClient.DisplayUserNotification();
                    }
                }
            }
        })
        .finally(()=>{
            thisRestClient.lastNotificationCheckPromise = null;
            sfRestClient.lastNotificationCheck = Date.now();
        });
    }
    private static lastNotificationCheck = 0

    /** Displays a simple user notification, with "dismiss" session memory
     * @param notificationText The message.  Message is skipped if the same exact message has already been dismissed.
     * @param timeOutMS if specified, message auto-clears in this many milliseconds.  Which does not count as dismissed.
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
            return top?.sfClient?.VModalPage(vpg,opts,w,h,defaultResponse);
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
                if (w === 440) w = Math.round(self.$(window).width()! * 0.5);
                if (w != null) top?.sfClient?.sfLookupWidthChangeTo(this.$LookupDialog!, w);
                if (h != null) top?.sfClient?.sfLookupHeightChangeTo( this.$LookupDialog!,h + this._LookupViewPortAdjustments.outsidExtraH);
            }
        });

    }

    private static GlobalPermitAPIPromise: Promise<UCPermitSet | null>;
    private static GALastPageHitSent: number = 0; // !!! this needs work
    private GAMonitorPageHit( clientID:string, url?:string, title?:string) {
        var RESTClient = this;
        if (!url) {
            url = RESTClient.ResolvePageName();
        }
        var pageHash : number = url.sfHashCode();
        if (sfRestClient.GALastPageHitSent === pageHash ) return;

        if (!title) title = self.$('title').text();
        var payload : GoogleAnalyticPayload = {
            v: 1,
            t: "pageview",
            tid: '', // set by send
            cid: clientID,
            dl: url,
            dt: title,
        }
        sfRestClient.GALastPageHitSent = pageHash ;

        return RESTClientBase.APIClientBase.GAMonitorSend(payload)
                         .done(function (data, textStatus, jqXHR) {
                             console.log(`GAMonitor(pageview:${url}) ok`);
                         })
                        .fail(function (jqXHR, textStatus) {
                            // GAMonitorSendFailed = true; set in APIClientBase
                            console.warn(`GAMonitor(pgvw:${url}) failed: ${jqXHR.responseText} ` );
                        });
    }



    /** Monitors an event
     * @argument clientID site id
     * @argument category Event Name, such as login, search, or view_search_results
     * @argument action
     */
    GAMonitorEvent(  clientID:string, category:string, action:string, label:string, value:number) {
        this.GAMonitorPageHit(clientID);
        return RESTClientBase.APIClientBase.GAMonitorEvent(clientID,category,action,label,value);
    }

    /** Google Analytics Event */
    GAEvent(category:string, action:string, label:string, value:number) {
        if (!value) value = 0;
        if (sfRestClient._WCC.GAFMOptOut) {
            console.log(`GA opt out: ${category} + ${action} '${label}' = ${value} `);
            return;
        }
        this.GAMonitorEvent(sfRestClient._WCC.SiteID, category, action, label, value);
    }

    /** Shortcut that calls GAEvent("dialog",action, dialogName,1) */
    GADialogEvent(action:string, dialogName:string) {
        this.GAEvent("Dialog", action, dialogName, 1);
    }
       /** Shortcut that calls GAEvent("dialog",action, viewName,rows) */
    GAViewModelEvent(viewName:string, rows: number) {
        this.GAEvent("ViewModel", "Get", viewName, rows);
    }

    private ValueHasWildcard(theVal:string) :boolean {
        if (theVal.indexOf("%") >= 0) return true;
        if (theVal.indexOf("*") >= 0) return true;
        if (theVal.indexOf("_") >= 0) return true;
        if (theVal.indexOf("?") >= 0) return true;
        return false;
    }

    private sfClearACHeighLimit():void {
        var $ACList = self.$('ul.ui-autocomplete');
        $ACList.css("max-height", "");
    }

    /**
     * / Note: this only returns Async Frames, not frames for lookups and other dialog scenarios
     * @returns
     */
    private sfGetParentIFrame(): JQuery<HTMLElement> {
    // from INSIDE a frame, this returns the PARENT IFRAME
    if (window === parent || typeof window.parent.$ === "undefined") return self.$();
    return window.parent.$(`IFRAME.sfAsyncPartFrame[src='${location.pathname}${location.search}']`);
}

    private sfLimitACHeightInFrame($AnchorEL:JQuery):void {
        var $ACList = self.$('ul.ui-autocomplete');
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
        if (typeof $AC === "string") $AC = self.$("#" + $AC);
        var RESTClient = this;
        var SourceURL = `${RESTClient._SiteRootURL}/api/suggestions/${lookupName}/${this.GetPageDataContext()}/${this._formatDependsList(true, depends1, dep2, dep3, dep4)}/`;
        $AC.data("sourceurl",SourceURL).autocomplete({
            source: SourceURL
            , minLength: 3
            , delay: 400
            , position: { collision: "flip" }
            , autoFocus: false
            , open: function (event:any, ui:any) {
                var $EL = self.$(this);
                $EL.data('acOpen', true);
                RESTClient.sfLimitACHeightInFrame($EL);
                // too late to increase frame height
            }
            //, search: function (event, ui) { $(this).autocomplete("option", "autoFocus", false); }
            , response: function (event:any, choices:any) {
                $AC = self.$(this);
                if (!$AC.hasClass("ui-autocomplete-input")) return;
                var enableAF = !RESTClient.ValueHasWildcard(<string>$AC.val());
                $AC.autocomplete("option", "autoFocus", enableAF);
                //hint: do not use $.each to modify choices.content, must update directly
                //$AC.trigger("sfAutoCompleted.Response", choices); // yes is synchronous legacy name
                $AC.trigger("sfAC.response", [choices]); // yes is synchronous , normalized (event is always passed)
                if (sfRestClient._Options.LogLevel >= LoggingLevels.Debug)  console.log(`sfAC autofocus ${enableAF}`);
            }
            , close: function (event:any, ui:any) {
                var ib = self.$(this);
                RESTClient.sfClearACHeighLimit();
                ib.data('acOpen', false);
                if (ib.data("acChange")) {
                    var kv = ib.data("acKey");
                    if (kv) {
                        if (!ib.hasData('acPostbackKey') || ib.data('acPostbackKey')) {
                            ib.css('color', 'white');
                            this.value = kv;
                        }
                        //ib.trigger("sfAutoCompletedKV", [kv]);  // legacy, pre 2019
                        ib.trigger("sfAC.KV", [kv]);            // normalized naming
                    }
                    ib.data("acChange", false).trigger("change");
                }
            }
            , select: function (event:any, ui:any) {
                var ib = self.$(this);
                ib.data("acChange", true);
                var kv = ui.item.key;
                if (kv) {
                    ib.data('acKey', kv)
                }
                //ib.trigger("sfAC.AutoCompleteSelect", [ib]);  // legacy name, pre 2019
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
                self.$(this).data("acChange", true);
            }
        });
        $AC.on("blur",function (e:any) {
            //if ($(this).data("acOpen")) { e.preventDefault(); return false
        }).on("keypress",function(e:any) {
            var ib = self.$(this);
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
    jqAlert(msg: string, title?: string , uiAlertIcon?: string ) : JQuery<HTMLDivElement> {
        console.log("jqAlert: " + msg);
        var $ALERT: JQuery<HTMLDivElement> ;
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
                    self.$(this).dialog("close");
                }
            },
            open: function () {
                self.$(this).parent('DIV').find('.ui-dialog-buttonpane button:eq(0)').trigger("focus");
            }
        };
        if (msg.length > 20) dialogOptions.width = "auto";
        $ALERT = self.$(fullMsg).dialog(dialogOptions);
        return ($ALERT);
    }

    /** Opens a jquery ui dialog with an iframe to display the requested url
     * @param url a same-site url
     * @param eventId optional - used when dialog is closed
     * @param eventArg optional - used when dialog is closed
     * @param eventContext optional - used when dialog is closed
     *
    */
    ModalDialog(url: string, eventId?: string | undefined, eventArg?: string | undefined, eventContext?: Window | undefined | null) : Promise<boolean|undefined> | undefined {
        var newValue;
        var formName = "0";
        if (!this.IsGlobalInstance()) {
            return top?.sfClient?.ModalDialog(url,eventId,eventArg,eventContext);
        }

        if (!eventId) eventId = 'mDialog';
        if (typeof eventArg === "undefined") eventArg = url;
        if (!window) {
            console.warn("ModalDialog() must be called in a browser window!", url);
            return new Promise<boolean>((b) => {  b(false)});;
        }
        if (!eventContext) eventContext = window;
        var RESTClient = this;

        sfRestClient.ExternalToolsLoadedPromise.then((unused)=>{
            var DefaultWidth = self.$("body").width();
            if (typeof DefaultWidth === "number") DefaultWidth = Math.round(DefaultWidth / 2.2);
            if (!DefaultWidth || DefaultWidth < 500) DefaultWidth = 500;
            if (this.$LookupDialog) {
                sfRestClient.$LookupDialogStack.push(this.$LookupDialog);
                this.$LookupDialog = undefined;
            }

            if (!this.$LookupDialog) {
                this.$LookupDialog =  self.$(`<div class='clsJQLookup' autofocus='autofocus' ><iframe id='sfClassicUIHolder' src='${sfRestClient._Options.BlankPageURI}' style='width: 100%; height: 150px;border:0;' seamless='seamless' autofocus='autofocus' /></div>`)
                .dialog(        { autoOpen: false, modal: true, title: 'Lookup Dialog', width: DefaultWidth, height: 200,
                        close: top!.sfClient.sfModalDialogClosed,
                        dialogClass: "lookup",
                        resizeStop:  top?.sfClient.sfModelDialogResizedHandler,
                        dragStop: top?.sfClient.sfModelDialogResizedHandler
                    });
                top?.sfClient.AddDialogTitleButton(top.sfClient.$LookupDialog!,"btnMaximizeDialog","Maximize","ui-icon-arrow-4-diag").on("click",function() {
                    var $BTN = self.$(this);
                    var $DialogDiv = self.$(top!.sfClient.$LookupDialog!).closest("DIV.ui-dialog");
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
                        top?.sfClient.sfLookupHeightChangeTo(top.sfClient.$LookupDialog!,self.$(top).height()!-top.sfClient.DialogViewPortAdjustments.outsidExtraW);
                        top?.sfClient.sfLookupWidthChangeTo(top.sfClient.$LookupDialog!,self.$(top).width()!-top.sfClient.DialogViewPortAdjustments.outsidExtraW);
                        $BTN.toggleClass("ui-icon-arrow-4-diag",false).toggleClass("ui-icon-arrow-4",true).data(RestoreSizeDataName,PriorSizeData);
                        $DialogDiv.css({top:sfRestClient._Options.PopupWindowTop,left:14});
                    }
                });
            }

            var  OpenUrl = url;
            if (!RESTClient.IsSiteURL(OpenUrl)) OpenUrl = `${RESTClient._SiteRootURL}/${url}`;

            if (OpenUrl.includes("xbia=1") && sfRestClient.IsPowerUXPage()) {
                //ui-icon-script
                top?.sfClient.AddDialogTitleButton(top.sfClient.$LookupDialog!,"btnToClassicUI","Classic UI (new tab)","ui-icon-script").on("click",function() {
                    window.open( OpenUrl.replace("xbia=1","xbia=0"));
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
            let UserCachedSize: boolean = false;
            if (ApplySizeAndPosition) {
                this.$LookupDialog!.data("RestoredSize",true );
                this.$LookupDialog!.data("SizePending",true );
                TargetSizeData = sfRestClient._DialogCoordinateCache.get(ThisURLHash)!;
                UserCachedSize = true;
            }
            else {
                if (url.indexOf("cuManager.aspx") > 0 ) TargetSizeData = sfRestClient._Options.PopupWindowLargeCWS
                else if (url.indexOf("cusysm.aspx") > 0 ) TargetSizeData = sfRestClient._Options.PopupWindowLargeCWS
                else if (url.indexOf("dxutil.aspx") > 0 ) TargetSizeData = sfRestClient._Options.PopupWindowViewUserCWS
                else if (url.indexOf("vpg=HelpMenu") > 0 ) TargetSizeData = sfRestClient._Options.PopupWindowHelpMenuCWS
                else if (url.indexOf("whoami.aspx") > 0 ) TargetSizeData = sfRestClient._Options.PopupWindowUserSettingsCWS
                else if (url.toLowerCase().indexOf("viewuser.aspx") > 0 ) TargetSizeData = sfRestClient._Options.PopupWindowViewUserCWS
                else if (url.indexOf("users.aspx") > 0 ) TargetSizeData = sfRestClient._Options.PopupWindowLargeCWS;

                if (typeof TargetSizeData !== "undefined") ApplySizeAndPosition = true;
                else TargetSizeData = {top:0,left:0,width:0,height:0};
            }
            if (sfRestClient._Options.LogLevel >= LoggingLevels.Verbose)  console.log(`ModalDialog() ${UserCachedSize ? "User" : "Option/Cfg"} Target size/loc; Apply:${ApplySizeAndPosition} ${!ApplySizeAndPosition ? `for ${url}`:"" }`,TargetSizeData);
            this.$LookupDialog.data("postbackEventId", eventId!);
            this.$LookupDialog.data("postbackEventArg", eventArg!);
            this.$LookupDialog.data("postback", (eventId != sfRestClient._Options.NonPostbackEventID));
            this.$LookupDialog.data("postbackContext", <any> eventContext);
            this.$LookupDialog.data("urlHash", ThisURLHash);
            this.$LookupDialog.data("idName", url);
            this.$LookupDialog.data("newValue", eventArg!);  // must reset to null or prior lookup result value may get used
            this.$LookupDialog.data("multiSelect", false);
            this.$LookupDialog.data("mode", 'modalDialog');

            const $window = self.$(window);
            this.$LookupDialog.data("windowWidth", $window.width()!);
            this.$LookupDialog.data("windowHeight", $window.height()!);
            this.$LookupDialog.data("documentWidth", $window.width()!);
            this.$LookupDialog.data("documentHeight", $window.height()!);
            this.$LookupDialog.data("vScrollPosition", $window.scrollTop()!);
            this.$LookupDialog.data("hScrollPosition", $window.scrollLeft()!);

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
            $DialogDiv = self.$(top!.sfClient.$LookupDialog!).closest("DIV.ui-dialog");

            try {
                var $LookupFrameDOM = this.$LookupFrame[0].contentDocument! || this.$LookupFrame[0].contentWindow!.document;
                this.$LookupFrame[0].contentWindow!.name = `MD${ThisURLHash}`;
                if ($LookupFrameDOM.location.href !== this.$LookupFrame.attr('src')) {
                    // we have confirmed that in a nested child frame, $LookupFrame is correct, but sometimes src does not update location
                    setTimeout("top.sfClient.RefreshiFrameSrc();", 1234);
                }

                if (ApplySizeAndPosition && TargetSizeData && $DialogDiv) {
                    this.$LookupDialog!.data("RestoredSize",true );
                    if (TargetSizeData.top < 0) {
                        var wh =self.$(window).height()!;
                        TargetSizeData.top = Math.round((wh - TargetSizeData.height) / 2.0);
                    }
                    if (TargetSizeData.left < 0) {
                        var ww =self.$(window).width()!;
                        TargetSizeData.left = Math.round((ww - TargetSizeData.width) / 2.0);
                    }

                    $DialogDiv.css({top:TargetSizeData.top,left:TargetSizeData.left});
                    top?.sfClient.sfLookupHeightChangeTo(RESTClient.$LookupDialog!,TargetSizeData.height);
                    top?.sfClient.sfLookupWidthChangeTo(RESTClient.$LookupDialog!,TargetSizeData.width);
                    $DialogDiv.css({top:TargetSizeData.top,left:TargetSizeData.left});
                    this.$LookupDialog!.data("SizePending",false );
                }
            }
            catch (e) { console.warn("WARNING: mDialog() could not verify iFrame location uri"); }

            self.$(top!).off(`resize.${ThisURLHash}`).on(`resize.${ThisURLHash}`,(e) => {
                if (sfRestClient._Options.LogLevel >= LoggingLevels.Debug) console.log(e);
                top?.sfClient.sfLookupHeightChangeTo(RESTClient.$LookupDialog!,self.$(RESTClient.$LookupDialog!).height()!);
                top?.sfClient.sfLookupWidthChangeTo(RESTClient.$LookupDialog!,self.$(RESTClient.$LookupDialog!).width()!);
            });
        });

    return sfRestClient.ExternalToolsLoadedPromise;  // so anchor click event doesn't also do work
    }
    protected $LookupDialog : JQuery<HTMLDivElement> | undefined ;
    static $LookupDialogStack  : JQuery<HTMLDivElement>[] = [];
    protected $LookupFrame : JQuery<HTMLIFrameElement> | undefined ;

    protected ResolveLookupFrame( forDialog?: JQuery<HTMLDivElement> | undefined) : JQuery<HTMLIFrameElement> | undefined {
        if (!forDialog) forDialog = this.$LookupDialog
        if (!forDialog) {
            if (sfRestClient._Options.LogLevel >= LoggingLevels.Debug) console.log("sfClient ResolveLookupFrame() called without current Dialog, returning undefined");
            return undefined;
        }
        return self.$(forDialog.children("iframe").get(0)!) as unknown as  JQuery<HTMLIFrameElement>;

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

    /** Adds a small button
     * @param btnIcon see
     */
    AddDialogTitleButton($Dialog : JQuery<HTMLElement>, btnID: string, btnText: string, btnIcon?: string) {
        const $DialogTitleBar = $Dialog.parent().children(".ui-dialog-titlebar");
        const $LastButton = <JQuery<HTMLButtonElement>>$DialogTitleBar.find("BUTTON[type='button']:last");
        const $NewButton = self.$(`<button type='button' id='${btnID}' />`)
        $NewButton.attr('title',btnText);
        //var ButtonCount = $DialogTitleBar.find("BUTTON[type='button']").length;
        const RightPosOfLeftmostButton = $LastButton.css("right");
        const WidthOfButtons = Math.ceil($LastButton!.width()! * 1.375);
        $DialogTitleBar.find(`BUTTON#${btnID}`).remove();
        $NewButton.button({ icon:  btnIcon, text: false })
            .addClass("ui-dialog-titlebar-close") // essential to get size
            .css({"right": `${((parseInt(RightPosOfLeftmostButton) + WidthOfButtons)  ) }px` })
            .appendTo($DialogTitleBar);
        $NewButton.find(`span.ui-button-icon.${btnIcon}`).css({"vertical-align": "basekune",
            top: "-2px",
        });

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
            this.$LookupDialog =  self.$("div.clsJQLookup");
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
        if (FrameElement) $FrameElement = self.$(FrameElement)!;
        else   $FrameElement =  top?.sfClient.ResolveLookupFrame()!;

        var RunHeight = $FrameElement.contents().find("html").outerHeight()! + 16;  // see also ResetPartFrameHeight() in sfPMS
        var MaxHeight :number = self.$(top!).height()! - 64;
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

    /** Sends the specified message to the server log file using REST API */
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
        var $LookupDialog : JQuery<HTMLDivElement> = self.$(<HTMLDivElement><unknown>this );
        var RESTClient = top?.sfClient;
        var postbackEventId = $LookupDialog.data("postbackEventId");
        var postbackEventArg = $LookupDialog.data("postbackEventArg");
        var postbackContext = $LookupDialog.data("postbackContext");
        var postBack = $LookupDialog.data("postback");
        var idName = $LookupDialog.data("idName");
        var newValue = $LookupDialog.data("newValue");
        var IsMultiSelect = $LookupDialog.data("multiSelect");
        var dialogMode = $LookupDialog.data("mode");
        var ThisURLHash = $LookupDialog.data("urlHash");
        var NewValueIsNew = true;
        if (sfRestClient._Options.LogLevel >= LoggingLevels.Verbose) console.log(`sfModalDialogClosed(${ThisURLHash}) ....`,$LookupDialog);

        if (typeof postbackContext === "undefined") postbackContext = window;
        var $LookupFrame   = RESTClient?.ResolveLookupFrame();
        $(top!).off(`resize.${ThisURLHash}`);
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
        var $LookupDialog : JQuery<HTMLDivElement> = self.$(<HTMLDivElement><unknown>this );
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
        if (Number.isNaN(newValue)) newValue = 789;
        if (self.$("HTML").css("font-size") > "16px") { newValue = newValue * 1.1; } //"Enlarged" theme is 18px
      //  if (($(window).height()! < (newValue + this._LookupViewPortAdjustments.outsidExtraH))) this.sfSetParentWindowSize(false, -1, newValue + this._LookupViewPortAdjustments.outsidExtraH);
        var PositionNow = ld.closest("DIV.ui-dialog").position();
        var wh : number =self.$(window).height()!;
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
      var ww =self.$(window).width()!;
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
        if (!self.$(window) || !(dg) || (dg.length === 0)) return;
        var tdh = Math.floor(dg.dialog("option", "height"));
        var tdw = Math.floor(dg.dialog("option", "width"));
        var height = dg.height()!; // actual content area
        var width = Math.round(dg.width()! + 1);  // actual content area
        var fh = dg.height()! - this.DialogViewPortAdjustments.frameExtraH;
        var $DFrame: JQuery<HTMLIFrameElement> = <any> self.$( dg.children("iframe").get(0)! as unknown as JQuery<HTMLIFrameElement> ) as JQuery<HTMLIFrameElement>;

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
                        var RealFieldName = item.DataField.substring(4);
                        if (!(RealFieldName in rawRow)) {
                            if (RealFieldName.indexOf("_") > 0) RealFieldName = RealFieldName.substring(0,RealFieldName.indexOf("_"));
                            if ((RealFieldName in rawRow && !(item.DataField in rawRow))) {
                                var FieldValue: any = thisPart.RestClient.FieldValueFromRow(rawRow, RealFieldName);
                                var DependsOn : string[] | undefined;
                                if (item.DependsOn) DependsOn = thisPart.RestClient.GatherDependsOnValues(item.DependsOn,rawRow);
                                thisPart._PromiseList!.push(thisPart.RestClient.GetDV(item.DV!, FieldValue, DependsOn, false).then(function then_AddDVToDModel(r) : void {
                                    thisPart.RestClient._AddDVValueToDataModel(thisPart, dataModelBuildKey, index, item.DataField!, "", r);
                                }));
                            }
                            else if (!(RealFieldName in rawRow)) console.warn("_ApplyUICFGtoRawData(cmp) base field {0} not found in row".sfFormat(RealFieldName));
                        }
                    }
                    else {
                        //if (!((item.DataField + ThisSuffix) in rawRow)) {
                        var FieldValue: any = thisPart.RestClient.FieldValueFromRow(rawRow, item.DataField!);
                        if (!((item.DataField + "_ov") in rawRow) || (FieldValue !== thisPart.RestClient.FieldValueFromRow(rawRow, item.DataField + "_ov")) ) {
                            thisPart.RestClient._AddDVValueToDataModel(thisPart, dataModelBuildKey, index, item.DataField!, "_ov", FieldValue);
                            // when XB stops swapping _dv and base, we MAY may need tweaks here.
                            if (!((item.DataField + ThisSuffix) in rawRow)) {  // need we think about aging of the _dv value?
                                var DependsOn : string[] | undefined;
                                if (item.DependsOn) DependsOn = thisPart.RestClient.GatherDependsOnValues(item.DependsOn,rawRow); ///!!! future: handle depends on #DocMasterDetail.project
                                thisPart._PromiseList!.push(thisPart.RestClient.GetDV(item.DV!, FieldValue, DependsOn, false).then(function then_AddDVToDModel(r) : void {

                                    thisPart.RestClient._AddDVValueToDataModel(thisPart, dataModelBuildKey, index, item.DataField!, ThisSuffix, r);
                               }));
                            }
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
        //if (sfRestClient._Options.LogLevel >= LoggingLevels.Debug) console.log(`Row ${index}, setting ${dataField}${suffix} = ${newValue} `);
        thisPart.DataModels.get(dataModelBuildKey)![index][dataField + suffix] = newValue;
    }

    /** typically returns a period for North America */
    private static ResolvedIntlFormat = {
                DecimalPlaceSeparator:  "",
                NumericGroupSeparator: ","
            }
    private static InitializeIntlFormats() {
        try {
            var formatter:any = Intl.NumberFormat(undefined); // Intl.NumberFormat   is missing formatToParts()
            var fParts: any[] = formatter.formatToParts(1234.1); // Intl.NumberFormatPart[] is missing
            sfRestClient.ResolvedIntlFormat.DecimalPlaceSeparator = fParts.find(function (v) { return v.type === "decimal" })!.value;
            sfRestClient.ResolvedIntlFormat.NumericGroupSeparator = fParts.find(function (v) { return v.type === "group" })!.value;
        }
        catch (err) {
            console.log('InitializeIntlFormats: Oops ', err);
            sfRestClient.ResolvedIntlFormat.DecimalPlaceSeparator = ".";
            sfRestClient.ResolvedIntlFormat.NumericGroupSeparator = ",";
        }

    }
    /** Typically returns a period for North America */
    public GetDecimalSeparator():string {
        if (sfRestClient.ResolvedIntlFormat.DecimalPlaceSeparator.length === 0 ) sfRestClient.InitializeIntlFormats();
        return sfRestClient.ResolvedIntlFormat.DecimalPlaceSeparator;
    }
    /** Typically returns a comma for North America */
    public GetNumericGroupSeparator():string {
        if (sfRestClient.ResolvedIntlFormat.DecimalPlaceSeparator.length === 0 )  sfRestClient.InitializeIntlFormats();
        return sfRestClient.ResolvedIntlFormat.NumericGroupSeparator;
    }

    /** returns true if the passed value is a specific number */
    public IsNumber(n: string | number ):boolean {
        var nn : number = typeof n === "number" ? n : parseFloat(n);
        return !isNaN(nn) && isFinite(nn);
    }

    /** Gets val or text from supplied jQuery element and returns its numeric value
     *
     * Removes formatting to convert string to value
    */
    public GetNumericValueFrom( el: JQuery) : number {
        if (el.length === 0) return 0.0;
        var vv: string | number;
        var elInfo: string = "?";
        if (el.is("input")) {
            var v2 = el.val();
            elInfo = (el.attr("name")) ? el.attr("name")! : "";
            vv = `${v2}`;
        }
        else {
            vv = $.trim(el.text());
        }
        if (el.hasData("is")) elInfo = el.data("is");
        if (typeof vv === "string") {
            vv = vv.replaceAll("$", "").replaceAll(this.GetNumericGroupSeparator(), "");
            if (vv.startsWith("(")) vv = `-${vv.replaceAll("($)", "").replaceAll(")","")}`;
            if (!this.IsNumber(vv)) {
                if (sfRestClient._Options.LogLevel >= LoggingLevels.Verbose) console.log(`GetNumericValueFrom(${elInfo}) Is NaN [${vv}]; using 0 `);
                return 0.0;
            }
            vv = parseFloat(vv);
        }
        if (!vv) {
              if (sfRestClient._Options.LogLevel >= LoggingLevels.Verbose) console.log(`GetNumericValueFrom(${elInfo}), using 0`);
            return 0.0;
        }
          if (sfRestClient._Options.LogLevel >= LoggingLevels.Verbose)  console.log(`GetNumericValueFrom(${elInfo}) OK = ${vv}`);
        return vv;
    }

    /** Formats a value and places it into VAL() or TEXT() then cascades change events to self.sfPutEditStoreValue()
     * returns TRUE if value has changed
     * This method is critical in cascading QTY*RATE=TOT and allowing any of the three to be changed
     * @see self.sfPutEditStoreValue()
    */
    SetJQElementValue(el:JQuery, newValue:number, dp?:number):boolean {
        if (el.length == 0) return false;
        var final;
        var pv = this.GetNumericValueFrom(el);
        if (typeof pv === typeof newValue && newValue === pv) return false;
        if (typeof (dp) != 'undefined') {
            var elDP = el.data("dp");
            if (elDP) dp = parseInt(elDP);
            final = this.RoundValue(newValue, dp)
            final = this.FormatNumericValue(final, `F${dp}`);
        }
        else final = newValue;
        if (el.is("input")) {
            el.val(final);
        }
        else el.text(final);
        if (self.sfPutEditStoreValue) self.sfPutEditStoreValue(el,$() ,$() ,newValue);
        //el.trigger("sfCE.AfterEdit",
        return true;
    }

    public RoundValue(originalNumber:number, decimals?:number) : number {
        if (typeof decimals !== "number") decimals = 2;
        var result1 = originalNumber * Math.pow(10, decimals);
        var result2 = Math.round(result1);
        var result3 = result2 / Math.pow(10, decimals);

        //in 2 decimal places
        return +result3.toFixed(decimals);
    }
    /** Returns a number formatted as a string, support C0-C4, F0-F9, N0-N9, 000  */
    public FormatNumericValue(newValue:number | string, intoFormat:string):string {
        // supports C2 and F0 etc
        if (!this.IsNumber(newValue)) return `${newValue}`; // only applies to numerics
        if (!intoFormat) return `${newValue}`;
        if (typeof newValue==="string") newValue = parseFloat(newValue);
        var isCurrency = intoFormat.sfStartsWithCI("C") ;
        var isFixed = (intoFormat.sfStartsWithCI("F") || intoFormat.sfStartsWithCI("N"));
        var isZeroPad = (intoFormat.startsWith("0"));
        var hasGrouping = (isZeroPad && intoFormat.indexOf(",") > 0);
        var dp = 2;
        intoFormat = intoFormat.substring(1);
        if (intoFormat) dp = parseInt(intoFormat);
        if (isNaN(dp)) dp = 0;
        var result : string;
        if (isCurrency  ) {
            // !!! what about decimal places??
            const CurrencyFormatter = new Intl.NumberFormat(undefined, {
                style: 'currency',
                currency: 'USD',
            });
            result = CurrencyFormatter.format(newValue);
        }
        else if (isZeroPad) {
            const langs = (navigator.languages);
            result = newValue.toLocaleString(<string[]>langs, { minimumIntegerDigits: intoFormat.length + 1, minimumFractionDigits: dp, useGrouping: hasGrouping  })
        }
        else if (isFixed) {
            result = newValue.toFixed(dp);
        }
            else
            result =    `${newValue}`;
        return result;
    }

    /** 
     * @argument sSource string in form name=value;otherKey=othervalue;...
     * @argument sKey name of value to be replaced or added
     * @argument sValue string or number or DateRange.  String should not contain a semicolon!
     * @returns sSource updated with sKey=sValue;
     */
    public SetNameValuePairInString(sSource: string, sKey: string, sValue:string | _SwaggerClientExports.DateRange | {start: Date, end: Date} | number) : string
    {
        let npos: number = -1;
        let sResult: string;
        let useValue: string;
        if (sValue instanceof _SwaggerClientExports.DateRange) {
            // MAR 23 DateRange does not support JSON.stringify() 
            useValue = `{"FromDate":"${(sValue.FromDate) ? new Date(sValue.FromDate).toISOString() : ''}", "ThruDate":"${(sValue.ThruDate) ? new Date(sValue.ThruDate).toISOString() : ''}`;
        }
        else  if (typeof sValue !== "string" && typeof sValue !== "number" && typeof sValue.start === "object" && typeof sValue.end === "object") {
            let rValue : {start: Date, end: Date} = sValue;
            useValue = `{"FromDate":"${(rValue.start) ? new Date(rValue.start).toISOString() : ''}", "ThruDate":"${(rValue.end) ? new Date(rValue.end).toISOString() : ''}`;
        }

        else if (typeof sValue==="string") useValue = sValue;
        else useValue= `${sValue}`;
        if (!sKey.endsWith("=")) sKey += "=";
        if (typeof sSource !== "string") sSource = "";
        if (sSource && sSource.length > 0) {
            npos = sSource.indexOf(sKey);
            if (!sSource.endsWith(";")) sSource += ";";
        }

        if (npos > -1)
        {
            sResult = "";
            sSource.split(";").forEach(element => {
                if (element) {
                    if (element.startsWith(sKey)) {
                        sResult += `${sKey}${useValue.trimEnd()};`
                    }
                    else {
                        sResult += `${element};`
                    }
                }
            });
        }
        else
            sResult = `${sSource}${sKey}${useValue.trimEnd()};`;

        return sResult;
    }

      /**
     * @argument sSource string in form name=value;otherKey=othervalue;...
     * @argument sKey name of value to be returned
     */
       public GetNamedValueFromStringAsBoolean(sSource: string, sKey: string, defaultValue:boolean=false) : boolean
       {
           let npos: number = -1;
           let result: boolean = defaultValue ;
           if (!sKey.endsWith("=")) sKey += "=";
           if (sSource && sSource.length > 0) npos = sSource.indexOf(sKey);

           if (npos > -1)
           {
               sSource.split(";").forEach(element => {
                   if (element) {
                       if (element.startsWith(sKey)) {
                           const sResult =  element.substring(sKey.length).toUpperCase();
                           result =  sResult === "1" || sResult.startsWith("T") || sResult.startsWith("Y");
                       }
                   }
               });
           }

           return result;
       }
     /**
     * @argument sSource string in form name=value;otherKey=othervalue;...
     * @argument sKey name of value to be returned
     */
      public GetNamedValueFromString(sSource: string, sKey: string, defaultValue?:string) : string
      {
          let npos: number = -1;
          let sResult: string = defaultValue ? defaultValue : "";
          if (!sKey.endsWith("=")) sKey += "=";
          if (sSource && sSource.length > 0) npos = sSource.indexOf(sKey);

          if (npos > -1)
          {
              sSource.split(";").forEach(element => {
                  if (element) {
                      if (element.startsWith(sKey)) {
                          sResult =  element.substring(sKey.length);
                      }
                  }
              });
          }

          return sResult;
      }

    /**
     * Returns a refernce that can be used to create instances of specific API clients
     * @returns object with exported resources constructorts
     */
    readonly exports : NVPair;
/**
     * Returns a refernce that can be used to invoke static methods on this class
     * @returns sfRestClient static class
     */
    readonly staticBase : sfRestClient;

    /**
     * Creates an instance of the requested API controller with baseURL set appropriately
     * @param ofTypeName eg ActionItemsClient, DocumentToolsClient, LookupClient
     * @returns instance
     */
    public NewAPIClient( ofTypeName : 'ActionItemsClient' | 'CatalogClient' | 'DocumentToolsClient' | 'ExcelToolsClient' | 'LookupClient' | 
                                    'ProjectsClient' | 'ProjectToolsClient' | 'ProjectKPIClient' | 'SessionClient' | 'UICFGClient'  ) :  any {
        var newController :  any;
        if (ofTypeName in this.exports) {
            newController = new this.exports[ofTypeName](this._SiteURL);
        }
        else console.warn("NewAPIClient() does not recognized ",ofTypeName);
        return newController  ;
    }

    /**
     * Call to reset the client state (important when changing users)
     * This method also clears static resources shared by all instances of sfRestClient
     *
     * @param alsoClearSessionStorage set true to also clear session storage (appropriate for logoffs)
     */
    public async ClearCache(alsoClearSessionStorage? : boolean):Promise<void> {
        var InGlobalInstance = this.IsGlobalInstance();
        console.log(`sfRestClient.ClearCache(${this.ThisInstanceID}), ${alsoClearSessionStorage ? " w/sessionStorage" : ""}, ${InGlobalInstance ? " Global" : ""}, UPRC:${sfRestClient._UserPermitResultCache.size}`);
        PartStorageData._LoadedParts.clear();
        try {
            if (typeof top!.sfPMSHub.client.ReConnectDelay === "number")  top!.sfPMSHub.client.ReConnectDelay = 10000;
            await self.$.connection.hub.stop();
        } catch {// ignore any errors
        }
        sfRestClient._UserPermitResultCache.clear();
        sfRestClient._LoadedPermits.clear();
        sfRestClient._LoadingPermitRequests.clear();
        sfRestClient._SessionClientGetWCC = null;
        sfRestClient._z.WCCLoaded = false;
        sfRestClient._WCC.AdminLevel = 0;
        sfRestClient._IconMap = null;
        this._CachedDVRequests.clear();
        if (!InGlobalInstance)
            await window.sfClient.ClearCache(false);
        // note: _UCPermitMap does not need to be cleared, it is the same for all users
        if (alsoClearSessionStorage)
            sessionStorage.clear();
    }

    /**
     * detects Global function call that is now handled by this client
     * @param request can start with javascript:
     * @returns updated request 
     */
    public HandleEvalRequest( request: string ):string {
        let RESTClient = this;
        if (request.startsWith("javascript:")) request = request.substring(11);

        if (request.includes("(")) {
            const token:string = request.substring(0,request.indexOf("("));
            if ( typeof (RESTClient as any)[token] === "function") request = `RESTClient.${request}`;
        }

        try {
            // eslint-disable-next-line no-eval 
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

        return request;
    }

    /**
     * Called by the global instance to connect to SignalR
     */
    protected static StartSignalRClientHub():void {

        if (self !== top) return;
        if (!self.$.connection || !self.$.connection.sfPMSHub || !top.sfClient)  {
            setTimeout("top.sfClient.exports.sfRestClient.StartSignalRClientHub(); // retry",234)
            return;
        }
        let RESTClient = top.sfClient;
        if (sfRestClient.IsPowerUXPage() && !RESTClient.IsDocumentPage() ) {
            if (!sfRestClient._NextPingTimerID)  sfRestClient._NextPingTimerID =    setTimeout(() =>{RESTClient.pingServer();},234);
        }
        if (self.$.connection) {
            var sfHub = self.$.connection.sfPMSHub;
            if (top.sfPMSHub === sfHub) return;
            top.sfPMSHub = sfHub;
            sfHub.client.ReConnectDelay = 5000;
            sfHub.client.ForWindowRX = /^javascript.+-(?<WindowName>[a-z0-9]{12})'\);/
            sfHub.client.systemWideUserNotification = function (msgText:string) {
                top?.sfClient.DisplayUserNotification(msgText);
            };
            sfHub.client.systemNotificationHasChanged = function (sysNoticeHC:string) {
                console.log(`${new Date().toSFLogTimeString()} sfPMSHub: Signal.systemNotificationHasChanged ${sysNoticeHC} `);
                if (!sysNoticeHC) sysNoticeHC = ""; // code=0 means erase
                top?.sfClient.DisplaySysNotification(sysNoticeHC);
            };

            sfHub.client.documentChangeBy = function (loginSessionKey:string, otherUserName:string, changeCount:number, refreshEvent:string) {
                console.log(`${new Date().toSFLogTimeString()} sfPMSHub: Signal.documentChangeBy ${otherUserName}, ${changeCount}`); // subscribed, not myself, offer reload

                if (top?.sfClient.GetPageContextValue("LoginSessionKey") === loginSessionKey) return;
                var HubEvent =  jQuery.Event("sfPMSHubSignal.documentChangeBy");
                self.$("body").trigger(HubEvent,  [otherUserName,changeCount,refreshEvent] );
                if (HubEvent.isDefaultPrevented()) return;
                if (typeof top?.DocumentChangedByAnotherUser === "function") top.DocumentChangedByAnotherUser(refreshEvent, otherUserName, changeCount);
            };



            sfHub.client.afterDocumentSaved = function (dtk:string, project: string) {
                console.log(`${new Date().toSFLogTimeString()} sfPMSHub: Signal.afterDocumentSaved dtk:${dtk}, project:${project}.`); // always myself, refresh related dashboards
                var HubEvent = jQuery.Event("sfPMSHubSignal.afterDocumentSaved");
                self.$("body").trigger(HubEvent,  [dtk,project] );
                if (HubEvent.isDefaultPrevented()) {
                    console.log("sfPMSHub afterDocumentSaved handled...");  // in general .preventDefault() was called
                    return;
                }

                if (!sfRestClient.IsPowerUXPage()) {
                    if (RESTClient.IsProjectPage()) {
                        top?.refreshPartbyName('ProjDocSummary', 'refresh', 'afterDocumentSaved');
                        top?.refreshPartbyName('ProjTypedDocList', 'SlctDocType', dtk);
                }
                else if (RESTClient.IsHomeDashboardPage()) {
                        top?.refreshPartbyName('actionitems', 'refresh', 'afterDocumentSaved');
                    }
                }
            }
            sfHub.client.addRecentDocument = function (dmk: GUID, title: string) {
                // this event updates the recent Document list
                RESTClient.UpdateRecentDocumentList(dmk,title);
            };

            sfHub.client.fileStateChange = function (targetWindowName:string, loginSessionKey:GUID, stateInfo: FileStateInfo[]) {
                var RequestForWindowMatches = targetWindowName.match(sfHub.client.ForWindowRX);
                console.log(`${new Date().toSFLogTimeString()} sfPMSHub: Signal.fileStateChange from ${loginSessionKey} to [${targetWindowName}]:${stateInfo} Req4Window:${RequestForWindowMatches} `);
                if (typeof stateInfo === "string") {
                    try
                    {
                        stateInfo = JSON.parse(stateInfo);
                    }
                    catch (error) {
                        console.warn(`pingServer() Error parsing file state JSON `, stateInfo,error);
                        return false;
                    }
                }
                // we can get this message from any doc viewer
                    var HubEvent = jQuery.Event("sfPMSHubSignal.fileStateChange");
                    self.$("body").trigger(HubEvent,  [targetWindowName,loginSessionKey,stateInfo] );
                    if (HubEvent.isDefaultPrevented()) return;
                    stateInfo.forEach(fsi => {
                                            const fnPromise = RESTClient.GetDV("CatalogFullFileName",fsi.FileDocKey);
                    fnPromise
                        .then((fileName:string | null) => {
                            let what:string = (fsi.Status === 'I' ? "Checked In" :
                                        fsi.Status === 'O' ? "Checked Out" :
                                        fsi.Status === 'L' ? "Locked" :
                                        fsi.Status === 'U' ? "Unlocked" : `"${fsi.Status}"`);

                            RESTClient.DisplayUserNotification(`${fsi.UserName} has ${what} ${fileName}`, 8765);
                        })
                        .catch((r)=>{
                            console.warn(`Could not resolve file name for ${fsi.FileDocKey} `,r);
                        });
                    });

                 
            }

            sfHub.client.nowViewingDocument = function (targettargetWindowName, loginSessionKey, request) {
                var RequestForWindowMatches = request.match(sfHub.client.ForWindowRX);
                console.log(`${new Date().toSFLogTimeString()} sfPMSHub: Signal.nowViewingDocument from ${loginSessionKey} to [${targettargetWindowName}]:${request} Req4Window:${RequestForWindowMatches} `);
                if (RESTClient.GetPageContextValue("LoginSessionKey") !== loginSessionKey) {
                    var HubEvent = jQuery.Event("sfPMSHubSignal.nowViewingDocument");
                    self.$("body").trigger(HubEvent,  [targettargetWindowName,loginSessionKey,request] );
                    if (HubEvent.isDefaultPrevented()) return;
                    RESTClient.HandleEvalRequest(request);
 
                   
                }
            }

            sfHub.client.dashboardOpenLink = function (target:string, request:string) {
                console.log(`${new Date().toSFLogTimeString()} sfPMSHub: Signal.dashboardOpenLink to [${target}]:${request} `);

                let RequestForWindowMatches:RegExpMatchArray | null = request.match(sfHub.client.ForWindowRX);
                var HubEvent = jQuery.Event("sfPMSHubSignal.dashboardOpenLink");
                self.$("body").trigger(HubEvent,  [target,request,RequestForWindowMatches] );
                if (HubEvent.isDefaultPrevented()) return;

                if (top) {
                    //var RESTClient = top.sfClient;
                    var TopName = top.name!;
                    if (TopName && TopName === 'v/LibView.aspx') TopName = "Dashboard"
                    if (TopName.length > 0 && target.sfStartsWithCI(TopName)) {
                        if (request.startsWith("javascript:")) {
                            request = request.substring(11);
                            const rxpopURL = /popURL\(['"](?<url>.*)['"]\)/g;
                            const match = rxpopURL.exec(request); // vpgName, args, width, height
                            if (match && match.groups && match.groups.url) {
                                const useURL =match.groups.url;
                                window.open(useURL,`pu${useURL.sfHashCode()}`);
                            }
                            else {
                                RESTClient.HandleEvalRequest(request);
                            }
                        }
                        else if (request.sfStartsWithCI("refresh")) {
                            var HasRefreshPageParts = (typeof top?.refreshPageParts === "function")
                            if (HasRefreshPageParts && RESTClient.IsProjectPage()) {
                                top.refreshPartbyName('DocSearch', request, 'signalR');
                                top.refreshPartbyName('ProjTypedDocList', request, 'signalR');
                            }
                            else if (HasRefreshPageParts && RESTClient.IsHomeDashboardPage()) {
                                top.refreshPartbyName('actionitems', 'refresh', 'signalR');
                            }
                            else if (typeof top?.refreshPageParts === "function" && request !== "RefreshAttachments") {
                                const OK = top.refreshPageParts(request, 'signalR') as unknown as boolean;
                                if (!OK ) console.log(`refreshPageParts did not refresh ${request}`);
                            }
                            else if ( request === "RefreshAttachments" ) {
                                var HubEvent = jQuery.Event(`sfPMSHubSignal.${request}`);
                                self.$("body").trigger(HubEvent,  [target,request] );
                                if (HubEvent.isDefaultPrevented()) {
                                    console.log("sfPMSHub RefreshAttachments handled...");  // in general .preventDefault() was called
                                    return;
                                }
                                console.log("sfPMSHub queing request ${request} in 1 second");
                                setTimeout(`top.sfDocDetailPostBack('${request}','sfLink'); // signalr`, 876);
                            }
                        }

                        else if ( RESTClient.IsSiteURL(request)) {
                            if (sfRestClient.IsPowerUXPage()) {
                                if (request.indexOf("ProjectDetail.aspx?") > 0) {
                                    const ProjectParse = /[\?\&]id=(?<id>.*)/gm;
                                    const match = ProjectParse.exec(request); //
                                    if (match) {
                                        if ( match.groups && match.groups.id) {
                                            RESTClient.OpenProject(match.groups.id);
                                            return;
                                        }
                                    }
                                }
                            }
                            top!.location.href = request;
                        }
                    }
                    else if (TopName.length! > 0 && RESTClient.GetPagePK().endsWith(TopName)
                        && (RequestForWindowMatches) && typeof RequestForWindowMatches.groups === "object" && RequestForWindowMatches.groups.WindowName === TopName) {
                        // hey wait, this is about me!  Lets schedule a refresh that might get stomped by re-nav (which is ok)
                        // how is this different than above
                        console.log("sfPMSHub queing request RefreshAttachments in 1 second (belt and suspenders)");
                        var HubEvent = jQuery.Event("sfPMSHubSignal.RefreshAttachments");
                        self.$("body").trigger(HubEvent,  [target,request] );
                        if (HubEvent.isDefaultPrevented()) {
                            console.log("sfPMSHub RefreshAttachments handled...");  // in general .preventDefault() was called
                            return;
                        }
                        setTimeout("top.sfDocDetailPostBack('RefreshAttachments','sfLink'); // signalr", 987);
                    }
                    else if (target === "CATALOG" ) {
                        var HubEvent = jQuery.Event("sfPMSHubSignal.catalogChange");
                        self.$("body").trigger(HubEvent,  [target,request] );
                        if (HubEvent.isDefaultPrevented()) {
                            console.log("sfPMSHub catalogChange handled...");  // in general .preventDefault() was called
                            return;
                        }
                        if (typeof top.RefreshDocPart === "function") {
                            top.RefreshDocPart("DocAIR",`CATALOG;${request}`);
                            return;
                        }
                        console.log(`sfPMSHub does not know how to forward ${request} to [${target}]`);
                    }
                    else console.log(`sfPMSHub ignoring ${request} to [${target}]`);
                }

            };
            sfHub.client.dashboardRefreshPartByName = function (target) {
                console.log(`${new Date().toSFLogTimeString()} sfPMSHub: Signal.dashboardRefreshPartByName for [${target}] `);
                var HubEvent = jQuery.Event("sfPMSHubSignal.dashboardRefreshPartByName");
                self.$("body").trigger(HubEvent,  [target] );
                if (HubEvent.isDefaultPrevented()) return;
                if (typeof top?.refreshPartbyName === "function") {
                    top?.refreshPartbyName(target);
                }
            };
            sfHub.client.onApplicationStart = function (serverVersion:string) {
                console.log(`${new Date().toSFLogTimeString()} sfPMSHub: Signal.OnApplicationStart ${self.location.pathname} vers ${serverVersion}`);
                // has version changed?
                const priorVersion = RESTClient.ServerVersion();
                const isNewVersion =(priorVersion && serverVersion && !priorVersion.startsWith(serverVersion));
                if (isNewVersion) RESTClient.ClearCache(true);  
                if (!top?.sfClient.IsDocumentPage()) {
                    if (top?.location.pathname.endsWith("login.aspx")) {
                        self.location.href = self.location.pathname + "?rwapp=1";
                        return;
                    }
                    else if (top?.location.hash.includes("/login")) {
                        self.location.reload();
                        return;
                    }
                    sfHub.server.sessionAlive();
                }
                sfHub.server.sessionAlive();
            }

            sfHub.client.onFlushClientDV = function (dvName: string, pValue: string, dependsOn: string[] | undefined) {
                console.log(`${new Date().toSFLogTimeString()} sfPMSHub: Signal.onFlushClientDV for [${dvName}] `);
                var HubEvent = jQuery.Event("sfPMSHubSignal.onFlushClientDV");
                self.$("body").trigger(HubEvent,  [dvName,pValue,dependsOn] );
                if (HubEvent.isDefaultPrevented()) return;
                top?.sfClient.ClearDV(dvName,pValue,dependsOn);
            };
            sfHub.client.onFlushClientResource = function (resourceType: string, project: string, extra: string | undefined) {
                //server wants us to flush something other than a DV
                console.log(`${new Date().toSFLogTimeString()} sfPMSHub: Signal.onFlushClientResource for [${resourceType},${project}] `);
                var HubEvent = jQuery.Event("sfPMSHubSignal.onFlushClientResource");
                self.$("body").trigger(HubEvent,  [resourceType,project,extra] );
                if (HubEvent.isDefaultPrevented()) return;  // not recommended unless they handle all our stuff too!
                if (resourceType === "project") {
                    //Dim sCacheKey As String = DataSupport.Logic.CacheKeyForProjectKPI(forProject)
                    //sCacheKey = DataSupport.Logic.CacheKeyForProjectData(forProject, Logic.ProjectCacheTypes.Model)
                    //sCacheKey = DataSupport.Logic.CacheKeyForProjectCA(forProject)
                    //DataSupport.Logic.Cache.Remove(DataSupport.Logic.CacheKeyForProjectTeam(forProject))
                    
                    RESTClient.ClearDV("ContractValue4ImportOnly", project, undefined)
                    //RESTClient.ClearDV("ProjectBRInfo", Nothing) // depends on DTK, so does this clear all doc types?
                    //RESTClient.ClearDV("WBSETC", New String() {project}) ' est to complete
                    RESTClient.ClearDV("ProjectSCBudgetMode", project, undefined)
                }
                else if (resourceType === "*") {
                    // mostly for webix  LV tables
                    sessionStorage.clear();  // this also flushes all DV's
                    localStorage.clear();
                    PartStorageData.ClearCache();
                }
            };
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
                self.$("body").trigger(HubEvent, [top?.sfClient.GetPageContextValue("UserKey")] );
                if (HubEvent.isDefaultPrevented()) return;

                top?.sfClient.DisplayUserNotification("You have been logged out!",8765);
                setTimeout(`top.location.href = '${sfRestClient.LoginPageURL("LoggedOut")}'; //signalr log out`, 3210);
            }
            if (top.localStorage.getItem("SignalR-Logging")) self.$.connection.hub.logging = true;

            self.$.connection.hub.connectionSlow(function () {
                console.log(`${new Date().toSFLogTimeString()} sfPMSHub: experiencing difficulties with the connection. `);
                self.$("SPAN.clsBrandingFooterText").append("<span id='spnDashOWarning' class='sfPingHealthTip' title='{1}'>Weak server connection. (Reported by Push Signal)</span>");
            });

            const stateConversion:string[] = [ 'connecting', 'connected', 'reconnecting', '3','disconnected'];

            self.$.connection.hub.stateChanged(function (state: {oldState:number, newState:number}) {
                if (sfRestClient._Options.LogLevel >= LoggingLevels.Verbose)
                    console.log(`${new Date().toSFLogTimeString()} sfPMSHub: state change from ${stateConversion[state.oldState]} to ${stateConversion[state.newState]} using ${sfHub.connection?.transport?.name} `);
                let connectionType: string | undefined;
                if (sfHub && sfHub.connection && sfHub.connection.transport) connectionType =sfHub.connection.transport.name;
                if (connectionType)  connectionType !== "webSockets" ? top?.sfClient.DisplayUserNotification(`FYI: Your <a href='https://support.spitfirepm.com/kba-01835/' target='_blank' title='Click for details'><i class="fa-duotone fa-signal-stream" style='text-decoration:underline;'></i>&nbsp;connection</a> is using '${connectionType}'; you may occassionally be disconnected.`) : undefined;
            });
            self.$.connection.hub.disconnected(function () {
                console.log(`${new Date().toSFLogTimeString()} sfPMSHub: disconnected.  Sleep ${sfHub.client.ReConnectDelay}ms;  Reconnect:${!sfHub.client.SkipAutoReconnect}`);
                if (self.$.connection.hub.lastError) {
                    console.log(self.$.connection.hub.lastError.message);
                }
                if (!sfHub.client.SkipAutoReconnect)
                    setTimeout(function () {
                        self.$.connection.hub.start().done(function hubReStart() {
                            console.log(`${new Date().toLocaleTimeString()} sfPMSHub Hub has been re-started...`);
                            if (RESTClient.IsDocumentPage()) {
                                const DMK = RESTClient.GetPagePK();
                                sfHub.server.subscribeToDocument(DMK);
                            }
                        });
                    }, sfHub.client.ReConnectDelay); // Restart connection after 5 seconds.
                if (sfHub.client.ReConnectDelay < 120000) sfHub.client.ReConnectDelay *= 2;
            });

            self.$.connection.hub.start().done(function () {
                console.log(`${new Date().toSFLogTimeString()} sfPMSHub: started...`);
                //if (typeof top.sfPMSHub === "undefined") top.sfPMSHub = $.connection.sfPMSHub; // $.connection.hub.proxies.sfpmshub;
                if (RESTClient.IsDocumentPage()) {
                    let delayMS = 222;
                    const WaitAndSubscribe = () => {
                            const DMK = RESTClient.GetPagePK();
                            if (!DMK || DMK === RESTClient.EmptyKey)  {
                                if (RESTClient.GetPageQueryParameterByName("add")) {
                                    console.log(`${new Date().toSFLogTimeString()} sfPMSHub: Doc Page in ADD mode...`);
                                    clearTimeout(sfRestClient._NextPingTimerID );
                                    sfRestClient._NextPingTimerID = undefined;
                                    return;
                                }
                                delayMS += 222;
                                setTimeout(() => {WaitAndSubscribe()},delayMS);
                                console.log(`${new Date().toSFLogTimeString()} sfPMSHub: waiting ${delayMS}ms for DMK to resolve...`);
                                return;
                            }
                            if (DMK) {
                                sfHub.server.subscribeToDocument(DMK);
                                console.log(`${new Date().toSFLogTimeString()} sfPMSHub: subscribedToDocument...`);
                                if (!sfRestClient._NextPingTimerID)  sfRestClient._NextPingTimerID =    setTimeout(() =>{RESTClient.pingServer();},234);
                            }
                            return;
                        }
                      
                    setTimeout(() => {WaitAndSubscribe()},delayMS);
                }
            });
        }
    }

    public NavigateToServerUnavailable(reason:string, delayMs:number=222): void {
        const RESTClient = this;
        const url = `${RESTClient._SiteRootURL}/wx/#!/server-unavailable`;

        setTimeout(`top.location="${url}";` , delayMs);
    }


    public NavigateToLogout(reason:string, delayMs:number=222): void {
        if (this._navigateToLogoutTimerEvent) {
            console.log(`${new Date().toSFLogTimeString()} NavigateToLogout already pending, redundant ${reason} ignored...`);
            return;
        }
        this._navigateToLogoutTimerEvent = setTimeout(`top.location="${sfRestClient.LogoutPageURL(reason)}";` , delayMs);
    }
    private _navigateToLogoutTimerEvent:number | undefined = undefined;

    protected static LogoutPageURL(mValue: string) : string {
        var result = "admin/Logout.aspx";
        if (top) {
            var RESTClient = top.sfClient;
            var isPowerUX = sfRestClient.IsPowerUXPage();
            isPowerUX = false;
            result = `${RESTClient._SiteRootURL}/${isPowerUX ? "wx/#!/login" : "admin/Logout.aspx"}?m=${mValue}`;
        }
        return result;
    }
    protected static LoginPageURL(mValue: string) : string {
        var isPowerUX = sfRestClient.IsPowerUXPage();
        var root = sfRestClient.ResolveSiteRootURLs();
        var result : string;
        if (isPowerUX) {
            result = `${root}/wx/#!/login?m=${mValue}`;
        }
        else {
            if (mValue === 'LoadUserSessionInfo401') {
                result = `${root}/admin/logout.aspx`
            }
            else result = `${root}/admin/SessionLost.aspx?m=${mValue}`;
        }
        return result;
    }

    /** updates the time of last user activity */
    public heartbeat():void {
        sfRestClient.LastActivityAt = Date.now();
    }

    public ResetUnsavedChangesAndCloseThisWindow(): void {
        self.location.href = 'about:blank';
        self.close();
    }

    protected static _NextPingTimerID :number | undefined= undefined;
    protected static _RepeatedPingRetryDelay: number = 0;
    protected static _connectionCheckDialogShown: boolean = false;
    public async  pingServer(): Promise<void> {
        let pdsKey = "TBD";
        try {
            const RESTClient = this;
            pdsKey = RESTClient.GetPageDataContext();
            if (!top?.sfPMSHub || top.sfPMSHub.connection.state !== self.$.signalR.connectionState.connected) {
                sfRestClient._RepeatedPingRetryDelay ++;
                if (sfRestClient._RepeatedPingRetryDelay > 20) {
                    RESTClient.CheckForSystemNotification();
                    console.log(`pingServer() waiting (${sfRestClient._RepeatedPingRetryDelay}) for Websocket connection, state is ${top?.sfPMSHub?.connection.state} `);
                    sfRestClient._RepeatedPingRetryDelay = 5;
                }
                sfRestClient._NextPingTimerID = setTimeout(()=>{RESTClient.pingServer(); /*  wait for hub */}, 123 * sfRestClient._RepeatedPingRetryDelay );
                return;
            }
            const isWebix = RESTClient.isWebix();
            if (this.IsPageOfType( this.PageTypeNames.Unauthenticated ) ) {
                if (sfRestClient._Options.LogLevel >= LoggingLevels.Verbose)  console.log(`pingServer() Log in pending (ignored ${sfRestClient._RepeatedPingRetryDelay})`);
                this.CheckForSystemNotification();
                const returnTo = RESTClient.GetPageQueryParameterByName("ReturnUrl");
                if (returnTo) {
                    const m =RESTClient.GetPowerUXRouteHelper().helpers.GenerateMessage("FYI: The requested resource requires authentication...","debug");
                    if (isWebix) {
                        self.webix?.message(m);
                    }
                    else RESTClient.DisplayUserNotification(m.text);
                }
                sfRestClient._RepeatedPingRetryDelay ++;
                sfRestClient._NextPingTimerID = setTimeout(()=>{RESTClient.pingServer(); /*  wait for login */}, 2345 + (sfRestClient._RepeatedPingRetryDelay * 555) );
                return;
            }
            const isDocumentPage = RESTClient.IsDocumentPage();
            const isPowerUXPage = sfRestClient.IsPowerUXPage()
            const isMainView = !isDocumentPage && isPowerUXPage && (location.hash.includes("/main/"));
            const docSessionkey = RESTClient.GetPageContextValue("DocSessionKey");
            const loginSessionKey = RESTClient.GetPageContextValue("LoginSessionKey");
            const docKey:string = RESTClient.GetPagePK();  
            const hasDocSessionkey = (docSessionkey && docSessionkey !== RESTClient.EmptyKey);
            const hasDocKey = (docKey && docKey !== RESTClient.EmptyKey);
            const hasPDSKey = (pdsKey && pdsKey !== 'TBD');
            const hasWebsocketConnection = top?.sfPMSHub?.connection.state === self.$.signalR.connectionState.connected ;

            if ( isDocumentPage && (!hasDocSessionkey || !hasPDSKey || !hasDocKey) ) {
                if (sfRestClient._Options.LogLevel >= LoggingLevels.Verbose)  
                    console.log(`pingServer()  ${!hasDocKey ? 'DMK':''} ${!hasDocSessionkey ? 'DSK':''} ${!hasPDSKey ? 'PDS':''}  still pending (requed)`);
                this.CheckForSystemNotification();
                sfRestClient._NextPingTimerID = setTimeout(()=>{RESTClient.pingServer(); /*  wait for doc context */}, 345);
                return;
            }

            sfRestClient._RepeatedPingRetryDelay = 0;
            var retryInterval = (sfRestClient._Options.BasicPingServerInterval * (1.1 + Math.random()));
            var $ALERT: JQuery<HTMLDivElement>;
            var ActionAfterAlert = "";
            var MaxIdleTime = RESTClient.GetPageContextValue("IdleForce",33) * 59000;
            if (self.$("DIV.ui-dialog-content.sfStopPingServer").length > 0) return;
            sfRestClient.PageServerPingAttempts ++;
            if (hasWebsocketConnection) top.sfPMSHub.server.sessionAlive();

            if (isDocumentPage && isPowerUXPage) {

                try {
                    let $DocUI = RESTClient.GetPowerUXDocumentUI();
                    let DocModel:iDocumentModel = RESTClient.GetPageDocumentModel()!;
                    
                    // var $DocBar = top.$("DIV.clsPartRowRight");
                    // var $DocBarSignal = $DocBar.find(".clsSignalR");
                    // if ($DocBarSignal.length === 0 && $DocBar.find("img").length > 0) $DocBarSignal = $DocBar.prepend('<i class="fa-duotone fa-signal-stream-slash clsSignalR"  ></i>').find(".clsSignalR");
                    
                    let WatchedFileKeys:string[] = [];
                    if (DocModel.CurrentAttachments) WatchedFileKeys = DocModel.CurrentAttachments.map((el:_SwaggerClientExports.DocAttachment) => el.DocKey) as string[] ;
            
                    self.sfPMSHub.server.documentWindowOpen(docKey, docSessionkey , pdsKey,sfRestClient.PageNotificationCount, 
                                    DocModel.getExclusivityMode(), WatchedFileKeys)
                    .then( (responseText)=>{
                        let msgText = "";
                        try {
                            if (responseText) { 
                                var isOK = (responseText.startsWith("OK"));
                                self.$("SPAN#spnIdleTime.sfPingHealthTip").detach();
        
                                //$(jqSelector).html(responseText);
                                //$sfModalDialog.dialog('option', 'width', 'auto');
                                var CanAutoSave = isOK;
                                if (isOK) {
                               
                                
                                 
                                var d = new Date();
                                var hourNow = d.getHours();
                                if (((sfRestClient.PageNotificationCount > 33) && (hourNow < 2)) || (((sfRestClient.PageNotificationCount * retryInterval) > MaxIdleTime))) {
                                    
                                    $ALERT = RESTClient.jqAlert("This window has been idle and will close in 1 minute.  Close this dialog to keep working!");
                                    var autoClose = setTimeout(() => {RESTClient.ResetUnsavedChangesAndCloseThisWindow();}, 66000);
        
                                    $ALERT.on('dialogclose', function (event) {
                                        clearTimeout(autoClose);
                                        RESTClient.heartbeat();
                                        //top.SaveThisDoc("IDLE");
                                    });
                                    retryInterval = 99000;
                                }
                            }

                            else {
                                
                                if (responseText == "NAK: Not Authenticated") {
                                    msgText = "You are no longer logged into this server.  This window will close when you click OK";
                                    retryInterval = -1;
                                    ActionAfterAlert = "Close"
                                    //darnSoon.resolve();  //makes msgReady be ready
                                }
                                else if (responseText.startsWith("NAK:")) {
                                    msgText = responseText.substring(5).trim();
                                    retryInterval = -1;
                                    ActionAfterAlert = "Reload"
                                    self.sfPMSHub.server.writeToServerLog(`SendDocWindowOpenNotification(${docKey}) - auto-reload ${msgText}`);
                                    self.location.reload();
                                }
                                else if (responseText.startsWith("FAIL:")) {
                                    msgText = responseText.substring(5).trim();
                                    retryInterval = -1;
                                    ActionAfterAlert = "Close"
                                }
                                else if ((responseText.startsWith('[{"FileDocKey":')) && responseText.indexOf("UserKey") > 0) {
                                // see fileStateChange signal!!
                                const sfHub = self.$.connection.sfPMSHub;
                                if (sfHub && sfHub.client.fileStateChange) {
                                    try
                                    {
                                        const fcInfo: FileStateInfo[] = JSON.parse(responseText);
                                        if (fcInfo) sfHub.client.fileStateChange(self.name,loginSessionKey,fcInfo);
                                    }
                                    catch (error) {
                                        console.warn(`pingServer() Error parsing JSON `, responseText,error);
                                    }

                                }
                                else console.warn('sfHUB client hub is not available', responseText);
 
                                }
                               // changed by another now via SignalR
                               // SysNotification are now via SignalR
                            
                                else if (responseText === "[]") {
                                    console.log("DWO: Empty response.")
                                }
                                else {
                                    msgText = responseText;
                                    retryInterval = -1;
                                    //darnSoon.resolve();  //makes msgReady be ready
                                }
                                if (msgText) {
                                    $ALERT = RESTClient.jqAlert(msgText);
                                    //if (DialogButtons) $ALERT.dialog('option', 'buttons', DialogButtons);
                                }
                                if (ActionAfterAlert.length > 0) {
                                    retryInterval = -1;
                                    $ALERT.on('dialogclose', function (event) {
                                        if (ActionAfterAlert === "Close") autoClose = setTimeout(() => {RESTClient.ResetUnsavedChangesAndCloseThisWindow();}, 333);
                                        if (ActionAfterAlert === "Reload") self.location.reload();
                                        //if (ActionAfterAlert) DotNetPostBack(ActionAfterAlert);
                                    });
                                }
                            }
        
                        }
                        } catch (rxx : any) {
                            console.warn(`SendDocWindowOpenNotification(${docKey}) - `, rxx)
                            self.sfPMSHub.server.writeToServerLog(`SendDocWindowOpenNotification(${docKey}) - ${rxx}`);
                            RESTClient.jqAlert('Problem processing heartbeat response; cause: ' + rxx.message);
                            self.location.reload();
                        }
                    })
                    .catch((rxx)=>{
                        console.warn('documentWindowOpen failed!',rxx);
                        var retryNow = RESTClient.PageServerPingBackFailed("dwo", docKey, "DWO Failed", retryInterval / 2, "SendDocWindowOpenNotification");
                        //if (retryNow) NextDWOEventID = setTimeout('SendDocWindowOpenNotification("' + docKey + '"); // dwo retry', retryInterval);
            
                    });


                } catch (error:any) {
                    if (error && (error as any).message) {
                        console.log('SendDocWindowOpenNotification(' + docKey + ') - ' + error.message)
                        RESTClient.jqAlert('The server could not be contacted to reserve the resources for this document window: ' + error.message);
                    }
                    // how to recover??
                }

              
            }
            else if (isMainView) {
                if (top.name !== "Dashboard") {
                    const bc = new BroadcastChannel("sfAuth");
                    const assertMe = setTimeout(()=>{
                        console.log('Asserting this is main Dashboard...');
                        top!.name = "Dashboard";
                    },1234);
                    bc.onmessage = function (event) {
                        // we never receive our own broadcast 
                        const eventMessage: {event:string, context:string, payload: any}  = event.data;
                        console.log(`BroadcastChannel.pingServer:${eventMessage.event}`, event);
                        if (eventMessage.event === "PongWindowByName") { //PingWindowByName
                            if (eventMessage.context === "Dashboard") {
                                // this means there is already a dashboard
                                console.log('Pong from Dashboard...');
                                clearTimeout(assertMe);
                            }
                        }
                    };  // BroadcastChannel message handling --------- ^^

                    bc.postMessage({event:"PingWindowByName",context:"Dashboard", payload:false}); //MessagePingWindow
                    // we either get a response or take over as Dashboard
                }
            }

            self.sfPMSHub.server.dashboardHeartbeat(pdsKey,sfRestClient.PageNotificationCount)
                .then(async (responseText) => {
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
                        var TimeSinceLastActivity = Date.now() - sfRestClient.LastActivityAt;
                        if (((TimeSinceLastActivity > 525600) && (hourNow < 2)) || ((TimeSinceLastActivity > MaxIdleTime))) {
                            RESTClient.DisplayUserNotification("This window has been idle and will logoff in 1 minute.  ", 60000);
                            setTimeout(`top.location="${sfRestClient.LogoutPageURL('idle')}";` , 66000);
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
                                    await self.$.connection.hub.stop();
                                    await self.$.connection.hub.start();
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
                                const AuthenticationMessage = sfRestClient.PageNotificationCount < 2 ?'Authentication required':'Lost authentication.';
                                RESTClient.DisplayUserNotification(AuthenticationMessage, 65432);
                                let defaultLogoutOnTimer = true;
                                if (self.webix) {
                                    if (1===1) { //RESTClient.DevMode()
                                        if (sfRestClient._connectionCheckDialogShown = true) return;
                                        sfRestClient._connectionCheckDialogShown = true;
                                        self.webix!
                                            .confirm({title:"Connection Check",
                                                    ok: 'Login Again',
                                                    cancel: 'Dismiss', 
                                                    text: `Authentication ${ sfRestClient.PageNotificationCount < 2 ?'Required':'Revoked'}. <br/> Returning to login page!`,
                                                    type: "alert-warning",
                                                }).then((r:boolean)=>{
                                                    if (r) this.NavigateToLogout("auth-lost-immediate");
                                                    else self.webix?.message("ok...");
                                                    sfRestClient._connectionCheckDialogShown = false;
                                                });
                                        defaultLogoutOnTimer = false;
                                    }
                                    else self.webix!
                                        .alert({title:"Connection Check",
                                                ok: 'Dismiss',
                                                text: `Authentication ${ sfRestClient.PageNotificationCount < 2 ?'Required':'Revoked'}. <br/> Returning to login page!`,
                                                type: "alert-warning",
                                            }).then((r)=>{
                                                this.NavigateToLogout("auth-lost-immediate");
                                            });
                                    }
                                if (defaultLogoutOnTimer) this.NavigateToLogout("auth-lost",19753);
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
                            if (!sfRestClient.IsPowerUXPage() && RESTClient.IsHomeDashboardPage()) {
                                setTimeout("if (typeof top.refreshPartbyName === 'function') top.refreshPartbyName('actionitems'); // pingServer::dasho", 222);
                            }
                            // deprecated: used to put a number on the classic home tab


                        }
                        else if (responseText.sfStartsWithCI('{"link":')) {
                            var ldata = JSON.parse(responseText);
                            console.warn(`pingServer() requested link `,responseText);
                            if ((location.pathname.toUpperCase() + location.search.toUpperCase()) == ldata.link.toUpperCase()) {
                                self.__doPostBack("refresh", "dasho");  // this makes the pending window.close irrelavent....
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
                    RESTClient.PageServerPingBackOk("dasho", pdsKey, responseText, retryInterval);
                    if (retryInterval > 0) sfRestClient._NextPingTimerID = setTimeout(`top.sfClient.pingServer("${pdsKey}");`, retryInterval);
                }
                }).catch(function (failMessage) {
                    var retryNow = RESTClient.PageServerPingBackFailed("dasho", pdsKey, failMessage, retryInterval / 2,"pingServer");
                if (retryNow) setTimeout(`top.sfClient.pingServer("${pdsKey}"); // weak connection retry`, retryInterval);
            });

        }
        catch (exx:any) {
            if (exx.message) {
                console.warn(`pingServer(${pdsKey}) - ${exx.message}`);
                this.DisplayUserNotification(`The server could not be contacted : ${exx.message}`,99999);
                // how to recover??
            }
            else  console.warn(`pingServer(${pdsKey}) - catch  ${typeof exx}`,exx);

        }
    }

    static PageServerPingAttempts = 0
    static PageServerPingOK = 0
    static PageServerPingFailRunCount = 0
    static PageServerPingFailThreshold = 6
    static PageServerPingUserNotificationShown = false;
    static PageNotificationCount = 0;
    static LastActivityAt = Date.now();


    protected PageServerPingBackAlert(msgText: string | boolean, actionAfterAlert:string) {
        if (!msgText) return;
        if (typeof msgText === "string") {
            console.warn(`PageServerPingBackAlert ${msgText}`);
            const easyLogout = (msgText === "Please logout and log back in (user session missing)") ;
            if (this.isWebix()) {
                self.webix!.alert({title:"Server Ping",
                    ok: easyLogout ? 'Logout' :'Dismiss',
                    text: msgText,
                    type: "alert-warning",
                }).then((r)=>{
                    if (easyLogout) this.NavigateToLogout("pingStatus");
                });
            } else this.jqAlert(msgText,"Server Ping");
        }
             //$ALERT = jqAlert(msgText,"Server Ping");
        else {
                console.warn(`PageServerPingBackAlert `,msgText);
                this.jqAlert("Unknown backend connection failure <br> Try CTRL+F5.<br/>If persists, contact help desk, check logs ","Server Ping");
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
        const thisClient: sfRestClient = this;
        const TimeSinceLastActivity = Date.now() - sfRestClient.LastActivityAt;
        let showLog = ((thisClient.DevMode()) || sfRestClient.PageServerPingOK < 2 || ((top?.sfPMSHub) && top.sfPMSHub.connection.logging) || ((responseText) && (responseText != "OK")));
        if (TimeSinceLastActivity >  525600) {
            showLog = true; 
            if (!id) id = "";
            if (typeof id === 'string' && id.length > 8) id = id.substring(0,8);
            id +=   ` Idle since ${new Date(sfRestClient.LastActivityAt).toLocaleTimeString()}`;
        }

        sfRestClient.PageServerPingFailRunCount = 0;
        sfRestClient.PageServerPingOK ++;
        self.$("SPAN#spnDashOWarning.sfPingHealthTip").detach();
        if (sfRestClient.PageServerPingUserNotificationShown) {
            thisClient.DisplayUserNotification();
            sfRestClient.PageServerPingUserNotificationShown = false;
        }
    if (showLog) {
        const pct = Math.round((sfRestClient.PageServerPingOK / sfRestClient.PageServerPingAttempts) * 100).toFixed(2);
        console.log(`pingServer(${marker},${id},${pct}%) - ${responseText}; Next: ${nextMS}ms at ${new Date(Date.now() + nextMS).toLocaleTimeString()}`);
    }
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
            top?.sfClient.DisplayUserNotification(`Warning: Server not responding ${responseText}`);
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
    self.$("SPAN#spnDashOWarning.sfPingHealthTip").detach();
    self.$("SPAN.clsBrandingFooterText")
        .append(`<span id='spnDashOWarning' class='sfPingHealthTip' title='${responseText}'>Weak server connection. (${(Math.round((sfRestClient.PageServerPingOK / sfRestClient.PageServerPingAttempts) * 100).toFixed(2))}% successful)</span>` );

    console.log(`pingServer(${marker},${id},${Math.round((sfRestClient.PageServerPingOK / sfRestClient.PageServerPingAttempts) * 100).toFixed(2)}%) - failed ${responseText}; Next ${nextMS}ms`);
    return continueAutoRetry;
}

    /** Returns current time in minutes */
    public TODInMinutes():number {
        var d = new Date();
        return (d.getHours() * 60) + d.getMinutes();
    }

    /**
     * Indicates if the app is in dev mode (often used to control logging)
     * @param minVerbosity one of the logging levels, the lower the value specified, the more likely this method will return true.
     * @returns true if DevMode is enabled and the current logging level exceeds verbosityOver
     *
     * @comment Turn DevMode on or off from console: top.sfClient.exports.sfRestClient._WCC.DevMode = false; (or true)
     */
    public DevMode(minVerbosity?: LoggingLevels ) : boolean {
        let result = top?.sfClient?.GetPageContextValue("DevMode",false);
        if (!result && !location.hostname.includes(".")) result = true;
        if (minVerbosity && result) {
            result = (sfRestClient._Options.LogLevel >= minVerbosity)
        }
        return result;
    }

    /** Returns a UI object for working with a database field */
    public DBF2TableandTblField(source : string | JQuery<HTMLElement>) :TableAndFieldInfo {
        var result : TableAndFieldInfo = { isValid: false, table: "", field: "", dbf: "", isRO: false };
        let dbf = "";
        if (typeof source === "object" && typeof source.data === "function" && source.hasData("dbf")) dbf = source.data("dbf");
        if (typeof source === "string") dbf = source;

        if (!dbf) return result;
        var DBFParts = dbf.split(".");
        result.dbf = dbf
        if (DBFParts.length === 2) {
            result.isValid = true;
            result.table = DBFParts[0];
            result.field = DBFParts[1];
            if (result.table.sfStartsWithCI("SPR")) result.isRO = true;
            if (result.field.sfStartsWithCI("cmp")) result.isRO = true;
        };
        return result;
    }


    /** returns true if Event Tracing is on (1) or if Dev Mode (0) AND the event name is not filtered out by Options.WxEventFilter
     *
     * @argument eventName the event name, for example onBeforeRender
     * @returns true if event tracing is on
     * @comment When sfRestClient._Options.WxEventTraceMode === 0, always returns false
     */
    public EventTrace(eventName: string) : boolean {
        return  ( sfRestClient._Options.WxEventTraceMode === 1 ||
                  ( sfRestClient._Options.WxEventTraceMode === 0 &&
                    top?.sfClient.GetPageContextValue("DevMode",false)
                   )
                ) &&
                     sfRestClient._Options.WxEventFilter.test(eventName);
    }


    /**
     * Not intended for production use: Clears localStorage, sessionStorage and indexedDB
     * This method preserves SetOptions, including log level 
     * @see SaveOptions()
     */
    public QAClearEnvironment( ):void {
        var InGlobalInstance = this.IsGlobalInstance();
        console.warn("sfRestClient.QAClearEnvironment()",  InGlobalInstance ? " Global" : "",", UPRC:",sfRestClient._UserPermitResultCache.size);
        let currentOptions = this.SetOptions();
        let currentLoggingLevel  = currentOptions.LogLevel;
        sessionStorage.clear();
        localStorage.clear()
        PartStorageData.ClearCache();
        indexedDB.deleteDatabase("spitfireApp");
        localStorage.setItem('SavedLoggingLevel',`${currentLoggingLevel}`);
        if (this.DevMode()) this.SaveOptions(currentOptions);
        if (sfRestClient.IsPowerUXPage()) {
            setTimeout("top.location.reload();",234);
            //setTimeout(`top.location.href = '${this._SiteURL}/wx/.html#!/main/home';`,234);  << bad on doc page
        } 
    }

    /** Stashes options in sessionStorage (perhaps for a page reload) 
     * @param currentOptions if specified, stored, otherwise current options
    */
    public SaveOptions(currentOptions?: SFRESTClientOptions):void {
        if (!currentOptions) currentOptions = this.SetOptions();
        sessionStorage.setItem('SFRestClientOptions',JSON.stringify(currentOptions));       
    }

    protected activateDynamicJS(RESTClient : sfRestClient,keyName: string, value: string) {
        if (typeof sfRestClient._WCC._DynamicJS === "string" && sfRestClient.IsPowerUXPage()) {
            if (sfRestClient._Options.LogLevel >= LoggingLevels.Verbose) console.log(`Activating Dynamics JS {value}`);
            if (!(top as any).exports) (top as any).exports = {};
            var djs: string[] = JSON.parse(sfRestClient._WCC._DynamicJS);
            if (djs) RESTClient.LoadDynamicJS(djs);
        }
    }

    public readonly  EmptyKey: GUID = "00000000-0000-0000-0000-000000000000";
    public readonly  EmptyDate: string     = "0001-01-01T00:00:00";
    public readonly  EmptyTime: number     = -62135579038000;
    protected _CachedDVRequests: Map<string, Promise<string | null>> = new Map<string, Promise<string | null>>();
    protected static _DialogCoordinateCache: Map<number, CoordinateWithSize> = new Map<number, CoordinateWithSize>();
    protected static _UserPermitResultCache: Map<string, number> = new Map<string, number>();
    protected static PermitMapLoaded() :boolean {
        return sfRestClient._UCPermitMap && "WORK" in sfRestClient._UCPermitMap;
    }
    protected static _IconMap: {[key:string]: string | Date} | null;
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
             api_session_permits_map: "sfUCFunctionNameMap",
             api_icon_map: "sfIconMap"
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

     private static ResolvedPageInfo = {
         _PageName: "tbd",
         _typeID: <PageTypeName> 0,
         _ValidHash: 0,
         get LastResolvedPageName() {
            return this._PageName;
        },
        get LastResolvedPageTypeName() {
            return this._typeID;
        } ,
        isHashMatch(test:number) : boolean { 
            return test === this._ValidHash;
        },
        setInfo(newHash: number, newPageName:string, newTypeID: PageTypeName ) {
            if (newHash && this._ValidHash && newHash !== this._ValidHash) {
                if (self.sfClient?.DevMode(LoggingLevels.Debug)) console.log(`PageInfo.set ${newPageName} #${newHash} `);
                this._ValidHash = newHash; 
            }
            else {
                // special case...
                console.log(`PageInfo.replace ${this.LastResolvedPageName} with ${newPageName} #${this._ValidHash}`);
            }
            if (self.sfClient?.DevMode()) console.log(`PageInfo.set ${newPageName} `);
            if (newHash) this._ValidHash = newHash; // special case...
            this._PageName = newPageName;
            this._typeID = newTypeID;
        }

     };
     private ThisInstanceID: number;


    constructor() {
        this.ThisInstanceID = sfRestClient.InstanceSerialNumberSource++;

            sfRestClient.ResolveSiteRootURLs();
            this._SiteURL = sfRestClient.__SiteURL;
            this._SiteRootURL = sfRestClient.__SiteRootURL;

        this.staticBase = sfRestClient as any;
        this.exports = _SwaggerClientExports;
        this.exports.$ = $;
        this.exports.sfRestClient = sfRestClient;
        this.exports.LoggingLevels = LoggingLevels;
        this.exports.sfProcessDTKMap = sfProcessDTKMap;
        const SavedOptions = sessionStorage.getItem('SFRestClientOptions');
        if (SavedOptions) {
            try {
                this.SetOptions(JSON.parse(SavedOptions));
                console.log("DEV: options restored from sessionStorage('SFRestClientOptions');  To reset, use sessionStorage.clear() and then CTRL+F5");
            } catch (error) {
                console.warn("DEV: options NOT restored from sessionStorage('SFRestClientOptions');",error);              
            }

        }
        const SavedLoggingLevel = localStorage.getItem("SavedLoggingLevel");
        if (!SavedLoggingLevel && location.protocol !== "https:") console.log("DEV: Set default logging level using localStorage.setItem('SavedLoggingLevel',9);");
        else {
            const defaultLoggingLevel = (SavedLoggingLevel) ?parseInt(SavedLoggingLevel) : NaN;
            if (!Number.isNaN(defaultLoggingLevel)) {
                this.SetOptions({LogLevel: defaultLoggingLevel});
                console.log(`DEV: logging level set from localStorage.setItem('SavedLoggingLevel',${defaultLoggingLevel} );`);
            }
        }

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
                // if (!$.hasData) $.fn.extend({hasData: function (this:JQuery<HTMLElement>, name:string):boolean {
                //     return this.data(name) !== undefined;
                // }});
                sfRestClient.ExternalToolsLoadedPromise = RESTClient.AssureJQUITools(self.$("div").first());
                if (self.$("title").text().length === 0 ) self.$("title").text("Spitfire PM");
            }
        });

        this.LoadUCFunctionMap().then(() =>{
            if (!window.sfClient && !sfRestClient._GlobalClientConstructFlag) {
                sfRestClient._GlobalClientConstructFlag = true;
                window.sfClient = new sfRestClient();
                if (!window.$) window.$ = $;
                if (!top!.$) top!.$ = $;
                var RESTClient = window.sfClient;

                self.$(function DOMReadyNow() {
                    if (sfRestClient._Options.LogLevel >= LoggingLevels.Verbose) console.log("sfClient: DOM Ready...");
                    if (!RESTClient.IsDocumentPage() && top && !(top?.name)
                        && (!RESTClient.IsHomeDashboardPage() || !(RESTClient.GetPageQueryParameterByName("uid")))
                        && ((RESTClient.ResolvePageTypeName() & RESTClient.PageTypeNames.Unauthenticated) === 0) 
                    ) top.name = "Dashboard";
                    RESTClient.activateDynamicJS(RESTClient,"_DynamicJS", "On Ready");

                    self.$("body").off("sfClient.SetWCC__DynamicJS").on("sfClient.SetWCC__DynamicJS", function dynamicJSEventHandler() {
                        RESTClient.activateDynamicJS(RESTClient,"_DynamicJS", "event");
                    });
               });

               sfRestClient.StartSignalRClientHub(); // for classic pages, XB pages are started after lazy load of SignalR
               sfRestClient._GlobalClientConstructFlag = false;
            }
        });
    }
};