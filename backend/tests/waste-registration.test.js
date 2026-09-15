import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

test("legacy and canonical Waste imports work in either order with app startup imports", () => {
  for (const paths of [["Item", "Waste"], ["Waste", "Item"]]) {
    const code = `
      import assert from 'node:assert/strict';
      const first = await import('./src/models/${paths[0]}.js');
      const second = await import('./src/models/${paths[1]}.js');
      assert.equal(first.default, second.default);
      await import('./src/app.js');
    `;
    assert.doesNotThrow(() => execFileSync(process.execPath, ["--input-type=module", "-e", code], {
      cwd: new URL("../", import.meta.url),
      stdio: "pipe",
      timeout: 15000,
    }));
  }
});
