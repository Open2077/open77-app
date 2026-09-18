import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { BLOG_TOPICS, postTopics, blogDate, blogArchives, filterBlogPosts, parseBlogFilters } from '../src/lib/devblog-presentation.ts';

const posts=[];
for(const file of await fs.readdir('content/devblog')){
  if(!file.endsWith('.md'))continue;
  const raw=await fs.readFile('content/devblog/'+file,'utf8'), meta={};
  for(const line of raw.split(/\r?\n/).slice(1)){if(line==='---')break;const i=line.indexOf(':');if(i>0)meta[line.slice(0,i)]=JSON.parse(line.slice(i+1).trim());}
  posts.push({...meta,slug:file.slice(0,-3),readingMinutes:1});
}
posts.sort((a,b)=>b.slug.localeCompare(a.slug));

test('archives are real counts in newest-first order',()=>{
  const archive=blogArchives(posts);
  assert.equal(archive.reduce((n,m)=>n+m.count,0),posts.length);
  assert.deepEqual(archive.map(m=>m.id),[...archive.map(m=>m.id)].sort().reverse());
  for(const month of archive)assert.equal(filterBlogPosts(posts,{topic:'all',month:month.id,query:''}).length,month.count);
  assert.deepEqual(blogArchives([]),[]);
});
test('topics are useful labels, not project-wide SEO tags',()=>{
  const fixture={title:'An unrelated update',description:'A note.',tags:['cyberpunk-2077-dedicated-server'],date:'2026-09-18',slug:'fixture',readingMinutes:1};
  assert.deepEqual(postTopics(fixture).map(t=>t.id),['platform']);
  for(const topic of BLOG_TOPICS)assert.ok(filterBlogPosts(posts,{topic:topic.id,month:'',query:''}).length>0,topic.id);
});
test('query, month and category intersect without changing order',()=>{
  const filters={topic:'server',month:'2026-09',query:'POLYZONE launcher'};
  const result=filterBlogPosts(posts,filters);
  assert.ok(result.length>0);
  assert.ok(result.every(p=>p.date.startsWith('2026-09')&&postTopics(p).some(t=>t.id==='server')));
  assert.deepEqual(filterBlogPosts(posts,{topic:'all',month:'',query:'   '}),posts);
  assert.equal(filterBlogPosts(posts,{topic:'all',month:'',query:'<script>invalidtarget</script>'}).length,0);
  assert.equal(filterBlogPosts([{...posts[0],title:'Café update',description:''}],{topic:'all',month:'',query:'cafe'}).length,1);
});
test('deep links validate input and cap search length',()=>{
  assert.deepEqual(parseBlogFilters('?topic=invalid&month=2026-99'),{topic:'all',month:'',query:''});
  assert.deepEqual(parseBlogFilters('?topic=networking&month=2026-09&q=world+sync'),{topic:'networking',month:'2026-09',query:'world sync'});
  assert.equal(parseBlogFilters('?q='+'a'.repeat(500)).query.length,160);
  assert.equal(blogDate('2026-09-17'),'17 Sept 2026');
});
test('articles stay editorial and do not inherit decorative imagery',async()=>{
  assert.ok(BLOG_TOPICS.every(topic=>!('image' in topic)));
  const card=await fs.readFile('src/components/devblog/blog-card.tsx','utf8');
  const article=await fs.readFile('src/app/devblog/[slug]/page.tsx','utf8');
  assert.doesNotMatch(card, /<Image|blog-card-art/);
  assert.doesNotMatch(article, /<Image|postArtwork/);
  await fs.access('public/assets/artwork/devblog-nightdrive-v1.webp');
});
