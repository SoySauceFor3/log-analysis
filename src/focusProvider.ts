import * as vscode from "vscode";
import { Filter } from "./utils";

//Provide virtual documents as a strings that only contain lines matching shown filters.
//These virtual documents have uris of the form "focus:<original uri>" where
//<original uri> is the escaped uri of the original, unfocused document.
//VSCode uses this provider to generate virtual read-only files based on real files
export class FocusProvider implements vscode.TextDocumentContentProvider {
    filterArr: Filter[];

    constructor(filterArr: Filter[]) {
        this.filterArr = filterArr;
    }

    //open the original document specified by the uri and return the focused version of its text
    async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
        let originalUri = vscode.Uri.parse(uri.path);
        let sourceCode = await vscode.workspace.openTextDocument(originalUri);

        // start the string with an empty line to make room for the focus mode text decoration
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

    //when this function gets called, the provideTextDocumentContent will be called again
    refresh(uri: vscode.Uri): void {
        this.onDidChangeEmitter.fire(uri);
    }
  
}
