import * as vscode from "vscode";
import { Filter, cleanUpIconFiles } from "./utils";
import { FilterTreeViewProvider } from "./filterTreeViewProvider";
import { applyHighlight, deleteFilter, setVisibility, importFilters, onFocusMode, exportFilters, addFilter, editFilter, setHighlight, refreshEditors } from "./commands";
import { FocusProvider } from "./focusProvider";
//GLOBAL
let storageUri: vscode.Uri;

export type State = {
    inFocusMode: boolean;
    filterArr: Filter[];
    decorations: vscode.TextEditorDecorationType[];
    disposableFoldingRange: vscode.Disposable | null;
    filterTreeViewProvider: FilterTreeViewProvider;
    focusProvider:FocusProvider
    storageUri: vscode.Uri;
};

export function activate(context: vscode.ExtensionContext) {
    storageUri = context.globalStorageUri; //get the store path
    cleanUpIconFiles(storageUri); //clean up the old icon files

        
    //internal globals
    const filterArr: Filter[] = []; 
    const state: State = {
        inFocusMode: false,
        filterArr,
        decorations: [],
        disposableFoldingRange: null, 
        filterTreeViewProvider: new FilterTreeViewProvider(filterArr),
        focusProvider: new FocusProvider(filterArr),
        storageUri
    };
    
    vscode.workspace.registerTextDocumentContentProvider('focus', state.focusProvider);

    vscode.window.registerTreeDataProvider('filters', state.filterTreeViewProvider);

    //
    var disposableEventListener = vscode.window.onDidChangeVisibleTextEditors(event => {
        refreshEditors(state);

    });
    context.subscriptions.push(disposableEventListener);

    vscode.workspace.onDidChangeTextDocument(event => {
        refreshEditors(state);
    });

    vscode.window.onDidChangeActiveTextEditor(event => {
        applyHighlight(state, vscode.window.visibleTextEditors);
        state.filterTreeViewProvider.refresh();
    })
    //register commands
    let disposableExport = vscode.commands.registerCommand(
        "log-analysis.exportFilters", 
        () => exportFilters(state));
    context.subscriptions.push(disposableExport);

    let disposableImport = vscode.commands.registerCommand(
        "log-analysis.importFilters", 
        () => importFilters(state));
    context.subscriptions.push(disposableImport);

    let disposableEnableVisibility = vscode.commands.registerCommand(
        "log-analysis.enableVisibility",
        (filterTreeItem: vscode.TreeItem) => setVisibility(true, filterTreeItem, state)
    );
    context.subscriptions.push(disposableEnableVisibility);

    let disposableDisableVisibility = vscode.commands.registerCommand(
        "log-analysis.disableVisibility",
        (filterTreeItem: vscode.TreeItem) => setVisibility(false, filterTreeItem, state)
    );
    context.subscriptions.push(disposableDisableVisibility);
    
    let disposableOnFocusMode = vscode.commands.registerCommand(
        "log-analysis.onFocusMode",
        () => onFocusMode(state)
    );
    context.subscriptions.push(disposableOnFocusMode);

    let disposibleDeleteFilter = vscode.commands.registerCommand(
        "log-analysis.deleteFilter",
        (filterTreeItem: vscode.TreeItem) => deleteFilter(filterTreeItem, state)
    );
    context.subscriptions.push(disposibleDeleteFilter);

    let disposibleAddFilter = vscode.commands.registerCommand(
        "log-analysis.addFilter",
        () => addFilter(state)
    );
    context.subscriptions.push(disposibleAddFilter);

    let disposibleEditFilter = vscode.commands.registerCommand(
        "log-analysis.editFilter",
        (filterTreeItem: vscode.TreeItem) => editFilter(filterTreeItem, state)
    );
    context.subscriptions.push(disposibleEditFilter);

    let disposibleEnableHighlight = vscode.commands.registerCommand(
        "log-analysis.enableHighlight",
        (filterTreeItem: vscode.TreeItem) => setHighlight(true, filterTreeItem, state)
    );
    context.subscriptions.push(disposibleEnableHighlight);

    let disposibleDisableHighlight = vscode.commands.registerCommand(
        "log-analysis.disableHighlight",
        (filterTreeItem: vscode.TreeItem) => setHighlight(false, filterTreeItem, state)
    );
    context.subscriptions.push(disposibleDisableHighlight);
}


// this method is called when your extension is deactivated
export function deactivate() {
    cleanUpIconFiles(storageUri);
}
