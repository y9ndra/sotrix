let accessToken: string | null = null;

export const saveToken = (token: string): void => {
  accessToken = token;
};

export const setToken = saveToken;

export const getToken = (): string | null => {
  return accessToken;
};

export const removeToken = (): void => {
  accessToken = null;
};

export const getCurrentUserId = (): string | null => {
  const token = getToken();

  if (!token) return null;

  try {
    const payloadBase64 = token.split(".")[1];

    const decoded = JSON.parse(atob(payloadBase64));

    return decoded.id || decoded.userId || decoded._id || null;
  } catch {
    return null;
  }
};
