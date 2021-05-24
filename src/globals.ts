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
        sfClient: sfRestClient;
    }
    interface JQueryStatic {
        datepicker: any;
    }
    interface JQuery {
        datepicker: any;
        dialog:  any;
    }
}

// interface JQueryStatic {
//     dialog() : Function;// : JQuery<HTMLElement>;
// }
// interface JQuery {
//     dialog() : Function;// : JQuery<HTMLElement>;
// }


export type GUID = string //& { isGuid: true };
declare let SPITFIRE_API_SERVER_URL: string;