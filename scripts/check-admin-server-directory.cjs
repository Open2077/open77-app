/* eslint-disable @typescript-eslint/no-require-imports, no-console -- Standalone browser check. */
// Intercepted master calls only; no real accounts or server labels are modified.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.OP77_PLAYWRIGHT || 'playwright');
const { mkdirSync } = require('node:fs');
const { resolve } = require('node:path');
(async () => {
  const browser = await chromium.launch({ channel:'msedge',headless:true });
  try {
    const page = await browser.newPage({viewport:{width:1440,height:960}}), calls=[],errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    const session = { accountId:'10000000-0000-4000-8000-000000000001',email:'operator@example.test',displayName:'Operator',role:'admin',emailVerified:true,token:'synthetic-directory-test',expiresAtUtc:'2036-01-01T00:00:00Z' };
    const row={serverId:'20000000-0000-4000-8000-000000000002',name:'Night City Test',connectEndpoint:'world.example.test:11778',connectedPlayers:24,maximumPlayers:64,lastHeartbeatUtc:new Date().toISOString(),ownerEmail:'owner@example.test',licenseLabel:'Community',official:false,featured:false,featuredOrder:0,directoryRevision:0,hidden:false};
    let reply, role='admin';
    await page.route('**/api/v1/**',async route=>{
      const r=route.request(),url=new URL(r.url());
      const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Allow-Methods':'GET, PUT, POST'};
      if(r.method()==='OPTIONS')return route.fulfill({status:204,headers});
      const json=body=>route.fulfill({json:body,headers});
      if(url.pathname==='/api/v1/accounts/me')return json({...session,role});
      if(url.pathname==='/api/v1/admin/servers')return json([row]);
      if(url.pathname.endsWith('/directory')) {
        calls.push({method:r.method(),body:r.postDataJSON(),authorization:r.headers().authorization});
        const outcome=await new Promise(resolve=>{reply=resolve;});
        if(outcome==='ok'){ Object.assign(row,calls.at(-1).body,{directoryRevision:row.directoryRevision+1}); return json(row); }
        row.directoryRevision++;
        return route.fulfill({status:409,headers,json:{code:'directory_changed',message:'Another administrator changed this server. Refresh before editing again.'}});
      }
      return json([]);
    });
    await page.addInitScript(session=>localStorage.setItem('open77.session',JSON.stringify(session)),session);
    await page.goto((process.env.OP77_TEST_APP||'http://127.0.0.1:3037')+'/admin/servers');
    await page.getByRole('checkbox',{name:'Official: Night City Test',exact:true}).check();
    await page.getByRole('checkbox',{name:'Featured: Night City Test',exact:true}).check();
    await page.getByRole('spinbutton',{name:'Featured order: Night City Test',exact:true}).fill('3');
    await page.getByRole('button',{name:'Save changes',exact:true}).click();
    await page.getByRole('button',{name:'Saving…',exact:true}).waitFor();
    assert(await page.getByRole('checkbox',{name:'Official: Night City Test',exact:true}).isDisabled());
    assert.deepEqual(calls[0],{method:'PUT',body:{official:true,featured:true,featuredOrder:3,revision:0,hidden:false},authorization:'Bearer synthetic-directory-test'});
    reply('ok'); await page.getByRole('button',{name:'Saved',exact:true}).waitFor();
    assert.match(await page.locator('[role="status"]').allTextContents().then(x=>x.join(' ')),/Directory settings saved/);
    await page.getByRole('checkbox',{name:'Official: Night City Test',exact:true}).uncheck();
    await page.getByRole('button',{name:'Save changes',exact:true}).click(); await page.getByRole('button',{name:'Saving…',exact:true}).waitFor();
    reply('conflict'); await page.getByRole('alert').filter({hasText:'Another administrator'}).waitFor();
    assert.equal(calls[1].body.revision,1);
    await page.locator('.adm-panel').getByRole('button',{name:'Refresh',exact:true}).click();
    await page.getByRole('checkbox',{name:'Official: Night City Test',exact:true}).waitFor();
    await page.waitForTimeout(300);
    assert(await page.getByRole('checkbox',{name:'Official: Night City Test',exact:true}).isChecked());
    const visibility=page.getByRole('checkbox',{name:'Hide from public list: Night City Test',exact:true});
    await visibility.check();
    await page.getByRole('button',{name:'Save changes',exact:true}).click();
    await page.getByRole('button',{name:'Saving…',exact:true}).waitFor();
    assert(await visibility.isDisabled());
    assert.equal(calls[2].body.hidden,true);
    assert.equal(calls[2].body.revision,2);
    reply('ok'); await page.getByRole('button',{name:'Saved',exact:true}).waitFor();
    assert.match(await page.locator('[role="status"]').allTextContents().then(x=>x.join(' ')),/hidden from public lists/);
    await page.getByRole('combobox',{name:'Show',exact:true}).selectOption('hidden');
    assert.equal(await visibility.count(),1);
    await page.getByRole('combobox',{name:'Show',exact:true}).selectOption('visible');
    assert.equal(await visibility.count(),0);
    await page.getByRole('combobox',{name:'Show',exact:true}).selectOption('all');
    await page.reload(); await visibility.waitFor(); assert(await visibility.isChecked(),'Hidden state survives reload');
    await visibility.uncheck();
    await page.getByRole('button',{name:'Save changes',exact:true}).click();
    await page.getByRole('button',{name:'Saving…',exact:true}).waitFor();
    assert.equal(calls[3].body.hidden,false);
    reply('ok'); await page.getByRole('button',{name:'Saved',exact:true}).waitFor();
    assert(!(await visibility.isChecked()));
    await page.getByRole('combobox',{name:'Show',exact:true}).selectOption('hidden');
    assert.equal(await visibility.count(),0);
    await page.getByRole('combobox',{name:'Show',exact:true}).selectOption('all');
    await page.getByRole('searchbox',{name:'Find a server'}).fill('absent'); assert.equal(await page.getByRole('checkbox').count(),0);
    await page.getByRole('searchbox',{name:'Find a server'}).fill('');
    const output=resolve(__dirname,'../artifacts/admin-directory');mkdirSync(output,{recursive:true});await page.screenshot({path:resolve(output,'servers.png')});
    delete row.hidden; await page.reload(); await visibility.waitFor();
    assert(await visibility.isDisabled(),'Do not pretend hiding works against an older master');
    await page.getByText('Update master first',{exact:true}).waitFor();
    role='user';await page.reload();await page.waitForTimeout(600);assert.equal(await page.getByRole('checkbox').count(),0,'Regular account cannot access curation controls');
    assert.equal(calls.length,4);assert.deepEqual(errors,[]);console.log('PASS: directory labels and visibility, hide/unhide, filters, persistence, old-master guard, loading, exact payload, conflict, search and role gate.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
