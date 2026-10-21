import { workspace, window } from 'vscode';
import * as vueParser from '@vuedoc/parser';
import type { TextDocument, WebviewPanel, WorkspaceFolder } from 'vscode';
import type { ConfigKey, PluginEntry, VueComponentObjects, VueDiscoveryConfig, VueFileEntry } from './types';

const configOverride: Record<string, unknown> = {};
const outputChannel = window.createOutputChannel('Vue Discovery - MTM');
let cyFiles: string[] = [];
let jsFiles: string[] = [];
let plugins: PluginEntry[] = [];
let constants: PluginEntry[] = [];
let vueFiles: VueFileEntry[] = [];
let vueRegisteredFiles: VueFileEntry[] = [];
let currentPanel: WebviewPanel | undefined;
let currentWorkspaceFolder: WorkspaceFolder | undefined;

/** Parseado del documento vue abierto actualmente, indexado por uri. */
const parsedVueMap = new Map<string, VueComponentObjects>();

const setConfig = (key: string, value: unknown): void => {
    configOverride[key] = value;
};

const getConfig = <K extends ConfigKey>(key: K): VueDiscoveryConfig[K] | undefined => {
    try {
        return key in configOverride
            ? (configOverride[key] as VueDiscoveryConfig[K])
            : workspace.getConfiguration().get<VueDiscoveryConfig[K]>(`VueDiscoveryMTM.${key}`);
    } catch (error) {
        console.error('Error en getConfig:', error);
        return undefined;
    }
};

const setVueFiles = (files: VueFileEntry[] = []): void => {
    vueFiles = files;
};
const setVueRegisteredFiles = (files: VueFileEntry[] = []): void => {
    vueRegisteredFiles = files;
};
const setJsFiles = (files: string[] = []): void => {
    jsFiles = files;
};
const setCyFiles = (files: string[] = []): void => {
    cyFiles = files;
};
const setPlugins = (files: PluginEntry[] = []): void => {
    plugins = files;
};
const setConstants = (files: PluginEntry[] = []): void => {
    constants = files;
};
const setCurrentWorkspaceFolder = (folder: WorkspaceFolder | undefined): void => {
    currentWorkspaceFolder = folder;
};
const setCurrentPanel = (panel: WebviewPanel | undefined): void => {
    currentPanel = panel;
};
const getVueFiles = (): VueFileEntry[] => vueFiles;
const getVueRegisteredFiles = (): VueFileEntry[] => vueRegisteredFiles;
const getJsFiles = (): string[] => jsFiles;
const getCyFiles = (): string[] => cyFiles;
const getPlugins = (): PluginEntry[] => plugins;
const getConstants = (): PluginEntry[] => constants;
const getCurrentWorkspaceFolder = (): WorkspaceFolder | undefined => currentWorkspaceFolder;

const getCurrentPanel = (): WebviewPanel | undefined => currentPanel;

/** Guardar el parseado del fichero vue actual */
const getVueObjects = (document: TextDocument): VueComponentObjects | undefined =>
    parsedVueMap.get(document.uri.toString());

const setVueObjects = async (document: TextDocument): Promise<void> => {
    // si el documento tiene la extension Vue
    if (document.fileName.endsWith('.vue')) {
        const vuedocOptions = { filename: document.fileName };
        try {
            const { data, computed, props, methods } = await vueParser.parse(vuedocOptions);
            parsedVueMap.set(document.uri.toString(), { data, computed, props, methods });
            outputChannel.appendLine(`Se ha cargado la configuración para el documento vue ${document.fileName}`);
        } catch (error) {
            outputChannel.appendLine(
                `Error al cargar la configuración para el documento vue ${document.fileName}: ${(error as Error).message}`
            );
        }
    }
};

const removeVueObjects = (document: TextDocument): boolean => parsedVueMap.delete(document.uri.toString());

export {
    outputChannel,
    setConfig,
    getConfig,
    setVueFiles,
    setVueRegisteredFiles,
    setJsFiles,
    setCyFiles,
    setPlugins,
    getVueFiles,
    getVueRegisteredFiles,
    getJsFiles,
    getCyFiles,
    getPlugins,
    setCurrentPanel,
    getCurrentPanel,
    getConstants,
    setConstants,
    getCurrentWorkspaceFolder,
    setCurrentWorkspaceFolder,
    getVueObjects,
    setVueObjects,
    removeVueObjects,
};
