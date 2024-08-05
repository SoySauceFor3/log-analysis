import * as vscode from "vscode";
import { Filter, Group } from "./utils";

//provides filters as tree items to be displayed on the sidebar
export class FilterTreeViewProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private groupItemCache: Map<string, GroupItem> = new Map();
  private filterItemCache: Map<string, FilterItem> = new Map();

  constructor(private groups: Group[]) { }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  //getChildren(vscode.TreeItem) returns empty list because filters have no children.
  //getChildren() returns the root elements (all the filters)
  getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
    if (element === undefined) {
      return Promise.resolve(this.groups.map(group => this.getNewGroupItem(group)));
    }
    if (element instanceof GroupItem) {
      return Promise.resolve(element.filters.map(filter => this.getNewFilterItem(filter)));
    } else {
      return Promise.resolve([]);
    }
  }

  private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined> = new vscode.EventEmitter<vscode.TreeItem | undefined>();
  readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined> = this._onDidChangeTreeData.event;

  refresh(element?: vscode.TreeItem): void {
    if (element === undefined) {
      console.log("[filter]: refresh all");
    } else {
      this.updateElement(element);
      console.log("[filter]: refresh item");
    }
    this._onDidChangeTreeData.fire(element);
  }

  updateElement(element: vscode.TreeItem): void {
    if (element instanceof GroupItem) {
      const group = this.groups.find(g => (g.id === element.id));
      if (group !== undefined) {
        element.update(group);
      }
    } else if (element instanceof FilterItem) {
      this.groups.map(g => {
        const filter = g.filters.find(f => (f.id === element.id));
        if (filter !== undefined) {
          element.update(filter);
        }
      });
    }
  }

  update(groups: Group[]): void {
    this.groups = groups;
    this.clearUnusedCacheItem();
    this.refresh();
  }

  getParentItem(element: vscode.TreeItem): vscode.TreeItem {
    if (element instanceof GroupItem) {
      return element;
    }

    for (const group of this.groups) {
      const index = group.filters.findIndex(f => (f.id === element.id));
      if (index !== -1) {
        let groupItem = this.groupItemCache.get(group.id);
        if (groupItem !== undefined) {
          return groupItem;
        }
      }
    }
    return element;
  }

  clearUnusedCacheItem() {
    this.groups.forEach(group => {
      group.filters.forEach(filter => {
        this.filterItemCache.delete(filter.id);
      });
      this.groupItemCache.delete(group.id);
    });
  }

  getNewGroupItem(group: Group): GroupItem {
    let groupItem = this.groupItemCache.get(group.id);
    if (groupItem === undefined) {
      groupItem = new GroupItem(group);
      this.groupItemCache.set(group.id, groupItem);
    } else {
      groupItem.update(group);
    }
    return groupItem;
  }

  getNewFilterItem(filter: Filter): FilterItem {
    let filterItem = this.filterItemCache.get(filter.id);
    if (filterItem === undefined) {
      filterItem = new FilterItem(filter);
      this.filterItemCache.set(filter.id, filterItem);
    } else {
      filterItem.update(filter);
    }
    return filterItem;
  }
}

export class GroupItem extends vscode.TreeItem {
  filters: Filter[] = [];

  constructor(group: Group) {
    super(group.name, vscode.TreeItemCollapsibleState.Collapsed);
    this.contextValue = 'g-unlit-invisible';
    this.update(group);
  }

  update(group: Group) {
    this.label = group.name;
    this.id = group.id;
    this.filters = group.filters;

    if (group.isHighlighted) {
      if (group.isShown) {
        this.contextValue = 'g-lit-visible';
        this.iconPath = new vscode.ThemeIcon("bracket-dot");
      } else {
        this.description = '';
        this.contextValue = 'g-lit-invisible';
        this.iconPath = new vscode.ThemeIcon("bracket-error");
      }
    } else {
      this.description = '';
      if (group.isShown) {
        this.contextValue = 'g-unlit-visible';
        this.iconPath = new vscode.ThemeIcon("bracket");
      } else {
        this.contextValue = 'g-unlit-invisible';
        this.iconPath = undefined;
      }
    }
  }

  //contextValue connects to package.json>menus>view/item/context
  contextValue:
    | 'g-lit-visible'
    | 'g-unlit-visible'
    | 'g-lit-invisible'
    | 'g-unlit-invisible';
}

//represents a filter as one row in the sidebar
export class FilterItem extends vscode.TreeItem {
  constructor(filter: Filter) {
    super(filter.regex.toString(), vscode.TreeItemCollapsibleState.None);
    this.contextValue = 'f-unlit-invisible';
    this.update(filter);
  }

  update(filter: Filter) {
    this.label = filter.regex.toString();
    this.id = filter.id;
    this.iconPath = filter.iconPath;

    if (filter.isHighlighted) {
      if (filter.isShown) {
        this.description = ` · ${filter.count}`;
        this.contextValue = 'f-lit-visible';
      } else {
        this.description = '';
        this.contextValue = 'f-lit-invisible';
      }
    } else {
      this.description = '';
      if (filter.isShown) {
        this.contextValue = 'f-unlit-visible';
      } else {
        this.contextValue = 'f-unlit-invisible';
      }
    }
  }

  //contextValue connects to package.json>menus>view/item/context
  contextValue:
    | "f-lit-visible"
    | "f-unlit-visible"
    | "f-lit-invisible"
    | "f-unlit-invisible";
}
