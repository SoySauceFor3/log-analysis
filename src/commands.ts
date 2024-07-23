import * as vscode from "vscode";
import { State } from "./extension";
import { generateRandomColor, generateSvgUri, writeSvgContent } from "./utils";

export function applyHighlight(
  state: State,
  editors: vscode.TextEditor[]
): void {
  // remove old decorations from all the text editor using the given decorationType
  state.decorations.forEach((decorationType) => decorationType.dispose());
  state.decorations = [];

  editors.forEach((editor) => {
    let sourceCode = editor.document.getText();
    const sourceCodeArr = sourceCode.split("\n");

    //apply new decorations
    state.filterArr.forEach((filter) => {
      let filterCount = 0;
      //if filter's highlight is off, or this editor is in focus mode and filter is not shown, we don't want to put decorations
      //especially when a specific line fits more than one filter regex and some of them are shown while others are not.
      if (
        filter.isHighlighted &&
        (!editor.document.uri.toString().startsWith("focus:") || filter.isShown)
      ) {
        let lineNumbers: number[] = [];
        for (let lineIdx = 0; lineIdx < sourceCodeArr.length; lineIdx++) {
          if (filter.regex.test(sourceCodeArr[lineIdx])) {
            lineNumbers.push(lineIdx);
          }
        }
        filterCount = lineNumbers.length;

        const decorationsArray = lineNumbers.map((lineIdx) => {
          return new vscode.Range(
            new vscode.Position(lineIdx, 0),
            new vscode.Position(lineIdx, 0) //position does not matter because isWholeLine is set to true
          );
        });
        let decorationType = vscode.window.createTextEditorDecorationType({
          backgroundColor: filter.color,
          isWholeLine: true,
        });
        //store the decoration type for future removal
        state.decorations.push(decorationType);
        editor.setDecorations(decorationType, decorationsArray);
      }
      //filter.count represents the count of the lines for the activeEditor, so if the current editor is active, we update the count
      if (editor === vscode.window.activeTextEditor) {
        filter.count = filterCount;
      }
    });
  });
}

//record the important fields of each filter on a json object and open a new tab for the json
export function exportFilters(state: State) {
  const content = JSON.stringify(
    state.filterArr.map((filter) => {
      return {
        regexText: filter.regex.source,
        color: filter.color,
        isHighlighted: filter.isHighlighted,
        isShown: filter.isShown,
      };
    })
  );
  vscode.workspace.openTextDocument({
    content: content,
    language: "json",
  });
}

//open a selected json file and parse each filter to add back
export function importFilters(state: State) {
  vscode.window
    .showOpenDialog({
      canSelectFiles: true,
      canSelectMany: false,
      filters: {
        json: ["json"],
      },
    })
    .then((uriArr) => {
      if (!uriArr) {
        return;
      }
      return vscode.workspace.openTextDocument(uriArr[0]);
    })
    .then((textDocument) => {
      const text = textDocument!.getText();
      const parsed = JSON.parse(text);
      if (typeof parsed !== "object") {
        return;
      }
      const array = parsed as any[];
      array.forEach((filterText) => {
        if (
          typeof filterText.regexText === "string" &&
          typeof filterText.color === "string" &&
          typeof filterText.isHighlighted === "boolean" &&
          typeof filterText.isShown === "boolean"
        ) {
          const id = `${Math.random()}`;
          const filter = {
            regex: new RegExp(filterText.regexText),
            color: filterText.color as string,
            isHighlighted: filterText.isHighlighted as boolean,
            isShown: filterText.isShown as boolean,
            id,
            iconPath: generateSvgUri(
              state.storageUri,
              id,
              filterText.isHighlighted
            ),
            count: 0,
          };
          state.filterArr.push(filter);
          writeSvgContent(filter, state.filterTreeViewProvider);
        }
      });
      refreshEditors(state);
    });
}

//set bool for whether the lines matched the given filter will be kept for focus mode
export function setVisibility(
  isShown: boolean,
  filterTreeItem: vscode.TreeItem,
  state: State
) {
  const id = filterTreeItem.id;
  const filter = state.filterArr.find((filter) => filter.id === id);
  filter!.isShown = isShown;
  refreshEditors(state);
}

//turn on focus mode for the active editor. Will create a new tab if not already for the virtual document
export function turnOnFocusMode(state: State) {
  let editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }
  let escapedUri = editor.document.uri.toString();
  if (escapedUri.startsWith("focus:")) {
    //avoid creating nested focus mode documents
    vscode.window.showInformationMessage(
      "You are on focus mode virtual document already!"
    );
    return;
  } else {
    //set special schema
    let virtualUri = vscode.Uri.parse("focus:" + escapedUri);
    //because of the special schema, openTextDocument will use the focusProvider
    vscode.workspace
      .openTextDocument(virtualUri)
      .then((doc) => vscode.window.showTextDocument(doc));
  }
}

export function deleteFilter(filterTreeItem: vscode.TreeItem, state: State) {
  const deleteIndex = state.filterArr.findIndex(
    (filter) => filter.id === filterTreeItem.id
  );
  state.filterArr.splice(deleteIndex, 1);
  refreshEditors(state);
}

export function addFilter(state: State) {
  vscode.window
    .showInputBox({
      prompt: "Type a regex to filter",
      ignoreFocusOut: false,
    })
    .then((regexStr) => {
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
        count: 0,
      };
      state.filterArr.push(filter);
      //the order of the following two lines is deliberate (due to some unknown reason of async dependencies...)
      writeSvgContent(filter, state.filterTreeViewProvider);
      refreshEditors(state);
    });
}

export function editFilter(filterTreeItem: vscode.TreeItem, state: State) {
  vscode.window
    .showInputBox({
      prompt: "Type a new regex",
      ignoreFocusOut: false,
    })
    .then((regexStr) => {
      if (regexStr === undefined) {
        return;
      }
      const id = filterTreeItem.id;
      const filter = state.filterArr.find((filter) => filter.id === id);
      filter!.regex = new RegExp(regexStr);
      refreshEditors(state);
    });
}

export function setHighlight(
  isHighlighted: boolean,
  filterTreeItem: vscode.TreeItem,
  state: State
) {
  const id = filterTreeItem.id;
  const filter = state.filterArr.find((filter) => filter.id === id);
  filter!.isHighlighted = isHighlighted;
  filter!.iconPath = generateSvgUri(
    state.storageUri,
    filter!.id,
    filter!.isHighlighted
  );
  applyHighlight(state, vscode.window.visibleTextEditors);
  writeSvgContent(filter!, state.filterTreeViewProvider);
}

//refresh every visible component, including:
//document content of the visible focus mode virtual document,
//decoration of the visible focus mode virtual document,
//highlight decoration of visible editors
//treeview on the side bar
export function refreshEditors(state: State) {
  vscode.window.visibleTextEditors.forEach((editor) => {
    let escapedUri = editor.document.uri.toString();
    if (escapedUri.startsWith("focus:")) {
      state.focusProvider.refresh(editor.document.uri);
      let focusDecorationType = vscode.window.createTextEditorDecorationType({
        before: {
          contentText: ">>>>>>>focus mode<<<<<<<",
          color: "#888888",
        },
      });
      let focusDecorationRangeArray = [
        new vscode.Range(new vscode.Position(0, 0), new vscode.Position(1, 0)),
      ];
      editor.setDecorations(focusDecorationType, focusDecorationRangeArray);
    }
  });
  applyHighlight(state, vscode.window.visibleTextEditors);
  console.log("refreshEditos");
  state.filterTreeViewProvider.refresh();
}
