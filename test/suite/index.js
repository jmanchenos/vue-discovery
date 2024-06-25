import Mocha from 'mocha';
import { glob } from 'glob';
import { fileURLToPath } from 'url';
import path, { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function run() {
    // Crear la prueba de mocha
    const mocha = new Mocha({
        ui: 'bdd',
        color: true,
    });

    const testsRoot = path.resolve(__dirname, '..');

        const files = await glob('**/**.test.js', { cwd: testsRoot });
        // Añadir archivos a la suite de pruebas
        files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

        return new Promise((c, e) => {
            try {
                // Ejecutar la prueba de mocha
                mocha.run(failures => {
                    if (failures > 0) {
                        e(new Error(`${failures} tests failed.`));
                    } else {
                        c();
                    }
                });
            } catch (err) {
                e(new Error(err));
            }
        });
    }


export { run };
