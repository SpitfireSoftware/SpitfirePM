
//import { contains } from "jquery";
import { GUID } from "./globals";
import  { sfApplicationRootPath } from "./string.extensions";
import { ActionItemsClient, AlertsClient, ContactClient, ContactFilters, IUCPermit, LookupClient, SessionClient, UCPermitSet, UICFGClient, UIDisplayConfig, UIDisplayPart } from "./SwaggerClients"
import * as $ from 'jquery';



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
 * Options for QAPopInfo
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


export class sfRestClient {
    version = 2020;
    /**
      *  Async builds a View Model for the rawData, given part context.  - use .then()
      */
    BuildViewModelForContext(partName: string, context: string, forDocType: GUID | undefined, rawData: any): Promise<DataModelCollection> {
        if (!this._z.WCCLoaded) this.LoadUserSessionInfo();
        var thisPart: PartStorageData | undefined = PartStorageData.PartStorageDataFactory(this, partName, forDocType, context);
        if (!thisPart) new Error("Count not resolve part {0}".sfFormat(PartStorageData.GetPartContextKey(partName, forDocType, context)));
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
     *  Applies CFG data to raw Data Model, returns promise that resolves when View Model is ready
     */
    protected _ConstructViewModel(thisPart: PartStorageData, rawData: any): Promise<DataModelCollection> {
        if (!thisPart || !thisPart.CFG || !thisPart!.CFG.UIItems) new Error("Cannot construct this ViewModel");
        var StartAtTicks: number = Date.now();
        var DataModelBuildKey: string = PartStorageData.GetDataModelBuildContextKey();
        var FailCount: number= 0;
        thisPart!.DataModels.set(DataModelBuildKey, rawData)
        thisPart!._PromiseList = [];

        // this loop builds PromiseList
        thisPart!.CFG!.UIItems!.forEach(element => thisPart!.RestClient._ApplyUICFGtoRawData(element, thisPart!, DataModelBuildKey));

        var ViewModelPromise: Promise<DataModelCollection> = new Promise<DataModelCollection>((resolve) => {
            $.when.apply($, thisPart!._PromiseList!)
                .done(function () {
                    resolve(thisPart!.DataModels.get(DataModelBuildKey!)!);
                    thisPart!.DataModels.delete(DataModelBuildKey);
                    if (thisPart!.RestClient._Options.LogLevel >= LoggingLevels.Verbose) console.log("ViewModel {0} complete in {1}t".sfFormat(DataModelBuildKey, Date.now() - StartAtTicks));
                }).fail(function() {
                    if (FailCount === 0) {
                        resolve(thisPart!.DataModels.get(DataModelBuildKey!)!);
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
    */
    CheckPermit(ucModule: string, ucFunction: string, optionalDTK?: string, optionalProject?: string, optionalReference?: string): JQueryPromise<number> {
        var RESTClient: sfRestClient = this;
        var DeferredResult = $.Deferred();
        var permitCheck = DeferredResult.promise();
        if (!RESTClient._z.WCCLoaded) RESTClient.LoadUserSessionInfo();

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
        var ThisProjectPermitSet: UCPermitSet | undefined;
        var UCFKDeferredResult = $.Deferred();
        var UCFKPromise = UCFKDeferredResult.promise();
        var PPSDeferredResult = $.Deferred();
        var PPSPromise = PPSDeferredResult.promise();
        if (ucModule.length === 36) {
            UCFK = ucModule;
            UCFKDeferredResult.resolve(UCFK);
        }
        else {
            RESTClient.LoadUCFunctionMap().done(function () {
                UCFK = RESTClient._UCPermitMap[ucModule][ucFunction];
                if (!UCFK) console.warn("CheckPermit could not find {0}|{1} - verify proper case!".sfFormat(ucModule, ucFunction));
                UCFKDeferredResult.resolve(UCFK);
            });
        }

        if (!(RESTClient._LoadedPermits.has(optionalProject))) {
            var api = new SessionClient(this._SiteURL);
            var apiResult: Promise<UCPermitSet | null> = api.getProjectPermits(optionalProject);
            if (apiResult) {
                apiResult.then((r) => {
                    if (r) {
                        console.log("Loaded Project {0} Permit set from server...".sfFormat(optionalProject));
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

        var finalCheck = [PPSDeferredResult, UCFKDeferredResult];

        $.when.apply($, finalCheck).done(function () {
            var finalPermit = 0;
            $.each(ThisProjectPermitSet?.Permits, function OneCapabilityCheck(ThisUCFK, capabilitySet) {
                if (ThisUCFK === UCFK) {
                    $.each(capabilitySet, function OnePermitCheck(_n, p: IUCPermit) {
                        var thisPermitValue = 0;
                        if (p.IsGlobal || RESTClient._PermitMatches(p, optionalDTK!, optionalReference)) {
                            if (p.ReadOK) thisPermitValue += 1;
                            if (p.InsOK) thisPermitValue += 2;
                            if (p.UpdOK) thisPermitValue += 4;
                            if (p.DelOK) thisPermitValue += 8;
                            if (p.BlanketOK) thisPermitValue += 16;
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
        var DependsOnSet: string[] = ["", "", "", ""];
        if (Array.isArray(dependsOn)) {
            $.each(dependsOn, function (i, v) { DependsOnSet[i] = v; });
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

    $GCI.dialog({
        title: queryOptions.DialogTitle, height: "auto", width: "auto", position: "top center"
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

    return forElement;
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
     *
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

        if (RESTClient._UCPermitMap._etag.w === 0) {
            // see about localStorage
            var ls = JSON.parse(localStorage.getItem(RESTClient._z.lsKeys.api_session_permits_map)!);
            if (ls && typeof ls._etag.w === "number") {
                console.log("Loaded Function Map from localStorage...");
                RESTClient._UCPermitMap = ls;
            }
        }
        if ((Date.now() - RESTClient._UCPermitMap._etag.w) < (this._Options.DVCacheLife * 4)) {
            DeferredResult.resolve(RESTClient._UCPermitMap);
            return permitCheck;
        }


        var GetPermitMapRequest = RESTClient._GetAPIXHR("session/permits/map?etag=" + Object.keys(RESTClient._UCPermitMap._etag)[0]).done(function DoneGetPermitMapRequest(r) {
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
    /**
     * Loads or Updates WCC session attributes
    */
    LoadUserSessionInfo(): Promise<WCCData> {
        var RESTClient: sfRestClient = this;

        var api: SessionClient = new SessionClient(this._SiteURL);
        var apiResult: WCCData | null = api.getWCC();
        if (!apiResult) new Error("LoadUserSessionInfo failed to getWCC");
        return apiResult.then((r: WCCData) => {
            $.each(r, function SetWCCProperties(pname: string | number, pvalue) {
                RESTClient._WCC[pname] = pvalue;
            });
            RESTClient._z.WCCLoaded = true;
        });
    }

    /**
     * Sets sfRestClient Options
     *
     * Example: SetOptions() { LogLevel: LoggingLevel.Verbose, DVCacheLife: 22*60000, PopDocForceXBUI: true, PopDocXBURL: "{0}#!/doc/home?id={1}"});
     *
     * PopDocXBURL can use {0} place holder for site path and {1} placeholder for document ID
    */
    public SetOptions(options: { [key: string]: any }): void {
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
        DVCacheLife:  16 * 60000, // 16 minutes
        LogLevel:  LoggingLevels.None,
        /**
         * When true PopDoc() will always use new UI
         */
        PopDocForceXBUI :  false,
        PopDocLegacyURL:   '{0}/DocDetail.aspx?id={1}',
        PopDocXBURL:  "{0}#!/document/home?id={1}"
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


    _ApplyUICFGtoRawData(item: UIDisplayConfig, thisPart: PartStorageData, DataModelBuildKey: string) {

        if (item.DV || item.LookupName ||
            (item.OtherProperties && item.OtherProperties.DataType && item.OtherProperties.DataType === "Guid")) {
            if (item.DV) {
                if (this._Options.LogLevel >= LoggingLevels.Debug) console.log("_ApplyUICFGtoRawData {0} DV {1} ".sfFormat(item.ItemName, item.DV));
                thisPart.DataModels.get(DataModelBuildKey)!.forEach(function DataModelRowDVApplication(rawRow: any, index: number) : void{
                    var ThisSuffix : string = "_dv";
                    if (!((item.DataField + ThisSuffix) in rawRow)) {
                        var FieldValue: any = thisPart.RestClient.FieldValueFromRow(rawRow, item.DataField!);
                        ///!!! future: handle depends on #DocMasterDetail.project
                        var DependsOn : string[] | undefined;
                        if (item.DependsOn) DependsOn = thisPart.RestClient.GatherDependsOnValues(item.DependsOn,rawRow);
                        thisPart._PromiseList!.push(thisPart.RestClient.GetDV(item.DV!, FieldValue, DependsOn, false).then(function then_AddDVToDModel(r) : void {
                            thisPart.RestClient._AddDVValueToDataModel(thisPart, DataModelBuildKey, index, item.DataField!, ThisSuffix, r);
                        }));
                    }
                });
            }
            if (item.UIType === "contact") {
                thisPart.DataModels.get(DataModelBuildKey)!.forEach(function DataModelRowDVContactActiveCheck(rawRow: any, index: number) : void {
                    var ThisSuffix : string = "_IsInactive";
                    if (!((item.DataField + ThisSuffix) in rawRow)) {
                        var FieldValue: any = thisPart.RestClient.FieldValueFromRow(rawRow, item.DataField!);
                        if (!FieldValue) return;
                        thisPart._PromiseList!.push(thisPart.RestClient.GetDV("sfUserActive", FieldValue, "", false).then(function then_AddDVActiveToDModel(r) {
                            if(!r)
                                thisPart.RestClient._AddDVValueToDataModel(thisPart, DataModelBuildKey, index, item.DataField!, ThisSuffix ,true);
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

    readonly EmptyKey: GUID = "00000000-0000-0000-0000-000000000000";
    protected _CachedDVRequests: Map<string, Promise<string | null>> = new Map<string, Promise<string | null>>();
    protected _UserPermitResultCache: Map<string, number> = new Map<string, number>();
    protected _UCPermitMap: any = {
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
        DocSessionKey: "00000000-0000-0000-0000-000000000000",
        DocTypeKey: "00000000-0000-0000-0000-000000000000",
        DevMode: false,
        dsCacheKey: "1",
        UserKey: "00000000-0000-0000-0000-000000000000"
    }
    protected _z: any = {
        lsKeys: {
            api_session_permits_map: "sfUCFunctionNameMap"
        },
        WCCLoaded: false
    }



    constructor() {
        if (typeof sfApplicationRootPath === "string") {
            this._SiteURL = sfApplicationRootPath;
        }
        else {
            var ApplicationPath = window.location.pathname.substr(1, window.location.pathname.substr(1).indexOf("/"));
            this._SiteURL = `${window.location.origin}/${ApplicationPath || 'sfPMS'}`;
        }
        this.LoadUserSessionInfo().then(() => this.LoadUCFunctionMap());
    }
};

