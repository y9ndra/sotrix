const TOKEN_KEY = "token";

export const saveToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const removeToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

export const getCurrentUserId = (): string | null => {
  const token = getToken();
  if (!token) return null;
  try {
    const payloadBase64 = token.split(".")[1];
    const decoded = JSON.parse(atob(payloadBase64));
    return decoded.id || decoded.userId || decoded._id || null;
  } catch (e) {
    return null;
  }
};
