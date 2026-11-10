import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        server: {
            deps: {
                // The specs import the package by its name, which resolves
                // through "exports" to the build in dist/. Externalizing it
                // makes Node itself load that file and resolve its imports
                // (lodash-es), as it does for consumers, instead of vite's
                // module runner transforming it.
                external: [/\/dist\//],
            },
        },
    },
});
