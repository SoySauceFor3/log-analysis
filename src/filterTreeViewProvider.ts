import * as vscode from 'vscode';
import { Filter } from "./utils";

export class FilterTreeViewProvider implements vscode.TreeDataProvider<FilterItem> {

    constructor(private filterArr:Filter[]) {}

    getTreeItem(element: FilterItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: FilterItem): FilterItem[] {
        if (element) {
            return [];
        } else { // root
            return this.filterArr.map(filter => new FilterItem(filter));
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
        filter: Filter,
    ) {
        super(filter.regex.toString());
        this.label = filter.regex.toString();
        this.id = filter.id;
        this.iconPath = filter.iconPath;
        

        if (filter.isHighlighted) {
            this.description = ` · ${filter.count}`;
            if (filter.isShown) {
                this.contextValue = 'lit-visible';
            } else {
                this.contextValue = 'lit-invisible';
            }
        } else {
            this.description = '';
            if (filter.isShown) {
                this.contextValue = 'unlit-visible';
            } else {
                this.contextValue = 'unlit-invisible';
            }
        }
    }

    contextValue: 'lit-visible' | 'unlit-visible' | 'lit-invisible' | 'unlit-invisible';
}
