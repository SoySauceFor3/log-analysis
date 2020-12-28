import * as vscode from "vscode";
import { FilterTreeViewProvider } from "./filterTreeViewProvider";

// One filter corresponds to one line in the configuration file
export type Filter = {
    isHighlighted: boolean;
    isShown: boolean;
    regex: RegExp;
    color: string;
    id: string;
    iconPath: vscode.Uri;
    count: number;
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

export function cleanUpIconFiles(storageUri: vscode.Uri) {
    vscode.workspace.fs.delete(storageUri, {
        recursive: true,
        useTrash: false
    });
}

export function writeSvgContent(filter: Filter, treeViewProvider: FilterTreeViewProvider): void {
    const fullSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle fill="${filter.color}" cx="50" cy="50" r="50"/></svg>`;
    const emptySvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle stroke="${filter.color}" fill="transparent" stroke-width="10" cx="50" cy="50" r="45"/></svg>`;
    vscode.workspace.fs.writeFile(filter.iconPath, str2Uint8(filter.isHighlighted ? fullSvg : emptySvg)).then(() => {
        treeViewProvider.refresh();
    });
}

function str2Uint8(str: string): Uint8Array {
    var buf = new ArrayBuffer(str.length);
    var bufView = new Uint8Array(buf);
    for (var i=0, strLen=str.length; i < strLen; i++) {
      bufView[i] = str.charCodeAt(i);
    }
    return bufView;
}

export function generateSvgUri(storageUri: vscode.Uri, id: string, isHighlighted: boolean): vscode.Uri {
    return vscode.Uri.joinPath(storageUri, `./${id}${isHighlighted}.svg`);
}

