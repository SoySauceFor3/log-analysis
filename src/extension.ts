// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as csvParse from "csv-parse/lib/sync";
import { Filter, filterLines } from "./utils";
import { FocusFoldingRangeProvider } from "./foldingrangeprovider";
import { FilterTreeViewProvider } from "./filterTreeViewProvider";

async function init(uri: vscode.Uri): Promise<Filter[]> {
    let textDoc = await vscode.workspace.openTextDocument(uri);
    let output: string[][] = csvParse(textDoc.getText());
    return output.map((row) => ({
        isHighlighted: row[0] === "T",
        isShown: row[1] === "T",
        regex: new RegExp(row[2]),
        color: row[3],
        id: `${Math.random()}`
    }));
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    //read the config file
    let uri = vscode.Uri.file(
        "/Users/xinya/Documents/GitHub/log-analysis/src/example.csv"
    );

    let inFocusMode = false;
    let filterArr: Filter[] = [{
        isHighlighted: true,
        isShown: true,
        regex: new RegExp("abc"),
        color: "#abcabc",
        id: `${Math.random()}`
    }];
    const filterTreeViewProvider = new FilterTreeViewProvider(filterArr);
    vscode.window.registerTreeDataProvider('filters', filterTreeViewProvider);

        // register commands
    let disposableApplyHighlight = vscode.commands.registerCommand(
        "log-analysis.applyHighlight",
        () => {
                let editor = vscode.window.activeTextEditor!;
                let sourceCode = editor.document.getText();
                const sourceCodeArr = sourceCode.split("\n");
                filterArr.forEach((filter) => {
                    if (!filter.isHighlighted) {
                        return;
                    }
                    const lineNumbers = filterLines(sourceCodeArr, filter);
                    const decorationsArray = lineNumbers.map((lineIdx) => {
                        return new vscode.Range(
                            new vscode.Position(lineIdx, 0),
                            new vscode.Position(lineIdx, 20)
                        );
                    });
                    let decorationType = vscode.window.createTextEditorDecorationType(
                        {
                            backgroundColor: filter.color,
                            isWholeLine: true,
                        }
                    );
                    editor.setDecorations(decorationType, decorationsArray);
                    });
        }
    );

    context.subscriptions.push(disposableApplyHighlight);

    let disposableToggleFocusMode = vscode.commands.registerCommand(
        "log-analysis.toggleFocusMode",
        () => {
            if (inFocusMode) {
                //toggle off focus mode, so unfold everything
                vscode.commands.executeCommand("editor.unfoldAll");
            } else {
                vscode.languages.registerFoldingRangeProvider(
                    {
                        pattern: "*",
                    },
                    new FocusFoldingRangeProvider(filterArr)
                );
                //toggle on focus mode, so fold everything
                vscode.commands.executeCommand("editor.foldAll");
                
            }
            inFocusMode = !inFocusMode;
        }
    );
    context.subscriptions.push(disposableToggleFocusMode);

    let disposibleDeleteFilter = vscode.commands.registerCommand(
        "log-analysis.deleteFilter",
        (filter: vscode.TreeItem) => {
            const id = filter.id;
            const deleteIndex = filterArr.findIndex(filter => (filter.id === id));
            filterArr.splice(deleteIndex, 1);
            filterTreeViewProvider.refresh();
        }
    );
    context.subscriptions.push(disposibleDeleteFilter);
}

// this method is called when your extension is deactivated
export function deactivate() {}
