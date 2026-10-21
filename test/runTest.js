import path from 'path';
import { runTests } from '@vscode/test-electron';
import { fileURLToPath } from 'url';
import process from 'process';

const main = async () => {
    try {
        const testDir = fileURLToPath(new URL('.', import.meta.url));

        // The folder containing the Extension Manifest package.json
        // Passed to `--extensionDevelopmentPath`
        const extensionDevelopmentPath = path.resolve(testDir, '../');

        // The path to the extension test script
        // Passed to --extensionTestsPath
        // La extension se indica de forma explicita porque el paquete es de tipo "module"
        // y el resolutor ESM no anade extensiones por defecto.
        const extensionTestsPath = path.resolve(testDir, './suite/index.js');

        // The workspace that is opened in VSCode. The extension discovers the
        // components, mixins and plugins of this folder.
        const workspacePath = path.resolve(testDir, './fixture');

        // Download VS Code, unzip it and run the integration test
        await runTests({
            extensionDevelopmentPath,
            extensionTestsPath,
            launchArgs: [workspacePath, '--disable-extensions', '--skip-welcome', '--skip-release-notes'],
        });
    } catch (err) {
        // eslint-disable-next-line no-undef
        console.error('Failed to run tests:', err);
        process.exit(1);
    }
};

main();
