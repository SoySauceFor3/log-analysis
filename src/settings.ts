import * as vscode from "vscode";
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { State } from "./extension";
import { Project, Group, Filter, generateSvgUri } from './utils';

const settingFilename: string = path.join(os.homedir(), 'vscode_log_analysis.json');

export function openSettings(state: State) {
    const settingFile = vscode.Uri.file(settingFilename);
    vscode.workspace.openTextDocument(settingFile).then((doc) => {
        vscode.window.showTextDocument(doc);
    });
}

export function readSettings(): Project[] {
    const projects: Project[] = [];

    if (fs.existsSync(settingFilename)) {
        const text = fs.readFileSync(settingFilename, 'utf8');
        const parsed = JSON.parse(text);

        try {
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
    } else {
        saveSettings(projects);
    }
    return projects;
}

export function saveSettings(projects: Project[]) {
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

    fs.writeFileSync(settingFilename, content, 'utf8');
}
