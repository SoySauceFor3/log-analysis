// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as csvParse from "csv-parse/lib/sync";
import { Filter, filterLines, generateRandomColor } from "./utils";
import { FocusFoldingRangeProvider } from "./foldingRangeProvider";
import { FilterTreeViewProvider } from "./filterTreeViewProvider";

async function init(uri: vscode.Uri): Promise<Filter[]> {
    let textDoc = await vscode.workspace.openTextDocument(uri);
    let output: string[][] = csvParse(textDoc.getText());
    return output.map((row) => {
        const id = `${Math.random()}`;
        const isHighlighted = row[0] === "T";
        return {
            isHighlighted,
            isShown: row[1] === "T",
            regex: new RegExp(row[2]),
            color: row[3],
            id,
            iconPath: generateSvgUri(id, isHighlighted),
        };
    });
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    // //read the config file
    // let uri = vscode.Uri.file(
    //     "/Users/xinya/Documents/GitHub/log-analysis/src/example.csv"
    // );

    let inFocusMode = false;
    let filterArr: Filter[] = [];
    const filterTreeViewProvider = new FilterTreeViewProvider(filterArr);
    vscode.window.registerTreeDataProvider('filters', filterTreeViewProvider);

    // applyHighlight
    let decorations: vscode.TextEditorDecorationType[] = [];
    function applyHighlight() {
        let editor = vscode.window.activeTextEditor!;
        let sourceCode = editor.document.getText();
        const sourceCodeArr = sourceCode.split("\n");

        // remove old decorations
        decorations.forEach(decorationType => decorationType.dispose());
        decorations = [];

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
            decorations.push(decorationType);
            editor.setDecorations(decorationType, decorationsArray);
        });
    }

    let disposableFoldingRange: vscode.Disposable; 
    function refreshFolding(): void {
        if (inFocusMode) {
            vscode.commands.executeCommand("editor.unfoldAll");
            disposableFoldingRange.dispose();
            disposableFoldingRange = vscode.languages.registerFoldingRangeProvider(
                {
                    pattern: "*",
                },
                new FocusFoldingRangeProvider(filterArr)
            );
            vscode.commands.executeCommand("editor.foldAll");
        }
    }
    let disposableEnableVisibility = vscode.commands.registerCommand(
        "log-analysis.enableVisibility",
        (filterTreeItem: vscode.TreeItem) => {
            const id = filterTreeItem.id;
            const filter = filterArr.find(filter => (filter.id === id));
            filter!.isShown = true;
            // filter!.iconPath = generateSvgUri(filter!.id, filter!.isHighlighted);
            // writeSvgContent(filter!, filterTreeViewProvider);
            filterTreeViewProvider.refresh();

            refreshFolding();
            
        }
    );
    context.subscriptions.push(disposableEnableVisibility);

    let disposableDisableVisibility = vscode.commands.registerCommand(
        "log-analysis.disableVisibility",
        (filterTreeItem: vscode.TreeItem) => {
            const id = filterTreeItem.id;
            const filter = filterArr.find(filter => (filter.id === id));
            filter!.isShown = false;
            // filter!.iconPath = generateSvgUri(filter!.id, filter!.isHighlighted);
            // writeSvgContent(filter!, filterTreeViewProvider);
            filterTreeViewProvider.refresh();
            refreshFolding();
        }
    );
    context.subscriptions.push(disposableEnableVisibility);

    let focusDecorationType: vscode.TextEditorDecorationType;
    
    let disposableToggleFocusMode = vscode.commands.registerCommand(
        "log-analysis.toggleFocusMode",
        () => {
            if (inFocusMode) {
                let editor = vscode.window.activeTextEditor!;
                editor.edit((editBuilder) => {
                    editBuilder.delete(new vscode.Range(
                        new vscode.Position(0, 0),
                        new vscode.Position(1, 0)));
                }).then(() => {
                    //toggle off focus mode, so unfold everything and remove decorations
                    focusDecorationType.dispose();
                    vscode.commands.executeCommand("editor.unfoldAll");
                    disposableFoldingRange.dispose();
                }); 
            } else {
                let editor = vscode.window.activeTextEditor!;
                editor.edit((editBuilder) => {
                    editBuilder.insert(new vscode.Position(0, 0), "\n");
                }).then(() => {
                    focusDecorationType = vscode.window.createTextEditorDecorationType(
                        {
                            before: {
                                contentText: ">>>>>>>focus mode<<<<<<<",
                                color: "#888888",
                            }
                        }
                    );
                    let focusDecorationRangeArray = [new vscode.Range(
                        new vscode.Position(0, 0),
                        new vscode.Position(1, 0)
                    )];
                    editor.setDecorations(focusDecorationType, focusDecorationRangeArray);
                    
                    disposableFoldingRange = vscode.languages.registerFoldingRangeProvider(
                        {
                            pattern: "*",
                        },
                        new FocusFoldingRangeProvider(filterArr)
                    );
                    //toggle on focus mode, so fold everything
                    vscode.commands.executeCommand("editor.foldAll");
                });  
            }
            inFocusMode = !inFocusMode;
        }
    );
    context.subscriptions.push(disposableToggleFocusMode);

    let disposibleDeleteFilter = vscode.commands.registerCommand(
        "log-analysis.deleteFilter",
        (filterTreeItem: vscode.TreeItem) => {
            const id = filterTreeItem.id;
            const deleteIndex = filterArr.findIndex(filterTreeItem => (filterTreeItem.id === id));
            filterArr.splice(deleteIndex, 1);
            filterTreeViewProvider.refresh();
            applyHighlight();
        }
    );
    context.subscriptions.push(disposibleDeleteFilter);

    let disposibleAddFilter = vscode.commands.registerCommand(
        "log-analysis.addFilter",
        () => {
            vscode.window.showInputBox({
                prompt: "Type a regex to filter",
                ignoreFocusOut: false
            }).then(regexStr => {
                if (regexStr === undefined) {
                    return;
                }
                const id = `${Math.random()}`;
                const filter = {
                    isHighlighted: true, 
                    isShown: true, 
                    regex: new RegExp(regexStr),
                    color: generateRandomColor(),
                    id: `${Math.random()}`,
                    iconPath: generateSvgUri(id, true)
                };
                filterArr.push(filter);
                writeSvgContent(filter, filterTreeViewProvider);
                applyHighlight();
                refreshFolding();
            });
        }
    );
    context.subscriptions.push(disposibleAddFilter);

    let disposibleEditFilter = vscode.commands.registerCommand(
        "log-analysis.editFilter",
        (filterTreeItem: vscode.TreeItem) => {
            vscode.window.showInputBox({
                prompt: "Type a new regex",
                ignoreFocusOut: false
            }).then(regexStr => {
                if (regexStr === undefined) {
                    return;
                }
                const id = filterTreeItem.id;
                const filter = filterArr.find(filter => (filter.id === id));
                filter!.regex = new RegExp(regexStr);
                filterTreeViewProvider.refresh();
                applyHighlight();
                refreshFolding();
            });
        }
    );
    context.subscriptions.push(disposibleEditFilter);

    let disposibleEnableHighlight = vscode.commands.registerCommand(
        "log-analysis.enableHighlight",
        (filterTreeItem: vscode.TreeItem) => {
            const id = filterTreeItem.id;
            const filter = filterArr.find(filter => (filter.id === id));
            filter!.isHighlighted = true;
            filter!.iconPath = generateSvgUri(filter!.id, filter!.isHighlighted);
            writeSvgContent(filter!, filterTreeViewProvider);
            applyHighlight();
            refreshFolding();
        }
    );
    context.subscriptions.push(disposibleEnableHighlight);

    let disposibleDisableHighlight = vscode.commands.registerCommand(
        "log-analysis.disableHighlight",
        (filterTreeItem: vscode.TreeItem) => {
            const id = filterTreeItem.id;
            const filter = filterArr.find(filter => (filter.id === id));
            filter!.isHighlighted = false;
            filter!.iconPath = generateSvgUri(filter!.id, filter!.isHighlighted);
            writeSvgContent(filter!, filterTreeViewProvider);
            applyHighlight();
        }
    );
    context.subscriptions.push(disposibleDisableHighlight);
}

// this method is called when your extension is deactivated
export function deactivate() {}

function generateSvgUri(id: string, isHighlighted: boolean): vscode.Uri {
    const path = `/Users/xinya/Documents/GitHub/log-analysis/resources/${id}${isHighlighted}.svg`;
    return vscode.Uri.file(path);
}

function writeSvgContent(filter: Filter, provider: FilterTreeViewProvider): void {
    const fullSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle fill="${filter.color}" cx="50" cy="50" r="50"/></svg>`;
    const emptySvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle stroke="${filter.color}" fill="transparent" stroke-width="10" cx="50" cy="50" r="45"/></svg>`;
    vscode.workspace.fs.writeFile(filter.iconPath, str2Uint8(filter.isHighlighted ? fullSvg : emptySvg)).then(() => {
        provider.refresh();
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
