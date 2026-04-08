import React from 'react';

export default function Login() {
  const handleLogin = () => {
    // This points to your Vercel Serverless Function
    window.location.href = '/api/auth';
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white">
      <h1 className="text-4xl font-bold mb-8">PlaySpend Analyzer</h1>
      <button 
        onClick={handleLogin}
        className="px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-full font-semibold transition-all"
      >
        Connect Gmail
      </button>
      <p className="mt-4 text-slate-400 text-sm">We only request read-only access to Play Store receipts.</p>
    </div>
  );
}