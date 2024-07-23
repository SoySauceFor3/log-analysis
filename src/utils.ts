import * as vscode from "vscode";
import { FilterTreeViewProvider } from "./filterTreeViewProvider";

// One filter corresponds to one line in the configuration file
export type Filter = {
  isHighlighted: boolean; // if the matching lines will be highlighted
  isShown: boolean; //if the matching lines will be kept in focus mode
  regex: RegExp;
  color: string;
  id: string; //random generated number
  iconPath: vscode.Uri; //point to the isHighlighted/isNotHighlighted svg icon in the file system
  count: number; //count of lines which match the filter in the active editor
};

export function generateRandomColor(): string {
  return `hsl(${Math.floor(360 * Math.random())}, 40%, 40%)`;
}

//clean up the generated svgs stored in the folder created for this extension
export function cleanUpIconFiles(storageUri: vscode.Uri) {
  vscode.workspace.fs.delete(storageUri, {
    recursive: true,
    useTrash: false,
  });
}

//create an svg icon representing a filter: a filled circle if the filter is highlighted, or an empty circle otherwise.
//this icon gets stored in the file system at filter.iconPath.
export function writeSvgContent(
  filter: Filter,
  treeViewProvider: FilterTreeViewProvider
): void {
  const fullSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle fill="${filter.color}" cx="50" cy="50" r="50"/></svg>`;
  const emptySvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle stroke="${filter.color}" fill="transparent" stroke-width="10" cx="50" cy="50" r="45"/></svg>`;
  vscode.workspace.fs
    .writeFile(
      filter.iconPath,
      str2Uint8(filter.isHighlighted ? fullSvg : emptySvg)
    )
    .then(() => {
      console.log("before refresh");
      console.log(filter.iconPath);
      treeViewProvider.refresh();
    });
}

//convert a string to a Uint8Array
function str2Uint8(str: string): Uint8Array {
  var buf = new ArrayBuffer(str.length);
  var bufView = new Uint8Array(buf); //TODO: check if can just use str.length
  for (var i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return bufView;
}

export function generateSvgUri(
  storageUri: vscode.Uri,
  id: string,
  isHighlighted: boolean
): vscode.Uri {
  return vscode.Uri.joinPath(storageUri, `./${id}${isHighlighted}.svg`);
}
