// Import the necessary modules.
// crear un provider que se encargue de, tras situar el boton derecho sobre un archivo .vue, crear un archivo de test en la carpeta tests/utils/ con el nombre del archivo .vue terminado en spec.js
import { languages } from 'vscode';
import { getVueFiles } from '@/config.mjs';
import * as utils from '@/utils.mjs';

// Define the pattern for the vue files.
const vueFilePattern = { scheme: 'file', pattern: '**/src/**/*.vue' };

// Register the context menu provider.
const createTestFileProvider = languages.registerCodeActionsProvider(vueFilePattern, {
  provideCodeActions(document, range) {
    // Get the component name.
    const componentName = utils.getComponenteTagPositionIsOver(document, range.start);
    // Get the file path.
    const filePath = getVueFiles()?.find(item => item?.componentName === componentName)?.filePath;
    // Return the code action.
    return [
      {
        title: 'Create test file',
        command: {
          command: 'extension.createTestFile',
          title: 'Create test file',
          arguments: [filePath],
        },
      },
    ];
  },
});

export { createTestFileProvider };
