import * as vscode from "vscode";
import { Filter, Group } from "./utils";

//Provide virtual documents as a strings that only contain lines matching shown filters.
//These virtual documents have uris of the form "focus:<original uri>" where
//<original uri> is the escaped uri of the original, unfocused document.
//VSCode uses this provider to generate virtual read-only files based on real files
export class FocusProvider implements vscode.TextDocumentContentProvider {
  groups: Group[];

  constructor(groups: Group[]) {
    this.groups = groups;
  }

  //open the original document specified by the uri and return the focused version of its text
  async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
    let originalUri = vscode.Uri.parse(uri.path);
    let sourceCode = await vscode.workspace.openTextDocument(originalUri);

    const { positiveCount } = this.countFilters();
    let resultArr: string[] = [];
    if (positiveCount > 0) {
      resultArr = this.collectFilteredLines(sourceCode);
    } else {
      resultArr = this.collectAllLines(sourceCode);
    }

    resultArr = this.removeExcludedLines(resultArr);

    return resultArr.join("\n");
  }

  private removeExcludedLines(lines: string[]): string[] {
    // Get all the ENABLED exclude filters
    const excludeFilters: Filter[] = [];
    for (const group of this.groups) {
      for (const filter of group.filters) {
        if (filter.isShown && filter.isExclude) {
          excludeFilters.push(filter);
        }
      }
    }

    // Remove the lines that match the exclude filters
    lines = lines.filter((line) => {
      for (const filter of excludeFilters) {
        if (filter.regex.test(line)) {
          return false;
        }
      }
      return true;
    });
    return lines;
  }
  private collectAllLines(sourceCode: vscode.TextDocument): string[] {
    const resultArr: string[] = [""];
    for (let lineIdx = 0; lineIdx < sourceCode.lineCount; lineIdx++) {
      const line = sourceCode.lineAt(lineIdx).text;
      resultArr.push(line);
    }
    return resultArr;
  }
  private collectFilteredLines(sourceCode: vscode.TextDocument): string[] {
    const resultArr: string[] = [""];
    for (let lineIdx = 0; lineIdx < sourceCode.lineCount; lineIdx++) {
      const line = sourceCode.lineAt(lineIdx).text;
      for (const group of this.groups) {
        for (const filter of group.filters) {
          if (!filter.isShown) {
            continue;
          }
          let regex = filter.regex;
          if (regex.test(line)) {
            resultArr.push(line);
            break;
          }
        }
      }
    }
    return resultArr;
  }
  private countFilters(): { positiveCount: number; excludeCount: number } {
    let positiveCount = 0;
    let excludeCount = 0;
    for (const group of this.groups) {
      for (const filter of group.filters) {
        if (filter.isShown) {
          if (filter.isExclude) {
            excludeCount++;
          } else {
            positiveCount++;
          }
        }
      }
    }
    return { positiveCount, excludeCount };
  }

  private onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
  readonly onDidChange = this.onDidChangeEmitter.event;

  //when this function gets called, the provideTextDocumentContent will be called again
  refresh(uri: vscode.Uri): void {
    this.onDidChangeEmitter.fire(uri);
  }

  update(groups: Group[]) {
    this.groups = groups;
  }
}
