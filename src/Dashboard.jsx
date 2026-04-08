import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function Dashboard({ tokens }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/transactions', { headers: { tokens: JSON.stringify(tokens) } })
      .then(res => res.json())
      .then(json => {
        if (Array.isArray(json)) {
          // SORT DATA: Chronological order (Oldest to Newest) for the chart
          const sortedData = json.sort((a, b) => new Date(a.date) - new Date(b.date));
          setData(sortedData);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const total = data.reduce((acc, curr) => acc + curr.amount, 0);
  const avg = data.length > 0 ? (total / data.length).toFixed(2) : 0;

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-slate-400 font-mono animate-pulse">EXTRACTING 5 YEARS OF HISTORY...</p>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-6 lg:p-10 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-white">Spend Analysis</h1>
          <p className="text-slate-400">Historical Play Store activity</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Connected</p>
          <p className="text-green-400 text-sm">Gmail Sync Active</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 border-t border-white/5">
          <p className="text-slate-400 text-sm mb-1">Total Lifetime Spend</p>
          <p className="text-3xl font-mono font-bold text-white">₹{total.toLocaleString()}</p>
        </div>
        <div className="glass-card p-6 border-l-blue-500/50">
          <p className="text-slate-400 text-sm mb-1">Avg. Per App</p>
          <p className="text-3xl font-mono font-bold text-white">₹{avg}</p>
        </div>
        <div className="glass-card p-6 border-t border-white/5">
          <p className="text-slate-400 text-sm mb-1">Total Orders</p>
          <p className="text-3xl font-mono font-bold text-white">{data.length}</p>
        </div>
      </div>

      {/* Chart Section */}
      <div className="glass-card p-8">
        <h2 className="text-lg font-semibold text-white mb-6">Spending Timeline</h2>
        <div className="h-[350px] w-full">
          <ResponsiveContainer>
            <BarChart data={data}>
              {/* X-AXIS FIX: Only show the year to keep it clean */}
              <XAxis 
                dataKey="date" 
                stroke="#475569"
                fontSize={12}
                tickFormatter={(tick) => {
                    const date = new Date(tick);
                    return date.getFullYear();
                }}
                minTickGap={60} 
              />
              <YAxis stroke="#475569" fontSize={12} tickFormatter={(value) => `₹${value}`} />
              <Tooltip 
                cursor={{fill: 'rgba(255,255,255,0.05)'}}
                contentStyle={{backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #334155', color: '#fff'}}
                itemStyle={{color: '#60a5fa'}}
              />
              <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.amount > 1000 ? '#f87171' : '#3b82f6'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Activity Table */}
      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <h2 className="font-semibold text-white">All Transactions</h2>
          <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded">Showing latest {data.length}</span>
        </div>
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-950/50 text-slate-500 text-xs uppercase sticky top-0 backdrop-blur-md">
              <tr>
                <th className="px-6 py-4">Product / App Name</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {/* Reverse to show NEWEST first in the table */}
              {[...data].reverse().map((tx) => (
                <tr key={tx.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4 font-medium text-slate-200 group-hover:text-blue-400 transition-colors">
                    {tx.app}
                  </td>
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