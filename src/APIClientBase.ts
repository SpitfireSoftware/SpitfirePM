import { GoogleAnalyticPayload,GA4Payload } from "./globals";

export class APIClientBase {
    static _SiteURL : string | null = null;
    /** Spitfire Assigned Site ID  */
    private static  GAClientID : string | undefined = undefined;
    private static GAIgnoreActions = {account: true, session:true, suggestions: true, uicfg:true, viewable: true};
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

    protected GAAPIEvent(controllerAction:string, endpointLabel: string) : JQuery.Promise<any> | undefined {
        if (!APIClientBase.GAClientID) return undefined;
        if (controllerAction=="session" && endpointLabel == "who") return undefined;
        if (!APIClientBase.GAClientID) return undefined;

        let G4Payload : GA4Payload = {client_id:APIClientBase.GAClientID!,
            non_personalized_ads:true,
            "events":[{name:controllerAction,
                        "params":{"items":[],
                        "endpoint": endpointLabel
                          }}]};

        return APIClientBase.GA4MonitorSend(G4Payload);
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

        return APIClientBase.GA4MonitorSend(payload);
                        // .done(function (data, textStatus, jqXHR) {
                        //     console.log(`GAMonitor(${category}:${action}) ${label} ok`);
                        // })
                        // .fail(function (jqXHR, textStatus) {
                        //     console.warn(`GAMonitor(${category}:${action}) failed: ${jqXHR.responseText}`);
                        //     APIClientBase.GAMonitorSendFailed = true;
                        // });

    }
    static GAMonitorSendFailed: boolean = false;
    static GA4MonitorSendFailed: boolean = false;



    /** POSTS supplied payload to Google Analytics
     *  @summary - Defaults property ID (tid) to sfPMS and version (v) to 1
     *          - One failure disables all future tracking on this client instance
     *  @async uses jQuery.ajax
     *  @see  https://developers.google.com/analytics/devguides/collection/protocol/v1/devguide#page
     *  @obsolete Use GA4MonitorSend
    */
    public static GAMonitorSend(payload:GoogleAnalyticPayload ): JQuery.Promise<any> {

        if ((typeof (APIClientBase.GA4MonitorSendFailed) === "boolean") && (!APIClientBase.GA4MonitorSendFailed)) {
            return this.GA4MonitorSend(payload);
        }
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

      /** converts and posts supplied payload to Google Analytics v4
     *  @summary - Defaults property ID (tid) to sfPMS and version (v) to 1
     *          - One failure disables all future tracking on this client instance
     *  @async uses jQuery.ajax
     *  @see  https://developers.google.com/analytics/devguides/collection/protocol/ga4
     * Requests can have a maximum of 25 events.
     * Events can have a maximum of 25 parameters.
     * Events can have a maximum of 25 user properties.
     * User property names must be 24 characters or fewer.
     *       User property values must be 36 characters or fewer.
     * Event names must be 40 characters or fewer, may only contain alpha-numeric characters and underscores, and must start with an alphabetic character.
     * Parameter names (including item parameters) must be 40 characters or fewer, may only contain alpha-numeric characters and underscores, and must start with an alphabetic character.
     * Parameter values (including item parameter values) must be 100 character or fewer.
     * Item parameters can have a maximum of 10 custom parameters.
     * The post body must be smaller than 130kB.
     *
    */
       public static GA4MonitorSend(payload:GoogleAnalyticPayload | GA4Payload): JQuery.Promise<any> {
        if ((typeof (APIClientBase.GA4MonitorSendFailed) === "boolean") && (APIClientBase.GA4MonitorSendFailed)) {
            var darnSoon = $.Deferred();
            var GASendDone = darnSoon.promise();
            darnSoon.resolve("fake");  //makes GASendDone be ready
            return GASendDone;
        }
        const measurement_id = 'G-9NW0XG0RRE';
        const apiSecret = 'gCh1G03eRv2mIkT1uAiu0Q';
        let G4Payload : GA4Payload;
        if ( "t" in payload) {
            if (payload.t === "pageview") payload.ec = payload.t;
            if (!payload.tid) delete payload.tid;
            if (!payload.v) payload.v = 1;
            G4Payload = {client_id:payload.cid!,
                non_personalized_ads:true,
                "events":[{name:payload.ec!,
                            "params":{"items":[]
                              }}]};
            if (payload.ec === "npmREST") {
                if (payload.ea) G4Payload.events[0].params.controller = payload.ea;
                if (payload.el) G4Payload.events[0].params.endpoint = payload.el;
            }
            else {
                if (payload.ea) G4Payload.events[0].params.action = payload.ea;
                if (payload.el) G4Payload.events[0].params.label = payload.el;
            }
            if (payload.ev) G4Payload.events[0].params.value = payload.ev;
            if (payload.dl) G4Payload.events[0].params.url = payload.dl;
            if (payload.dt) G4Payload.events[0].params.title = payload.dt;
        }
        else G4Payload = payload;

        //console.log(`GA4MonitorSend() : `,G4Payload);

        return $.ajax({
            type: "POST",
            url: `https://www.google-analytics.com/mp/collect?api_secret=${apiSecret}&measurement_id=${measurement_id}`,
            async: true,
            data: JSON.stringify(G4Payload)
        }).fail(function (jqXHR, textStatus) {
            console.warn(`GA4MonitorSend() failed: ${jqXHR.responseText}`,G4Payload);
           // APIClientBase.GA4MonitorSendFailed = true;
        });
    }

}