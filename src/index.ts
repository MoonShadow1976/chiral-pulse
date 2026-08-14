/**
 * CHIRAL PULSE, node half. Pure UI plugin: the empty apply exists so the
 * package can be a row in the host cordis tree / Loader; the browser half
 * ships via exports["./client"], discovered through the package.json
 * `dsh.client` declaration.
 */

/** Host plugin body — no host-side behavior for this surface plugin. */
export function apply(): void {}
