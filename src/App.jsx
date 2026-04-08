import React, { useState, useEffect } from 'react';
import Login from './Login';
import Dashboard from './Dashboard';

export default function App() {
  const [tokens, setTokens] = useState(null);

  useEffect(() => {
    // Check if we just got redirected back from OAuth
    const params = new URLSearchParams(window.location.search);
    const tokenData = params.get('tokens');
    
    if (tokenData) {
      const parsed = JSON.parse(decodeURIComponent(tokenData));
      setTokens(parsed);
      // Clean URL
      window.history.replaceState({}, document.title, "/");
    }
  }, []);

  if (!tokens) return <Login />;
  
  return <Dashboard tokens={tokens} />;
}