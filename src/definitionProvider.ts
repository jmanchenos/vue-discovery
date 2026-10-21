import * as utils from '@/utils';
import { languages, Location, Range, Uri } from 'vscode';
import type { DefinitionProvider, TextDocument, Position } from 'vscode';
import { getVueFiles } from '@/config';

const vueFilePattern = { scheme: 'file', pattern: '**/src/**/*.vue' };
const cypressFilePattern = { scheme: 'file', pattern: '**/tests/**/*.js' };

const componentsDefinitionProvider = languages.registerDefinitionProvider(vueFilePattern, {
    async provideDefinition(document: TextDocument, position: Position) {
        if (!utils.isPositionInTemplateSection(position) || !utils.isPositionOverAComponentTag(document, position)) {
            return null;
        }
        const component = utils.getComponenteTagPositionIsOver(document, position);
        const filepath = getVueFiles()?.find(item => item?.componentName === component)?.filePath;
        if (!filepath) {
            return null;
        }
        return new Location(Uri.file(filepath), new Range(0, 0, 0, 0));
    },
} satisfies DefinitionProvider);

const cypressDefinitionProvider = languages.registerDefinitionProvider(cypressFilePattern, {
    async provideDefinition(document: TextDocument, position: Position) {
        try {
            const { file, range } = utils.getCypressActionOverPosition(document, position) ?? {};
            if (!file || !range) {
                return null;
            }
            const translated = await utils.translateRange(range, file);
            return translated ? new Location(Uri.file(file), translated) : null;
        } catch (e) {
            console.error(e);
            return null;
        }
    },
} satisfies DefinitionProvider);

const pluginDefinitionProvider = languages.registerDefinitionProvider(vueFilePattern, {
    async provideDefinition(document: TextDocument, position: Position) {
        try {
            const { file, range } = utils.getPluginOverPosition(document, position) ?? {};
            if (!file || !range) {
                return null;
            }
            const translated = await utils.translateRange(range, file);
            return translated ? new Location(Uri.file(file), translated) : null;
        } catch (e) {
            console.error(e);
            return null;
        }
    },
} satisfies DefinitionProvider);

const refsDefinitionProvider = languages.registerDefinitionProvider(vueFilePattern, {
    async provideDefinition(document: TextDocument, position: Position) {
        try {
            const { range } = utils.getRefOverPosition(document, position) ?? {};
            return range ? new Location(document.uri, range) : null;
        } catch (e) {
            console.error(e);
            return null;
        }
    },
} satisfies DefinitionProvider);

export { componentsDefinitionProvider, cypressDefinitionProvider, pluginDefinitionProvider, refsDefinitionProvider };
