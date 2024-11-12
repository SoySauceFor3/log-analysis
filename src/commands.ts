import * as vscode from "vscode";
import { State } from "./extension";
import { readSettings, saveSettings } from "./settings";
import {
  Filter,
  generateRandomColor,
  generateSvgUri,
  getProjectSelectedIndex,
  setProjectSelectedFlag,
  setStatusBarMessage,
} from "./utils";

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

    state.groups.forEach((group) => {
      //apply new decorations
      group.filters.forEach((filter) => {
        let filterCount = 0;
        //if filter's highlight is off, or this editor is in focus mode and filter is not shown, we don't want to put decorations
        //especially when a specific line fits more than one filter regex and some of them are shown while others are not.
        if (
          filter.isHighlighted &&
          (!editor.document.uri.toString().startsWith("focus:") ||
            filter.isShown)
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
  });
}

//set bool for whether the lines matched the given filter will be kept for focus mode
export function setVisibility(
  isShown: boolean,
  treeItem: vscode.TreeItem,
  state: State
) {
  const id = treeItem.id;
  const group = state.groups.find((group) => group.id === id);
  if (group !== undefined) {
    group.isShown = isShown;
    group.filters.map((filter) => (filter.isShown = isShown));
  } else {
    state.groups.map((group) => {
      const filter = group.filters.find((filter) => filter.id === id);
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
  state.groups.map((group) => {
    const deleteIndex = group.filters.findIndex(
      (filter) => filter.id === treeItem.id
    );
    if (deleteIndex !== -1) {
      group.filters.splice(deleteIndex, 1);
    }
  });
  refreshEditors(state);
}

export function addFilter(treeItem: vscode.TreeItem, state: State) {
  // First show quick pick with choices
  vscode.window
    .showQuickPick(["Add a filter", "Add an exclude filter"], {
      placeHolder: "Select filter type",
    })
    .then((selected) => {
      if (!selected) {
        return;
      }

      vscode.window
        .showInputBox({
          prompt: "[FILTER] Type a regex for that filter",
          ignoreFocusOut: false,
        })
        .then((regexStr) => {
          if (!regexStr) {
            return;
          }
          const group = state.groups.find((group) => group.id === treeItem.id);
          const id = `${Math.random()}`;
          const isExclude = selected === "Add an exclude filter";
          const color = generateRandomColor(isExclude);
          const filter: Filter = {
            isHighlighted: true,
            isShown: true,
            regex: new RegExp(regexStr),
            color: color,
            id,
            iconPath: generateSvgUri(color, true, isExclude),
            count: 0,
            isExclude: isExclude,
          };
          group!.filters.push(filter);
          refreshEditors(state);
        });
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
      state.groups.map((group) => {
        const filter = group.filters.find((filter) => filter.id === id);
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
  const group = state.groups.find((group) => group.id === id);
  if (group !== undefined) {
    group.isHighlighted = isHighlighted;
    group.filters.map((filter) => {
      filter.isHighlighted = isHighlighted;
      filter.iconPath = generateSvgUri(
        filter.color,
        filter.isHighlighted,
        filter.isExclude
      );
    });
  } else {
    state.groups.map((group) => {
      const filter = group.filters.find((filter) => filter.id === id);
      if (filter !== undefined) {
        filter.isHighlighted = isHighlighted;
        filter.iconPath = generateSvgUri(
          filter.color,
          filter.isHighlighted,
          filter.isExclude
        );
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

export function refreshFilterTreeView(state: State) {
  console.log("refresh only tree view");
  state.filterTreeViewProvider.refresh();
}

export function updateFilterTreeViewAndFocusProvider(state: State) {
  console.log("update filter and tree view");
  state.filterTreeViewProvider.update(state.groups);
  state.focusProvider.update(state.groups);
}

export function updateProjectTreeView(state: State) {
  console.log("update project tree view");
  state.projectTreeViewProvider.update(state.projects);
}

export function addGroup(state: State) {
  vscode.window
    .showInputBox({
      prompt: "[GROUP] Type a new group name",
      ignoreFocusOut: false,
    })
    .then((name) => {
      if (name === undefined) {
        return;
      }
      const id = `${Math.random()}`;
      const group = {
        filters: [],
        isHighlighted: true,
        isShown: true,
        name: name,
        id,
      };
      state.groups.push(group);
      refreshFilterTreeView(state);
    });
}

export function editGroup(treeItem: vscode.TreeItem, state: State) {
  vscode.window
    .showInputBox({
      prompt: "[GROUP] Type a new group name",
      ignoreFocusOut: false,
    })
    .then((name) => {
      if (name === undefined) {
        return;
      }
      const id = treeItem.id;
      const group = state.groups.find((group) => group.id === id);
      group!.name = name;
      refreshFilterTreeView(state);
    });
}

export function deleteGroup(treeItem: vscode.TreeItem, state: State) {
  const deleteIndex = state.groups.findIndex(
    (group) => group.id === treeItem.id
  );
  if (deleteIndex !== -1) {
    state.groups.splice(deleteIndex, 1);
  }
  refreshEditors(state);
}

export function saveProject(state: State) {
  if (state.groups.length === 0) {
    vscode.window.showErrorMessage("There is no filter groups");
    return;
  }

  const selected = state.projects.find((p) => p.selected === true);
  if (selected === undefined) {
    vscode.window.showErrorMessage("There is no selected project");
    return;
  }

  selected.groups = state.groups;
  saveSettings(state.globalStorageUri, state.projects);

  setStatusBarMessage(`Project(${selected.name}) is saved.`);
}

export function addProject(state: State) {
  vscode.window
    .showInputBox({
      prompt: "[PROJECT] Type a new project name",
      ignoreFocusOut: false,
    })
    .then((name) => {
      if (name === undefined) {
        return;
      }

      const project = {
        groups: [],
        name,
        id: `${Math.random()}`,
        selected: false,
      };

      state.projects.push(project);
      saveSettings(state.globalStorageUri, state.projects);
      updateProjectTreeView(state);
    });
}

export function editProject(
  treeItem: vscode.TreeItem,
  state: State,
  callback: () => void
) {
  vscode.window
    .showInputBox({
      prompt: "[PROJECT] Type a new name",
      ignoreFocusOut: false,
    })
    .then((name) => {
      if (name === undefined) {
        return;
      }
      const findIndex = state.projects.findIndex(
        (project) => project.id === treeItem.id
      );
      if (findIndex !== -1) {
        state.projects[findIndex].name = name;
        saveSettings(state.globalStorageUri, state.projects);
        updateProjectTreeView(state);

        callback();
      }
    });
}

export function deleteProject(treeItem: vscode.TreeItem, state: State) {
  const selectedIndex = getProjectSelectedIndex(state.projects);
  const deleteIndex = state.projects.findIndex(
    (project) => project.id === treeItem.id
  );
  if (deleteIndex !== -1) {
    if (deleteIndex === selectedIndex) {
      state.groups = [];
      updateFilterTreeViewAndFocusProvider(state);
      refreshEditors(state);
    }
    state.projects.splice(deleteIndex, 1);
    saveSettings(state.globalStorageUri, state.projects);
    updateProjectTreeView(state);
  }
}

function createDefaultProject(state: State) {
  const name = "NONAME";

  if (state.projects.length === 0 || state.projects[0].name !== name) {
    const project = {
      groups: [],
      name,
      id: `${Math.random()}`,
      selected: false,
    };

    state.projects.unshift(project);
  }
}

export function refreshSettings(state: State) {
  state.projects = readSettings(state.globalStorageUri);
  var selectedIndex = -1;

  // Automatically activate the project if there is only one
  if (state.projects.length === 1) {
    selectedIndex = 0;
  }

  // Add a project named "NONAMED" in the following cases:
  // - A default project is generated for users who do not use the project feature.
  // - If multiple projects are available but none is selected, an empty project is created and selected.
  if (state.projects.length === 0) {
    createDefaultProject(state);
    saveSettings(state.globalStorageUri, state.projects);
    selectedIndex = 0;
  }

  if (selectedIndex === -1) {
    createDefaultProject(state);
    selectedIndex = 0;
  }

  setProjectSelectedFlag(state.projects, selectedIndex);
  state.groups = state.projects[selectedIndex].groups;

  updateProjectTreeView(state);
  updateFilterTreeViewAndFocusProvider(state);
  refreshEditors(state);
}

export function selectProject(
  treeItem: vscode.TreeItem,
  state: State
): boolean {
  const prevSelectedIndex = getProjectSelectedIndex(state.projects);
  const newSelectedIndex = state.projects.findIndex(
    (p) => p.id === treeItem.id
  );
  if (newSelectedIndex !== -1) {
    if (prevSelectedIndex === newSelectedIndex) {
      vscode.window.showInformationMessage("This project is already selected");
      return true;
    }
    state.projects.forEach((p) => {
      p.selected = false;
      p.groups.forEach((g) => {
        g.isHighlighted = false;
        g.isShown = false;
        g.filters.forEach((f) => {
          f.isHighlighted = false;
          f.isShown = false;
          f.iconPath = generateSvgUri(f.color, f.isHighlighted, f.isExclude);
        });
      });
    });

    const project = state.projects[newSelectedIndex];
    state.groups = project.groups;
    setProjectSelectedFlag(state.projects, newSelectedIndex);
    updateProjectTreeView(state);
    updateFilterTreeViewAndFocusProvider(state);
    refreshEditors(state);
    return true;
  }
  return false;
}

export function updateExplorerTitle(
  view: vscode.TreeView<vscode.TreeItem>,
  state: State
) {
  const selectedIndex = getProjectSelectedIndex(state.projects);
  if (selectedIndex === -1) {
    view.title = "Filters";
  } else {
    view.title = "Filters (" + state.projects[selectedIndex].name + ")";
  }
}
