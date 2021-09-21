import { BrowserExtensionChecker } from "./BrowserExtensionChecker";
import { sfRestClient } from "./sfRESTClient";

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

    interface DMKMethod {(dmk:GUID):void}
    interface DocumentChangeBy { (loginSessionKey: GUID, otherUserName :string,   changeCount:number, nextEvent:string):void }
    interface HeartbeatMonitor { (dsk: string, rep: number):Promise<string>}
    interface NowViewingDocument {(targetWindowName: string, loginSessionKey: GUID, request: string):void}
    // sfClass interfaces
    interface DocumentChangedByAnotherUser {(nextEvent:string, otherUserName:string, changeCount:number): void}
    interface RefreshPartbyName {(partName: string, eventTarget?: string, eventArg?: string):void}
    interface RefreshPageParts {(eventTarget: string, eventArg:string):void}
    interface SimpleMethod {():void}
    // sfClassic interfaces ^^^

    interface sfPMSHub {

        client: {
            ReConnectDelay: number;
            ForWindowRX : RegExp //= /^javascript.+-(?<WindowName>[a-z0-9]{12})'\);/

            afterDocumentSaved: AfterDocumentSaved;
            dashboardOpenLink: DashboardOpenLink;
            dashboardRefreshPartByName: DashboardRefreshPartByName;
            documentChangeBy: DocumentChangeBy;
            nowViewingDocument: NowViewingDocument;
            onApplicationStart: SimpleMethod;
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
            dashboardHeartbeat: HeartbeatMonitor;
            sessionAlive: SimpleMethod;
            subscribeToDocument:  DMKMethod;
        }

    }

    interface Window {
        $: JQueryStatic;
        jQuery: JQueryStatic;
        sfClient: sfRestClient;
        sfPMSHub: sfPMSHub;
        ClickOnceExtension: BrowserExtensionChecker;  // not the best name, needed by legacy UI

        WindowHasFocus: boolean;

        // sf classic
        clearHomeTabCount: any;
        DocumentChangedByAnotherUser:DocumentChangedByAnotherUser;
        refreshPartbyName: RefreshPartbyName;
        refreshPageParts: RefreshPageParts;

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




export type GUID = string //& { isGuid: true };
declare let SPITFIRE_API_SERVER_URL: string;