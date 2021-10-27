import { datepicker } from "jquery";

declare global {
    interface String {
        sfFormat(this: string, ...words: any[]): string;
        replaceAll(this: string, pattern: string, replacement: string): string;
        sfHashCode(this: string): number;
        sfIsGuid(this: string): boolean;
        sfStartsWithCI(this:string,testString: string) : boolean;
    }

    interface Date {
        addDays(this: Date, d: number): Date;
        diffDays(this: Date, firstDate: Date | string, secondDate: Date | String): number;
        isDate(this:Date, d?: Date | string ): boolean;
        isMidnight(this: Date): boolean;
        oneDay(this: Date): number;
        /** returns hh:mm:ss.tt */
        toSFLogTimeString(this: Date): string;
    }

    interface Window {
        __doPostBack(eventTarget: string, eventArgument : string | undefined): void;
        __sfPostBackTargetForm() :HTMLFormElement | undefined;
        __hasPostBackTarget(): boolean;
    }

}

export interface String { };
export interface Date {};

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
        if (OmegaDate instanceof Date && AlphaDate instanceof Date)  Math.round(Math.abs((AlphaDate.getTime() - OmegaDate.getTime()) / (ONEDAY)));
        return dDays
    };
}
if (!Date.prototype.isMidnight) {
    Date.prototype.isMidnight = function () : boolean {
        return this.getHours() === 0 && this.getMinutes() === 0 && this.getSeconds() === 0;
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
        return this.toISOString().substr(11,11);
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
            if (!theForm.onsubmit || (theForm.onsubmit(new Event("onsubmit")) !== false)) {
                theForm.__EVENTTARGET.value = eventTarget;
                theForm.__EVENTARGUMENT.value = eventArgument;
                theForm.submit();
            }
        }
    }
}


String.prototype.sfHashCode = function caclHashCode(this: string): number {
    let hash = 0;
    for (let i = 0; i < this.length; i++) {
        hash = Math.imul(31, hash) + this.charCodeAt(i) | 0;
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
    return (this.match(/^[{]?[0-9a-fA-F]{8}[-]?([0-9a-fA-F]{4}[-]?){3}[0-9a-fA-F]{12}[}]?$/g) !== null);
};

if (!String.prototype.replaceAll) {
    String.prototype.replaceAll = function replaceAll(this: string, pattern: string, replacement: string): string {
        return this.split(pattern).join(replacement);
    }
}

 String.prototype.sfStartsWithCI = function (testString) {
        return this.slice(0, testString.length).toLowerCase()  === testString.toLowerCase();
    };

var HTTPApplicationName = (typeof window !== "undefined" ?window.location.pathname.substr(1, window.location.pathname.substr(1).indexOf("/")) : "sfPMS");
var HTTPOrigin = (typeof window !== "undefined" ?window.location.origin : "");
export const sfApplicationNamePart : string =  HTTPApplicationName;  // sfPMS
export const sfApplicationRootPath : string = `${HTTPOrigin}/${sfApplicationNamePart || 'sfPMS'}`;  // https://try.spitfirepm.com/sfPMS
