import { BrowserExtensionChecker } from "./BrowserExtensionChecker";
import { NVPair, sfRestClient } from "./sfRESTClient";

interface Window {
    sfApplicationRootPath: string;
}



interface Math {
    imul(a: number, b: number) : number;
}

declare global {

    interface AfterDocumentSaved {(dtk:string, project: string):void}
    interface DashboardOpenLink {(targetWindowName: string, request: string):void}
    interface DashboardRefreshPartByName {(partName: string):void}
    interface DocumentWindowOpen {(id:string, DocSessionKey:string, dsCacheKey:string, DWONotificationCount:number, DataLockFlag:number, WatchedFileKeys:string[]):Promise<string> }
    interface DocumentWindowClose {(id:string, DocSessionKey:string, dsCacheKey:string):Promise<string> }

    interface DMKMethod {(dmk:GUID):void}
    interface RecentDocumentEntry { (dmk: GUID, title: string):void}
    interface DocumentChangeBy { (loginSessionKey: GUID, otherUserName :string,   changeCount:number, nextEvent:string):void }
    interface FlushClientDV { (dvName:string, pValue: string, dependsOn: string[] | undefined):void }
    interface FlushClientResource { (resourceType:'Project' | '*', project: string, extra: string | undefined):void }
    interface HeartbeatMonitor { (dsk: string, rep: number):Promise<string>}
    interface NowViewingDocument {(targetWindowName: string, loginSessionKey: GUID, request: string):void}
    // sfClass interfaces
    interface DocumentChangedByAnotherUser {(nextEvent:string, otherUserName:string, changeCount:number): void}
    interface RefreshDocPart {(partName:string | "DocAIR" | "DocBody", arg?:string):void}
    interface RefreshPartbyName {(partName: string, eventTarget?: string, eventArg?: string):void}
    interface RefreshPageParts {(eventTarget: string, eventArg:string):void}
    //interface CEPutSourceElementValue {(el: JQuery, newVal:string|number, pv: string|number):void}
    interface CEPStoreElementValue {(el: JQuery,$EDIT: JQuery, $FeedBack: JQuery,newVal:string|number, finalValue?:string, validateAK?:boolean):void}
    interface StringThenVoid { (stringValue:string): void}
    interface StringThenBooleanPromise { (stringValue:string): Promise<boolean>}
    interface SimpleBooleanPromise {(): Promise<boolean>}
    interface SimpleMethod {():void}
    // sfClassic interfaces ^^^

    interface sfPMSHub {

        client: {
            ReConnectDelay: number;
            ForWindowRX : RegExp //= /^javascript.+-(?<WindowName>[a-z0-9]{12})'\);/
            SkipAutoReconnect: boolean;
            addRecentDocument: RecentDocumentEntry
            afterDocumentSaved: AfterDocumentSaved;
            dashboardOpenLink: DashboardOpenLink;
            dashboardRefreshPartByName: DashboardRefreshPartByName;
            documentChangeBy: DocumentChangeBy;
            nowViewingDocument: NowViewingDocument;
            onApplicationStart: StringThenVoid;
            onFlushClientDV: FlushClientDV;
            onFlushClientResource: FlushClientResource;
            systemNotificationHasChanged: any;
            systemWideUserNotification: any;
            tickleSession:SimpleMethod;
            userLoggedOut:SimpleMethod;
        }
        connection: {

            logging: boolean;
            state: number;
            transport: {
                name: string;
            }
        }
        server: {
            activateExchangeToken: StringThenBooleanPromise;
            dashboardHeartbeat: HeartbeatMonitor;
            dashboardOpenLink: DashboardOpenLink;
            documentWindowOpen: DocumentWindowOpen;    
            onDocumentWindowClose: DocumentWindowClose;    
            
            sessionAlive: SimpleBooleanPromise;
            subscribeToDocument:  DMKMethod;
            writeToServerLog: {(msg:string):void};
        }

    }

    export interface iWebixObjectSkeleton {
        config: object | {():object};
        $scope: any;
    }
    export interface iWebixCommon {
        alert: {(options: {title:string,
                            ok?:string, 
                            text:string,
                            type?:"alert-warning" | "alert-error"}):Promise<boolean> };
        confirm: {(options: {title:string,
            ok?:string, 
            text:string,
            type?:"alert-warning" | "alert-error"}):Promise<boolean> };
        message: {(msg:string| iWebixMessageConfig):void };
        
    }
    export interface iWebixSpinner {
        show: {():void};
    }

    export type iWebixMessageType = 'info' | 'debug' | 'success' | 'error';

    export interface iWebixMessageConfig { //extends webix.WebixMessageConfig 
        text: string,
        type: iWebixMessageType,
        expire: number,
        id: string
   }
   export interface iWebixConfirm  {
    title: string,
    text: string,
    type:  "confirm-warning" | "confirm-error",
    expire: number,
    id: string
    ok: string, //  the text of the 'Ok' button
    cancel: string //  the text of the 'Cancel' button
    css: string ,
}



    export interface iWebixApp {
        attachEvent: { (eventName:string, handler: Function):void };
        blockEvent: { ():void };
        callEvent: {eventName:string,args:any[]};
        config: NVPair;
        detachEvent: { (eventName:string):void};
        hasEvent: { (eventName:string):boolean};
        unblockEvent: { ():void };
        webixJet: boolean;
        [key:string]:any;
    }
    export interface iRouteHelperService {
        _appContext: iWebixApp ;
        openDocument(dmk:GUID):Promise<Window>;
        CloseInSeconds(msg:string,seconds:number):void;
        helpers: {
            OpenEmail:{(to: string, subject: string, cc?: string, body?: string): void}
            GenerateMessage(what: string, type: iWebixMessageType): iWebixMessageConfig;
            isEmptyValue(value: any): boolean ;
        }
    }

    export interface iPowerUXDocumentUI {
        ReallyReady: Promise<boolean>;
        app: iWebixApp;
        docDesc: string;
        documentId: GUID;
        documentModel: iDocumentModelBase;
        confirmStatus: {(newStatusCode: string, menuItem: HTMLElement | string):void};
        createNextDoc: {():void};
        refreshHeader: {():void};
        sendStatusChangeToServer: {(oldStatus:string):Promise<boolean>};
        spinner: iWebixSpinner;
        $scope: any;

    }

    export interface iDocumentModelBase {
        
        DMK: {():GUID}; 
        DocumentTypeKey: {():GUID }; 
        Project: {():string};  
        isCurrentRoutee: {(): boolean};
        isUIEnabled: {(): boolean};
        // and much more!
        [key:string]: any;
    }

     interface Window {
        $: JQueryStatic;
        $$: {(t:string|object):iWebixObjectSkeleton};
        webix?: iWebixCommon;
        jQuery: JQueryStatic;
        sfClient: sfRestClient;
        sfPMSHub: sfPMSHub;
        ClickOnceExtension: BrowserExtensionChecker;  // not the best name, needed by legacy UI
        CLICKONCE_EXTENSION_IS_INSTALLED: boolean | undefined;

        WindowHasFocus: boolean;

        // sf classic
        clearHomeTabCount: any;
        DocumentChangedByAnotherUser:DocumentChangedByAnotherUser;
        PostbackRefresh: RefreshPageParts;
        RefreshDocPart: RefreshDocPart;
        refreshPartbyName: RefreshPartbyName;
        refreshPageParts: RefreshPageParts;
        //sfPutEditUpdateSourceElement:CEPutSourceElementValue;
        sfPutEditStoreValue: CEPStoreElementValue;

        // sf classic ^^^

    }
    interface JQueryStatic {
        datepicker: any;
        signalR: any;
        connection: {
            hub: any;
            sfPMSHub: sfPMSHub
        }
    }
    interface JQuery {
        datepicker: any;
        dialog:  any;
        button: any;
        autocomplete: any;
        hasData:any;
    }
}

export type GoogleAnalyticPayload = { v: number,
        /** event, pageview, etc */
        t: string,
        /** Property ID UA-xxxx or G-9NW0XG0RRE */
        tid?: string,
        /** Client id (usually spitfire site id) */
        cid?: string,
        ec?: string,
        ea?: string,
        el?: string,
        dl?: string | undefined,
        dt?: string | undefined,
        ev?: number
}

export type G4Events  = [
    {
      name : string,
      params : {
         items? : {[key:string]: any},
         [key:string]: any
      }
    }
  ]

export type GA4Payload = {
    client_id: string,
    non_personalized_ads?: boolean,
    events: G4Events
}



export type GUID = string //& { isGuid: true };
declare let SPITFIRE_API_SERVER_URL: string;