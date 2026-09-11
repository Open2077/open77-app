import assert from "node:assert/strict";
import { test } from "node:test";
import { communityVideo } from "../src/lib/community/video.ts";

test("supported YouTube forms produce a fixed non-autoplay player origin", () => {
  for (const source of ["https://youtu.be/abcdefghijk?autoplay=1", "https://www.youtube.com/watch?v=abcdefghijk&origin=https://evil.example", "https://youtube.com/shorts/abcdefghijk", "https://youtube.com/live/abcdefghijk"]) {
    const result = communityVideo(source);
    assert.equal(result.embed, "https://www.youtube-nocookie.com/embed/abcdefghijk?autoplay=0&playsinline=1");
  }
});
test("Vimeo unlisted hash survives while arbitrary player options do not", () => {
  const result = communityVideo("https://vimeo.com/123456789/abc123def4?autoplay=1&background=1");
  assert.equal(result.embed, "https://player.vimeo.com/video/123456789?autoplay=0&dnt=1&h=abc123def4");
});
test("provider pages and unrecognized video shapes keep a direct-link fallback", () => {
  assert.equal(communityVideo("https://youtube.com/@creator").embed, null);
  assert.equal(communityVideo("https://vimeo.com/channels/example").embed, null);
  assert.equal(communityVideo("https://youtube.com/watch?v=abcdefghijk&v=otherid1234").embed, null);
});
test("host spoofing, script URLs, credentials, ports and control characters are rejected", () => {
  for (const source of ["javascript:alert(1)", "http://youtube.com/watch?v=abcdefghijk", "https://youtube.com.evil.example/watch?v=abcdefghijk", "https://youtube.com@evil.example/watch", "https://user@youtube.com/watch?v=abcdefghijk", "https://youtube.com:8443/watch?v=abcdefghijk", "https://youtube.com/watch?v=abcdefghijk\n", "//youtu.be/abcdefghijk"]) assert.equal(communityVideo(source), null);
});
