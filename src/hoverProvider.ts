import { getVueFiles, getConfig } from '@/config';
import * as utils from '@/utils';
import { languages, Hover } from 'vscode';
import type { HoverProvider, TextDocument, Position } from 'vscode';
import type { MarkdownString } from 'vscode';

const vueFilePattern = { scheme: 'file', pattern: '**/src/**/*.vue' };

/**
 *  Return content of props as a hover content
 */
async function hoverContentFromProps(component: string): Promise<MarkdownString[]> {
    if (component) {
        const file = getVueFiles()?.find(item => item?.componentName === component)?.filePath;
        if (file) {
            const props = await utils.retrievePropsFromFile({ filePath: file, componentName: component });
            if (props) {
                return props.map(x => utils.markdownProp(x, true)).filter((m): m is MarkdownString => !!m);
            }
        }
    }
    return [];
}

const componentsHoverProvider = languages.registerHoverProvider(vueFilePattern, {
    async provideHover(document: TextDocument, position: Position) {
        try {
            if (utils.isPositionInTemplateSection(position) && utils.isPositionOverAComponentTag(document, position)) {
                const component = utils.getComponenteTagPositionIsOver(document, position);
                const options: Record<string, (component: string) => Promise<MarkdownString[]>> = {
                    props: hoverContentFromProps,
                };
                const option = getConfig('hoverComponentInfoType');
                if (option && options[option]) {
                    return new Hover(await options[option](component ?? ''));
                }
            }
        } catch (error) {
            console.error('Error en provideHover:', error);
        }
        return undefined;
    },
} satisfies HoverProvider);

export { componentsHoverProvider };
