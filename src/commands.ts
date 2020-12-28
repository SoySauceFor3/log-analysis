import * as vscode from "vscode";
import { State } from "./extension";
import { generateSvgUri, writeSvgContent, generateRandomColor, filterLines } from "./utils";

export function applyHighlight(state: State, editors: vscode.TextEditor[]): void {
    console.log(editors);
    
    // remove old decorations from all the text editor using the given decorationType
    state.decorations.forEach(decorationType => decorationType.dispose());
    state.decorations = [];
    
    editors.forEach((editor) => {
        let sourceCode = editor.document.getText();
        const sourceCodeArr = sourceCode.split("\n");
        
        //apply new decorations
        state.filterArr.forEach((filter) => {
            if (!filter.isHighlighted || (editor.document.uri.toString().startsWith('focus:') && !filter.isShown)) {
                if (editor === vscode.window.activeTextEditor) {
                    filter.count = 0;
                    console.log(filter.count);
                }
                return;
            }
            const lineNumbers = filterLines(sourceCodeArr, filter);
            if (editor === vscode.window.activeTextEditor) {
                filter.count = lineNumbers.length;
                console.log(filter.count);
            }
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
        });
}

export function setVisibility(isShown: boolean, filterTreeItem: vscode.TreeItem, state: State) {
    const id = filterTreeItem.id;
    const filter = state.filterArr.find(filter => (filter.id === id));
    filter!.isShown = isShown;
    refreshEditors(state);
}

let focusDecorationType: vscode.TextEditorDecorationType;

export function onFocusMode(state: State) {
    let editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }

    let escapedUri = editor.document.uri.toString();
    if (escapedUri.startsWith('focus:')) {
        vscode.window.showInformationMessage('You are on focus mode virtual document already!');
        return;
    } else {
        let virtualUri = vscode.Uri.parse('focus:' + escapedUri);
        vscode.workspace.openTextDocument(virtualUri).then(doc => vscode.window.showTextDocument(doc));
    }
    
}

export function deleteFilter(filterTreeItem: vscode.TreeItem, state: State) {
    const deleteIndex = state.filterArr.findIndex(filter => (filter.id === filterTreeItem.id));
    state.filterArr.splice(deleteIndex, 1);
    refreshEditors(state);
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
        refreshEditors(state);
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
        refreshEditors(state);
    });
}

export function setHighlight(isHighlighted: boolean, filterTreeItem: vscode.TreeItem, state: State) {
    const id = filterTreeItem.id;
    const filter = state.filterArr.find(filter => (filter.id === id));
    filter!.isHighlighted = isHighlighted;
    filter!.iconPath = generateSvgUri(state.storageUri, filter!.id, filter!.isHighlighted);
    applyHighlight(state, vscode.window.visibleTextEditors);
    writeSvgContent(filter!, state.filterTreeViewProvider);
}

export function refreshEditors(state: State) {
    vscode.window.visibleTextEditors.forEach(editor => {
        state.focusProvider.refresh(editor.document.uri);
    });
    vscode.window.visibleTextEditors.forEach(editor => {
        let escapedUri = editor.document.uri.toString();
        if (escapedUri.startsWith('focus:')){
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
        }
    });
    applyHighlight(state, vscode.window.visibleTextEditors);
    state.filterTreeViewProvider.refresh();
}