import * as vscode from "vscode";
import * as path from 'path';
import * as fs from 'fs';
import { Project, Group, Filter, generateSvgUri } from './utils';

function getSettingFile(storageUri: vscode.Uri): string {
    const storagePath: string = storageUri.fsPath;

    // Create the directory if it does not exist
    if (!fs.existsSync(storagePath)) {
        fs.mkdirSync(storagePath, { recursive: true });
    }

    return path.join(storagePath, 'vscode_log_analysis.json');
}

export function openSettings(storageUri: vscode.Uri) {
    const settingFile = getSettingFile(storageUri);

    vscode.workspace.openTextDocument(settingFile).then((doc) => {
        vscode.window.showTextDocument(doc);
    });
}

export function readSettings(storageUri: vscode.Uri): Project[] {
    const settingFile = getSettingFile(storageUri);
    const projects: Project[] = [];

    if (fs.existsSync(settingFile)) {
        try {
            const text = fs.readFileSync(settingFile, 'utf8');
            const parsed = JSON.parse(text);

            parsed.projects.map((p: Project) => {
                const project: Project = {
                    groups: [],
                    name: p.name,
                    id: `${Math.random()}`,
                    selected: false
                };
                p.groups.map((g: Group) => {
                    const group: Group = {
                        filters: [],
                        name: g.name as string,
                        isHighlighted: false,
                        isShown: false,
                        id: `${Math.random()}`
                    };
                    g.filters.map((f: Filter) => {
                        const filterId = `${Math.random()}`;
                        const filter = {
                            regex: new RegExp(f.regex),
                            color: f.color as string,
                            isHighlighted: false,
                            isShown: false,
                            id: filterId,
                            iconPath: generateSvgUri(f.color, f.isHighlighted),
                            count: 0
                        };
                        group.filters.push(filter);
                    });
                    project.groups.push(group);
                });
                projects.push(project);
            });
        } catch (e) {
            vscode.window.showErrorMessage('The settings file is broken');
        }
    }
    return projects;
}

export function saveSettings(storageUri: vscode.Uri, projects: Project[]) {
    const settingFile = getSettingFile(storageUri);

    const content = JSON.stringify({
        projects: projects.map(project => ({
            name: project.name,
            groups: project.groups.map(group => ({
                name: group.name,
                filters: group.filters.map(filter => ({
                    regex: filter.regex.source,
                    color: filter.color,
                }))
            }))
        }))
    }, null, 2);

    fs.writeFileSync(settingFile, content, 'utf8');
}
