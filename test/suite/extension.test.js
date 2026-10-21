import assert from 'assert';
import * as vscode from 'vscode';
import { showFile, getDocPathWithSlash, position, getDocUri, sleep, range } from '../util.js';
import {
    testLineEquals,
    rangeEquals,
    testHover,
    testCompletion,
    testCompletionDoesNotContainItems,
} from '../helpers.js';
import { it, describe, before } from 'mocha';

const components = [
    Object.assign(new vscode.CompletionItem('ComponentWithPropsName', vscode.CompletionItemKind.Constructor), {
        detail: 'components/ComponentWithProps.vue',
    }),
    Object.assign(new vscode.CompletionItem('AnotherComponentName', vscode.CompletionItemKind.Constructor), {
        detail: 'components/AnotherComponent.vue',
    }),
    Object.assign(new vscode.CompletionItem('RegisteredComponentName', vscode.CompletionItemKind.Constructor), {
        detail: 'registeredComponents/RegisteredComponent.vue',
    }),
];

// Props declarados por ComponentWithProps.vue y por sus mixins.
// En el tag insertado ya estan fijados name, names y defaultValue,
// por lo que solo se ofrece la prop que todavia no esta en el tag.
const props = [new vscode.CompletionItem('label', vscode.CompletionItemKind.Property)];

const propsAlreadySet = [
    new vscode.CompletionItem('defaultValue', vscode.CompletionItemKind.Property),
    new vscode.CompletionItem('name', vscode.CompletionItemKind.Property),
    new vscode.CompletionItem('names', vscode.CompletionItemKind.Property),
];

const events = [
    new vscode.CompletionItem('eventInComponent', vscode.CompletionItemKind.Event),
    new vscode.CompletionItem('eventInMixin', vscode.CompletionItemKind.Event),
    new vscode.CompletionItem('eventInSubMixin', vscode.CompletionItemKind.Event),
];

// Fin de linea e indentacion detectados por el editor a partir del documento abierto
let LF = '\r\n';
let INDENT = '  ';

describe('Interactions (pascal case)', function () {
    const docUri = getDocUri('App.vue');
    const componentWithoutPropsSnippet =
        '<ComponentWithPropsName :name="" :names="" :default-value="" />';

    before('activate', async () => {
        await vscode.commands.executeCommand('VueDiscoveryMTM.tests.setConfigOption', 'componentCase', 'pascal');
        await vscode.commands.executeCommand('VueDiscoveryMTM.tests.setConfigOption', 'propCase', 'kebab');
        await vscode.commands.executeCommand('VueDiscoveryMTM.tests.setConfigOption', 'addTrailingComma', true);
        await vscode.commands.executeCommand('VueDiscoveryMTM.tests.setConfigOption', 'includeDataCyAttribute', false);
        await vscode.commands.executeCommand('VueDiscoveryMTM.tests.setConfigOption', 'propIconType', 'Property');
        await vscode.commands.executeCommand(
            'VueDiscoveryMTM.tests.setConfigOption',
            'registeredDirectory',
            '/src/registeredComponents'
        );
        await vscode.commands.executeCommand(
            'VueDiscoveryMTM.tests.setConfigOption',
            'rootDirectory',
            '/src/components;/src/mixins'
        );
        await showFile(docUri);

        LF = vscode.window.activeTextEditor.document.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n';
        INDENT = vscode.window.activeTextEditor.options.insertSpaces
            ? ' '.repeat(vscode.window.activeTextEditor.options.tabSize)
            : '\t';
    });

    it('shows available components', async () => {
        await testCompletion(docUri, position(3, 8), components);
    });

    it('adds a component to the template section', async () => {
        const pos = position(3, 8);
        const editor = vscode.window.activeTextEditor;

        await editor.edit(edit => {
            edit.insert(position(3, 0), '\t\t');
        });

        editor.selection = new vscode.Selection(pos, pos);

        await vscode.commands.executeCommand(
            'VueDiscoveryMTM.importFile',
            getDocPathWithSlash('components/ComponentWithProps.vue'),
            'ComponentWithProps'
        );

        await sleep(50);

        testLineEquals(3, `\t\t${componentWithoutPropsSnippet}`);
    });

    it('imports a component and respects alias', async () => {
        testLineEquals(8, "import ComponentWithPropsName from '@/components/ComponentWithProps.vue';");
    });

    it('registers the component', async () => {
        const expected = `${INDENT}components: {${LF}${INDENT}${INDENT}ComponentWithPropsName,${LF}${INDENT}},${LF}`;
        rangeEquals(range(11, 0, 14, 0), expected);
    });

    it('shows props when hovering a component', async () => {
        await testHover(docUri, position(3, 10), {
            contents: [
                '(required) name: String',
                '(required) names: Array',
                'label: String',
                '(required) defaultValue: String',
            ],
        });
    });

    it('does not show available components when inside attributes', async () => {
        await testCompletionDoesNotContainItems(docUri, position(3, 40), components);
    });

    it('completes props and events on a component', async () => {
        await testCompletion(docUri, position(3, 40), [...props, ...events]);
    });

    it('does not complete props that are already set on the component', async () => {
        await testCompletionDoesNotContainItems(docUri, position(3, 40), propsAlreadySet);
    });

    it('adds the same component to the template section', async () => {
        const pos = position(3, componentWithoutPropsSnippet.length + 2);
        const editor = vscode.window.activeTextEditor;

        editor.selection = new vscode.Selection(pos, pos);

        await vscode.commands.executeCommand(
            'VueDiscoveryMTM.importFile',
            getDocPathWithSlash('components/ComponentWithProps.vue'),
            'ComponentWithProps'
        );

        await sleep(50);

        testLineEquals(3, `\t\t${componentWithoutPropsSnippet}${componentWithoutPropsSnippet}`);
    });

    it('does not import the component twice', async () => {
        const text = vscode.window.activeTextEditor.document.getText();
        const occurrences =
            text.split("import ComponentWithPropsName from '@/components/ComponentWithProps.vue'").length - 1;
        assert.ok(occurrences === 1);
    });

    it('does not register the component twice', async () => {
        const expected = `${INDENT}components: {${LF}${INDENT}${INDENT}ComponentWithPropsName,${LF}${INDENT}},${LF}`;
        rangeEquals(range(11, 0, 14, 0), expected);
    });

    it('adds another component to the template section', async () => {
        const pos = position(3, componentWithoutPropsSnippet.length * 2 + 2);
        const editor = vscode.window.activeTextEditor;

        editor.selection = new vscode.Selection(pos, pos);

        await vscode.commands.executeCommand(
            'VueDiscoveryMTM.importFile',
            getDocPathWithSlash('components/AnotherComponent.vue'),
            'AnotherComponent'
        );

        await sleep(50);

        testLineEquals(
            3,
            `\t\t${componentWithoutPropsSnippet}${componentWithoutPropsSnippet}<AnotherComponentName :name="" :names="" />`
        );
    });

    it('imports another component and respects alias', async () => {
        testLineEquals(8, "import AnotherComponentName from '@/components/AnotherComponent.vue';");
    });

    it('registers another component', async () => {
        const expected = `${INDENT}components: {${LF}${INDENT}${INDENT}ComponentWithPropsName,${LF}${INDENT}${INDENT}AnotherComponentName,${LF}${INDENT}},${LF}`;
        rangeEquals(range(12, 0, 16, 0), expected);
    });
});
