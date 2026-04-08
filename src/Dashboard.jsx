import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function Dashboard({ tokens }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/transactions', { headers: { tokens: JSON.stringify(tokens) } })
      .then(res => res.json())
      .then(json => {
        if (Array.isArray(json)) setData(json);
        setLoading(false);
      });
  }, []);

  const total = data.reduce((acc, curr) => acc + curr.amount, 0);
  const avg = data.length > 0 ? (total / data.length).toFixed(2) : 0;

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-slate-400 font-mono animate-pulse">ANALYZING RECEIPTS...</p>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-6 lg:p-10 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400">Total Play Store activity detected.</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Active Account</p>
          <p className="text-blue-400 text-sm">Gmail Connected</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6">
          <p className="text-slate-400 text-sm mb-1">Total Spent</p>
          <p className="text-3xl font-mono font-bold text-white">₹{total.toLocaleString()}</p>
        </div>
        <div className="glass-card p-6 border-l-blue-500/50">
          <p className="text-slate-400 text-sm mb-1">Average Purchase</p>
          <p className="text-3xl font-mono font-bold text-white">₹{avg}</p>
        </div>
        <div className="glass-card p-6">
          <p className="text-slate-400 text-sm mb-1">Transactions</p>
          <p className="text-3xl font-mono font-bold text-white">{data.length}</p>
        </div>
      </div>

      {/* Chart Section */}
      <div className="glass-card p-8">
        <h2 className="text-lg font-semibold text-white mb-6">Spending Trend</h2>
        <div className="h-[300px] w-full">
          <ResponsiveContainer>
            <BarChart data={data}>
              <XAxis dataKey="date" hide />
              <Tooltip 
                cursor={{fill: 'rgba(255,255,255,0.05)'}}
                contentStyle={{backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #334155'}}
              />
              <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.amount > 500 ? '#ef4444' : '#3b82f6'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-slate-800">
          <h2 className="font-semibold text-white">Recent Purchases</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-950/50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="px-6 py-4">App Name</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {data.map((tx) => (
                <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 font-medium text-white">{tx.app}</td>
                  <td className="px-6 py-4 text-slate-400 text-sm">{tx.date}</td>
                  <td className="px-6 py-4 text-right font-mono text-white">₹{tx.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}