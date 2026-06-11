// walk toward a district and screenshot the view (画面感 check)
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
const ROOT=new URL('..',import.meta.url).pathname;
const MIME={'.html':'text/html','.js':'text/javascript','.png':'image/png','.json':'application/json'};
const server=createServer(async(req,res)=>{let p=decodeURIComponent(new URL(req.url,'http://x').pathname);
  if(p.endsWith('/'))p+='index.html';let f=normalize(join(ROOT,p));
  try{const st=await stat(f).catch(()=>null);if(st?.isDirectory())f=join(f,'index.html');else if(!st&&!extname(f))f=f+'/index.html';
    res.writeHead(200,{'Content-Type':MIME[extname(f)]||'application/octet-stream'});res.end(await readFile(f));}
  catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(8767,r));
const b=await chromium.launch({args:['--enable-unsafe-swiftshader']});
const p=await (await b.newContext({viewport:{width:1100,height:750}})).newPage();
for(const [key,name] of [['translate','bureau'],['games','arcade']]){
  await p.goto('about:blank');
  await p.goto(`http://localhost:8767/world/#${key}`,{waitUntil:'domcontentloaded'});
  await p.waitForSelector('#loading.gone',{timeout:15000});
  await p.screenshot({path:`shot-zoo-${name}-spawn.png`});
  await p.keyboard.down('ArrowRight');await p.waitForTimeout(500);await p.keyboard.up('ArrowRight');
  await p.keyboard.down('ArrowUp');await p.waitForTimeout(3500);await p.keyboard.up('ArrowUp');
  await p.screenshot({path:`shot-zoo-${name}-walk.png`});
}
await b.close();server.close();console.log('done');
