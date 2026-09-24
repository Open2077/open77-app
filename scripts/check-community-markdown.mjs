import assert from "node:assert/strict";
import { communityMarkdown } from "../src/lib/community/markdown.ts";

const source = [
  '# Taxi',
  '**Hello** and [source](https://github.com/example/taxi).',
  '<script>globalThis.hubExecuted=true</script>',
  '<a href="javascript:alert(1)">raw</a>',
  '[bad](javascript:alert%281%29)',
  '[credentials](https://user:password@example.com)',
  '![tracker](https://example.com/pixel.gif)',
  '<iframe src="https://example.com"></iframe>',
  '```lua\nprint("<script>")\n```',
  '- One\n- Two',
].join('\n\n');
const html = await communityMarkdown(source);
assert.match(html, /<strong>Hello<\/strong>/);
assert.match(html, /href="https:\/\/github.com\/example\/taxi"/);
assert.match(html, /rel="nofollow ugc noopener noreferrer"/);
assert.match(html, /<ul>/);
assert.match(html, /(?:&lt;|&#x3C;)script(?:&gt;|>)/);
assert.doesNotMatch(html, /<script|<iframe|<img|javascript:|password@/i);
await assert.rejects(() => communityMarkdown("x".repeat(50_001)));
console.log("Community Markdown checks passed: safe formatting, links, code, HTML and image removal.");
