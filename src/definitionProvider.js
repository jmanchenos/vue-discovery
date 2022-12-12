import * as utils from './utils';
import { languages, Location, Range, Uri } from 'vscode';
import { getVueFiles } from './config';

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

// definir un provider llamada cypressActionProvider para que cuando nos posicionemos en un fichero en la ruta /tests/**/*.js
// y nos posicionemos sobre un elemento que tenga la clase cypress-action, nos lleve a la definición de la acción de cypress
const cypressDefinitionProvider = languages.registerDefinitionProvider(
    { scheme: 'file', pattern: '**/tests/**/*.js' },
    {
        async provideDefinition(document, position) {
            try {
                const { file, range } = utils.getCypressActionOverPosition(document, position) || {};
                if (!file) {
                    return null;
                }
                const location = new Location(Uri.file(file), await utils.translateRange(range, file));
                return location;
            } catch (e) {
                console.error(e);
            }
        },
    }
);

export { componentsDefinitionProvider, cypressDefinitionProvider };
