import React from 'react';

export default function Login() {
  const handleLogin = () => {
    window.location.href = '/api/auth';
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-6">
      <div className="glass-card p-10 max-w-md w-full text-center shadow-2xl border-t-blue-500/20">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 rotate-3 shadow-lg shadow-blue-500/20">
          <span className="text-3xl font-bold text-white">₹</span>
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">
          PlaySpend
        </h1>
        <p className="text-slate-400 mb-8">
          Analyze your Google Play spending habits with one click.
        </p>
        <button 
          onClick={handleLogin}
          className="w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-blue-50 transition-all active:scale-95 flex items-center justify-center gap-3 shadow-xl"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="google" />
          Continue with Google
        </button>
        <p className="mt-6 text-xs text-slate-500 uppercase tracking-widest">
          Secure • Read-only • Encrypted
        </p>
      </div>
    </div>
  );
}