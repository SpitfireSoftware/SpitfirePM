import { GoogleAnalyticPayload } from "./globals";

export class APIClientBase {
    static _SiteURL : string | null = null;
    private static  GAClientID : string | undefined = undefined;
    private static GAIgnoreActions = {account: true, session:true, suggestions: true, viewable: true};
    public getBaseUrl( baseURL : string) : string {
        if (APIClientBase._SiteURL === null) {
            var ApplicationPath = window.location.pathname;
            ApplicationPath = ApplicationPath.substring(1, ApplicationPath.length === 1 && ApplicationPath === "/" ? 1 : ApplicationPath.substring(1).indexOf("/") + 1);
            APIClientBase._SiteURL = `${window.location.origin}/${ApplicationPath || 'sfPMS'}`;
        }
        return APIClientBase._SiteURL;
    }

    protected transformResult(url: string, response: Response, processor: (response: Response) => any) {
         const rxAPIURL = /\/\/.+\/api\/(?<controler>\w+)\/(?<endpoint>.*?)(\?|$|\s)/gm;
        const match = rxAPIURL.exec(url); // vpgName, args, width, height
        if (match && match.groups && match.groups.controler && match.groups.endpoint) {
            if (!(match.groups.controller in APIClientBase.GAIgnoreActions)) this.GAAPIEvent(match.groups.controler, match.groups.endpoint);
        }
        else console.log(`REST ${url} non-GA `,match);
        return processor(response);
    }

    protected GAAPIEvent(action:string, label: string) : JQuery.Promise<any> | undefined {
        if (!APIClientBase.GAClientID) return undefined;
        if (action=="session" && label == "who") return undefined;
        return APIClientBase.GAMonitorEvent(APIClientBase.GAClientID,"npmREST",action,label, 1);
    }

    public static GAMonitorEvent(  clientID:string , category:string, action:string, label:string, value:number) : JQuery.Promise<any> | undefined {

        if (!clientID && ! APIClientBase.GAClientID) return undefined;
        if (!APIClientBase.GAClientID) APIClientBase.GAClientID = clientID;

        var payload : GoogleAnalyticPayload = {
            v: 1,
            t: "event",
            tid: '',  // set by send
            cid: APIClientBase.GAClientID,
            ec: category,
            ea: action,
            el: label,
            ev: value
        }

        return APIClientBase.GAMonitorSend(payload);
                        // .done(function (data, textStatus, jqXHR) {
                        //     console.log(`GAMonitor(${category}:${action}) ${label} ok`);
                        // })
                        // .fail(function (jqXHR, textStatus) {
                        //     console.warn(`GAMonitor(${category}:${action}) failed: ${jqXHR.responseText}`);
                        //     APIClientBase.GAMonitorSendFailed = true;
                        // });

    }
    static GAMonitorSendFailed: boolean = false;


    /** POSTS supplied payload to Google Analytics
     *  @summary - Defaults property ID (tid) to sfPMS and version (v) to 1
     *          - One failure disables all future tracking on this client instance
     *  @async uses jQuery.ajax
     *  @see  https://developers.google.com/analytics/devguides/collection/protocol/v1/devguide#page
     *
    */
    public static GAMonitorSend(payload:GoogleAnalyticPayload ): JQuery.Promise<any> {
        if ((typeof (APIClientBase.GAMonitorSendFailed) === "boolean") && (APIClientBase.GAMonitorSendFailed)) {
            var darnSoon = $.Deferred();
            var GASendDone = darnSoon.promise();
            darnSoon.resolve("fake");  //makes GASendDone be ready
            return GASendDone;
        }
        if (!payload.tid) payload.tid = 'UA-6465434-4';
        if (!payload.v) payload.v = 1;
        return $.ajax({
            type: "POST",
            url: "https://www.google-analytics.com/collect",
            async: true,
            data: payload
        }).fail(function (jqXHR, textStatus) {
            console.warn(`GAMonitorSend() failed: ${jqXHR.responseText}`,payload);
            APIClientBase.GAMonitorSendFailed = true;
        });
    }

}