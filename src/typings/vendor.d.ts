/**
 * Declaraciones de los modulos de terceros que no incluyen tipos propios.
 */

declare module '@vuedoc/parser' {
    import type { VueDescriptor } from '../types';

    export interface VueParserOptions {
        /** Ruta del fichero a analizar. */
        filename?: string;
        /** Contenido a analizar. */
        filecontent?: string;
        /** Caracteristicas a extraer (props, data, computed, methods, events, slots, name...). */
        features?: string[];
        encoding?: string;
        jsx?: boolean;
    }

    export function parseOptions(options: VueParserOptions): Promise<VueParserOptions>;
    export function parse(options: VueParserOptions): Promise<VueDescriptor>;
}

declare module 'esquery' {
    import type { EsprimaNode } from '../types';

    interface Esquery {
        query(node: EsprimaNode | EsprimaNode[], selector: string): EsprimaNode[];
        parse(selector: string): unknown;
    }

    const esquery: Esquery;
    export default esquery;
}
