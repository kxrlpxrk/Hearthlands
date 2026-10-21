import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(({mode})=>{
 const build={release:'6C.3',commit:(loadEnv(mode,'.','GITHUB_SHA').GITHUB_SHA||'local').slice(0,7),builtAt:new Date().toISOString()};
 return {
  base:'/Hearthlands/',
  define:{__HEARTHLANDS_BUILD__:JSON.stringify(build)},
  plugins:[react(),{
   name:'hearthlands-release',
   transformIndexHtml:()=>[{tag:'meta',attrs:{name:'hearthlands-build',content:`${build.release} ${build.commit}`},injectTo:'head'}],
   generateBundle(){this.emitFile({type:'asset',fileName:'release.json',source:JSON.stringify(build)});},
  }],
 };
});
