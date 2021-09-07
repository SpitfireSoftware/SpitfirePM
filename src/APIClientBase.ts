

export class APIClientBase {
    static _SiteURL : string | null = null;
    public getBaseUrl( baseURL : string) : string {
        if (APIClientBase._SiteURL === null) {
            var ApplicationPath = window.location.pathname.substr(1, window.location.pathname.substr(1).indexOf("/"));
            APIClientBase._SiteURL = `${window.location.origin}/${ApplicationPath || 'sfPMS'}`;
        }
        return APIClientBase._SiteURL;
    }


}