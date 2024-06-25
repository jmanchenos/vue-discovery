import assert from 'assert';
import vscode from 'vscode';

const rangeEquals = (range, value) => {
    const editor = vscode.window.activeTextEditor;
    const text = editor.document.getText(range);
    assert.strictEqual(text, value);
};

const testLineEquals = (line, value) => {
    const editor = vscode.window.activeTextEditor;
    const { text } = editor.document.lineAt(line);
    assert.strictEqual(text, value);
};

/** @returns {Promise} */
const triggerCompletion = async (docUri, position) => {
    vscode.window.activeTextEditor.selection = new vscode.Selection(position, position);
    return vscode.commands.executeCommand('vscode.executeCompletionItemProvider', docUri, position);
};

const testCompletionDoesNotContainItems = async (docUri, position, illegalItems) => {
    const { items } = await triggerCompletion(docUri, position);
    const illegalItemsInItems = items.filter(({ label }) => illegalItems.find(i => i.label === label));
    assert.strictEqual(illegalItemsInItems.length, 0);
};

const testCompletion = async (docUri, position, expectedItems) => {
    const result = await triggerCompletion(docUri, position);
    expectedItems.forEach(expectedItem => {
        if (typeof expectedItem === 'string') {
            assert.ok(result.items.find(i => i.label === expectedItem));
            return;
        }
        const match = result.items.find(i => i.label === expectedItem.label);
        if (!match) {
            assert.fail(
                `Can't find matching item for\n${JSON.stringify(expectedItem, null, 2)}\nSeen items:\n${JSON.stringify(
                    result.items,
                    null,
                    2
                )}`
            );
            return;
        }
        assert.strictEqual(match.label, expectedItem.label);
        if (expectedItem.kind) {
            assert.strictEqual(match.kind, expectedItem.kind);
        }
        if (expectedItem.detail) {
            assert.strictEqual(match.detail, expectedItem.detail);
        }
        if (expectedItem.documentation) {
            if (typeof match.documentation === 'string') {
                assert.strictEqual(match.documentation, expectedItem.documentation);
            } else {
                if (expectedItem.documentation && expectedItem.documentation.value && match.documentation) {
                    assert.strictEqual(match.documentation.value, expectedItem.documentation.value);
                }
            }
        }
        if (expectedItem.documentationStart) {
            if (typeof match.documentation === 'string') {
                assert.ok(match.documentation.startsWith(expectedItem.documentationStart));
            } else {
                assert.ok(match.documentation.value.startsWith(expectedItem.documentationStart));
            }
        }
    });
};

const testHover = async (docUri, position, expectedHover) => {
    const result = await vscode.commands.executeCommand('vscode.executeHoverProvider', docUri, position);
    if (!result[0]) {
        throw Error('Hover failed');
    }
    const { contents } = result[0];
    contents.forEach((c, i) => {
        const actualContent = markedStringToString(c);
        const expectedContent = markedStringToString(expectedHover.contents[i]);
        assert.ok(actualContent.startsWith(expectedContent));
    });
};

const markedStringToString = s => (typeof s === 'string' ? s : s.value);

export { testHover, rangeEquals, testLineEquals, testCompletion, triggerCompletion, testCompletionDoesNotContainItems };
