import {createHash} from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';
const read=file=>readFileSync(join('dist',file),'utf8');
const release=JSON.parse(read('release.json')),html=read('index.html');
const script=html.match(/<script[^>]+src="([^"]+\.js)"/);
if(!script)throw new Error('Production entry script is missing.');
const bundle=read(join('assets',basename(script[1])));
if(release.release!=='6C.3'||!release.commit||!html.includes(`6C.3 ${release.commit}`))throw new Error('HTML and release metadata disagree.');
if(process.env.GITHUB_SHA&&release.commit!==process.env.GITHUB_SHA.slice(0,7))throw new Error('Release marker does not match this deployment commit.');
for(const text of ['Develop district','Development mode','Expand settlement','Illustrated','Planning','Apply appearance','Architecture theme','demo.viking.longhouse.','hearthlands.viking.longhouse.01','Ravenfjord Timber Longhouse','Ravenfjord Painted Timber Hall','Ravenfjord Mossy Timber Hall','Viking Cottage – Sheet 4','Viking Tavern – Sheet 4','Viking Farmstead – Sheet 4','data:image/png;base64,','building-footprint-hit','rasterLevel','rasterSource','forest-canopy-batch','forest-pilot-images','Viking tree PNG pilot','Layered single-tree canopies enabled; cropped clusters withheld.','xMidYMid meet','6C.3'])if(!bundle.includes(text))throw new Error(`Production bundle is missing ${text}.`);
if(bundle.includes('raster-overview'))throw new Error('Production bundle still contains the obsolete raster-to-vector overview substitution.');
console.log(`Verified Hearthlands ${release.release} (${release.commit}): matching HTML, release metadata and Planning/Illustrated styles and preserved development/expansion controls in ${basename(script[1])}.`);

const trees=JSON.parse(readFileSync('src/assets/forests/manifest.json','utf8'));
const lazy=readdirSync('dist/assets').filter(n=>n.endsWith('.js')&&n!==basename(script[1])).map(n=>read(join('assets',n))).find(source=>trees.assets.every(a=>source.includes(a.id))&&source.includes('data:image/png;base64,'));
if(!lazy)throw new Error('The lazy six-image forest pilot bundle is missing.');
const hashes=[...lazy.matchAll(/data:image\/png;base64,([A-Za-z0-9+/=]+)/g)].map(m=>createHash('sha256').update(Buffer.from(m[1],'base64')).digest('hex'));
if(hashes.length!==6||!trees.assets.every(a=>hashes.includes(a.sha256)))throw new Error('Bundled forest PNGs differ from the approved manifest.');
console.log('Verified all six original forest PNGs in the opt-in lazy bundle.');

const canopies=JSON.parse(readFileSync('src/assets/forests/canopies/manifest.json','utf8'));
if(canopies.assets.length!==20||!canopies.comparisonOnly)throw new Error('Expected the opt-in twenty-canopy pack.');
const canopyModule=readdirSync('dist/assets').filter(n=>n.endsWith('.js')&&n!==basename(script[1])).map(n=>read(join('assets',n))).find(source=>canopies.assets.every(a=>source.includes(a.id)));
if(!canopyModule||canopyModule.includes('data:image/png;base64,'))throw new Error('Canopies must use a separate lazy local-URL module.');
for(const a of canopies.assets){
 const name=basename(a.file,'.png'),files=readdirSync('dist/assets').filter(f=>f.startsWith(name+'-')&&f.endsWith('.png'));
 if(files.length!==1||!canopyModule.includes('/Hearthlands/assets/'+files[0]))throw new Error(`Missing base-safe bundled canopy ${a.id}`);
 const png=readFileSync(join('dist/assets',files[0]));
 if(createHash('sha256').update(png).digest('hex')!==a.sha256||png.readUInt32BE(16)!==a.pixelWidth||png.readUInt32BE(20)!==a.pixelHeight||png[24]!==8||png[25]!==6)throw new Error(`Canopy PNG changed: ${a.id}`);
}
for(const text of ['Canopy variety','All twenty canopy images ready. Five variations per species; original colours preserved.','Forest artwork in PNG'])if(!bundle.includes(text))throw new Error(`Canopy comparison controls missing: ${text}`);
console.log('Verified all twenty unchanged RGBA canopy PNGs, base-safe lazy references and reversible comparison/export controls.');

const meadow=JSON.parse(readFileSync('src/assets/grassland/manifest.json','utf8')),meadowHashes=JSON.parse(readFileSync('src/assets/grassland/integrity.json','utf8'));
const meadowModule=readdirSync('dist/assets').filter(n=>n.endsWith('.js')&&n!==basename(script[1])).map(n=>read(join('assets',n))).find(source=>meadow.assets.every(a=>source.includes(a.id)));
if(meadow.assets.length!==6||!meadowModule||meadowModule.includes('data:image/'))throw new Error('Expected six WebPs behind a separate lazy URL module.');
for(const a of meadow.assets){
 const name=basename(a.file,'.webp'),files=readdirSync('dist/assets').filter(f=>f.startsWith(name+'-')&&f.endsWith('.webp'));
 if(files.length!==1||!meadowModule.includes('/Hearthlands/assets/'+files[0]))throw new Error(`Missing base-safe WebP: ${a.id}`);
 const bytes=readFileSync(join('dist/assets',files[0]));
 if(bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WEBP'||bytes.toString('ascii',12,16)!=='VP8 '||(bytes.readUInt16LE(26)&0x3fff)!==896||(bytes.readUInt16LE(28)&0x3fff)!==896||createHash('sha256').update(bytes).digest('hex')!==meadowHashes[a.id])throw new Error(`Grassland source changed: ${a.id}`);
}
for(const text of ['Illustrated grassland pilot','Illustrated grassland in PNG','grassland-pilot-images','grassland-ground-cache','illustrated-ground-63','Illustrated Ground 6C.3 in PNG','grasslandTextureOpacity','data-grassland-source-detail','All six meadow textures ready. Quiet ground at Fit; crisp artwork nearby.'])if(!bundle.includes(text))throw new Error(`Grassland controls/batch missing: ${text}`);
console.log('Verified six unchanged WebPs, base-safe lazy URLs, opt-in meadow controls and shared image batch.');
