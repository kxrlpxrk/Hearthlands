const build=__HEARTHLANDS_BUILD__;
export function BuildVersion(){return <output className="build-version" aria-label={`Build version ${build.release}, commit ${build.commit}`} title={`Built ${build.builtAt} · Reload this page to load a newer deployment`}>{build.release} · {build.commit}</output>;}
