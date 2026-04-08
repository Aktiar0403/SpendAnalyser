import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { db } from './firebase';
import { doc, setDoc } from 'firebase/firestore';

export default function Dashboard({ tokens }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

// src/Dashboard.jsx

// Change your fetch logic to this:
useEffect(() => {
  fetch('/api/transactions', { headers: { tokens: JSON.stringify(tokens) } })
    .then(res => res.json())
    .then(json => {
      // Check if json is actually an array before setting state
      if (Array.isArray(json)) {
        setData(json);
        json.forEach(tx => {
          setDoc(doc(db, "transactions", tx.id), tx, { merge: true });
        });
      } else {
        console.error("Backend error:", json.error);
        setData([]); // Set empty array so .reduce() doesn't fail
      }
      setLoading(false);
    })
    .catch(err => {
      console.error("Fetch failed:", err);
      setData([]);
      setLoading(false);
    });
}, []);

// Ensure total is calculated safely
const total = Array.isArray(data) ? data.reduce((acc, curr) => acc + curr.amount, 0) : 0;

  if (loading) return <div className="p-10 text-white">Analyzing Receipts...</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <h1 className="text-3xl font-bold mb-8">Spend Insights</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
          <p className="text-slate-400 text-sm">Total Lifetime Spend</p>
          <p className="text-4xl font-mono text-green-400">₹{total.toFixed(2)}</p>
        </div>
      </div>

      <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 h-80">
        <h2 className="mb-4 font-semibold">Spending History</h2>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="date" stroke="#64748b" />
            <YAxis stroke="#64748b" />
            <Tooltip contentStyle={{backgroundColor: '#0f172a', border: 'none'}} />
            <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}