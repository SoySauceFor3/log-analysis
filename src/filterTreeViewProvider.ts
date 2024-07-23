import * as vscode from "vscode";
import { Filter } from "./utils";

//provides filters as tree items to be displayed on the sidebar
export class FilterTreeViewProvider
  implements vscode.TreeDataProvider<FilterItem>
{
  constructor(private filterArr: Filter[]) {}

  getTreeItem(element: FilterItem): vscode.TreeItem {
    return element;
  }

  //getChildren(filterItem) returns empty list because filters have no children.
  //getChildren() returns the root elements (all the filters)
  getChildren(element?: FilterItem): FilterItem[] {
    if (element) {
      return [];
    } else {
      // root
      return this.filterArr.map((filter) => new FilterItem(filter));
    }
  }

  private _onDidChangeTreeData: vscode.EventEmitter<FilterItem | undefined> =
    new vscode.EventEmitter<FilterItem | undefined>();
  readonly onDidChangeTreeData: vscode.Event<FilterItem | undefined> =
    this._onDidChangeTreeData.event;

  refresh(): void {
    console.log("in refresh");
    this._onDidChangeTreeData.fire(undefined);
  }
}

//represents a filter as one row in the sidebar
export class FilterItem extends vscode.TreeItem {
  constructor(filter: Filter) {
    super(filter.regex.toString());
    this.label = filter.regex.toString();
    this.id = filter.id;
    this.iconPath = filter.iconPath;

    if (filter.isHighlighted) {
      if (filter.isShown) {
        this.description = ` · ${filter.count}`;
        this.contextValue = "lit-visible";
      } else {
        this.description = "";
        this.contextValue = "lit-invisible";
      }
    } else {
      this.description = "";
      if (filter.isShown) {
        this.contextValue = "unlit-visible";
      } else {
        this.contextValue = "unlit-invisible";
      }
    }
  }

  //contextValue connects to package.json>menus>view/item/context
  contextValue:
    | "lit-visible"
    | "unlit-visible"
    | "lit-invisible"
    | "unlit-invisible";
}
