import test from "node:test";
import assert from "node:assert/strict";
import {
  getPasswordRequirements,
  getPasswordValidationMessage,
} from "../src/utils/passwordValidation.js";

test("registration passwords report each missing requirement independently", () => {
  for (const [password, missing] of [
    ["Abcde1!", ["length"]],
    ["Aa1!🙂🙂", ["length"]],
    ["Aa1!🙂🙂🙂", ["length"]],
    ["abcdef1!", ["uppercase"]],
    ["ABCDEF1!", ["lowercase"]],
    ["Abcdefg!", ["number"]],
    ["Abcdefg1", ["special"]],
    ["Abcdef1 ", ["special"]],
    ["Abcdef1\t", ["special"]],
    ["Abcdef1\n", ["special"]],
    ["Abcdef1é", ["special"]],
    ["Åbcdef1!", ["uppercase"]],
    ["ABCDEF1é!", ["lowercase"]],
    ["Abcdefg١!", ["number"]],
    ["abc", ["length", "uppercase", "number", "special"]],
    ["", ["length", "uppercase", "lowercase", "number", "special"]],
  ]) {
    assert.deepEqual(
      getPasswordRequirements(password).filter(({ met }) => !met).map(({ id }) => id),
      missing,
      JSON.stringify(password),
    );
    assert.ok(getPasswordValidationMessage(password).startsWith("Password must contain: "));
  }
});

test("all ASCII punctuation qualifies as special, including symbols outside the examples", () => {
  const punctuation = "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~";
  assert.equal(punctuation.length, 32);
  for (const symbol of punctuation) {
    assert.ok(getPasswordRequirements(`Abcdef1${symbol}`).every(({ met }) => met), symbol);
    assert.equal(getPasswordValidationMessage(`Abcdef1${symbol}`), "", symbol);
  }
  for (const password of ["Abcdef1!", "Aa1!🙂🙂🙂🙂", " A strong password 1! ", "ÅéAb1!longer"]) {
    assert.equal(getPasswordValidationMessage(password), "");
  }
});

test("password validation does not coerce malformed values to strings", () => {
  for (const password of [
    undefined, null, 12345678, true, [], ["Abcdef1!"], {},
    { password: "Abcdef1!" }, new String("Abcdef1!"),
    { length: 8, toString: () => "Abcdef1!" },
  ]) {
    const requirements = getPasswordRequirements(password);
    assert.equal(requirements.length, 5);
    assert.ok(requirements.every(({ met }) => met === false));
    assert.ok(getPasswordValidationMessage(password).includes("at least 8 characters"));
  }
});

test("validation messages explain only unmet requirements in readable language", () => {
  assert.equal(getPasswordValidationMessage("abcdef1!"),
    "Password must contain: at least one uppercase letter (A–Z).");
  assert.equal(getPasswordValidationMessage("abcdefgh"),
    "Password must contain: at least one uppercase letter (A–Z); at least one number (0–9); at least one special character (e.g., @, #, $, !, %, &).");
  assert.equal(getPasswordValidationMessage("Abcdef1!"), "");
});
