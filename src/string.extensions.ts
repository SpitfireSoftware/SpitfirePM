
declare global {
    interface String {
        sfFormat(this: string, ...words: any[]): string;
        replaceAll(this: string, pattern: string, replacement: string): string;
        sfHashCode(this: string): number;
    }
}

export interface String { };


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




