import assert from "node:assert/strict";
import { argumentsFor } from "./check-hub-browser.mjs";

for (const input of [[], ["https://open2077.net", "taxi", "Taxi"], ["http://example.test", "taxi", "Taxi"], ["http://user:pass@127.0.0.1:3000", "taxi", "Taxi"], ["http://127.0.0.1:3000/path", "taxi", "Taxi"], ["http://127.0.0.1:3000?x=1", "taxi", "Taxi"], ["http://127.0.0.1:3000", "../draft", "Taxi"], ["http://127.0.0.1:3000", "taxi", ""], ["http://127.0.0.1:3000", "taxi", "Taxi", "--start-server"]]) {
  assert.throws(() => argumentsFor(input));
}
assert.deepEqual(argumentsFor(["http://127.0.0.1:3000", "auto-taxi", "Auto Taxi", "--require-gallery"]), { origin: "http://127.0.0.1:3000", slug: "auto-taxi", title: "Auto Taxi", requireGallery: true });
assert.equal(argumentsFor(["http://[::1]:3000/", "taxi", "Taxi"]).origin, "http://[::1]:3000");
console.log("Hub browser argument guards passed; no browser or server launched.");
