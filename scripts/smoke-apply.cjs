// Simulate browser-side materialization of the client bundle: capture the
// registered factory, execute it against the real module table (react et al
// resolve through the workspace junction), then run apply() against a mock
// client context. Any runtime error here is what a browser would hit.
const captured = []
const elements = []
const fakeElement = () => ({
  dataset: {}, className: '', textContent: '',
  appendChild() {}, remove() {}, setAttribute() {},
})
const fakeDocument = {
  createElement: () => { const el = fakeElement(); elements.push(el); return el },
  head: { appendChild() {} },
  body: { appendChild() {} },
  querySelector: () => null,
}
global.window = {
  __ModuleLoader__: { load: (rec) => { captured.push(rec) } },
  matchMedia: () => ({ matches: false }),
}
global.document = fakeDocument

const m = require('D:/style/lib/client.js')
console.log('registered:', captured.map(c => c.id))
const rec = captured.find(c => c.id === 'chiral-pulse')
if (!rec) { console.error('FACTORY NOT REGISTERED'); process.exit(1) }

// Resolve platform modules the way the loader module table would: through a
// workspace package that depends on react (pnpm keeps it per-package).
const { createRequire } = require('node:module')
const tableRequire = createRequire('D:/deepseek-harness/packages/client/ui-goal/package.json')
const exports_ = rec.factory(tableRequire)
console.log('exports:', Object.keys(exports_))

const registeredSlots = []
const effects = []
const ctx = {
  effect: (cb, label) => { effects.push(label); const dispose = cb(); if (typeof dispose === 'function') dispose() },
  slots: {
    inject: (key, cb) => { console.log('slots.inject', key); cb() },
    register: (opts, C) => { registeredSlots.push({ opts, comp: typeof C }); console.log('slots.register', JSON.stringify(opts)) },
  },
  locale: { register: (ns, dict) => { console.log('locale.register', ns, Object.keys(dict)) } },
}
try {
  exports_.apply(ctx)
  console.log('APPLY OK 鈥?slots:', registeredSlots.length, 'effects:', effects.length, 'style tags:', elements.filter(e => e.tagName).length)
} catch (error) {
  console.error('APPLY THREW:', error)
  process.exit(1)
}
