import test, { mock } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import nodemailer from "nodemailer";
import User from "../src/models/User.js";
import EmailVerification from "../src/models/EmailVerification.js";
import { getPasswordValidationMessage } from "../src/utils/passwordValidation.js";

// Capture the transport before importing the app so these tests cannot send email.
const emailTransport = { sendMail: async () => { throw new Error("Unexpected email"); } };
const createTransport = mock.method(nodemailer, "createTransport", () => emailTransport);
const { default: app } = await import("../src/app.js");
const { signupUser, requestSignupOtp, verifySignupOtp } = await import("../src/controllers/authController.js");
createTransport.mock.restore();

async function invoke(handler, body) {
  const response = {};
  await handler({ body }, {
    status(value) { response.status = value; return this; },
    json(value) { response.body = value; return this; },
  });
  return response;
}

async function startApi(t) {
  const server = app.listen(0, "127.0.0.1");
  t.after(() => new Promise((resolve, reject) => server.close((error) =>
    error ? reject(error) : resolve())));
  await once(server, "listening");
  return async (path, body) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/auth${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() };
  };
}

function useTestTokenSecret(t) {
  const previous = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "auth-password-test-secret";
  t.after(() => {
    if (previous === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previous;
  });
}

test("both signup endpoints reject weak or malformed passwords before database access or email", async (t) => {
  const unexpected = async () => { throw new Error("Invalid password reached a side effect"); };
  const effects = [
    t.mock.method(User, "findOne", unexpected),
    t.mock.method(User, "create", unexpected),
    t.mock.method(EmailVerification, "deleteMany", unexpected),
    t.mock.method(EmailVerification, "create", unexpected),
    t.mock.method(emailTransport, "sendMail", unexpected),
  ];
  const request = await startApi(t);
  for (const path of ["/signup", "/signup/request-otp"]) {
    for (const password of [
      "Abcde1!", "Aa1!🙂🙂", "Aa1!🙂🙂🙂", "abcdef1!", "ABCDEF1!", "Abcdefg!", "Abcdefg1", "Abcdef1 ",
      "Abcdef1é", "", undefined, null, 12345678, true, [], ["Abcdef1!"],
      { password: "Abcdef1!" },
    ]) {
      const response = await request(path, { name: "Shop Keeper", email: "keeper@example.com", password });
      assert.equal(response.status, 400, `${path}: ${JSON.stringify(password)}`);
      assert.deepEqual(response.body, { success: false, message: getPasswordValidationMessage(password) });
    }
  }
  for (const handler of [signupUser, requestSignupOtp]) {
    for (const body of [undefined, null, {}]) {
      const response = await invoke(handler, body);
      assert.equal(response.status, 400);
      assert.equal(response.body.success, false);
    }
  }
  for (const effect of effects) assert.equal(effect.mock.callCount(), 0);
});

test("a previously issued signup OTP cannot create an account with a weak pending password", async (t) => {
  const pending = {
    _id: new mongoose.Types.ObjectId(), name: "Shop Keeper", email: "keeper@example.com",
    password: "legacy1", otp: "1234", expiresAt: new Date(Date.now() + 60000),
  };
  t.mock.method(EmailVerification, "findOne", async () => pending);
  const findUser = t.mock.method(User, "findOne", async () => null);
  const createUser = t.mock.method(User, "create", async () => { throw new Error("Weak signup accepted"); });
  const deleteOtp = t.mock.method(EmailVerification, "deleteOne", async () => ({}));
  const response = await invoke(verifySignupOtp, { email: pending.email, otp: pending.otp });
  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
  assert.ok(response.body.message.startsWith(getPasswordValidationMessage(pending.password)));
  assert.match(response.body.message, /start registration again/i);
  assert.equal(findUser.mock.callCount(), 0);
  assert.equal(createUser.mock.callCount(), 0);
  assert.equal(deleteOtp.mock.callCount(), 0);

  const wrongOtp = await invoke(verifySignupOtp, { email: pending.email, otp: "9999" });
  assert.equal(wrongOtp.status, 400);
  assert.equal(wrongOtp.body.message, "Invalid verification code.");
});

test("strong passwords complete direct and OTP signup, remain hashed, and can log in", async (t) => {
  useTestTokenSecret(t);
  const users = new Map();
  // Keep the real Mongoose schema, password hashing hooks, and matchPassword method.
  t.mock.method(User.collection, "findOne", async ({ email }) => users.get(email) || null);
  t.mock.method(User.collection, "insertOne", async (document) => {
    users.set(document.email, { ...document });
    return { acknowledged: true, insertedId: document._id };
  });
  const updateUser = t.mock.method(User.collection, "updateOne", async ({ _id }, update) => {
    const document = [...users.values()].find((user) => user._id.equals(_id));
    Object.assign(document, update.$set);
    return { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
  });
  const pending = new Map();
  t.mock.method(EmailVerification, "deleteMany", async ({ email }) => { pending.delete(email); });
  t.mock.method(EmailVerification, "create", async (document) => {
    pending.set(document.email, { ...document, _id: new mongoose.Types.ObjectId() });
  });
  t.mock.method(EmailVerification, "findOne", async ({ email }) => pending.get(email) || null);
  const deleteOtp = t.mock.method(EmailVerification, "deleteOne", async ({ _id }) => {
    for (const [email, document] of pending) if (document._id.equals(_id)) pending.delete(email);
  });
  const sendMail = t.mock.method(emailTransport, "sendMail", async () => ({}));
  const request = await startApi(t);
  const password = "Abcdef1!";

  for (const flow of ["direct", "otp"]) {
    const email = `${flow}@example.com`;
    let response;
    if (flow === "direct") {
      response = await request("/signup", { name: "Shop Keeper", email, password });
    } else {
      const requested = await request("/signup/request-otp", { name: " Shop Keeper ", email: " OTP@EXAMPLE.COM ", password });
      assert.equal(requested.status, 200, JSON.stringify(requested.body));
      assert.equal(requested.body.success, true);
      assert.equal(users.has(email), false);
      assert.equal(sendMail.mock.callCount(), 1);
      assert.equal(sendMail.mock.calls[0].arguments[0].to, email);
      assert.equal(pending.get(email).password, password);
      response = await request("/signup/verify-otp", { email, otp: pending.get(email).otp });
      assert.equal(pending.has(email), false);
    }
    assert.equal(response.status, 201, JSON.stringify(response.body));
    assert.equal(response.body.success, true);
    assert.equal(response.body.user.role, "shop_keeper");
    assert.equal(response.body.user.name, "Shop Keeper");
    assert.equal(response.body.user.password, undefined);
    assert.equal(jwt.verify(response.body.token, process.env.JWT_SECRET).id, response.body.user.id);
    const storedHash = users.get(email).password;
    assert.notEqual(storedHash, password);
    assert.equal(await bcrypt.compare(password, storedHash), true);

    const loggedIn = await request("/login", { email: ` ${email.toUpperCase()} `, password });
    assert.equal(loggedIn.status, 200, JSON.stringify(loggedIn.body));
    assert.equal(loggedIn.body.success, true);
    assert.equal(loggedIn.body.user.id, response.body.user.id);
    assert.equal(users.get(email).password, storedHash);
    assert.ok(users.get(email).lastLoginAt instanceof Date);
  }
  assert.equal(deleteOtp.mock.callCount(), 1);
  assert.equal(updateUser.mock.callCount(), 2);
});

test("existing accounts can still log in with legacy passwords and incorrect passwords remain rejected", async (t) => {
  useTestTokenSecret(t);
  const legacyPassword = "old123";
  const document = {
    _id: new mongoose.Types.ObjectId(), name: "Existing User", email: "legacy@example.com",
    role: "shop_keeper", isActive: true, password: await bcrypt.hash(legacyPassword, 10),
  };
  const originalHash = document.password;
  t.mock.method(User.collection, "findOne", async () => ({ ...document }));
  const updateUser = t.mock.method(User.collection, "updateOne", async (filter, update) => {
    Object.assign(document, update.$set);
    return { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
  });
  const request = await startApi(t);
  const response = await request("/login", { email: document.email, password: legacyPassword });
  assert.equal(response.status, 200, JSON.stringify(response.body));
  assert.equal(response.body.success, true);
  assert.equal(document.password, originalHash);
  assert.ok(document.lastLoginAt instanceof Date);
  assert.equal(updateUser.mock.callCount(), 1);

  const wrongPassword = await request("/login", { email: document.email, password: "WrongPassword1!" });
  assert.equal(wrongPassword.status, 401);
  assert.equal(wrongPassword.body.message, "Invalid email or password");
  assert.equal(updateUser.mock.callCount(), 1);
});
