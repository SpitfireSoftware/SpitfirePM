
declare global {
    interface String {
        sfFormat(this: string, ...words: any[]): string;
        replaceAll(this: string, pattern: string, replacement: string): string;
        sfHashCode(this: string): number;
    }

    interface Date {
        addDays(this: Date, d: number): Date;
        diffDays(this: Date, firstDate: Date | string, secondDate: Date | String): number;
        isDate(this:Date, d?: Date | string ): boolean;
        isMidnight(this: Date): boolean;
        oneDay(this: Date): number;
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
    Date.prototype.isMidnight = function () {
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



String.prototype.sfHashCode = function caclHashCode(this: string): number {
    let hash = 0;
    for (let i = 0; i < this.length; i++) {
        hash = Math.imul(31, hash) + this.charCodeAt(i) | 0;
    }
    return hash;
};
String.prototype.sfFormat = function formatThis(this: string, ...words): string {
    return this.replace(
        /{(\d+)}/g,
        (match, number) => (typeof words[number] !== 'undefined' ? words[number] : match)
    );
};
String.prototype.replaceAll = function replaceAll(this: string, pattern: string, replacement: string): string {
    return this.split(pattern).join(replacement);
}

var HTTPApplicationName = (typeof window !== "undefined" ?window.location.pathname.substr(1, window.location.pathname.substr(1).indexOf("/")) : "sfPMS");
var HTTPOrigin = (typeof window !== "undefined" ?window.location.origin : "");
export const sfApplicationNamePart : string =  HTTPApplicationName;  // sfPMS
export const sfApplicationRootPath : string = `${HTTPOrigin}/${sfApplicationNamePart || 'sfPMS'}`;  // https://try.spitfirepm.com/sfPMS
