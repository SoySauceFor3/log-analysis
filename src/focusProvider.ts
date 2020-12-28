import * as vscode from "vscode";
import { Filter } from "./utils";

export class FocusProvider implements vscode.TextDocumentContentProvider {
    filterArr: Filter[];

    constructor(filterArr: Filter[]) {
        this.filterArr = filterArr;
    }

    async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
        let originalUri = vscode.Uri.parse(uri.path);
        let sourceCode = await vscode.workspace.openTextDocument(originalUri);

        let resultArr: string[] = [''];
        for (let lineIdx = 0; lineIdx < sourceCode.lineCount; lineIdx++) {
            const line = sourceCode.lineAt(lineIdx).text;
            for (const filter of this.filterArr) {
                if (!filter.isShown) {
                    continue;
                }
                let regex = filter.regex;
                if (regex.test(line)) {
                    resultArr.push(line);
                    break;
                }
            }
        }
        return resultArr.join('\n');
    }

    private onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
    readonly onDidChange = this.onDidChangeEmitter.event;

    refresh(uri: vscode.Uri): void {
        this.onDidChangeEmitter.fire(uri);
    }
  
}
