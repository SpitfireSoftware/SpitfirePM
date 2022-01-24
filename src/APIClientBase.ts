

export class APIClientBase {
    static _SiteURL : string | null = null;
    public getBaseUrl( baseURL : string) : string {
        if (APIClientBase._SiteURL === null) {
            var ApplicationPath = window.location.pathname;
            ApplicationPath = ApplicationPath.substring(1, ApplicationPath.length === 1 && ApplicationPath === "/" ? 1 : ApplicationPath.substring(1).indexOf("/") + 1);
            APIClientBase._SiteURL = `${window.location.origin}/${ApplicationPath || 'sfPMS'}`;
        }
        return APIClientBase._SiteURL;
    }


}