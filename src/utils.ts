import * as vscode from "vscode";

// One filter corresponds to one line in the configuration file
export type Filter = {
  isHighlighted: boolean; // if the matching lines will be highlighted
  isShown: boolean; //if the matching lines will be kept in focus mode
  regex: RegExp;
  color: string;
  id: string; //random generated number
  iconPath: vscode.Uri; //dataUri representing the isHighlighted/isNotHighlighted svg icon
  count: number; //count of lines which match the filter in the active editor
};

export type Group = {
    filterArr: Filter[];
    isHighlighted: boolean; // if the matching lines will be highlighted
    isShown: boolean; //if the matching lines will be kept in focus mode
    name: string;
    id: string; //random generated number
};

export function generateRandomColor(): string {
  return `hsl(${Math.floor(360 * Math.random())}, 40%, 40%)`;
}

// Creates an svg icon representing a filter: a filled circle if the filter is highlighted, or an empty circle otherwise.
// this icon is stored as a dataUri.
export function generateSvgUri(
  color: string,
  isHighlighted: boolean
): vscode.Uri {
  const fullSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle fill="${color}" cx="50" cy="50" r="50"/></svg>`;
  const emptySvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle stroke="${color}" fill="transparent" stroke-width="10" cx="50" cy="50" r="45"/></svg>`;
  const svgContent = isHighlighted ? fullSvg : emptySvg;
  const dataUri = `data:image/svg+xml;base64,${btoa(svgContent)}`;
  return vscode.Uri.parse(dataUri);
}
