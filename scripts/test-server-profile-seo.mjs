import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
registerHooks({ resolve(specifier, context, next) { return next(specifier === "./launcher-text" ? "./launcher-text.ts" : specifier, context); } });
const { serverProfileSummary, SERVER_ID } = await import("../src/lib/server-profile-seo.ts");

test("link previews strip server formatting codes while preserving readable text", () => {
  assert.equal(serverProfileSummary({ name: "$o$ff0Night City$z", description: "$iRoleplay$z · $$5", bannerUrl: null, iconUrl: null }).title, "Night City");
  assert.equal(serverProfileSummary({ name: "$tworld", description: "$iRoleplay$z · $$5", bannerUrl: null, iconUrl: null }).description, "Roleplay · $5");
});

test("server previews use real text and prefer a banner, then icon, then brand fallback", () => {
  const server = { name: "  My world  ", description: "Roleplay.\nMeet your neighbours.", bannerUrl: "https://master.example/banner.png", iconUrl: "https://master.example/icon.png" };
  assert.deepEqual(serverProfileSummary(server), { title: "My world", description: "Roleplay. Meet your neighbours.", image: server.bannerUrl });
  assert.equal(serverProfileSummary({ ...server, bannerUrl: null }).image, server.iconUrl);
  assert.equal(serverProfileSummary({ ...server, bannerUrl: null, iconUrl: null }).image, undefined);
  assert.match(serverProfileSummary({ ...server, description: " " }).description, /My world/);
});

test("invalid image schemes and credential URLs cannot enter a link preview", () => {
  for (const bannerUrl of ["javascript:alert(1)", "data:image/png;base64,abc", "https://user:password@example.com/a", "/relative"]) {
    assert.equal(serverProfileSummary({ name: "Test", description: "", bannerUrl, iconUrl: "https://master.example/icon.png" }).image, "https://master.example/icon.png");
  }
  assert.equal(SERVER_ID.test("6b611fe7-f168-4959-8b28-2a7cdb673b24"), true);
  assert.equal(SERVER_ID.test("../../accounts"), false);
});
