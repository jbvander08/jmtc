// src/security/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // isAuthenticated checks both user and token
  const isAuthenticated = !!user && !!token;

  // Load user and token from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("token");
    
    if (storedUser && storedToken) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setToken(storedToken);
      } catch (error) {
        console.error("Error parsing stored user data:", error);
        clearAuthData();
      }
    }
    setLoading(false);
  }, []);

  const clearAuthData = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  };

  const login = (userData, authToken) => {
    // Ensure userData includes token
    const userWithToken = {
      ...userData,
      token: authToken
    };
    
    setUser(userWithToken);
    setToken(authToken);
    localStorage.setItem("user", JSON.stringify(userWithToken));
    localStorage.setItem("token", authToken);
    
    console.log("Login successful:", {
      userID: userData.user_ID,
      tokenLength: authToken?.length,
      tokenPreview: authToken?.substring(0, 20) + '...'
    });
  };

  const logout = () => {
    console.log("Logging out user:", user?.user_ID);
    clearAuthData();
  };

  // Helper function for API calls
  const getToken = () => token;

  // Function to check token validity
  const validateToken = async () => {
    if (!token) return false;
    
    try {
      // Optional: Add token validation logic here
      // For now, we'll just return true if token exists
      return true;
    } catch {
      return false;
    }
  };

  // Function to refresh token (if implemented)
  const refreshToken = async () => {
    try {
      const response = await fetch('/.netlify/functions/refreshToken', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.token) {
          login(user, data.token);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error("Token refresh failed:", error);
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user: user ? { ...user, token: token } : null,
      token,
      isAuthenticated,
      login, 
      logout, 
      loading,
      getToken,
      validateToken,
      refreshToken
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};