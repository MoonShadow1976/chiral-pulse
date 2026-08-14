/**
 * CHIRAL PULSE — out-of-tree client plugin build.
 *
 * Emits the two artifacts a dual-face plugin package needs:
 *  - lib/index.js   — the node half: an empty `apply` so the package can be a
 *                     row in the host loader tree (the browser half is
 *                     discovered through the package.json `dsh.client`).
 *  - lib/client.js  — the browser half: a lazy-CJS closure factory registered
 *                     via window.__ModuleLoader__.load({ id, factory }).
 *
 * The client bundle contract mirrors the in-repo shared preset
 * (packages/client/tsdown.client.ts in the deepseek-harness checkout):
 * externals resolve through the injected require (the loader module table —
 * the platform seed list), everything else must inline, and the banner/footer
 * pair wraps the factory. Never import another plugin package by value: the
 * module table cannot answer it. Type-only imports are erased and never reach
 * this artifact.
 */
import { defineConfig } from 'tsdown'

/**
 * The shell's frozen module table (platform seed; one constant in the harness
 * shell: packages/client/web/src/platform.ts). A require() the table cannot
 * answer is a guaranteed runtime throw, so the rule is the list itself.
 */
const PLATFORM_MODULES = [
  'react', 'react/jsx-runtime', 'react-dom', 'react-dom/client', '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-web-react',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-ui-attachment',
  '@deepseek-ai/dsh-client-schema-form',
] as const

const PLUGIN_ID = '@dsh-plugins/chiral-pulse'

export default defineConfig([
  // Node half: the host loader mounts the package as an ordinary entry.
  {
    name: PLUGIN_ID,
    entry: { index: 'src/index.ts' },
    outDir: 'lib',
    format: ['esm'],
    platform: 'node',
    target: 'es2024',
    // Keep the entry extension: lib/index.js, not lib/index.mjs.
    fixedExtension: false,
    dts: false,
    clean: false,
  },
  // Browser half: the bundle served at /plugins/<id>/client.js.
  {
    name: `${PLUGIN_ID}/client`,
    entry: { client: 'src/client/index.ts' },
    outDir: 'lib',
    format: 'cjs',
    platform: 'browser',
    sourcemap: true,
    dts: false,
    clean: false,
    // Only the platform seed stays external (the loader module table answers
    // its require); everything else the bundle touches must inline — no
    // shared identity outside the module table.
    deps: {
      neverBundle: [...PLATFORM_MODULES],
      alwaysBundle: (id: string) => !(PLATFORM_MODULES as readonly string[]).includes(id),
    },
    outputOptions: {
      entryFileNames: 'client.js',
      // Registration is a side effect of EXECUTING the script; module bodies
      // run lazily at first materialization inside the factory closure.
      banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(PLUGIN_ID)}, factory: (require) => {`,
      footer: 'return module.exports; } });',
      intro: 'var module = { exports: {} }; var exports = module.exports;',
    },
  },
])
