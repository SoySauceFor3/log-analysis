import * as vscode from "vscode";
import { State } from "./extension";
import { FocusFoldingRangeProvider } from "./foldingRangeProvider";
import { Filter, generateSvgUri, writeSvgContent, generateRandomColor, filterLines } from "./utils";

function applyHighlight(state: State, editors: vscode.TextEditor[]): void {
    console.log(editors);
    
    // remove old decorations from all the text editor using the given decorationType
    state.decorations.forEach(decorationType => decorationType.dispose());
    state.decorations = [];
    
    editors.forEach((editor) => {
        let sourceCode = editor.document.getText();
        const sourceCodeArr = sourceCode.split("\n");

        //apply new decorations
        state.filterArr.forEach((filter) => {
            if (!filter.isHighlighted) {
                return;
            }
            const lineNumbers = filterLines(sourceCodeArr, filter);
            filter.count = lineNumbers.length;
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
            state.decorations.push(decorationType);
            editor.setDecorations(decorationType, decorationsArray);
        });
    });
    
}

function refreshFolding(state: State):void {
  if (state.inFocusMode) {
      vscode.commands.executeCommand("editor.unfoldAll");
      state.disposableFoldingRange?.dispose();
      state.disposableFoldingRange = vscode.languages.registerFoldingRangeProvider(
          {
              pattern: "*",
          },
          new FocusFoldingRangeProvider(state.filterArr)
      );
      vscode.commands.executeCommand("editor.foldAll");
  }
}

export function exportFilters(state: State) {
    const content = JSON.stringify(state.filterArr.map(filter => {
        return {
            regexText: filter.regex.source,
            color: filter.color,
            isHighlighted: filter.isHighlighted,
            isShown: filter.isShown,
        };
    }));
    vscode.workspace.openTextDocument({
        content: content,
        language: "json"
    });
}

export function importFilters(state: State) {
        vscode.window.showOpenDialog({
            canSelectFiles: true, 
            canSelectMany: false, 
            filters: {
                "json": ["json"]
            }
        }).then(uriArr => {
            if (!uriArr) {
                return;
            }

            return vscode.workspace.openTextDocument(uriArr[0]);
        }).then(textDocument => {
            const text = textDocument!.getText();//.replace(/\s+/g, '');

            const parsed = JSON.parse(text);

            if (typeof parsed !== "object") {
                return;
            }
            const array = parsed as any[];
            array.forEach((filterText) => {
                if (
                    (typeof filterText.regexText === "string") &&
                    (typeof filterText.color === "string") &&
                    (typeof filterText.isHighlighted === "boolean") &&
                    (typeof filterText.isShown === "boolean")
                ) {
                    const id = `${Math.random()}`;
                    const filter = {
                        regex: new RegExp(filterText.regexText),
                        color: filterText.color as string,
                        isHighlighted: filterText.isHighlighted as boolean,
                        isShown: filterText.isShown as boolean,
                        id,
                        iconPath: generateSvgUri(state.storageUri, id, filterText.isHighlighted),
                        count: 0
                    };
                    state.filterArr.push(filter);
                    writeSvgContent(filter, state.filterTreeViewProvider);
                }
            });
            applyHighlight(state, vscode.window.visibleTextEditors);
            refreshFolding(state);
        });
}

export function setVisibility(isShown: boolean, filterTreeItem: vscode.TreeItem, state: State) {
    const id = filterTreeItem.id;
    const filter = state.filterArr.find(filter => (filter.id === id));
    filter!.isShown = isShown;
    state.filterTreeViewProvider.refresh();
    refreshFolding(state);
}

let focusDecorationType: vscode.TextEditorDecorationType;

export function toggleFocusMode(state: State) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }
    if (state.inFocusMode) {
        editor.edit((editBuilder) => {
            editBuilder.delete(new vscode.Range(
                new vscode.Position(0, 0),
                new vscode.Position(1, 0)));
        }).then(() => {
            //toggle off focus mode, so unfold everything and remove decorations
            focusDecorationType.dispose();
            vscode.commands.executeCommand("editor.unfoldAll");
            state.disposableFoldingRange?.dispose();
        }); 
    } else {
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
            
            state.disposableFoldingRange = vscode.languages.registerFoldingRangeProvider(
                {
                    pattern: "*",
                },
                new FocusFoldingRangeProvider(state.filterArr)
            );
            //toggle on focus mode, so fold everything
            vscode.commands.executeCommand("editor.foldAll");
        });   
    }
    state.inFocusMode = !state.inFocusMode;
}

export function deleteFilter(filterTreeItem: vscode.TreeItem, state: State) {
    const deleteIndex = state.filterArr.findIndex(filter => (filter.id === filterTreeItem.id));
    state.filterArr.splice(deleteIndex, 1);
    state.filterTreeViewProvider.refresh();
    applyHighlight(state, vscode.window.visibleTextEditors);
}

export function addFilter(state: State) {
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
            id,
            iconPath: generateSvgUri(state.storageUri, id, true),
            count: 0
        };
        state.filterArr.push(filter);
        writeSvgContent(filter, state.filterTreeViewProvider);
        applyHighlight(state, vscode.window.visibleTextEditors);
        refreshFolding(state);
    });
}

export function editFilter(filterTreeItem: vscode.TreeItem, state: State) {
    vscode.window.showInputBox({
        prompt: "Type a new regex",
        ignoreFocusOut: false
    }).then(regexStr => {
        if (regexStr === undefined) {
            return;
        }
        const id = filterTreeItem.id;
        const filter = state.filterArr.find(filter => (filter.id === id));
        filter!.regex = new RegExp(regexStr);
        state.filterTreeViewProvider.refresh();
        applyHighlight(state, vscode.window.visibleTextEditors);
        refreshFolding(state);
    });
}

export function setHighlight(isHighlighted: boolean, filterTreeItem: vscode.TreeItem, state: State) {
    const id = filterTreeItem.id;
    const filter = state.filterArr.find(filter => (filter.id === id));
    filter!.isHighlighted = isHighlighted;
    filter!.iconPath = generateSvgUri(state.storageUri, filter!.id, filter!.isHighlighted);
    applyHighlight(state, vscode.window.visibleTextEditors);
    writeSvgContent(filter!, state.filterTreeViewProvider);
    refreshFolding(state);
}

export function refreshEditors(state: State) {
    applyHighlight(state, vscode.window.visibleTextEditors);
    refreshFolding(state);
}