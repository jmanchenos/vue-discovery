// Archivo que simula los métodos de electron para poder ser interceptados por los test e2e de cypress

export const electron = {
    invokeOpenDialogReadFolder: () => {},
    maximize: () => {},
    minimize: () => {},
    unmaximize: () => {},
    close: () => {},
    focus: () => {},
    isMaximized: () => {},
    appInfo: {},
    appConfiguracion: {
        temporales: {
            ruta: 'C:/tmp/',
        },
    },
    invokePingDrive: () => {},
    invokeSaveLog: () => {},
    invokeOpenDialogReadFiles: () => {},
    invokeEscanear: () => {},
    invokeScanfolder: () => {},
    invokeInfoFichero: () => {},
    invokeGetImpresoras: () => {},
    invokeImprimir: () => {},
    invokeBorrarFichero: () => {},
    invokeAbrirArchivoWe: () => {},
    invokeAbrirArchivo: () => {},
    invokeSetStore: () => {},
    invokeGetStore: () => {},
    invokeShowSaveDialog: () => {},
    invokeCifrarCertificado: () => {},
    invokeGetCertificados: () => {},
    invokeDocConvertRtf: () => {},
    invokeCrearFichero: () => {},
    fs: {
        createWriteStream: () =>
            jest.fn({
                end: jest.fn(),
                write: jest.fn(),
            }),
    },
    closeChildWindows: () => {},
    existWindowWithFramename: framename => {},
};
export default electron;
