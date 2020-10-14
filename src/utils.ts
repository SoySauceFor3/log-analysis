import * as vscode from "vscode";

// One filter corresponds to one line in the configuration file
export type Filter = {
    isHighlighted: boolean;
    isShown: boolean;
    regex: RegExp;
    color: string;
    id: string;
    iconPath: vscode.Uri;
};

// returns an array of line numbers that match the filter
// (doesn't check for isHighlighted or isShown)
export function filterLines(sourceCodeArr: string[], filter: Filter): number[] {
    let regex = filter.regex;
    let lineNumbers: number[] = [];
    for (let lineIdx = 0; lineIdx < sourceCodeArr.length; lineIdx++) {
        if (regex.test(sourceCodeArr[lineIdx])) {
            lineNumbers.push(lineIdx);
        }
    }
    return lineNumbers;
}

export function generateRandomColor(): string {
    return `hsl(${Math.floor(360 * Math.random())}, 40%, 40%)`;
}