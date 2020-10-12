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
            return this.filterArr.map(filter => new FilterItem(filter.regex.toString(), filter.id));
        }
    }

    private _onDidChangeTreeData: vscode.EventEmitter<FilterItem | undefined> = new vscode.EventEmitter<FilterItem | undefined>();
    readonly onDidChangeTreeData: vscode.Event<FilterItem | undefined> = this._onDidChangeTreeData.event;
    
    refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
      }
}

export class FilterItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly id: string,
    ) {
        super(label);
        this.id = id;
    }

    contextValue: 'lit-visible' | 'unlit-visible' | 'lit-invisible' | 'unlit-invisible' = 'unlit-visible';
}