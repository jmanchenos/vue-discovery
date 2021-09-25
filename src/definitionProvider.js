const utils = require('./utils');
const { languages, Location, Range, Uri } = require('vscode');
const { getVueFiles } = require('./config');
const patternObject = { scheme: 'file', pattern: '**/src/**/*.vue' };

const componentsDefinitionProvider = languages.registerDefinitionProvider(patternObject, {
    async provideDefinition(document, position) {
        if (!utils.isPositionInTemplateSection(position) || !utils.isPositionOverAComponentTag(document, position)) {
            return null;
        }
        const component = utils.getComponenteTagPositionIsOver(document, position);
        const filepath = getVueFiles()?.find(item => item.componentName === component)?.filePath;
        return new Location(Uri.file(filepath), new Range(0, 0, 0, 0));
    },
});

module.exports = { componentsDefinitionProvider };
