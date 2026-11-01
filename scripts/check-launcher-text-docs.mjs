import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const load = createRequire(import.meta.url);
const { chromium } = load(process.env.OP77_PLAYWRIGHT || 'playwright');
(async () => {
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try {
  const page=await browser.newPage({viewport:{width:1440,height:1100}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:3147/docs/launcher-text-formatting');
  await page.waitForLoadState('networkidle');
  const editor=page.getByRole('textbox',{name:'YOUR TEXT + CODES'});
  await editor.waitFor();
  await editor.fill('$o$ff0Night City$z');
  await editor.evaluate(el=>el.setSelectionRange(el.value.length,el.value.length));
  await page.getByRole('button',{name:'Insert Cyan, $0ff',exact:true}).click();
  assert.equal(await editor.inputValue(),'$o$ff0Night City$z$0ff');
  await page.getByRole('button',{name:'Freeroam',exact:true}).click();
  assert.match(await editor.inputValue(),/FREE/);
  await editor.fill('$f00<img src=x onerror=alert(1)>');
  assert.equal(await page.locator('section[aria-label="Launcher text editor"] img').count(),0);
  await page.getByRole('button',{name:'Roleplay',exact:true}).click();
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:'artifacts/highlights/launcher-text-doc-desktop.png',fullPage:false});
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:'artifacts/highlights/launcher-text-doc-mobile.png',fullPage:false});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal overflow');
  assert.deepEqual(errors,[]);
  console.warn('PASS text formatting docs: code insertion, examples, safe preview, desktop/mobile layout.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
