import { GoogleAnalyticPayload,GA4Payload } from "./globals";

/** What a beforeSend hook receives: the subset of the old jqXHR surface the hook can still use */
export type SFBeforeSendRequest = { setRequestHeader(name: string, value: string): void };

export  class APIClientBase {
    static _SiteURL : string | null = null;
    private static _LastControler:string='';
    private static  _LastEndpoint:string='';
    private static _LastAt:number=0;
    /** Spitfire Assigned Site ID  */
    private static  GAClientID : string | undefined = undefined;
    private static GAIgnoreActions = {account: true, session:true, suggestions: true, uicfg:true, viewable: true};
    /** Set true when the current user has opted out of Analytics data collection (WCCData.GAFMOptOut) */
    private static _GAOptOut: boolean = false;

    /** Synchronizes the client's Analytics opt-out preference. Call whenever WCCData.GAFMOptOut becomes known/changes. */
    public static setGAOptOut(optOut: boolean): void {
        APIClientBase._GAOptOut = !!optOut;
    }

    // public static setBaseUrl(usingURL: string) {
    //     APIClientBase._SiteURL = usingURL;
    //     console.log('APIClientBase.setBaseUrl()....${APIClientBase._SiteURL}');        
    // }

// Regex to match ISO 8601 date strings (e.g., 2026-04-06T12:16:34Z)
    private readonly _dateFormat = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d*)?(?:[-+]\d{2}:?\d{2}|Z)?$/;

    // sadly jsonParseReviver is overwritten by nSwag
    protected jsonParseReviver: {(key: string, value: any):any} | undefined = undefined;
    // we will replace jsonParseReviver with this
    protected jsonParseReviverLogic: ((key: string, value: any) => any) | undefined = (key, value) => {
        if (typeof value === "string" && this._dateFormat.test(value)) {
            return new Date(value);
        }
        return value;
    };

    /**
     * Resolves the base URL for a generated client.
     * @param baseURL the default the generator baked in (ignored; logged only)
     * @param explicitBaseUrl the baseUrl the caller passed to the client constructor, if any
     * @remarks The Fetch template calls getBaseUrl(default, explicit) for every construction; the
     * JQueryPromises template only called it when no explicit URL was given.  Behaviour is kept
     * identical: an explicit URL is returned as-is and the date reviver is armed only on the
     * default path (see docs/modernization/FINDINGS.md, B1).
     */
    public getBaseUrl( baseURL : string, explicitBaseUrl?: string | null) : string {
        if (explicitBaseUrl !== undefined && explicitBaseUrl !== null) return explicitBaseUrl;

        // Re-arm the reviver function
        if (!this.jsonParseReviver)  this.jsonParseReviver= this.jsonParseReviverLogic;

        if (APIClientBase._SiteURL === null) {
            if (window.location.origin === "http://localhost" && window.location.pathname === "/powerux/") {
                console.log(`APIClientBase.getBaseUrl(${baseURL})....detected DEV path`);
                APIClientBase._SiteURL = `http://localhost/sfpms`;
            }
            else {
                var ApplicationPath = window.location.pathname;
                ApplicationPath = ApplicationPath.substring(1, ApplicationPath.length === 1 && ApplicationPath === "/" ? 1 : ApplicationPath.substring(1).indexOf("/") + 1);
                APIClientBase._SiteURL = `${window.location.origin}/${ApplicationPath || 'sfPMS'}`;
            }
            console.log(`APIClientBase.getBaseUrl(${baseURL})....${APIClientBase._SiteURL}`);
        }
        return APIClientBase._SiteURL;
    }

    /**
     * Hook invoked before every generated client request (replaces the jQuery.ajax beforeSend option
     * the previous generator template exposed).  Receives an adapter whose setRequestHeader() writes
     * into the request headers; nothing else of the old jqXHR surface is available.
     * @example accountClient.beforeSend = (xhr) => xhr.setRequestHeader("Authorization", "Bearer ...");
     */
    public beforeSend: ((xhr: SFBeforeSendRequest) => void) | undefined = undefined;

    /**
     * Called by every generated endpoint with the RequestInit it is about to pass to fetch.
     * Applies beforeSend (if set) and returns the options to use.
     */
    protected transformOptions(options: RequestInit): Promise<RequestInit> {
        if (typeof this.beforeSend === "function") {
            const headers = new Headers(options.headers ?? undefined);
            const adapter: SFBeforeSendRequest = {
                setRequestHeader(name: string, value: string): void { headers.set(name, value); }
            };
            this.beforeSend(adapter);
            options.headers = headers;
        }
        return Promise.resolve(options);
    }

    protected transformResult(url: string, response: Response, processor: (response: Response) => any) {
         const rxAPIURL = /\/\/.+\/api\/(?<controler>\w+)\/(?<endpoint>.*?)(\?|$|\s)/gm;
        const match = rxAPIURL.exec(url); // vpgName, args, width, height
        if (match && match.groups && match.groups.controler && match.groups.endpoint) {
            if (!(match.groups.controler in APIClientBase.GAIgnoreActions)) {
                const ep = match.groups.endpoint || '?';
                const ec = match.groups.controler || '';
                if (( (Date.now() - APIClientBase._LastAt ) > 1357) ||
                    ! APIClientBase._LastEndpoint.startsWith(ep.substring(0,1))  ||
                    APIClientBase._LastControler !== ec ) {
                        APIClientBase._LastAt = Date.now();
                        APIClientBase._LastEndpoint = ep;
                        APIClientBase._LastControler = ec;
                        this.GAAPIEvent(ec, ep);
                    }
            }
        }
        else console.log(`REST ${url} non-GA `,match);
        return processor(response);
    }

    protected GAAPIEvent(controllerAction:string, endpointLabel: string) : Promise<any> | undefined {
        if (APIClientBase._GAOptOut) return undefined;
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

    public static GAMonitorEvent(  clientID:string , category:string, action:string, label:string, value:number) : Promise<any> | undefined {

        if (APIClientBase._GAOptOut) return undefined;
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
    }
    static GAMonitorSendFailed: boolean = false;
    static GA4MonitorSendFailed: boolean = false;



    /** POSTS supplied payload to Google Analytics
     *  @summary Forwards to GA4MonitorSend; the Universal Analytics (/collect) transport this method
     *           used to fall back to was shut down by Google and has been removed.
     *  @obsolete Use GA4MonitorSend
    */
    public static GAMonitorSend(payload:GoogleAnalyticPayload ): Promise<any> {
        if (!APIClientBase.GA4MonitorSendFailed) {
            return this.GA4MonitorSend(payload);
        }
        return Promise.resolve("fake");
    }

      /** converts and posts supplied payload to Google Analytics v4
     *  @summary - Defaults property ID (tid) to sfPMS and version (v) to 1
     *          - One failure disables all future tracking on this client instance
     *  @async uses fetch with keepalive; the returned promise never rejects (a failure is logged)
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
       public static GA4MonitorSend(payload:GoogleAnalyticPayload | GA4Payload): Promise<any> {
        if (APIClientBase.GA4MonitorSendFailed) {
            return Promise.resolve("fake");
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

        if (typeof fetch !== "function") return Promise.resolve(undefined);
        try {
            return fetch(`https://www.google-analytics.com/mp/collect?api_secret=${apiSecret}&measurement_id=${measurement_id}`, {
                method: "POST",
                body: JSON.stringify(G4Payload),
                keepalive: true
            }).then((response) => {
                if (!response.ok) console.warn(`GA4MonitorSend() failed: ${response.status} ${response.statusText}`, G4Payload);
                return response;
            }).catch((reason) => {
                console.warn(`GA4MonitorSend() failed: ${reason?.message ?? reason}`, G4Payload);
               // APIClientBase.GA4MonitorSendFailed = true;
            });
        }
        catch (ex: any) {
            console.warn(`GA4MonitorSend() failed: ${ex?.message ?? ex}`, G4Payload);
            return Promise.resolve(undefined);
        }
    }

}