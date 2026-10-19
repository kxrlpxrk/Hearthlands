/** Opt-in development URL only; never persisted, exported or enabled in production. */
export function footprintDebugEnabled(){return import.meta.env.DEV&&typeof window!=='undefined'&&new URLSearchParams(window.location.search).get('footprintDebug')==='1';}
