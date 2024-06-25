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
import {it, describe, before} from 'mocha';

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

const LF = '\r\n';

const props = [
    new vscode.CompletionItem('label', vscode.CompletionItemKind.Property),
    new vscode.CompletionItem('defaultValue', vscode.CompletionItemKind.Property),
    new vscode.CompletionItem('name', vscode.CompletionItemKind.Property),
    new vscode.CompletionItem('names', vscode.CompletionItemKind.Property),
];

const events = [
    new vscode.CompletionItem('eventInComponent', vscode.CompletionItemKind.Event),
    new vscode.CompletionItem('eventInMixin', vscode.CompletionItemKind.Event),
    new vscode.CompletionItem('eventInSubMixin', vscode.CompletionItemKind.Event),
];

describe('Interactions', function () {
    const docUri = getDocUri('App.vue');
    const componentWithoutPropsSnippet =
        '<ComponentWithPropsName :name="" :names="" :default-value=""></ComponentWithPropsName>';

    before('activate', async () => {
        await vscode.commands.executeCommand('VueDiscoveryMTM.tests.setConfigOption', 'componentCase', 'pascal');
        await vscode.commands.executeCommand('VueDiscoveryMTM.tests.setConfigOption', 'propCase', 'kebab');
        await vscode.commands.executeCommand('VueDiscoveryMTM.tests.setConfigOption', 'addTrailingComma', true);
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
        testLineEquals(8, "import ComponentWithPropsName from '@/components/ComponentWithProps.vue'");
    });

    it('registers the component', async () => {
        const expected = `    components: {${LF}        ComponentWithPropsName,${LF}    },${LF}`;
        rangeEquals(range(10, 0, 13, 0), expected);
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
        const expected = `    components: {${LF}        ComponentWithPropsName,${LF}    },${LF}`;
        rangeEquals(range(10, 0, 13, 0), expected);
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
            `\t\t${componentWithoutPropsSnippet}${componentWithoutPropsSnippet}<AnotherComponentName :name="" :names=""></AnotherComponentName>`
        );
    });

    it('imports another component and respects alias', async () => {
        testLineEquals(8, "import AnotherComponentName from '@/components/AnotherComponent.vue'");
    });

    it('registers another component', async () => {
        const expected = `    components: {${LF}        ComponentWithPropsName,${LF}        AnotherComponentName,${LF}    },${LF}`;
        rangeEquals(range(11, 0, 15, 0), expected);
    });
});
