const passwordRequirements = [
  { id: "length", label: "At least 8 characters", test: (password) => Array.from(password).length >= 8 },
  { id: "uppercase", label: "At least one uppercase letter (A–Z)", test: (password) => /[A-Z]/.test(password) },
  { id: "lowercase", label: "At least one lowercase letter (a–z)", test: (password) => /[a-z]/.test(password) },
  { id: "number", label: "At least one number (0–9)", test: (password) => /[0-9]/.test(password) },
  { id: "special", label: "At least one special character (e.g., @, #, $, !, %, &)", test: (password) => /[!-/:-@\[-`{-~]/.test(password) },
];

export const getPasswordRequirements = (password) =>
  passwordRequirements.map(({ id, label, test }) => ({
    id,
    label,
    met: typeof password === "string" && test(password),
  }));

export const getPasswordValidationMessage = (password) => {
  const missing = getPasswordRequirements(password)
    .filter(({ met }) => !met)
    .map(({ label }) => label.charAt(0).toLowerCase() + label.slice(1));

  return missing.length ? `Password must contain: ${missing.join("; ")}.` : "";
};
