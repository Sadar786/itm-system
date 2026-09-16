export const resetOnLogout = (reducer) => (state, action) =>
  reducer(action.type === "auth/logout" ? undefined : state, action);

// Ignore request results from a session that has since logged out.
export const createSessionMiddleware = () => {
  let session = 0;
  const requests = new Map();
  return () => (next) => (action) => {
    if (action.type === "auth/logout") session += 1;
    const requestId = action.meta?.requestId;
    const status = action.meta?.requestStatus;
    if (requestId && status === "pending") requests.set(requestId, session);
    if (requestId && (status === "fulfilled" || status === "rejected")) {
      const previousSession = requests.get(requestId);
      requests.delete(requestId);
      if (previousSession !== undefined && previousSession !== session) return action;
    }
    return next(action);
  };
};
