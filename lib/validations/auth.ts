const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;

export function validateUsername(username: string): string | null {
  const trimmed = username.trim();

  if (!trimmed) {
    return "Username is required.";
  }
  if (trimmed.length < 3 || trimmed.length > 20) {
    return "Username must be between 3 and 20 characters.";
  }
  if (!USERNAME_REGEX.test(trimmed)) {
    return "Username can only contain letters, numbers, and underscores.";
  }

  return null;
}

export function validateSignupPasswords(
  password: string,
  confirmPassword: string,
): string | null {
  if (!password || !confirmPassword) {
    return "Password and confirmation are required.";
  }
  if (password.length < 6) {
    return "Password must be at least 6 characters.";
  }
  if (password !== confirmPassword) {
    return "Passwords do not match.";
  }

  return null;
}
