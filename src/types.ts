import type { Range } from 'vscode';

/**
 * Par de offsets [inicio, fin] dentro del contenido de un fichero.
 */
export type OffsetRange = [number, number];

/**
 * Nodo del AST generado por esprima-next.
 * Se tipa de forma laxa porque se usa para recorrer el AST de forma dinamica.
 */
export interface EsprimaNode {
    type: string;
    id?: EsprimaNode;
    name?: string;
    key?: EsprimaNode;
    value?: any;
    init?: any;
    properties?: EsprimaNode[];
    params?: EsprimaNode[];
    left?: any;
    right?: any;
    range?: OffsetRange;
    start?: number;
    end?: number;
    arguments?: EsprimaNode[];
    [key: string]: any;
}

/**
 * Fichero .vue (o componente compilado) descubierto en el workspace.
 */
export interface VueFileEntry {
    /** Ruta absoluta del fichero en disco. */
    filePath: string;
    /** Nombre del componente, tal y como se declara en `name` o en el nombre del fichero. */
    componentName: string;
    /** Rango del bloque `export default { ... }` (solo componentes ya compilados a js). */
    range?: OffsetRange;
    /** Nombres de los slots declarados por el componente. */
    slotNames?: string[];
}

/**
 * Miembro de un componente (data, computed, props, methods, events...).
 */
export interface ComponentMember {
    name: string;
    kind: string;
    type?: unknown;
    required?: boolean;
    default?: unknown;
    description?: string;
    syntax?: string[];
    params?: MethodParam[];
    initialValue?: string;
    value?: MemberValue;
    /** Nombre del objeto origen (para los objetos declarados en `data`). */
    origen?: string;
    dependencies?: string[];
    arguments?: EventArgument[];
}

export interface MemberValue {
    raw?: string;
    type?: string;
}

export interface MethodParam {
    name: string;
    type?: unknown;
    defaultValue?: unknown;
    rest?: boolean;
}

export interface EventArgument {
    name: string;
    type?: unknown;
    description?: string;
    rest?: boolean;
}

/**
 * Plugin instalado globalmente en la aplicacion (Vue.prototype.$plugin).
 */
export interface PluginEntry {
    name: string;
    kind: 'plugin' | 'library';
    description?: string;
    objectAst: EsprimaNode;
    objectText: string;
    file: string;
    range: OffsetRange;
}

/**
 * Accion de Cypress detectada en los ficheros de test e2e.
 */
export interface CypressAction {
    name: string;
    params: string;
    file: string;
    range: OffsetRange;
}

/**
 * Referencia `ref="nombre"` declarada dentro de la seccion template.
 */
export interface TemplateRef {
    name: string;
    range: Range | undefined;
    tag: string;
}

/**
 * Alias de rutas declarado en el tsconfig.json / jsconfig.json del workspace.
 */
export interface PathAlias {
    value: string;
    path: string;
}

/**
 * Descriptor devuelto por @vuedoc/parser al analizar un componente.
 */
export interface VueDescriptor {
    name?: string;
    inheritAttrs: boolean;
    errors: string[];
    warnings: string[];
    keywords: unknown[];
    slots: ComponentMember[];
    props: ComponentMember[];
    data: ComponentMember[];
    computed: ComponentMember[];
    events: ComponentMember[];
    methods: ComponentMember[];
}

/**
 * Miembros de un componente ya parseado (data, computed, props y methods).
 */
export interface VueComponentObjects {
    data: ComponentMember[];
    computed: ComponentMember[];
    props: ComponentMember[];
    methods: ComponentMember[];
}

/**
 * Valores de la configuracion de la extension declarados en package.json.
 */
export interface VueDiscoveryConfig {
    rootDirectory: string;
    registeredDirectory: string;
    cypressTestsDirectory: string;
    pluginsDirectory: string;
    utilsDirectory: string;
    componentCase: 'pascal' | 'kebab';
    addTrailingComma: boolean;
    propCase: 'camel' | 'kebab';
    propIconType: string;
    includeDataCyAttribute: boolean;
    hoverComponentInfoType: 'props' | 'none';
    useComponentShowcase: boolean;
    componentShowcaseUrl: string;
    componentShowcaseTimeout: number;
    componentShowcaseMaxItems: number;
    createTestFileLibrary: string;
}

export type ConfigKey = keyof VueDiscoveryConfig;
