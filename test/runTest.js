import path from 'path';
import { runTests } from '@vscode/test-electron';
import { URL } from 'url';
import process from 'process';

const main = async () => {
    try {
        // The folder containing the Extension Manifest package.json
        // Passed to `--extensionDevelopmentPath`
        const extensionDevelopmentPath = path.resolve(new URL('.', import.meta.url).pathname, '../');

        // The path to the extension test script
        // Passed to --extensionTestsPath
        const extensionTestsPath = path.resolve(new URL('.', import.meta.url).pathname, './suite/index');

        // Download VS Code, unzip it and run the integration test
        await runTests({ extensionDevelopmentPath, extensionTestsPath });
    } catch (err) {
        // eslint-disable-next-line no-undef
        console.error('Failed to run tests:', err);
        process.exit(1);
    }
};

main();
