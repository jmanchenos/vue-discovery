const fs = require('fs');
const path = require('path');
const uuid = require('uuid4');
// https://docs.cypress.io/guides/guides/plugins-guide.html

// if you need a custom webpack configuration you can uncomment the following import
// and then use the `file:preprocessor` event
// as explained in the cypress docs
// https://docs.cypress.io/api/plugins/preprocessors-api.html#Examples

/* eslint-disable import/no-extraneous-dependencies */

module.exports = (on, config) => {
    on('before:browser:launch', (browser = {}, launchOptions) => {
        if (browser.name === 'chrome') {
            launchOptions.args.push('--start-fullscreen');
            launchOptions.args.push(
                '--disable-features=CrossSiteDocumentBlockingIfIsolating,CrossSiteDocumentBlockingAlways,IsolateOrigins,site-per-process'
            );
            launchOptions.args.push(
                '--disable-features=CrossSiteDocumentBlockingAlways,CrossSiteDocumentBlockingIfIsolating'
            );
            launchOptions.args.push('--load-extension=cypress/extensions/Ignore-X-Frame-headers_v1.1');
            launchOptions.args.push('--disable-site-isolation-trials');
            launchOptions.args.push('--disable-web-security');
            launchOptions.args.push('--disable-dev-shm-usage');
            return launchOptions;
        }
        // if (browser.name === 'electron') {
        //   launchOptions.preferences.chromeWebSecurity = false;
        //   launchOptions.preferences.webPreferences.nodeIntegration = false;
        //   launchOptions.preferences.webPreferences.webSecurity = false;
        //   return launchOptions;
        // }
    });

    on('task', {
        getAbsolutePath(givenpath) {
            return Promise.resolve(path.resolve(givenpath));
        },
        getFiles(rootDir) {
            return new Promise(async resolve => {
                const fileList = [];
                const files = await fs.readdirSync(rootDir);

                for (const file of files) {
                    const fullPath = path.join(rootDir, file);
                    const stat = await fs.statSync(fullPath);
                    const isDir = stat.isDirectory();
                    const extension = !isDir ? path.extname(file) : '';
                    fileList.push({
                        fullPath,
                        rootDir,
                        name: path.basename(file),
                        extension,
                        isDir,
                        stat,
                        size: stat.size,
                        uuid: uuid(),
                    });
                }
                resolve({ dir: rootDir, files: fileList });
            });
        },
    });

    require('cypress-grep/src/plugin')(config);

    require('@cypress/code-coverage/task')(on, config);
    // on('file:preprocessor', require('@cypress/code-coverage/use-babelrc'));
    // config.ignoreTestFiles = "examples/*.spec.js";
    return config;
};
