// not used

import { GUID  } from "./globals";
import { String, sfApplicationRootPath } from "./string.extensions";

var x : string = sfApplicationRootPath;
import { ActionItemsClient, AlertsClient, ContactClient, ContactFilters, IUCPermit, LookupClient,  SessionClient,  UCPermitSet,  UICFGClient, UIDisplayConfig, UIDisplayPart } 
    from "./SwaggerClients"

new ActionItemsClient();
new AlertsClient();

console.log("npm SpitfirePM loaded; {0}".sfFormat(x)); // cause 