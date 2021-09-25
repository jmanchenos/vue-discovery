const { getVueFiles } = require('./config');
const utils = require('./utils');
const { languages, Hover } = require('vscode');
const { getConfig } = require('./config');

const patternObject = { scheme: 'file', pattern: '**/src/**/*.vue' };

/**
 *  Return content of props as a hover content
 * @param {String} component component name
 * @returns  {Promise<any>}
 */
async function hoverContentFromProps(component) {
    if (component) {
        const file = getVueFiles()?.find(item => item.componentName === component)?.filePath;
        if (file) {
            const props = await utils.retrievePropsFromFile(file);
            if (props) {
                return props.map(x => utils.markdownProp(x, true));
            }
        }
    }
}

const componentsHoverProvider = languages.registerHoverProvider(patternObject, {
    async provideHover(document, position) {
        try {
            if (utils.isPositionInTemplateSection(position) && utils.isPositionOverAComponentTag(document, position)) {
                const component = utils.getComponenteTagPositionIsOver(document, position);
                const options = {
                    props: hoverContentFromProps,
                };
                const option = getConfig('hoverComponentInfoType');
                if (options[option]) {
                    return new Hover(await options[option](component));
                }
            }
        } catch (error) {
            console.error(error);
        }
    },
});

module.exports = { componentsHoverProvider };
