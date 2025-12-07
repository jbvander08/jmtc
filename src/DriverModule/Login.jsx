import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../security/AuthContext"; 
import axios from "axios";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [alreadyLoggedIn, setAlreadyLoggedIn] = useState(false);
  const [debugInfo, setDebugInfo] = useState(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e, force = false) => {
    e.preventDefault();
    setError("");
    setAlreadyLoggedIn(false);
    setDebugInfo(null);

    if (!username || !password) {
      setError("Please enter username and password");
      return;
    }

    try {
      setLoading(true);

      console.log("Attempting login with:", { username, force });

      // Call Netlify login function
      const res = await axios.post("/.netlify/functions/login", {
        username,
        password,
        force: force || false,
      });

      console.log("Login API response:", res.data);

      const { token, user_ID, username: resUsername, role, state, email } = res.data;

      // Debug info for troubleshooting
      const debugData = {
        user_ID,
        tokenLength: token?.length,
        tokenPreview: token?.substring(0, 30) + '...',
        role,
        timestamp: new Date().toISOString()
      };
      setDebugInfo(debugData);
      console.log("Login debug info:", debugData);

      // Prepare comprehensive user data object
      const userData = {
        user_ID,
        username: resUsername,
        role: role, // Keep original case: "Admin", "Driver", "Shop"
        email: email || null,
        state: state || 1,
        token: token // Include token in user object for TripList compatibility
      };

      // Save to AuthContext - passes both userData and token
      console.log("Calling AuthContext login with:", {
        userData,
        tokenLength: token?.length
      });
      login(userData, token);

      // Store token in localStorage for TripList fallback
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));

      // Verify storage
      console.log("Stored token in localStorage:", localStorage.getItem('token')?.substring(0, 30) + '...');
      console.log("Stored user in localStorage:", JSON.parse(localStorage.getItem('user')));

      // Short delay to ensure state is updated
      setTimeout(() => {
        // Redirect based on role - use EXACT case matching
        if (role === "Driver" || role === "driver") {
          console.log("Redirecting to driver dashboard");
          navigate("/driver", { replace: true });
        } else if (role === "Shop" || role === "shop") {
          console.log("Redirecting to shop dashboard");
          navigate("/shop", { replace: true });
        } else if (role === "Admin" || role === "admin") {
          console.log("Redirecting to admin dashboard");
          navigate("/admin", { replace: true });
        } else {
          console.warn("Unexpected role:", role);
          setError(`Unknown role: ${role}. Contact administrator.`);
        }
      }, 100);

    } catch (err) {
      console.error("Login error details:", {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message
      });
      
      // Handle "already logged in" case
      if (err.response?.status === 403 && err.response?.data?.alreadyLoggedIn) {
        setAlreadyLoggedIn(true);
        setError("User is already logged in elsewhere. Logout first or force login?");
      } else {
        const errorMsg = err.response?.data?.message || "Login failed. Please try again.";
        setError(errorMsg);
        
        // Provide more specific error messages
        if (err.response?.status === 401) {
          setError("Invalid username or password");
        } else if (err.response?.status === 404) {
          setError("Login service unavailable. Please try again later.");
        } else if (!err.response) {
          setError("Network error. Please check your connection.");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForceLogin = (e) => {
    handleLogin(e, true);
  };

  // Test function for debugging (can be called from console)
  const testAuthentication = () => {
    console.log("=== Authentication Test ===");
    console.log("LocalStorage Token:", localStorage.getItem('token')?.substring(0, 50) + '...');
    console.log("LocalStorage User:", JSON.parse(localStorage.getItem('user') || '{}'));
    console.log("Current URL:", window.location.href);
    console.log("=== End Test ===");
  };

  // Expose test function globally for debugging
  if (typeof window !== 'undefined') {
    window.testAuth = testAuthentication;
  }

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center px-4 relative"
      style={{
        backgroundImage: "url('/images/bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="absolute inset-0 bg-[#001F4D] opacity-80"></div>
      <div
        className="relative bg-[#5A6D8F]/70 pt-16 pb-20 px-24 rounded-3xl shadow-2xl w-full max-w-xl"
        style={{ boxShadow: "0 0 40px rgba(0, 0, 0, 0.4)" }}
      >
        <div className="text-center mb-1">
          <h1 className="text-5xl font-extrabold text-sky-400">JMTC</h1>
        </div>
        <div className="text-center mb-8">
          <h2 className="text-lg font-semibold text-yellow-500">Transport Services</h2>
        </div>

        {error && (
          <div className="text-center mb-4 p-3 bg-red-900/40 rounded-lg">
            <div className="text-red-300 font-semibold mb-2">{error}</div>
            {alreadyLoggedIn && (
              <button
                onClick={handleForceLogin}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors mt-2"
              >
                Force Login (Logout other session)
              </button>
            )}
          </div>
        )}

        {debugInfo && process.env.NODE_ENV === 'development' && (
          <div className="text-center mb-4 p-3 bg-blue-900/40 rounded-lg text-xs text-blue-200">
            <div className="font-mono">
              <div>User ID: {debugInfo.user_ID}</div>
              <div>Role: {debugInfo.role}</div>
              <div>Token: {debugInfo.tokenPreview}</div>
              <div>Time: {new Date(debugInfo.timestamp).toLocaleTimeString()}</div>
            </div>
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col items-center w-full">
          <div className="mb-4 w-full">
            <label htmlFor="username" className="block text-yellow-500 font-semibold mb-1">
              Username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-white/90"
              disabled={loading}
              autoComplete="username"
            />
          </div>

          <div className="mb-8 w-full">
            <label htmlFor="password" className="block text-yellow-500 font-semibold mb-1">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-white/90"
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-2/3 py-2 font-bold rounded-lg transition-colors ${
              loading
                ? "bg-gray-500 text-white cursor-not-allowed"
                : "bg-yellow-600 text-white hover:bg-yellow-500"
            }`}
          >
            {loading ? "Logging in..." : "LOGIN"}
          </button>

          {/* Debug button (visible only in development) */}
          {process.env.NODE_ENV === 'development' && (
            <button
              type="button"
              onClick={testAuthentication}
              className="mt-4 px-4 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
            >
              Debug Auth
            </button>
          )}
        </form>

        {/* Debug info at bottom */}
        <div className="mt-8 text-center text-xs text-gray-300">
          <div className="mb-2">For debugging:</div>
          <div className="font-mono space-y-1">
            <div>Open browser console (F12) and type:</div>
            <div className="bg-black/30 p-2 rounded">testAuth()</div>
            <div className="bg-black/30 p-2 rounded">localStorage.getItem('token')</div>
            <div className="bg-black/30 p-2 rounded">localStorage.getItem('user')</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

// Add global debug helper
if (typeof window !== 'undefined') {
  window.clearAuth = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    console.log("Auth data cleared");
    window.location.reload();
  };
}