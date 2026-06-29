import { createSelector } from 'reselect';
const authSelect = (state) => state.auth;

export const selectAuth = (state) => state.auth;
export const selectCurrentAdmin = createSelector([selectAuth], (auth) => {
  if (auth && auth.current) {
    return {
      ...auth.current,
      role: 'owner'
    };
  }
  return auth ? auth.current : null;
});

export const isLoggedIn = createSelector([selectAuth], (auth) => auth.isLoggedIn);
