/**
 * Analizador ligero de componentes Vue basado en texto.
 *
 * Extrae del contenido de un `.vue` (o de un mixin `.js`) las secciones
 * `template` y `script`, y de esta ultima los `mixins`, los `events` y los
 * `props`. Se utiliza como fallback cuando el parser AST no es able de
 * interpretar el fichero (por ejemplo cuando el componente usa sintaxis no
 * soportada) y para recuperar los props tal y como estan declarados en el
 * codigo fuente (nombre, tipo y valor por defecto).
 */
export interface ParsedContent {
    template: string | null;
    script: string | null;
    mixins: string[] | null;
    events: string[];
}

/**
 * Prop declarado en un componente, conservando el texto original del codigo fuente.
 */
export interface RawProp {
    /** Nombre de la prop tal y como esta declarada. */
    name: string;
    /** Texto del tipo declarado (String, Array, [String, Number]...). */
    type: string;
    /** true si la prop esta marcada como required. */
    required: boolean;
    /** Texto del valor por defecto (undefined si no tiene). */
    default?: string;
    /** Descripcion obtenida de los comentarios JSDoc. */
    description?: string;
}

interface Position {
    start: number | null;
    end: number | null;
}

export class Parser {
    private content: string;
    private parsed: ParsedContent;

    constructor(content: string) {
        this.content = content;
        this.parsed = {
            template: null,
            script: null,
            mixins: null,
            events: [],
        };
    }

    getContentBetweenTag(tag: string): string | null {
        const tagStart = `<${tag}`;
        const tagEnd = `</${tag}>`;

        const indexOfTagStart = this.content?.indexOf?.(tagStart) ?? -1;
        const indexOfTagEnd = this.content?.indexOf?.(tagEnd) ?? -1;

        return indexOfTagStart === -1 || indexOfTagEnd === -1
            ? null
            : this.content.substring(indexOfTagStart, indexOfTagEnd + tagEnd.length);
    }

    /**
     * Localiza el bloque delimitado por startCharacter/endCharacter respetando
     * el anidamiento. Devuelve la posicion de inicio (indice del caracter de
     * apertura) y la posicion final (indice siguiente al de cierre).
     */
    static getPositionOfStartAndEnd(content: string, startCharacter: string, endCharacter: string): Position {
        const position: Position = {
            start: null,
            end: null,
        };

        let index = 0;
        let depth = 0;
        let started = false;

        while (index < content.length) {
            const character = content[index];

            if (!started) {
                if (character === startCharacter) {
                    position.start = index;
                    started = true;
                    depth = 1;
                }
            } else if (character === startCharacter) {
                depth++;
            } else if (character === endCharacter) {
                depth--;
                if (depth === 0) {
                    position.end = index + 1;
                    break;
                }
            }

            index++;
        }

        return position;
    }

    static startAtAndGetPositionOfStartAndEnd(
        content: string,
        search: string,
        start: string,
        end: string
    ): { content: string | null; start: number | null; end: number | null } {
        const indexOfStart = (content ?? '').indexOf?.(search);

        // Can't find start of mixins
        if (indexOfStart === -1) {
            return { content: null, start: null, end: null };
        }

        const contentAtStart = content.substring(indexOfStart, content.length);

        return {
            content: contentAtStart,
            ...Parser.getPositionOfStartAndEnd(contentAtStart, start, end),
        };
    }

    /**
     * Divide un fragmento de codigo en las entradas que lo componen,
     * respetando los anidamientos de llaves, corchetes, parentesis y las cadenas.
     */
    private static splitTopLevelEntries(source: string): string[] {
        const entries: string[] = [];
        let depth = 0;
        let current = '';
        let quote: string | null = null;

        for (let index = 0; index < source.length; index++) {
            const char = source[index];

            if (quote) {
                current += char;
                if (char === quote && source[index - 1] !== '\\') {
                    quote = null;
                }
                continue;
            }

            if (char === '"' || char === "'" || char === '`') {
                quote = char;
                current += char;
                continue;
            }

            if (char === '{' || char === '[' || char === '(') {
                depth++;
            } else if (char === '}' || char === ']' || char === ')') {
                depth--;
            } else if (char === ',' && depth === 0) {
                entries.push(current);
                current = '';
                continue;
            }

            current += char;
        }

        entries.push(current);

        return entries.map(entry => entry.trim()).filter(entry => entry.length > 0);
    }

    /**
     * Recupera el valor de un atributo dentro de un objeto literal.
     */
    private static extractAttribute(source: string, attribute: string): string | undefined {
        for (const entry of Parser.splitTopLevelEntries(source)) {
            const separator = entry.indexOf(':');
            if (separator === -1) {
                continue;
            }
            if (entry.substring(0, separator).trim() === attribute) {
                return entry.substring(separator + 1).trim();
            }
        }
        return undefined;
    }

    /**
     * Elimina los comentarios de bloque y de linea de un fragmento de codigo
     * sin tocar el contenido de las cadenas.
     */
    private static stripComments(source: string): string {
        let result = '';
        let quote: string | null = null;

        for (let index = 0; index < source.length; index++) {
            const char = source[index];
            const next = source[index + 1];

            if (quote) {
                result += char;
                if (char === quote && source[index - 1] !== '\\') {
                    quote = null;
                }
                continue;
            }

            if (char === '"' || char === "'" || char === '`') {
                quote = char;
                result += char;
                continue;
            }

            if (char === '/' && next === '/') {
                while (index < source.length && source[index] !== '\n') {
                    index++;
                }
                result += '\n';
                continue;
            }

            if (char === '/' && next === '*') {
                index += 2;
                while (index < source.length && !(source[index] === '*' && source[index + 1] === '/')) {
                    index++;
                }
                index++;
                result += ' ';
                continue;
            }

            result += char;
        }

        return result;
    }

    /**
     * Convierte una entrada `nombre: { ... }` en una prop.
     */
    private static parsePropEntry(entry: string): RawProp | null {
        const separator = entry.indexOf(':');
        if (separator === -1) {
            return null;
        }

        const name = entry
            .substring(0, separator)
            .trim()
            .replace(/^['"`]|['"`]$/g, '');
        const value = entry.substring(separator + 1).trim();

        if (!name) {
            return null;
        }

        // Notacion corta: `prop: String`
        if (!value.startsWith('{')) {
            return {
                name,
                type: value.replace(/^['"`]|['"`]$/g, ''),
                required: false,
            };
        }

        const closing = value.lastIndexOf('}');
        const inner = value.substring(1, closing === -1 ? value.length : closing);
        const type = Parser.extractAttribute(inner, 'type');
        const required = Parser.extractAttribute(inner, 'required');
        const defaultValue = Parser.extractAttribute(inner, 'default');
        const valueAttribute = Parser.extractAttribute(inner, 'value');

        return {
            name,
            type: type ?? 'unknown',
            required: required === 'true',
            default: defaultValue ?? valueAttribute,
        };
    }

    /**
     * Devuelve el contenido de un atributo en formato objeto
     */
    attributeWithObjectNotation(attribute: string): string | null {
        const { content, start, end } = Parser.startAtAndGetPositionOfStartAndEnd(
            this.parsed.script ?? '',
            `${attribute}:`,
            '{',
            '}'
        );
        if (!content || start === null || end === null) {
            return null;
        }
        // Se devuelve el contenido interno, sin las llaves que lo delimitan
        return content.substring(start + 1, end - 1);
    }

    /**
     * Devuelve el contenido de un atributo en formato array
     */
    attributeWithArrayNotation(attribute: string): string[] | null {
        const { content, start, end } = Parser.startAtAndGetPositionOfStartAndEnd(
            this.parsed.script ?? '',
            `${attribute}:`,
            '[',
            ']'
        );
        if (!content || start === null || end === null) {
            return null;
        }
        return content
            .substring(start + 1, end - 1)
            .split(',')
            .map(mixin => mixin.trim());
    }

    mixins(): this {
        this.parsed.mixins = this.attributeWithArrayNotation('mixins');
        return this;
    }

    events(): this {
        const events = this.content.match(/(?<=\$emit\([^,)]*?)(?<=(['"`]))([a-z\-:]+)(?=\1)/gi) ?? [];
        //Eliminate duplicates
        this.parsed.events = [...new Set([...events])];
        return this;
    }

    template(): this {
        this.parsed.template = this.getContentBetweenTag('template');
        return this;
    }

    script(): this {
        const { content, start, end } = Parser.startAtAndGetPositionOfStartAndEnd(
            this.content,
            'export default',
            '{',
            '}'
        );
        // Para los componentes que vienen ya compilados todo el contenido es el  script
        if (!content || start === null || end === null) {
            this.parsed.script = this.content;
        } else {
            this.parsed.script = content.substring(start, end);
        }
        return this;
    }

    /**
     * Devuelve los props declarados en el componente conservando el texto original
     * del nombre y del tipo, de forma que se muestren tal y como los escribe el
     * desarrollador.
     */
    parseProps(): RawProp[] {
        this.script();
        const propsSource = this.attributeWithObjectNotation('props');
        if (!propsSource) {
            return [];
        }
        return Parser.splitTopLevelEntries(Parser.stripComments(propsSource))
            .map(entry => Parser.parsePropEntry(entry))
            .filter((prop): prop is RawProp => prop !== null);
    }

    parse(): ParsedContent {
        this.template().script().mixins().events();
        return this.parsed;
    }
}
