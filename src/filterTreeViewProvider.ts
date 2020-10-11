import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Filter } from "./utils";

export class FilterTreeViewProvider implements vscode.TreeDataProvider<FilterItem> {

    // private _onDidChangeTreeData: vscode.EventEmitter<Dependency | undefined | void> = new vscode.EventEmitter<Dependency | undefined | void>();
    // readonly onDidChangeTreeData: vscode.Event<Dependency | undefined | void> = this._onDidChangeTreeData.event;

    constructor(private filterArr:Filter[]) {}

    // refresh(): void {
    //     this._onDidChangeTreeData.fire();
    // }

    getTreeItem(element: FilterItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: FilterItem): FilterItem[] {
        if (element) {
            return [];
        } else { // root
            return this.filterArr.map(filter => new FilterItem(filter.regex.toString()));
        }
    }

}

export class FilterItem extends vscode.TreeItem {
    constructor(
    public readonly label: string,
    ) {
        super(label);
    }

    contextValue = 'filter';
}