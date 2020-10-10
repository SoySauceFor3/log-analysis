import * as vscode from "vscode";
import { Filter, filterLines } from "./utils";

export class FocusFoldingRangeProvider implements vscode.FoldingRangeProvider {
    filterArr: Filter[];

    constructor(filterArr: Filter[]) {
        this.filterArr = filterArr;
    }

    provideFoldingRanges(
        document: vscode.TextDocument,
        context: vscode.FoldingContext,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.FoldingRange[]> {
        let sourceCode = document.getText();
        const sourceCodeArr = sourceCode.split("\n");

        let lastShownLine = 0;
        const foldingRanges: vscode.FoldingRange[] = [];
        for (let lineIdx = 0; lineIdx < sourceCodeArr.length; lineIdx++) {
            for (const filter of this.filterArr) {
                if (!filter.isShown) {
                    continue;
                }
                let regex = filter.regex;
                if (regex.test(sourceCodeArr[lineIdx])) {
                    foldingRanges.push(
                        new vscode.FoldingRange(lastShownLine, lineIdx - 1)
                    );
                    lastShownLine = lineIdx;
                    break;
                }
            }
        }
        foldingRanges.push(
            new vscode.FoldingRange(lastShownLine, sourceCodeArr.length - 1)
        );
        return foldingRanges;
    }
}
