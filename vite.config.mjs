import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { builtinModules } from 'module';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

// La extension se ejecuta en Node (extension host de VSCode), por lo que los
// modulos nativos se externalizan en vez de polyfillarse para el navegador.
const nodeBuiltins = [...builtinModules, ...builtinModules.map(module => `node:${module}`)];

export default defineConfig({
    build: {
        lib: {
            entry: path.resolve(rootDir, 'src/extension.ts'),
            name: 'vue-discovery-mtm',
            formats: ['cjs'],
            fileName: format => `vue-discovery-mtm.${format}`,
        },
        rollupOptions: {
            shimMissingExports: false,
            external: ['vscode', ...nodeBuiltins],
            input: {
                main: path.resolve(rootDir, 'src/extension.ts'),
            },
        },
        outDir: 'dist',
        // No se limpia el directorio porque convive con el bundle generado por esbuild
        emptyOutDir: false,
        target: 'node22',
        sourcemap: true,
    },
    resolve: {
        alias: {
            '@': path.resolve(rootDir, 'src'),
        },
    },
    define: {
        global: 'globalThis',
    },
});
