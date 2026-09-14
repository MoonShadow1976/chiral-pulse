// Regression coverage for the Session / Chat split. Run after building lib/.
const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')

const root = path.join(__dirname, '..')
const source = fs.readFileSync(path.join(root, 'lib/client.js'), 'utf8')
let registration
vm.runInNewContext(source, {
  window: { __ModuleLoader__: { load: value => { registration = value } } },
}, { filename: 'client.js' })
assert.equal(registration.id, 'chiral-pulse')
const { HeartLine } = registration.factory(require)

// Reject removed properties rather than silently emulating the old runtime.
function strictSession(running = false, lastAgentError = null) {
  return new Proxy({ running, lastAgentError }, {
    get(target, key) {
      assert.ok(Object.hasOwn(target, key), `obsolete Session property: ${String(key)}`)
      return target[key]
    },
  })
}

function render(options = {}) {
  const session = strictSession(options.running, options.error)
  const chat = { legacy: {
    partial: options.partial ?? null,
    runningCalls: options.tools ?? [],
    nodes: options.nodes ?? [],
  } }
  return renderToStaticMarkup(React.createElement(HeartLine, {
    useSession: selector => selector(session),
    useChat: selector => selector(chat),
    useProjection: key => {
      assert.equal(key, 'sessionStats')
      return options.stats
    },
    t: key => key,
  }))
}

test('idle renders the strip and canvas with no stats projection', () => {
  const html = render()
  assert.match(html, /class="cp-line"/)
  assert.match(html, /<canvas/)
  assert.match(html, /status.stable/)
})

test('streaming reads Chat partial blocks, not Session.partial', () => {
  const html = render({ running: true, partial: { blocks: [{ kind: 'text', text: 'Thinking now' }] } })
  assert.match(html, /Thinking now/)
})

test('executing tools read Chat runningCalls and take status priority', () => {
  const html = render({ running: true, tools: [{ name: 'read' }] })
  assert.match(html, /EXEC · read/)
})

test('errors still read the Session lifecycle snapshot', () => {
  assert.match(render({ error: 'Provider failed' }), /Provider failed/)
})

test('fresh scheduled retry draws the flatline status', () => {
  assert.match(render({ running: true, nodes: [
    { kind: 'model-retry', retryState: 'scheduled', time: Date.now() },
  ] }), /status.flatline/)
})

test('started or stale retries do not keep the strip in flatline', () => {
  const old = { kind: 'model-retry', retryState: 'scheduled', time: Date.now() }
  const started = { ...old, retryState: 'started' }
  assert.doesNotMatch(render({ nodes: [old, started] }), /status.flatline/)
  assert.doesNotMatch(render({ nodes: [{ ...old, time: Date.now() - 180_000 }] }), /status.flatline/)
})

test('manifest loads the current Session, Chat and renderer packages', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
  assert.ok(!JSON.stringify(manifest).includes('@deepseek-ai/dsh-client-runtime'))
  for (const name of ['ui-session', 'ui-chat', 'ui-renderer']) {
    assert.ok(manifest.dsh.client.inject.includes(`@deepseek-ai/dsh-client-${name}`))
  }
})
