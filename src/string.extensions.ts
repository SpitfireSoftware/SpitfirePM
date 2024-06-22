import { datepicker } from "jquery";
import { APIClientBase } from "./APIClientBase";

declare global {
    interface String {
        sfFormat(this: string, ...words: any[]): string;
        replaceAll(this: string, pattern: string, replacement: string): string;
        sfHashCode(this: string): number;
        sfIsGuid(this: string): boolean;
        sfStartsWithCI(this:string,testString: string) : boolean;
        sfIsNumeric(this:string):boolean;
    }

    interface Date {
        addDays(this: Date, d: number): Date;
        diffDays(this: Date, firstDate: Date | string, secondDate: Date | string): number;
        isDate(this:Date, d?: Date | string ): boolean;
        isMidnight(this: Date): boolean;
        isSameDay(this:Date, d:Date): boolean;
        oneDay(this: Date): number;
        /** returns hh:mm:ss.tt */
        toSFLogTimeString(this: Date): string;
    }

    interface Window {
        __doPostBack(eventTarget: string, eventArgument : string | undefined): void;
        __sfPostBackTargetForm() :HTMLFormElement | undefined;
        __hasPostBackTarget(): boolean;
        /** Returns the portion of the URL after the hostname (and optional port).  For example https://your.server.com:8080/alpha/beta return alpha */
        __HTTPApplicationName() : string
    }

}

export interface String { };
 

if (!Date.prototype.addDays) {
    Date.prototype.addDays = function (d) {
        return new Date(this.valueOf() + 864E5 * d);
    };
}
if (!Date.prototype.oneDay) {
    Date.prototype.oneDay = (): number => {
        return 24 * 60 * 60 * 1000;// hours*minutes*seconds*milliseconds;
    };
}
if (!Date.prototype.diffDays) {
    Date.prototype.diffDays = function (firstDate: Date | string, secondDate?: Date | string) {
        var AlphaDate: Date = new Date, OmegaDate: Date = new Date();
        if (!firstDate) return 0;
        if (typeof firstDate == "string") AlphaDate = new Date(firstDate);
        if ( firstDate instanceof Date) AlphaDate = firstDate;
        if (!secondDate) secondDate = this;
        if (typeof secondDate == "string") OmegaDate = new Date(secondDate);
        if ( secondDate instanceof Date) OmegaDate = secondDate;
        if (!OmegaDate || (OmegaDate instanceof Date &&  !OmegaDate.isDate())) return 0;
        var ONEDAY = 24 * 60 * 60 * 1000;// hours*minutes*seconds*milliseconds
        var dDays = 0;
        if (OmegaDate instanceof Date && AlphaDate instanceof Date) dDays = Math.round(Math.abs((AlphaDate.getTime() - OmegaDate.getTime()) / (ONEDAY)));
        return dDays
    };
}
if (!Date.prototype.isMidnight) {
    Date.prototype.isMidnight = function () : boolean {
        return this.getHours() === 0 && this.getMinutes() === 0 && this.getSeconds() === 0;
    };
}
if (!Date.prototype.isSameDay) {
    Date.prototype.isSameDay = function (d: Date)  : boolean {
        return this.getDate() === d.getDate() && this.getFullYear() === d.getFullYear() && this.getMonth() === d.getMonth();
    };
}

if (!Date.prototype.isDate) {
    Date.prototype.isDate = function (d? : string | Date) {
        var result = false;
        if (!d) d = this;
        if (typeof d === "string" && d.length > 3) d = new Date(d);
        //if (Object.prototype.toString.call(d) === "[object Date]") {
        if (d instanceof Date) {
            // it is a date
            if (isNaN(d.getTime())) {  // d.valueOf() could also work
                // date is not valid
            } else {
                result = true
            }
        } else {
            // not a date
        }
        return result;
    };
}

if (!Date.prototype.toSFLogTimeString) {
    Date.prototype.toSFLogTimeString = function () : string {
        new Date
        return this.toISOString().substring(11,22);
    }
}
if (!Window.prototype.__sfPostBackTargetForm) {
    Window.prototype.__sfPostBackTargetForm = function():HTMLFormElement | undefined {
        var DefaultFormName: string = "Form1";
        var theForm : HTMLFormElement | undefined;
        if (DefaultFormName in this.document.forms) theForm = document.forms[<any>DefaultFormName];
        return theForm;
    }
}
if (!Window.prototype.__hasPostBackTarget) {
    Window.prototype.__hasPostBackTarget = function(): boolean {
        var theForm : HTMLFormElement | undefined = this.__sfPostBackTargetForm();
        return theForm !== undefined;
    }
}
if (!Window.prototype.__doPostBack) {
    Window.prototype.__doPostBack = function(eventTarget, eventArgument) {
        var theForm : HTMLFormElement | undefined = this.__sfPostBackTargetForm();
        if (!theForm) {
            console.warn("No form found for classic postbacks");
        }
        else {
            if (!theForm.onsubmit || (theForm.onsubmit(<any> new Event("onsubmit")) !== false)) {
                theForm.__EVENTTARGET.value = eventTarget;
                theForm.__EVENTARGUMENT.value = eventArgument;
                theForm.submit();
            }
        }
    }
}

if (!Window.prototype.__HTTPApplicationName) {
    Window.prototype.__HTTPApplicationName = (): string => {
        var ApplicationPath = window.location.pathname;
        ApplicationPath = ApplicationPath.substring(1, ApplicationPath.length === 1 && ApplicationPath === "/" ? 1 : ApplicationPath.substring(1).indexOf("/") + 1);
        return ApplicationPath;
    }
}

/** Calculates an integer hash 
 * @abstract can be negative; max length 19
*/
String.prototype.sfHashCode = function caclHashCode(this: string): number {
    let hash = 0;
    for (let i = 0; i < this.length; i++) {
        hash = (Math.imul(31, hash) + this.charCodeAt(i) | 0) 
        if (Math.log10(hash) > 18) hash = hash % 611111;
    }
    return hash;
};

/** alternative to template string `${varname}` */
String.prototype.sfFormat = function formatThis(this: string, ...words): string {
    return this.replace(
        /{(\d+)}/g,
        (match, number) => (typeof words[number] !== 'undefined' ? words[number] : match)
    );
};
String.prototype.sfIsGuid = function IsThisStringaGuid(this: string, ): boolean {
    return (   (typeof this === 'string') &&
               (this.length >= 36) &&
               (this.match(/^[{]?[0-9a-fA-F]{8}[-]?([0-9a-fA-F]{4}[-]?){3}[0-9a-fA-F]{12}[}]?$/g) !== null)
             );
};

if (!String.prototype.replaceAll) {
    String.prototype.replaceAll = function replaceAll(this: string, pattern: string, replacement: string): string {
        return this.split(pattern).join(replacement);
    }
}

if (!String.prototype.sfIsNumeric) {
    String.prototype.sfIsNumeric = function sfIsNumeric(this: string): boolean {
        return !isNaN(this as unknown as number);
    }
}


 String.prototype.sfStartsWithCI = function (testString) {
        return this.slice(0, testString.length).toLowerCase()  === testString.toLowerCase();
    };

// we do not test if (!$.hasData) on purpose!
 jQuery.fn.extend({hasData: function (this:JQuery<HTMLElement>, name:string):boolean {
        return this.data(name) !== undefined;
    }});

var HTTPApplicationName = (typeof window !== "undefined" ? window.__HTTPApplicationName() : "sfPMS");
if (HTTPApplicationName.toLocaleLowerCase() === "powerux") HTTPApplicationName = 'sfPMS';
var HTTPOrigin = (typeof window !== "undefined" ?window.location.origin : "");
export const sfProcessDTKMap = {
    ARInvoice: '2e4b7fc1-1a3c-4835-948b-edfbf45035c5',
    ARPayments: 'f62e246c-a55e-4d05-9016-ac9fce26f4e4',
    BFABypass: 'f94caee0-87fd-4b99-9ff7-0b4e92e8e538',
    Budget: '84bee6c3-9239-4dd4-9ebe-d741ebc1b177',
    ChangeItemRegister: '570038a7-a9df-435c-91f9-31e517788bf8',
    ChargeEntry: '102a5592-08ef-4bb2-8638-84635768cf22',
    Checklist: '6b95e9a1-7f5b-4c4b-af3a-c816cf5f645a',
    ComplianceSummary: 'afad933b-0968-467d-bc99-23ccec0d1ad5',
    Correspondence: '35636afc-e67e-4275-9185-db5a12c2bcae',
    Customer: 'f0f5115d-c5a2-4560-976f-2f79a1e0b90b',
    CustomerBid: '6d384462-6c13-42c5-a744-8e70dbd7e95d',
    CustomerChangeOrder: 'f59affe0-b407-4849-8917-060c021450a1',
    CustomerInvAdj: 'c92bbbb7-5234-4380-9f17-357730f79aa1',
    CustomerPayApplication: '0afb17f9-7aeb-4444-b16e-898f89f4315c',
    CustomerProposedCO: '45a6a6ca-5a34-4062-8485-3b0e11431cb6',
    CustomerSubmittalPkg: '05ac1337-57f5-4020-be53-900b9bcc8f82',
    DailyFieldReport: 'fe43472f-5fbd-4533-909b-216fc34370f0',
    Drawings: '715d2c09-ee06-46fb-adee-801fe9954245',
    Empty: '00000000-0000-0000-0000-000000000000',
    Employee: 'd82c597f-4aa1-4cf8-9d12-7641e9b03010',
    Estimate: 'd4bf9f3e-684f-48c3-92d6-73d03ea220ae',
    ExpenseEntry: '4164f777-eac5-4f5e-a846-ac3f607cbfb7',
    FileBatch: '6b6b0d7b-99a2-462c-9f1f-7f25ae1b85b4',
    FileRouter: '3fb46cf8-4eea-4577-82fa-1c5d18e40768',
    Forecast: '47736438-0613-48f7-9d87-ff5aed70ffec',
    Inspections: '3b9dd6ff-5454-4744-b74b-26f080de78ba',
    InvitationtoBid: 'e3ffe0bb-4611-443f-b8f8-ab0b7ba8f343',
    InvoiceUpload: '67441f9e-a2e0-489b-8908-07d1cc113f1a',
    Issue: '2d735e8d-77c5-41cf-bb1d-58a21aaffe9e',
    LEED: '0702574c-4819-4ec9-a487-fc43347ec693',
    LienWaiver: '53a38703-114a-440e-8fab-2cdd5296b270',
    MaintenanceSchedule: 'be67f926-436e-4698-ab9a-9d5e121a918f',
    MeetingMinutes: 'd0473208-d380-4f59-9997-c743128ca26b',
    Milestone: '916f5b91-16d1-4b44-9c9c-5dbfec360b2c',
    Notification: '1e69c9e9-6ec8-4c70-892e-5bb7b58dc34c',
    PeriodDistribution: '5c162230-4aa5-4e43-8c12-5e4300c47613',
    Permits: '49508d08-4667-4781-bb47-ba8350bb86cc',
    POExpediting: 'c722166f-49f3-49e3-8514-90f7ee618443',
    PrimeContract: '0c16f800-78d5-4c32-b4af-ac5e50bb2e42',
    ProductionUnits: 'e0fbb2d8-0b63-4b69-beeb-49c8f32b761f',
    ProjectDashboardPhoto: 'fe016274-84a0-4361-8ad1-ec0907a6de3c',
    ProjectSetup: 'ee06ed1b-0329-4154-81a7-756c281ebd93',
    ProjectSetupInfo: 'fcc976bf-4b62-4fce-8c01-e230e64bf945',
    PunchList: 'dc41686b-e18e-49cc-8d1c-9622da8045c0',
    RFI: '3beb0324-64f7-4084-9d83-0399173eeaa6',
    SafetyCompliance: '04988bc8-4298-4261-a7fd-2c98aa1b0d13',
    SafetyIncident: '85ba9dd7-739b-49db-b478-d7835ee19249',
    ScanTC: 'ac1d9dc8-e726-48b7-815c-5321ded2a7c3',
    Schedule: '3196d8e8-c58c-41e5-a055-0ac488ba60a1',
    ServiceTicket: 'a772101c-12f0-4e50-a146-b67e323b2434',
    SitePhoto: 'a8516ed6-e9f6-463e-8919-fa4d654b922b',
    SubmittalItemRegister: 'e892ddae-c38f-4ca7-b520-05479a70b2ee',
    SvcContract: 'fbaab9be-ce30-4696-bf09-478edb895250',
    Task: 'bdb9945a-b9db-4729-9af6-b8c504ec322f',
    TeamMessage: 'ed9def02-0a14-4d39-9cff-a888a1977392',
    TimeBatch: '79139a87-53e3-4d7c-b3f4-a3c03cea725a',
    TimeEntry: 'ee1d78ab-bbb0-4c24-892f-142dc9534ea2',
    Transmittal: 'c213b0e6-29b3-4b8d-a057-fac4aabab9ac',
    UserAccount: 'a19affc3-035d-47c8-860a-1717fc81a886',
    Vendor: '91ebefc5-6238-41ef-ad72-dee841a24a6f',
    VendorBidPkg: '33ac1a19-7709-4137-a337-b72272893e66',
    VendorBidPkgAddendum: '4915a6c4-c81e-4b84-b18c-5e3413b40312',
    VendorCCO: '234d47b9-a189-414e-a072-a4a82a6d850d',
    VendorCommitment: 'ff1975fd-76de-486c-888b-54e8fcd880e0',
    VendorComplianceNotification: '1893294c-8c38-4b03-97b4-5fc2f778dce4',
    VendorNotification: '9e37ff5f-d7c9-4d23-bef4-b8e52f9951ee',
    VendorPayRequest: '5b0a71d8-ed55-455b-bb99-2ab7d3b7a1cf',
    VendorReceipt: '0c9a537a-3c41-4d16-ab9f-130ef69ea6c8',
    VendorRFQ: '7f9f6112-6401-409c-80c9-8ed1f648aaa3',
    VendorSubmittal: '080e17ed-1e16-47be-8639-4cd62eb8318e',
    VendorVouchers: '43738463-5126-4394-a554-08dff202ffff',
    Warranty: '8852e7ce-b86e-4b17-b099-2b96c6c9aac9',
    WorkOrder: '3b49567a-62bc-4546-ba71-de6c0f8aa36b',
    WorkPosted: 'e18f4f17-377b-499e-bd12-bfbc4764de6c',
    }

export let sfApplicationNamePart : string =  HTTPApplicationName;  // sfPMS
export let sfApplicationRootPath : string = `${HTTPOrigin}/${sfApplicationNamePart || 'sfPMS'}`;  // https://try.spitfirepm.com/sfPMS

/**
 * Overrides default inferred from window.location
 * @param hostNamePortAppl newtown.spitfirepm.com:8443/sfDev
 * @description DOES NOT HELP until the path meets CORS restrictions!!
 */
export function setRuntimeAPIPath( hostNamePortAppl:string ) {
    if (hostNamePortAppl.includes("@")) hostNamePortAppl = hostNamePortAppl.replaceAll("@",'/');
    if (!hostNamePortAppl.includes("/")) hostNamePortAppl += '/sfPMS';
//    sfApplicationNamePart = hostNamePortAppl.substring(hostNamePortAppl.indexOf("/")+1);
  //  sfApplicationRootPath = `https://${hostNamePortAppl}`;
    //APIClientBase.setBaseUrl(sfApplicationRootPath);
    return sfApplicationRootPath;
}