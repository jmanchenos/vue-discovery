export class Parser {
    constructor(content) {
        this.content = content;
        this.parsed = {
            template: null,
            script: null,
            props: null,
            mixins: null,
            events: null,
        };
    }
    getContentBetweenTag(tag) {
        const tagStart = `<${tag}`;
        const tagEnd = `</${tag}>`;

        const indexOfTagStart = this.content.indexOf(tagStart);
        const indexOfTagEnd = this.content.indexOf(tagEnd);

        return indexOfTagStart === -1 || indexOfTagEnd === -1
            ? null
            : this.content.substring(indexOfTagStart, indexOfTagEnd + tagEnd.length);
    }
    static getPositionOfStartAndEnd(content, startCharacter, endCharacter) {
        const position = {
            start: null,
            end: null,
        };

        let starts = 0;
        let index = 0;

        while ((starts !== 0 || position.start === null) && index < content.length) {
            const character = content[index];

            if (character === startCharacter) {
                if (position.start === null) {
                    position.start = index;
                }

                ++starts;
            }

            if (character === endCharacter) {
                --starts;
            }

            ++index;
        }

        position.end = index;

        return position;
    }
    static startAtAndGetPositionOfStartAndEnd(content, search, start, end) {
        const indexOfStart = content.indexOf(search);

        // Can't find start of mixins
        if (indexOfStart === -1) {
            return { content: null, start: null, end: null };
        }

        const contentAtStart = content.substring(indexOfStart, content.length);

        return { content: contentAtStart, ...Parser.getPositionOfStartAndEnd(contentAtStart, start, end) };
    }
    attributeWithObjectNotation(attribute) {
        const { content, start, end } = Parser.startAtAndGetPositionOfStartAndEnd(
            this.parsed.script,
            `${attribute}:`,
            '{',
            '}'
        );

        return !content || !start || !end ? null : content.substring(start, end);
    }
    attributeWithArrayNotation(attribute) {
        const { content, start, end } = Parser.startAtAndGetPositionOfStartAndEnd(
            this.parsed.script,
            `${attribute}:`,
            '[',
            ']'
        );

        return !content || !start || !end
            ? null
            : content
                  .substring(start + 1, end - 1)
                  .split(',')
                  .map(mixin => mixin.trim());
    }

    mixins() {
        this.parsed.mixins = this.attributeWithArrayNotation('mixins');

        return this;
    }

    props() {
        let props = this.attributeWithObjectNotation('props');

        if (props) {
            try {
                //sustituimos lo que haya en default:  por  default: null por si hubiera constantes que no se puedan parsear
                props = props.replace(/default:([^,}])*?(?=[,}])/g, 'default: null');
                this.parsed.props = [eval][0](`(${props})`);
            } catch (e) {
                this.parsed.props = null;
                console.log(e);
            }

            return this;
        }

        // If we did not find any props as object lets try again for array
        this.parsed.props = this.attributeWithArrayNotation('props');

        return this;
    }
    events() {
        const events = this.content.match(/(?<=\$emit\([^,\)]*?)(?<=(['"`]))([a-z\-:]+)(?=\1)/gi) || [];
        //Eliminate duplicates
        this.parsed.events = [...new Set([...events])];
        return this;
    }
    template() {
        this.parsed.template = this.getContentBetweenTag('template');

        return this;
    }
    script() {
        const { content, start, end } = Parser.startAtAndGetPositionOfStartAndEnd(
            this.content,
            'export default',
            '{',
            '}'
        );

        if (!content || !start || !end) {
            return null;
        }

        this.parsed.script = content.substring(start, end);

        return this;
    }
    parse() {
        this.template().script().mixins().props().events();
        return this.parsed;
    }

    /**
     * Convierte una cadena de texto representando un objeto Javascript en el objeto
     * @param {String} inputString
     * @returns {Object}
     */
    static parseObjectJS(inputString) {
        let result = null;
        if (inputString.startsWith(`{`)) {
            try {
                let openBrackets = 0,
                    index = 0;
                let text = '';
                for (const char of Array.from(inputString)) {
                    if (openBrackets > 0 || index === 0) {
                        if (char === '{') {
                            openBrackets++;
                        } else if (char === '}') {
                            openBrackets--;
                        }
                        text = text + char;
                    }
                    index++;
                }
                result = [eval][0](`(${text})`);
            } catch (error) {
                console.error(error);
                result = null;
            }
        }
        return result;
    }
}
