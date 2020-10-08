// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as csvParse from "csv-parse/lib/sync";

// One filter corresponds to one line in the configuration file
type Filter = {
    isHighlighted: boolean;
    isShown: boolean;
    regex: RegExp;
    color: string;
};

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log(
        'Congratulations, your extension "log-analysis" is now active!'
    );
    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json
    let disposable = vscode.commands.registerCommand(
        "log-analysis.addFilter",
        () => {
            // The code you place here will be executed every time your command is executed

            let uri = vscode.Uri.file(
                "/Users/xinya/Documents/GitHub/log-analysis/src/example.csv"
            );
            vscode.workspace.fs.readFile(uri).then(console.log, console.log);
            vscode.workspace
                .openTextDocument(uri)
                .then((textDoc) => {
                    let output: string[][] = csvParse(textDoc.getText());
                    return output.map((row) => ({
                        isHighlighted: row[0] === "T",
                        isShown: row[1] === "T",
                        regex: new RegExp(row[2], "g"),
                        color: row[3],
                    }));
                }, console.log)
                .then((filterArr) => {
                    let editor = vscode.window.activeTextEditor!;
                    let sourceCode = editor.document.getText();
                    const sourceCodeArr = sourceCode.split("\n");
                    filterArr.forEach((filter) => {
                        if (!filter.isHighlighted) {
                            return;
                        }
                        let regex = filter.regex;
                        let decorationsArray: vscode.DecorationOptions[] = [];
                        for (
                            let lineIdx = 0;
                            lineIdx < sourceCodeArr.length;
                            lineIdx++
                        ) {
                            if (regex.test(sourceCodeArr[lineIdx])) {
                                let range = new vscode.Range(
                                    new vscode.Position(lineIdx, 0),
                                    new vscode.Position(lineIdx, 20)
                                );
                                decorationsArray.push({ range });
                            }
                        }
                        let decorationType = vscode.window.createTextEditorDecorationType(
                            {
                                backgroundColor: filter.color,
                                isWholeLine: true,
                            }
                        );
                        editor.setDecorations(decorationType, decorationsArray);
                    });
                }, console.log)
                .then(() => console.log("FINISHED"), console.log);

            //
        }
    );

    context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
