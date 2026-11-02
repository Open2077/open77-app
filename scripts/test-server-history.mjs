import test from "node:test";
import assert from "node:assert/strict";
import { historyGeometry, historyStats, validatePlayerHistory } from "../src/lib/server-history-data.ts";
import { parseLauncherText, plainLauncherText } from "../src/lib/launcher-text.ts";

const data = { serverId: "server", hours: 48, intervalSeconds: 600, fromUtc: "2026-11-01T00:00:00Z", toUtc: "2026-11-03T00:00:00Z", points: [
  { timestampUtc: "2026-11-02T12:00:00Z", capturedAtUtc: "2026-11-02T12:00:01Z", connectedPlayers: 80, maximumPlayers: 100 },
  { timestampUtc: "2026-11-02T12:40:00Z", capturedAtUtc: "2026-11-02T12:40:01Z", connectedPlayers: 40, maximumPlayers: 100 },
  { timestampUtc: "2026-11-02T13:00:00Z", capturedAtUtc: "2026-11-02T13:00:01Z", connectedPlayers: 60, maximumPlayers: 100 },
] };
test("partial history uses the full plot and a single continuous line and area across missing readings", () => {
  const plot = historyGeometry(validatePlayerHistory(data, "server", 48), 700);
  assert.equal(plot.points[0].x, plot.left);
  assert.equal(plot.points.at(-1).x, plot.right);
  assert.equal(plot.line.match(/M/g).length, 1);
  assert.equal(plot.area.match(/M/g).length, 1);
  assert.equal(plot.line.match(/L/g).length, 2);
  assert.deepEqual(historyStats(data), { peak: 80, average: 60 });
});
test("singleton is centred, zero players stays measurable and empty history stays empty", () => {
  const single = { ...data, points: [{ ...data.points[0], connectedPlayers: 0 }] };
  const plot = historyGeometry(single, 700);
  assert.equal(plot.points[0].x, (plot.left + plot.right) / 2);
  assert.equal(plot.area, "");
  assert.equal(plot.maximum, 4);
  assert.deepEqual(historyStats(single), { peak: 0, average: 0 });
  assert.deepEqual(historyStats({ ...data, points: [] }), { peak: null, average: null });
});
test("history rejects wrong identities, windows, unordered or malformed points", () => {
  for (const invalid of [{ ...data, serverId: "another" }, { ...data, hours: 24 }, { ...data, intervalSeconds: 0 }, { ...data, fromUtc: "bad" }, { ...data, points: [...data.points].reverse() }, { ...data, points: [data.points[0], data.points[0]] }, { ...data, points: [{ ...data.points[0], connectedPlayers: -1 }] }, { ...data, points: [{ ...data.points[0], connectedPlayers: "8" }] }]) assert.throws(() => validatePlayerHistory(invalid, "server", 48));
});
test("launcher formatting preserves literal escapes and unknown codes, including HTML as text", () => {
  assert.equal(plainLauncherText("$o$ff0Night$z $iCity$z $$10 $q"), "Night City $10 $q");
  assert.deepEqual(parseLauncherText("$o$i$n$0ffRP$z"), [{ bold: true, italic: true, width: "n", color: "#0ff", text: "RP" }]);
  assert.equal(plainLauncherText("$f00<img onerror=alert(1)>"), "<img onerror=alert(1)>");
});
