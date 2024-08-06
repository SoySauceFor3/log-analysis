import * as vscode from "vscode";
import { State } from "./extension";
import { Group, generateRandomColor, generateSvgUri } from "./utils";

export function applyHighlight(
  state: State,
  editors: readonly vscode.TextEditor[]
): void {
  // remove old decorations from all the text editor using the given decorationType
  state.decorations.forEach((decorationType) => decorationType.dispose());
  state.decorations = [];

  editors.forEach((editor) => {
    let sourceCode = editor.document.getText();
    const sourceCodeArr = sourceCode.split("\n");

    state.groupArr.forEach((group) => {
      //apply new decorations
      group.filterArr.forEach((filter) => {
        let filterCount = 0;
        //if filter's highlight is off, or this editor is in focus mode and filter is not shown, we don't want to put decorations
        //especially when a specific line fits more than one filter regex and some of them are shown while others are not.
        if (filter.isHighlighted && (!editor.document.uri.toString().startsWith('focus:') || filter.isShown)) {
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
          let decorationType = vscode.window.createTextEditorDecorationType(
            {
              backgroundColor: filter.color,
              isWholeLine: true,
            }
          );
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
  })
}

//record the important fields of each filter on a json object and open a new tab for the json
export function exportFilters(state: State) {
  const content = JSON.stringify({
    groups: state.groupArr.map(group => ({
      name: group.name,
      isHighlighted: group.isHighlighted,
      isShown: group.isShown,
      filterArr: group.filterArr.map(filter => ({
        regexText: filter.regex.source,
        color: filter.color,
        isHighlighted: filter.isHighlighted,
        isShown: filter.isShown
      }))
    }))
  }, null, 2);

  vscode.workspace.openTextDocument({
    content: content,
    language: "json"
  }).then(textDocument => {
    vscode.window.showTextDocument(textDocument);
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
      parsed.groups.map((g: any) => {
        const groupId = `${Math.random()}`;
        const group: Group = {
          filterArr: [],
          name: g.name as string,
          isHighlighted: g.isHighlighted as boolean,
          isShown: g.isShown as boolean,
          id: groupId
        };

        g.filterArr.map((f: any) => {
          const filterId = `${Math.random()}`;
          const filter = {
            regex: new RegExp(f.regexText),
            color: f.color as string,
            isHighlighted: f.isHighlighted as boolean,
            isShown: f.isShown as boolean,
            id: filterId,
            iconPath: generateSvgUri(
              f.color as string,
              f.isHighlighted
            ),
            count: 0
          };
          group.filterArr.push(filter);
        });
        state.groupArr.push(group);
      });
      refreshEditors(state);
    });
}

//set bool for whether the lines matched the given filter will be kept for focus mode
export function setVisibility(
  isShown: boolean,
  treeItem: vscode.TreeItem,
  state: State
) {
  const id = treeItem.id;
  const group = state.groupArr.find(group => (group.id === id));
  if (group !== undefined) {
    group.isShown = isShown;
    group.filterArr.map(filter => (filter.isShown = isShown));
  } else {
    state.groupArr.map(group => {
      const filter = group.filterArr.find(filter => (filter.id === id));
      if (filter !== undefined) {
        filter.isShown = isShown;
      }
    });
  }
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

export function deleteFilter(treeItem: vscode.TreeItem, state: State) {
  state.groupArr.map(group => {
    const deleteIndex = group.filterArr.findIndex(filter => (filter.id === treeItem.id));
    if (deleteIndex !== -1) {
      group.filterArr.splice(deleteIndex, 1);
    }
  });
  refreshEditors(state);
}

export function addFilter(treeItem: vscode.TreeItem, state: State) {
  vscode.window
    .showInputBox({
      prompt: "[FILTER] Type a regex to filter",
      ignoreFocusOut: false,
    })
    .then((regexStr) => {
      if (regexStr === undefined) {
        return;
      }
      const group = state.groupArr.find(group => (group.id === treeItem.id));
      const id = `${Math.random()}`;
      const color = generateRandomColor();
      const filter = {
        isHighlighted: true,
        isShown: true,
        regex: new RegExp(regexStr),
        color: color,
        id,
        iconPath: generateSvgUri(color, true),
        count: 0,
      };
      group!.filterArr.push(filter);
      refreshEditors(state);
    });
}

export function editFilter(treeItem: vscode.TreeItem, state: State) {
  vscode.window
    .showInputBox({
      prompt: "[FILTER] Type a new regex",
      ignoreFocusOut: false,
    })
    .then((regexStr) => {
      if (regexStr === undefined) {
        return;
      }
      const id = treeItem.id;
      state.groupArr.map(group => {
        const filter = group.filterArr.find(filter => (filter.id === id));
        if (filter !== undefined) {
          filter.regex = new RegExp(regexStr);
        }
      });
      refreshEditors(state);
    });
}

export function setHighlight(
  isHighlighted: boolean,
  treeItem: vscode.TreeItem,
  state: State
) {
  const id = treeItem.id;
  const group = state.groupArr.find(group => (group.id === id));
  if (group !== undefined) {
    group.isHighlighted = isHighlighted;
    group.filterArr.map(filter => {
      filter.isHighlighted = isHighlighted;
      filter.iconPath = generateSvgUri(filter.color, filter.isHighlighted);
    });
  } else {
    state.groupArr.map(group => {
      const filter = group.filterArr.find(filter => (filter.id === id));
      if (filter !== undefined) {
        filter.isHighlighted = isHighlighted;
        filter.iconPath = generateSvgUri(filter.color, filter.isHighlighted);;
      }
    });
  }
  applyHighlight(state, vscode.window.visibleTextEditors);
  refreshEditors(state);
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
  console.log("refreshEditors");
  state.filterTreeViewProvider.refresh();
}

export function refreshTreeView(state: State) {
  console.log("refresh only tree view");
  state.filterTreeViewProvider.refresh();
}

export function addGroup(state: State) {
  vscode.window.showInputBox({
    prompt: '[GROUP] Type a new group name',
    ignoreFocusOut: false
  }).then(name => {
    if (name === undefined) {
      return;
    }
    const id = `${Math.random()}`;
    const group = {
      filterArr: [],
      isHighlighted: true,
      isShown: true,
      name: name,
      id
    };
    state.groupArr.push(group);
    refreshTreeView(state);
  });
}

export function editGroup(treeItem: vscode.TreeItem, state: State) {
  vscode.window.showInputBox({
    prompt: "[GROUP] Type a new group name",
    ignoreFocusOut: false
  }).then(name => {
    if (name === undefined) {
      return;
    }
    const id = treeItem.id;
    const group = state.groupArr.find(group => (group.id === id));
    group!.name = name;
    refreshTreeView(state);
  });
}

export function deleteGroup(treeItem: vscode.TreeItem, state: State) {
  const deleteIndex = state.groupArr.findIndex(group => (group.id === treeItem.id));
  if (deleteIndex !== -1) {
    state.groupArr.splice(deleteIndex, 1);
  }
  refreshEditors(state);
}
