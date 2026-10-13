// Keep the registration policy in sync with the backend validator.
export const getPasswordRequirements = (password) => {
  const isString = typeof password === "string";

  return [
    { id: "length", label: "At least 8 characters", met: isString && Array.from(password).length >= 8 },
    { id: "uppercase", label: "At least one uppercase letter (A–Z)", met: isString && /[A-Z]/.test(password) },
    { id: "lowercase", label: "At least one lowercase letter (a–z)", met: isString && /[a-z]/.test(password) },
    { id: "number", label: "At least one number (0–9)", met: isString && /[0-9]/.test(password) },
    {
      id: "special",
      label: "At least one special character (e.g., @, #, $, !, %, &)",
      // ASCII punctuation; spaces and accented letters do not count as special characters.
      met: isString && /[\x21-\x2f\x3a-\x40\x5b-\x60\x7b-\x7e]/.test(password),
    },
  ];
};

export const getPasswordValidationMessage = (password) => {
  const missing = getPasswordRequirements(password)
    .filter(({ met }) => !met)
    .map(({ label }) => label.charAt(0).toLowerCase() + label.slice(1));

  return missing.length ? `Password must contain: ${missing.join("; ")}.` : "";
};
