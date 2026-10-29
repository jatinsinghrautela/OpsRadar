export const isAuthenticated = () => {
    return !!localStorage.getItem('authToken');
  };
  
  export const logout = () => {
    localStorage.removeItem('authToken');
    window.location.href = '/login';
  };