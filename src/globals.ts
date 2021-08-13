import { BrowserExtensionChecker } from "./BrowserExtensionChecker";
import { sfRestClient } from "./sfRESTClient";

interface Window {
    sfApplicationRootPath: string;
}



interface Math {
    imul(a: number, b: number) : number;
}

declare global {
    interface Window {
        $: JQueryStatic;
        jQuery: JQueryStatic;
        sfClient: sfRestClient;
        ClickOnceExtension: BrowserExtensionChecker;  // not the best name, needed by legacy UI
        WindowHasFocus: boolean;
    }
    interface JQueryStatic {
        datepicker: any;
        signalR: any;
        connection: {
            sfPMSHub: any
        }
    }
    interface JQuery {
        datepicker: any;
        dialog:  any;
    }
}




export type GUID = string //& { isGuid: true };
declare let SPITFIRE_API_SERVER_URL: string;