import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
const ROOT = new URL('..', import.meta.url).pathname;
const MIME = { '.html':'text/html', '.js':'text/javascript', '.png':'image/png', '.json':'application/json' };
const server = createServer(async (req,res)=>{
  let p = decodeURIComponent(new URL(req.url,'http://x').pathname);
  if (p.endsWith('/')) p+='index.html';
  let file = normalize(join(ROOT,p));
  try{
    const st = await stat(file).catch(()=>null);
    if (st?.isDirectory()) file=join(file,'index.html');
    else if (!st && !extname(file)) file=file+'/index.html';
    res.writeHead(200,{'Content-Type':MIME[extname(file)]||'application/octet-stream'});
    res.end(await readFile(file));
  }catch{res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(8766,r));
const browser = await chromium.launch({args:['--enable-unsafe-swiftshader']});
const p = await (await browser.newContext({viewport:{width:1100,height:800}})).newPage();
for (const [hash,name] of [['#0','clay-cipher'],['#1','paper-translate'],['#2','voxel-games'],['#3','molten-forge'],['#4','mosaic-wall']]){
  await p.goto("about:blank");await p.goto(`http://localhost:8766/${hash}`,{waitUntil:"domcontentloaded"});
  await p.waitForSelector('#panel.on',{timeout:10000});
  await p.waitForTimeout(2600); // let the camera lerp settle
  await p.screenshot({path:`shot-style-${name}.png`});
}
await p.goto('http://localhost:8766/world/#games',{waitUntil:'domcontentloaded'});
await p.waitForSelector('#loading.gone',{timeout:15000});
await p.waitForTimeout(800);
await p.screenshot({path:'shot-world-games.png'});
await browser.close(); server.close();
console.log('done');
