const ACCESS_TOKEN_KEY = "accessToken";

export const saveAccessToken = (token: string): void => {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
};

export const saveToken = saveAccessToken;
export const setToken = saveAccessToken;

export const getAccessToken = (): string | null => {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
};

export const getToken = getAccessToken;

export const removeAccessToken = (): void => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
};

export const removeToken = removeAccessToken;

export const getCurrentUserId = (): string | null => {
  const token = getAccessToken();

  if (!token) return null;

  try {
    const payloadBase64 = token.split(".")[1];

    const decoded = JSON.parse(atob(payloadBase64));

    return decoded.id || decoded.userId || decoded._id || null;
  } catch {
    return null;
  }
};

