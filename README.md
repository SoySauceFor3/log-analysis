# Log Analysis

[![Version](https://img.shields.io/vscode-marketplace/v/XinyaYang0506.log-analysis.svg?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=XinyaYang0506.log-analysis)
[![Download](https://img.shields.io/visual-studio-marketplace/d/XinyaYang0506.log-analysis)](https://marketplace.visualstudio.com/items?itemName=XinyaYang0506.log-analysis)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/XinyaYang0506.log-analysis)](https://marketplace.visualstudio.com/items?itemName=XinyaYang0506.log-analysis)
[![Avarage Rating](https://img.shields.io/vscode-marketplace/r/XinyaYang0506.log-analysis.svg?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=XinyaYang0506.log-analysis)

Highlight your logs with colorful filters, and manipulate what to display for better log file reading. This helps you focus on log analysis and use your time efficiently.

This extension is inspired by [textAnalysisTool.NET](https://textanalysistool.github.io/).

## Features

- Create filters based on user input regular expressions
- Highlight lines that match the filters
- Focus mode: hide lines that don't match your filters
- Group filters by purpose and control them collectively
- Manage filters by project to accommodate different log formats across devices and frameworks

## Usage

The basic operation for log analysis is as follows.

![default_usage](https://raw.githubusercontent.com/JeanTracker/log-analysis-plus/update_readme/image/default_usage.gif)

Select a project from the "Log Analysis" menu, and you will be directed to the "FILTERS" tab. The tab lists the filter information for the selected project. You can activate filters from the list or control highlights to focus on log analysis in Focus Mode.

The left editor holds the original document, and all the lines that matches any of the filters have been highlighted. The right editor holds the focus mode of the left document, and notice that the lines which don't match any of the filters' regex are gone.
The focus mode is implemented as a virtual document (read-only), and the original document is not modified.

If there are lines in the filtered results that you want to exclude, you can add filters for this purpose in the "FILTERS-" tab.

### Customization for filters

This extension creates a tab "FILTERS" in the explorer sidebar. This tab holds all the filters created and allows for filter management.

![filter](https://raw.githubusercontent.com/JeanTracker/log-analysis-plus/update_readme/image/filters.png)

#### Group

A group can contain multiple filters, and filters within a group can be controlled collectively. This allows you to group filters suitable for log analysis.
For each group, there are two controls and three attributes:

- add
- regex (name) : change group name
- isHighlighted
- isShown
- remove

#### Filter

The filled/unfilled circle represents the color of the filter and whether the highlight is applied to documents. The text represents the regex of the filter, and the number in a smaller font, if there is one, represents the number of lines that match the regex in the active editor.
For each filter, there is one control and four attributes:

- regex
- isHighlighted
- isShown
- remove

#### Exclusion Filter

This extension also creates a "FILTERS-" tab in the explorer sidebar.

![ex-filter](https://raw.githubusercontent.com/JeanTracker/log-analysis-plus/update_readme/image/ex_filters.png)

In this tab, you can add exclusion filters to remove unnecessary information from the focused filter results during log analysis. For exclusion filters, there are two controls and one attribute:

- regex
- isShown
- remove

#### Filter Control

- add
  - add filter in group item
  - add group in "FILTERS" tab
- remove
  - remove selected filter
  - remove group including filters

#### Filter Properties

- Color: The color is generated randomly, but if you don't like it, you can generate a new filter.
- Regex: You can change the regex by clicking the pencil icon.
- isHighlighted: If true, the lines that match the regex will be highlighted with the filter's color. If false, this filter will be ignored for color highlighting. You can toggle this attribute by clicking the paint bucket icon.
- isShown: Used in focus mode. If true, the lines that match the regex will be kept; if false, the lines will be removed, unless other filters keep the line. You can toggle this attribute by clicking the eye icon.
 If one line matches multiple regexes, because the highlight will overwrite themselves, the final color is not deterministic. However, the line is still counted in all the filters.

### Focus Mode

You can use `log-analysis.turnOnFocusMode` command to activate focus mode for the active editor. The command has a default shortcut: `ctrl/cmd + h`, or the second icon located on the top of the tab can achieve the same goal. And as the focus mode is just another tab, you can close focus mode as how you close any vscode tab.

### Project Configuration

This extension also creates a "Log Analysis" in the activity bar.

![new-project](https://raw.githubusercontent.com/JeanTracker/log-analysis-plus/update_readme/image/new_project.gif)

Projects are created and selected in "Log Analysis." When a project is selected, you will be directed to the "FILTERS" tab, where you can see the project name. Click the add group icon to add a group, and then click the add filter icon within the group to add the necessary filters. To save the configured project, click the project save icon in the "FILTERS" tab. This allows users to freely modify filters in the "FILTERS" tab and intentionally update the file. Clicking the refresh icon in "Log Analysis" will reload the filter information saved in the file. When a project is selected and loaded, all filters are set to the disabled state.

Project settings can be also configured by clicking the settings gear icon in "Log Analysis" and editing the configuration file in JSON format.

## Handling Huge Files

In VS Code, when opening files larger than 50MB, the use of extensions is restricted to ensure performance and memory efficiency. This limitation helps maintain a responsive and stable environment when handling large files. More details on this can be found in [#31078](https://github.com/microsoft/vscode/issues/31078). By using the extension below, you can enable extension functionality when opening large files, allowing for log analysis.

It works well with [![Visual Studio Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/mbehr1.vsc-lfs?color=green&label=vsc-lfs&logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=mbehr1.vsc-lfs) to handle large log files.
