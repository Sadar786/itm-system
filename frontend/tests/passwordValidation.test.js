import test from "node:test";
import assert from "node:assert/strict";
import {
  getPasswordRequirements,
  getPasswordValidationMessage,
} from "../src/utils/passwordValidation.js";
import {
  getPasswordRequirements as getServerPasswordRequirements,
  getPasswordValidationMessage as getServerPasswordValidationMessage,
} from "../../backend/src/utils/passwordValidation.js";

const requirementIds = ["length", "uppercase", "lowercase", "number", "special"];
const missingRequirements = (password) => getPasswordRequirements(password)
  .filter(({ met }) => !met)
  .map(({ id }) => id);

const invalidPasswords = [
  { password: "Aa1!aaa", missing: "length", message: "Password must contain: at least 8 characters." },
  { password: "aaaaaaa1!", missing: "uppercase", message: "Password must contain: at least one uppercase letter (A–Z)." },
  { password: "AAAAAAA1!", missing: "lowercase", message: "Password must contain: at least one lowercase letter (a–z)." },
  { password: "Aaaaaaa!", missing: "number", message: "Password must contain: at least one number (0–9)." },
  { password: "Aaaaaaa1", missing: "special", message: "Password must contain: at least one special character (e.g., @, #, $, !, %, &)." },
];

test("valid passwords satisfy every requirement at and above the eight-character boundary", () => {
  for (const password of ["Aa1!aaaa", "Password123!", "aZ9@longer password", "Aa1!".repeat(30)]) {
    assert.deepEqual(missingRequirements(password), []);
    assert.equal(getPasswordValidationMessage(password), "");
  }
});

test("the length requirement counts Unicode characters rather than UTF-16 code units", () => {
  assert.deepEqual(missingRequirements("Aa1!🙂🙂"), ["length"]);
  assert.deepEqual(missingRequirements("Aa1!🙂🙂🙂"), ["length"]);
  assert.deepEqual(missingRequirements("Aa1!🙂🙂🙂🙂"), []);
  assert.equal(getPasswordValidationMessage("Aa1!🙂🙂🙂🙂"), "");
});

for (const { password, missing, message } of invalidPasswords) {
  test(`a password missing only ${missing} identifies the unmet requirement clearly`, () => {
    assert.deepEqual(missingRequirements(password), [missing]);
    assert.equal(getPasswordValidationMessage(password), message);
  });
}

test("an empty password exposes all requirements in display order", () => {
  assert.deepEqual(getPasswordRequirements(""), [
    { id: "length", label: "At least 8 characters", met: false },
    { id: "uppercase", label: "At least one uppercase letter (A–Z)", met: false },
    { id: "lowercase", label: "At least one lowercase letter (a–z)", met: false },
    { id: "number", label: "At least one number (0–9)", met: false },
    { id: "special", label: "At least one special character (e.g., @, #, $, !, %, &)", met: false },
  ]);
  assert.equal(
    getPasswordValidationMessage(""),
    "Password must contain: at least 8 characters; at least one uppercase letter (A–Z); at least one lowercase letter (a–z); at least one number (0–9); at least one special character (e.g., @, #, $, !, %, &).",
  );
});

test("multiple unmet requirements produce one actionable message", () => {
  assert.deepEqual(missingRequirements("password"), ["uppercase", "number", "special"]);
  assert.equal(
    getPasswordValidationMessage("password"),
    "Password must contain: at least one uppercase letter (A–Z); at least one number (0–9); at least one special character (e.g., @, #, $, !, %, &).",
  );
});

test("non-string inputs are rejected without coercing objects or throwing", () => {
  const cannotCoerce = { toString() { throw new Error("Passwords must not be coerced"); } };
  for (const password of [undefined, null, 12345678, true, ["Password1!"], { password: "Password1!" }, cannotCoerce]) {
    assert.deepEqual(missingRequirements(password), requirementIds);
    assert.equal(getPasswordValidationMessage(password), getPasswordValidationMessage(""));
  }
});

test("every ASCII punctuation character can satisfy the special-character requirement", () => {
  const punctuation = "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~";
  assert.equal(punctuation.length, 32);
  for (const character of punctuation) {
    assert.deepEqual(missingRequirements(`Abcdef1${character}`), [], `Punctuation ${character} should be accepted`);
  }
});

test("whitespace, non-ASCII letters, digits, and emoji do not substitute for required character classes", () => {
  for (const character of [" ", "\t", "\n", "\r", "\u00a0", "é", "中", "١", "🙂"]) {
    assert.deepEqual(missingRequirements(`Abcdef1${character}`), ["special"]);
  }
  assert.deepEqual(missingRequirements("abcdef1É!"), ["uppercase"]);
  assert.deepEqual(missingRequirements("ABCDEF1é!"), ["lowercase"]);
  assert.deepEqual(missingRequirements("Abcdef١!"), ["number"]);
  assert.deepEqual(missingRequirements("Aa1!    "), []);
});

test("requirements update independently as a password is typed and deleted", () => {
  const steps = [
    ["", requirementIds],
    ["a", ["length", "uppercase", "number", "special"]],
    ["aA", ["length", "number", "special"]],
    ["aA1", ["length", "special"]],
    ["aA1!", ["length"]],
    ["aA1!aaaa", []],
    ["aA1!aaa", ["length"]],
  ];
  for (const [password, missing] of steps) {
    assert.deepEqual(missingRequirements(password), missing);
  }
});

test("frontend and backend agree on fixtures and every ASCII character", () => {
  const fixtures = [
    "", "password", "Aa1!aaaa", "Password123!", " Aa1!aaa ", "Aa1!🙂🙂", "Abcdefé1", "Abcdef١!",
    undefined, null, 12345678, false, ["Password1!"], { password: "Password1!" },
    ...invalidPasswords.map(({ password }) => password),
  ];
  for (let code = 0; code < 128; code += 1) {
    const character = String.fromCharCode(code);
    fixtures.push(character, `Abcdef1${character}`, `abcdef1${character}!`, `ABCDEF1${character}!`, `Abcdef${character}!`);
  }
  for (const password of fixtures) {
    assert.deepEqual(getPasswordRequirements(password), getServerPasswordRequirements(password));
    assert.equal(getPasswordValidationMessage(password), getServerPasswordValidationMessage(password));
  }
});
