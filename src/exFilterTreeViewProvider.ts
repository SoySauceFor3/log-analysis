import * as vscode from 'vscode';
import { Filter } from "./utils";

//provides filters as tree items to be displayed on the sidebar
export class ExFilterTreeViewProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  constructor(private filters: Filter[]) { }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
    if (element === undefined) {
      return Promise.resolve(this.filters.map(filter => new FilterItem(filter)));
    } else {
      return Promise.resolve([]);
    }
  }

  private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined> = new vscode.EventEmitter<vscode.TreeItem | undefined>();
  readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined> = this._onDidChangeTreeData.event;

  refresh(element?: vscode.TreeItem): void {
    if (element === undefined) {
      console.log("[ex-filter]: refresh all");
    } else {
      console.log("[ex-filter]: refresh item");
    }
    this._onDidChangeTreeData.fire(element);
  }
}

//represents a filter as one row in the sidebar
export class FilterItem extends vscode.TreeItem {
  constructor(
    filter: Filter,
  ) {
    super(filter.regex.toString(), vscode.TreeItemCollapsibleState.None);
    this.contextValue = 'f-invisible';
    this.update(filter);
  }

  update(filter: Filter) {
    this.label = filter.regex.toString();
    this.id = filter.id;

    if (filter.isShown) {
      this.description = ` · ${filter.count}`;
      this.contextValue = 'f-visible';
      this.iconPath = new vscode.ThemeIcon("bracket-error");
    } else {
      this.description = '';
      this.contextValue = 'f-invisible';
      this.iconPath = undefined;
    }
  }

  //contextValue connects to package.json>menus>view/item/context
  contextValue:
    | 'f-visible'
    | 'f-invisible';
}
