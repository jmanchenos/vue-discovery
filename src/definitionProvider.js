import * as utils from './utils.js';
import { languages, Location, Range, Uri } from 'vscode';
import { getVueFiles } from './config.js';

const vueFilePattern = { scheme: 'file', pattern: '**/src/**/*.vue' };
const cypressFilePattern = { scheme: 'file', pattern: '**/tests/**/*.js' };

const componentsDefinitionProvider = languages.registerDefinitionProvider(vueFilePattern, {
    async provideDefinition(document, position) {
        if (!utils.isPositionInTemplateSection(position) || !utils.isPositionOverAComponentTag(document, position)) {
            return null;
        }
        const component = utils.getComponenteTagPositionIsOver(document, position);
        const filepath = getVueFiles()?.find(item => item.componentName === component)?.filePath;
        return new Location(Uri.file(filepath), new Range(0, 0, 0, 0));
    },
});

const cypressDefinitionProvider = languages.registerDefinitionProvider(cypressFilePattern, {
    async provideDefinition(document, position) {
        try {
            const { file, range } = utils.getCypressActionOverPosition(document, position) || {};
            return file ? new Location(Uri.file(file), await utils.translateRange(range, file)) : null;
        } catch (e) {
            console.error(e);
        }
    },
});

const pluginDefinitionProvider = languages.registerDefinitionProvider(vueFilePattern, {
    async provideDefinition(document, position) {
        try {
            const { file, range } = utils.getPluginOverPosition(document, position) || {};
            return file ? new Location(Uri.file(file), await utils.translateRange(range, file)) : null;
        } catch (e) {
            console.error(e);
        }
    },
});

const refsDefinitionProvider = languages.registerDefinitionProvider(vueFilePattern, {
    async provideDefinition(document, position) {
        try {
            const { range } = utils.getRefOverPosition(document, position) || {};
            return range ? new Location(document.uri, range) : null;
        } catch (e) {
            console.error(e);
        }
    },
});

export { componentsDefinitionProvider, cypressDefinitionProvider, pluginDefinitionProvider, refsDefinitionProvider };
