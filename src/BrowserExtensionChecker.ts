export class BrowserExtensionChecker {
    static browser: { [key: string]: boolean; } = {
        detected:false,
        isTouch : false,
        sfAgent : false,
        isEdge : false,
            iPad : false,
            isWindowsOS : false,
            isMacOS : false
    };
    static readonly ChromeWebstoreLink = "https://chromewebstore.google.com";
    public static SuggestedExtensionLink():string {
        return BrowserExtensionChecker.MetaWebstoreLink;
    }
    static readonly WRemixWebstoreLink = `${BrowserExtensionChecker.ChromeWebstoreLink}/detail/wremix-clickonce/dgpgholdldjjbcmpeckiephjigdpikan`;
    static readonly BreezWebstoreLink = `${BrowserExtensionChecker.ChromeWebstoreLink}/detail/breez-clickonce/cmkpnegkacdeagdmnbbhjbgdpndmlkgj`;
    static readonly MetaWebstoreLink = `${BrowserExtensionChecker.ChromeWebstoreLink}/detail/cegid-peoplenet-clickonce/jkncabbipkgbconhaajbapbhokpbgkdc?`;
    DetectedID: string = "";
    DetectedName: string = "";
    // always returns false the first time
    public HasDotNetApplicationExtension(): boolean {
        if (top && self !== top) return top.ClickOnceExtension.HasDotNetApplicationExtension();
        if (!this._ClickOnceExtensionHasBeenChecked) {
            var result = sessionStorage.getItem(this._SessionStorageCacheKey);
            if (result === null) {
                if (BrowserExtensionChecker.browser.isWindowsOS) {
                    if (BrowserExtensionChecker.browser.chrome) {
                        if (!this._ClickOnceExtensionAvailable) this._CheckForMeta4ClickOnceLauncherExtension();
                        if (!this._ClickOnceExtensionAvailable) this._CheckForWindowsRemixClickonceExtension();
                        if (!this._ClickOnceExtensionAvailable) this._CheckForBreezClickOnceLauncherExtension(); 
                    }
                    
                }
                this._ClickOnceExtensionHasBeenChecked = true;
            }
            else {
                var ExtInfo = result.split(";");
                this._ExtensionDetected(ExtInfo[0], ExtInfo[1], true);
            }
        }
        return this._ClickOnceExtensionAvailable;
    }
    public IgnoreMissingExtension(): void {
        this._ExtensionDetected("dgpgholdldjjbcmpeckiephjigdpikan", "FAKE - User clicked Ignore Button", false);
    }

    public Version: string = "2.2";

    protected _ClickOnceExtensionAvailable: boolean = false;
    protected _ClickOnceExtensionHasBeenChecked: boolean = false
    protected _SessionStorageCacheKey: string =  "SFClickOnceExtensionDetected";
    protected  _ExtensionDetected(id:string, ExtName : string, previously: boolean): boolean {
        if (this._ClickOnceExtensionAvailable) return true;
        this._ClickOnceExtensionAvailable = true;
        this.DetectedID = id;
        this.DetectedName = ExtName;
        console.log("Detected click once helper extension: " + ExtName, previously ? " - this session " : " - just now");
        sessionStorage.setItem(this._SessionStorageCacheKey, "{0};{1}".sfFormat(id, ExtName));
        return true;
    }
    // find resource using chrome-extension://cmkpnegkacdeagdmnbbhjbgdpndmlkgj/manifest.json
    // create the correct elment type 
    protected _CheckForWindowsRemixClickonceExtension() : boolean {
        var ExtName = "Windows Remix ClickOnce Helper"
        var ExtID = "dgpgholdldjjbcmpeckiephjigdpikan";
        if (top?.CLICKONCE_EXTENSION_IS_INSTALLED) return this._ExtensionDetected(ExtID,ExtName,false);
        var s = document.createElement('script');
        return this._GenericExtensionDetector(ExtID, ExtName, s, "detect.js");
    }
    protected _CheckForBreezClickOnceLauncherExtension() :boolean {
        var ExtName = "Breez ClickOnce Launcher"
        var ExtID = "cmkpnegkacdeagdmnbbhjbgdpndmlkgj";
        var s = document.createElement('script');
        return this._GenericExtensionDetector(ExtID, ExtName, s, "modalHelper.js"); // manifest.json for list 
    }

    protected _CheckForMeta4ClickOnceLauncherExtension() :boolean {
        var ExtName = "Meta4 ClickOnce Launcher"
        var ExtID = "jkncabbipkgbconhaajbapbhokpbgkdc";
        var s = new Image(); //document.createElement('script');
        return this._GenericExtensionDetector(ExtID, ExtName, s, "images/download_all.png");
    }
    protected _GenericExtensionDetector(ExtID : string, ExtName: string, s : HTMLScriptElement | HTMLImageElement, testResource: string) : boolean {
        var PARENT = this;
        s.id = "SFExtensionCheck" + ExtID;
        s.src = 'chrome-extension://' + ExtID + '/' + testResource;
        s.onload = function () { PARENT._ExtensionDetected(ExtID, ExtName, false); };
        s.onerror = function () { // (e), if needed console.log(ExtName, e);
        };
        try {
            document.body.appendChild(s);
            s.remove();
            //$("SCRIPT#SFExtensionCheck" + ExtID).remove();
        }
        catch (e) {
            // "Caught: Extension not installed: {0}".sfFormat(ExtName);
            console.warn(e);
        }
        return this._ClickOnceExtensionAvailable;
    }
    protected _uaMatch(ua:string) : {browser:string, version: string} {
        ua = ua.toLowerCase();

        var match = /(chrome)[ \/]([\w.]+)/.exec(ua) ||
			/(webkit)[ \/]([\w.]+)/.exec(ua) ||
			/(opera)(?:.*version)?[ \/]([\w.]+)/.exec(ua) ||
			/(msie) ([\w.]+)/.exec(ua) ||
			ua.indexOf("compatible") < 0 && /(mozilla)(?:.*? rv:([\w.]+))?/.exec(ua) ||
			[];

        return {
            browser: match[1] || "",
            version: match[2] || "0"
        };
    }
    constructor() {

        if (!BrowserExtensionChecker.browser.detected) {

            var matched :{browser:string, version: string};
            var userAgent: string  = navigator.userAgent || "";

            // Based on  jQuery.browser, which is ancient and is frowned upon.
            // More details: http://api.jquery.com/jQuery.browser
            matched = this._uaMatch(userAgent);
            if (matched.browser) {
                BrowserExtensionChecker.browser[matched.browser] = true;
            }

            //proprietary sf
            //FYI: $ likely not defined
            BrowserExtensionChecker.browser.isTouch = ('ontouchstart' in window) || ((navigator as any).msMaxTouchPoints > 0);
            BrowserExtensionChecker.browser.sfAgent = false;
            BrowserExtensionChecker.browser.isEdge = navigator.userAgent.match(/Edg/i) !== null || navigator.userAgent.match(/Edge/i) !== null;
            BrowserExtensionChecker.browser.iPad = navigator.userAgent.match(/iPad/i) !== null;
            BrowserExtensionChecker.browser.isWindowsOS = navigator.userAgent.match(/Windows/i) !== null;
            BrowserExtensionChecker.browser.isMacOS = navigator.userAgent.match(/Mac OS/i) !== null || navigator.userAgent.match(/Macintosh/i) !== null;
            BrowserExtensionChecker.browser.isiOS = navigator.userAgent.match(/iOS/i) !== null || navigator.userAgent.match(/Macintosh/i) !== null;

            if (userAgent.indexOf(' Trident/') > 0) BrowserExtensionChecker.browser.msie = true; else if (userAgent.indexOf(' Edg/') > 0) BrowserExtensionChecker.browser.msEdge = true;
            //this.browser.msieLegacy = (this.browser.msie && window.attachEvent && !window.addEventListener);
        }
        this.HasDotNetApplicationExtension();
    }

}
