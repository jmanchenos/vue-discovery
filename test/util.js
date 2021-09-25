const vscode = require('vscode');
const path = require('path');

const position = (line, char) => new vscode.Position(line, char);

const range = (startLine, startChar, endLine, endChar) =>
    new vscode.Range(position(startLine, startChar), position(endLine, endChar));

const sameLineRange = (line, startChar, endChar) =>
    new vscode.Range(position(line, startChar), position(line, endChar));

const location = (uri, startLine, startChar, endLine, endChar) =>
    new vscode.Location(uri, range(startLine, startChar, endLine, endChar));

const sameLineLocation = (uri, line, startChar, endChar) =>
    new vscode.Location(uri, sameLineRange(line, startChar, endChar));

const getDocPath = p => {
    return path.resolve(__dirname, 'fixture/src', p);
};

const getDocPathWithSlash = p => getDocUri(p).path.slice(1);

const getDocUri = p => vscode.Uri.file(getDocPath(p));

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const showFile = async docUri => {
    vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    await sleep(50);
    const doc = await vscode.workspace.openTextDocument(docUri);
    return vscode.window.showTextDocument(doc);
};

module.exports = {
    position,
    range,
    sameLineRange,
    sameLineLocation,
    location,
    getDocPath,
    getDocUri,
    getDocPathWithSlash,
    sleep,
    showFile,
};
