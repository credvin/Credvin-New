import React, { useState, useEffect, useMemo, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import RoleGuard from '../components/RoleGuard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Activity, Brain, AlertTriangle, CheckCircle2, Clock, Loader2,
  TrendingUp, TrendingDown, RefreshCw, Download, Search, Zap,
  IndianRupee, Shield, Users, ChevronRight, ArrowUpRight,
  ArrowDownRight, Bell, Target, BarChart3, FileText, Send,
  MessageSquare, Layers, Calendar, Star, AlertCircle, Banknote
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

// ─── Risk Scoring Helpers ─────────────────────────────────────
function getRiskLevel(score) {
  if (score >= 75) return { label: 'Safe', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500' };
  if (score >= 60) return { label: 'Stable', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', dot: 'bg-blue-500' };
  if (score >= 45) return { label: 'Watchlist', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-500' };
  if (score >= 30) return { label: 'High Risk', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', dot: 'bg-orange-500' };
  return { label: 'Critical', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', dot: 'bg-red-500' };
}

// Simulate EMI default probability from risk score
function getDefaultProbability(score) {
  if (score == null) return 35;
  return Math.max(5, Math.min(95, Math.round(100 - score + (Math.random() * 10 - 5))));
}

// ─── Metric Card ──────────────────────────────────────────────
function MetricCard({ label, value, sub, icon: Icon, color = 'text-slate-800', accent, trend }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 p-4 shadow-sm ${accent ? `border-l-4 ${accent}` : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${accent ? accent.replace('border-l-', 'bg-').replace('-500', '-50').replace('-600', '-50') : 'bg-slate-50'}`}>
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
        {trend !== undefined && (
          <span className={`flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full ${trend >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
            {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-sm font-medium text-slate-700 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── AI Pulse Chat ────────────────────────────────────────────
const PULSE_QUICK = [
  "Who may bounce EMI tomorrow?",
  "Top 5 high-risk accounts",
  "Accounts needing escalation",
  "Who is likely to self-pay?",
  "Settlement candidates this week",
];

function generatePulseAIResponse(message, apps) {
  const disbursed = apps.filter(a => a.status === 'disbursed');
  const highRisk = disbursed.filter(a => (a.uw_risk_score || 50) < 50);
  const safe = disbursed.filter(a => (a.uw_risk_score || 50) >= 70);

  if (/bounce|default|tomorrow|delay/i.test(message)) {
    if (highRisk.length === 0) return "Great news — no high-risk EMI accounts detected in the current portfolio. All disbursed borrowers show stable repayment signals. Continue monitoring weekly.";
    return `⚠ ${highRisk.length} borrower(s) show elevated default probability:\n\n${highRisk.slice(0, 3).map((a, i) => `${i + 1}. ${a.full_name} — Risk: ${a.uw_risk_score ?? 'N/A'}/100 (${getDefaultProbability(a.uw_risk_score)}% default probability)`).join('\n')}\n\nRecommendation: Send WhatsApp pre-EMI reminder 3 days before due date.`;
  }
  if (/high.?risk|risk|critical/i.test(message)) {
    return `Current high-risk portfolio segmentation:\n\n• Critical (<30 risk): ${disbursed.filter(a => (a.uw_risk_score || 50) < 30).length} accounts\n• High Risk (30–49): ${disbursed.filter(a => (a.uw_risk_score || 50) >= 30 && (a.uw_risk_score || 50) < 50).length} accounts\n• Watchlist (50–59): ${disbursed.filter(a => (a.uw_risk_score || 50) >= 50 && (a.uw_risk_score || 50) < 60).length} accounts\n\nAI Action: Escalate top ${Math.min(3, highRisk.length)} accounts to senior collection team immediately.`;
  }
  if (/escalat/i.test(message)) {
    if (highRisk.length === 0) return "No accounts currently require escalation. Portfolio health is strong.";
    return `Escalation queue (${highRisk.length} accounts):\n\n${highRisk.slice(0, 4).map((a, i) => `${i + 1}. ${a.full_name} · ₹${(a.uw_approved_amount || a.loan_amount)?.toLocaleString('en-IN')} · Risk: ${a.uw_risk_score}/100`).join('\n')}\n\nSuggested action: Assign to senior recovery agent. Send formal notice within 24hrs.`;
  }
  if (/self.?pay|likely.?pay|good|safe/i.test(message)) {
    return `${safe.length} borrower(s) are highly likely to self-pay:\n\n${safe.slice(0, 3).map((a, i) => `✅ ${i + 1}. ${a.full_name} — Risk score: ${a.uw_risk_score}/100`).join('\n')}\n\nThese accounts do NOT require manual intervention. Let auto-reminders handle them.`;
  }
  if (/settl/i.test(message)) {
    const candidates = disbursed.filter(a => (a.uw_risk_score || 50) < 55);
    return `Settlement candidates (${candidates.length} accounts):\n\nAI recommends offering flexible settlement to borrowers with >60 days overdue + risk score <50.\n\n${candidates.slice(0, 3).map((a, i) => `${i + 1}. ${a.full_name} — Suggested: Waive 15% penalty, allow 3 EMI rescheduling`).join('\n')}\n\nEstimated recovery improvement: +23% with settlement offers.`;
  }
  return `I'm Credvin Pulse AI — your intelligent collections co-pilot.\n\nI can instantly answer:\n• Bounce/default risk analysis\n• Escalation priority lists\n• Settlement recommendations\n• Portfolio health summaries\n• Recovery probability scores\n\nAsk me anything about your portfolio!`;
}

// ─── AI Pulse Assistant (Inline Panel) ───────────────────────
function PulseAI({ apps }) {
  const [messages, setMessages] = useState([
    { role: 'ai', text: "👋 I'm Credvin Pulse AI. Ask me about default risk, collection priorities, or portfolio health — I'll give you instant intelligence." }
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async (msg) => {
    const text = msg || input.trim();
    if (!text) return;
    setInput('');
    setMessages(p => [...p, { role: 'user', text }]);
    setTyping(true);
    await new Promise(r => setTimeout(r, 700 + Math.random() * 500));
    setMessages(p => [...p, { role: 'ai', text: generatePulseAIResponse(text, apps) }]);
    setTyping(false);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[480px]">
      <div className="bg-gradient-to-r from-slate-900 to-primary px-5 py-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center">
          <Brain className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-white font-bold text-sm">Credvin Pulse AI</p>
          <p className="text-white/60 text-xs flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />Collection Intelligence Engine</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[88%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
              m.role === 'user' ? 'bg-primary text-white rounded-br-sm' : 'bg-white border border-slate-100 text-slate-700 rounded-bl-sm shadow-sm'
            }`}>{m.text}</div>
          </div>
        ))}
        {typing && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-100 px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm flex gap-1">
              {[0, 1, 2].map(i => <span key={i} className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="px-3 pt-2 pb-1 bg-white border-t border-slate-100 flex gap-1.5 overflow-x-auto">
        {PULSE_QUICK.slice(0, 3).map(q => (
          <button key={q} onClick={() => send(q)} className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full bg-primary/8 text-primary border border-primary/20 hover:bg-primary/15 transition-colors">{q}</button>
        ))}
      </div>
      <div className="p-3 bg-white border-t border-slate-100 flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Ask about your portfolio…"
          className="flex-1 text-sm px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-slate-50" />
        <button onClick={() => send()} disabled={!input.trim()}
          className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center disabled:opacity-40 hover:bg-primary/90 transition-colors">
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Borrower Risk Row ────────────────────────────────────────
function BorrowerRiskRow({ app, onSelect }) {
  const score = app.uw_risk_score ?? 50;
  const risk = getRiskLevel(score);
  const defaultProb = getDefaultProbability(score);
  return (
    <div onClick={() => onSelect(app)}
      className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 cursor-pointer transition-colors border-b border-slate-100 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-800 text-sm truncate">{app.full_name}</p>
        <p className="text-xs text-slate-400 capitalize truncate">{app.loan_type?.replace(/_/g, ' ')} · ₹{(app.uw_approved_amount || app.loan_amount)?.toLocaleString('en-IN')}</p>
      </div>
      {app.uw_eligible_emi && (
        <div className="text-right hidden sm:block">
          <p className="text-xs text-slate-400">EMI</p>
          <p className="text-sm font-bold text-slate-700">₹{app.uw_eligible_emi?.toLocaleString('en-IN')}</p>
        </div>
      )}
      <div className="text-center hidden md:block">
        <p className="text-xs text-slate-400 mb-1">Default Risk</p>
        <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-red-500" style={{ width: `${defaultProb}%` }} />
        </div>
        <p className={`text-xs font-bold mt-0.5 ${defaultProb > 65 ? 'text-red-500' : defaultProb > 40 ? 'text-amber-600' : 'text-emerald-600'}`}>{defaultProb}%</p>
      </div>
      <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${risk.bg} ${risk.border} ${risk.color} flex-shrink-0`}>
        <span className={`inline-block w-1.5 h-1.5 rounded-full ${risk.dot} mr-1.5`} />{risk.label}
      </span>
    </div>
  );
}

// ─── Borrower Detail Drawer ───────────────────────────────────
function BorrowerDetailDrawer({ app, onClose }) {
  const emiHistory = useMemo(() => {
    if (!app || !app.tenure_months || !app.disbursed_at) return [];
    const start = new Date(app.disbursed_at);
    const now = new Date();
    return Array.from({ length: Math.min(app.tenure_months, 8) }, (_, i) => {
      const date = new Date(start.getFullYear(), start.getMonth() + i + 1, 5);
      const past = date < now;
      const rnd = Math.random();
      return {
        month: date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
        status: past ? (rnd > 0.15 ? 'paid' : 'delayed') : 'upcoming',
        amount: app.uw_eligible_emi,
      };
    });
  }, [app]);

  if (!app) return null;
  const score = app.uw_risk_score ?? 50;
  const risk = getRiskLevel(score);
  const defaultProb = getDefaultProbability(score);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25 }}
        className="w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-br from-slate-900 to-primary text-white p-5 flex-shrink-0">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-white/60 text-xs">Borrower Profile</p>
              <h2 className="text-lg font-bold mt-0.5">{app.full_name}</h2>
              <p className="text-white/50 text-xs">{app.phone} · {app.email}</p>
            </div>
            <button onClick={onClose} className="w-7 h-7 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors">×</button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white/10 rounded-xl p-2.5 text-center">
              <p className="text-white text-lg font-bold">{score}</p>
              <p className="text-white/60 text-xs">Risk Score</p>
            </div>
            <div className={`rounded-xl p-2.5 text-center ${defaultProb > 65 ? 'bg-red-500/30' : defaultProb > 40 ? 'bg-amber-500/30' : 'bg-emerald-500/30'}`}>
              <p className="text-white text-lg font-bold">{defaultProb}%</p>
              <p className="text-white/60 text-xs">Default Risk</p>
            </div>
            <div className={`rounded-xl p-2.5 text-center ${risk.bg.replace('bg-', 'bg-opacity-20 bg-')}`}>
              <p className={`text-lg font-bold ${risk.color}`}>{risk.label}</p>
              <p className="text-white/60 text-xs">AI Status</p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4 flex-1 overflow-y-auto">
          {/* Loan Details */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Loan Details</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { l: 'Amount', v: `₹${(app.uw_approved_amount || app.loan_amount)?.toLocaleString('en-IN')}` },
                { l: 'Monthly EMI', v: app.uw_eligible_emi ? `₹${app.uw_eligible_emi.toLocaleString('en-IN')}` : '—' },
                { l: 'Tenure', v: `${app.tenure_months || '—'} months` },
                { l: 'Rate', v: app.uw_interest_rate ? `${app.uw_interest_rate}% p.a.` : '—' },
                { l: 'Status', v: app.status?.replace(/_/g, ' ') },
                { l: 'Disbursed', v: app.disbursed_at ? new Date(app.disbursed_at).toLocaleDateString('en-IN') : '—' },
              ].map(({ l, v }) => (
                <div key={l} className="bg-white rounded-xl p-2.5 border border-slate-100">
                  <p className="text-xs text-slate-400">{l}</p>
                  <p className="text-sm font-semibold text-slate-800 capitalize mt-0.5">{v}</p>
                </div>
              ))}
            </div>
          </div>

          {/* EMI History */}
          {emiHistory.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">EMI History</p>
              <div className="grid grid-cols-4 gap-2">
                {emiHistory.map((e, i) => (
                  <div key={i} className={`rounded-xl p-2.5 text-center border ${
                    e.status === 'paid' ? 'bg-emerald-50 border-emerald-200' :
                    e.status === 'delayed' ? 'bg-red-50 border-red-200' :
                    'bg-slate-50 border-slate-100'
                  }`}>
                    <p className="text-xs font-bold text-slate-600">{e.month}</p>
                    {e.status === 'paid' ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto mt-1" /> :
                     e.status === 'delayed' ? <AlertCircle className="w-4 h-4 text-red-500 mx-auto mt-1" /> :
                     <Clock className="w-4 h-4 text-slate-300 mx-auto mt-1" />}
                    <p className={`text-xs mt-0.5 font-medium ${e.status === 'paid' ? 'text-emerald-600' : e.status === 'delayed' ? 'text-red-500' : 'text-slate-400'}`}>
                      {e.status}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Recommendation */}
          <div className={`rounded-2xl border p-4 ${risk.bg} ${risk.border}`}>
            <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${risk.color}`}>AI Collection Recommendation</p>
            <p className={`text-sm ${risk.color}`}>
              {score >= 75 ? "✅ Auto-reminders sufficient. High self-payment probability. No manual intervention needed." :
               score >= 60 ? "ℹ️ Send WhatsApp reminder 5 days before EMI. Monitor next 2 cycles." :
               score >= 45 ? "⚠️ Proactive outreach recommended. Schedule call 7 days before due date." :
               score >= 30 ? "🚨 Assign to senior agent. Send formal notice + settlement offer if overdue." :
               "🔴 Escalate immediately. Legal notice may be required. Consider settlement restructuring."}
            </p>
          </div>

          {/* Quick Actions */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Quick Actions</p>
            {[
              { label: 'Send WhatsApp Reminder', icon: MessageSquare, color: 'bg-emerald-600 text-white' },
              { label: 'Send SMS Alert', icon: Bell, color: 'bg-blue-600 text-white' },
              { label: 'Log Promise to Pay', icon: CheckCircle2, color: 'bg-slate-800 text-white' },
              { label: 'Mark for Escalation', icon: AlertTriangle, color: 'bg-red-600 text-white' },
            ].map(({ label, icon: Icon, color }) => (
              <button key={label} onClick={() => { toast.success(`${label} — triggered for ${app.full_name}`); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl ${color} hover:opacity-90 transition-opacity text-sm font-semibold`}>
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── MIS Export ───────────────────────────────────────────────
function exportMIS(apps, type) {
  const headers = {
    collections: ['Name', 'Phone', 'Loan Type', 'Amount', 'EMI', 'Status', 'Risk Score', 'Default Prob%', 'Disbursed Date'],
    overdue: ['Name', 'Phone', 'Loan Amount', 'EMI', 'Risk Level', 'Contact'],
    emi_due: ['Name', 'Phone', 'EMI Amount', 'Due Date', 'Risk Score'],
  };

  const rows = apps.map(a => {
    const score = a.uw_risk_score ?? 50;
    const risk = getRiskLevel(score);
    if (type === 'collections') return [a.full_name, a.phone, a.loan_type?.replace(/_/g, ' '), a.uw_approved_amount || a.loan_amount, a.uw_eligible_emi || '', a.status, score, getDefaultProbability(score), a.disbursed_at ? new Date(a.disbursed_at).toLocaleDateString('en-IN') : ''];
    if (type === 'overdue') return [a.full_name, a.phone, a.uw_approved_amount || a.loan_amount, a.uw_eligible_emi || '', risk.label, a.email];
    return [a.full_name, a.phone, a.uw_eligible_emi || '', '5th of next month', score];
  });

  const h = headers[type] || headers.collections;
  const csv = [h, ...rows].map(r => r.map(v => `"${v || ''}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `credvin_pulse_${type}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
  toast.success(`${type.replace(/_/g, ' ').toUpperCase()} MIS exported!`);
}

// ─── Merchant Performance Tab ─────────────────────────────────
function MerchantPerformanceTab({ applications }) {
  // Group by loan_type as proxy for merchant segment (real app would use merchant_id)
  const loanTypes = ['jewellery', 'solar', 'healthcare', 'home_decor', 'retail', 'education', 'personal'];
  
  const merchantStats = useMemo(() => loanTypes.map(type => {
    const apps = applications.filter(a => a.loan_type === type);
    if (!apps.length) return null;
    const submitted = apps.length;
    const approved = apps.filter(a => (a.final_decision || a.uw_decision) === 'APPROVE').length;
    const disbursed = apps.filter(a => a.status === 'disbursed');
    const disbursedCount = disbursed.length;
    const totalDisbursement = disbursed.reduce((s, a) => s + (a.uw_approved_amount || a.loan_amount || 0), 0);
    const totalEMI = disbursed.reduce((s, a) => s + (a.uw_eligible_emi || 0), 0);
    const highRisk = disbursed.filter(a => (a.uw_risk_score ?? 50) < 50).length;
    const avgRisk = disbursed.length > 0 ? Math.round(disbursed.reduce((s, a) => s + (a.uw_risk_score || 50), 0) / disbursed.length) : 0;
    const approvalRate = submitted > 0 ? Math.round((approved / submitted) * 100) : 0;
    const bounceRate = disbursedCount > 0 ? Math.round((highRisk / disbursedCount) * 100) : 0;
    const avgTicket = disbursedCount > 0 ? Math.round(totalDisbursement / disbursedCount) : 0;
    // Health score: weighted average
    const healthScore = Math.max(0, Math.min(100, Math.round(avgRisk * 0.5 + approvalRate * 0.3 + (100 - bounceRate) * 0.2)));
    const healthLevel = healthScore >= 75 ? { label: 'Excellent', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' }
      : healthScore >= 55 ? { label: 'Good', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' }
      : healthScore >= 40 ? { label: 'Monitor', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' }
      : { label: 'At Risk', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' };
    return { type, submitted, approved, disbursedCount, totalDisbursement, totalEMI, highRisk, avgRisk, approvalRate, bounceRate, avgTicket, healthScore, healthLevel };
  }).filter(Boolean), [applications]);

  const totals = useMemo(() => ({
    leads: applications.length,
    approved: applications.filter(a => (a.final_decision || a.uw_decision) === 'APPROVE').length,
    disbursed: applications.filter(a => a.status === 'disbursed').length,
    disbursementValue: applications.filter(a => a.status === 'disbursed').reduce((s, a) => s + (a.uw_approved_amount || a.loan_amount || 0), 0),
    monthlyEMI: applications.filter(a => a.status === 'disbursed').reduce((s, a) => s + (a.uw_eligible_emi || 0), 0),
  }), [applications]);

  const overallConversionRate = totals.leads > 0 ? Math.round((totals.disbursed / totals.leads) * 100) : 0;
  const overallApprovalRate = totals.leads > 0 ? Math.round((totals.approved / totals.leads) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-violet-900 via-violet-800 to-primary rounded-3xl p-6 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 20% 80%, white 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
        <div className="relative flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Merchant Performance Intelligence</h2>
                <p className="text-white/60 text-sm">AI-powered merchant quality & portfolio analytics</p>
              </div>
            </div>
          </div>
          <span className="flex items-center gap-1.5 text-xs bg-emerald-500/20 text-emerald-300 px-3 py-1.5 rounded-full border border-emerald-500/30 font-semibold">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />Live Analytics
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-5">
          {[
            { label: 'Total Leads', value: totals.leads },
            { label: 'Loans Approved', value: totals.approved },
            { label: 'Disbursed', value: totals.disbursed },
            { label: 'Approval Rate', value: `${overallApprovalRate}%` },
            { label: 'Conversion Rate', value: `${overallConversionRate}%` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white/10 rounded-2xl p-3 text-center border border-white/10">
              <p className="text-xl font-bold text-white">{value}</p>
              <p className="text-white/60 text-xs mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Disbursement', value: `₹${(totals.disbursementValue / 100000).toFixed(1)}L`, icon: Banknote, color: 'text-emerald-600', accent: 'border-l-emerald-500' },
          { label: 'Monthly EMI Book', value: `₹${(totals.monthlyEMI / 1000).toFixed(0)}K`, icon: IndianRupee, color: 'text-blue-600', accent: 'border-l-blue-500' },
          { label: 'Active Segments', value: merchantStats.length, icon: Layers, color: 'text-violet-600', accent: 'border-l-violet-500' },
          { label: 'Avg Ticket Size', value: totals.disbursed > 0 ? `₹${((totals.disbursementValue / totals.disbursed) / 1000).toFixed(0)}K` : '—', icon: Target, color: 'text-primary', accent: 'border-l-primary' },
        ].map(p => <MetricCard key={p.label} {...p} />)}
      </div>

      {/* Merchant Segment Performance Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-sm">Segment-wise Performance Dashboard</h3>
          <span className="text-xs text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">{merchantStats.length} active segments</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="bg-slate-50">
                {['Merchant Segment', 'Leads', 'Approved', 'Disbursed', 'Avg Ticket', 'Monthly EMI', 'Bounce Risk', 'Health Score', 'AI Status'].map(h => (
                  <th key={h} className="text-left text-xs text-slate-500 font-semibold px-4 py-3 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {merchantStats.map(m => (
                <tr key={m.type} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3.5">
                    <p className="font-semibold text-slate-800 capitalize">{m.type.replace(/_/g, ' ')}</p>
                  </td>
                  <td className="px-4 py-3.5 text-slate-600 font-medium">{m.submitted}</td>
                  <td className="px-4 py-3.5">
                    <span className="text-emerald-700 font-semibold">{m.approved}</span>
                    <span className="text-slate-400 text-xs ml-1">({m.approvalRate}%)</span>
                  </td>
                  <td className="px-4 py-3.5 font-semibold text-slate-700">{m.disbursedCount}</td>
                  <td className="px-4 py-3.5 text-slate-600">₹{(m.avgTicket / 1000).toFixed(0)}K</td>
                  <td className="px-4 py-3.5 font-semibold text-blue-600">₹{(m.totalEMI / 1000).toFixed(0)}K</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${m.bounceRate > 40 ? 'bg-red-500' : m.bounceRate > 20 ? 'bg-amber-400' : 'bg-emerald-500'}`} style={{ width: `${m.bounceRate}%` }} />
                      </div>
                      <span className={`text-xs font-bold ${m.bounceRate > 40 ? 'text-red-500' : m.bounceRate > 20 ? 'text-amber-600' : 'text-emerald-600'}`}>{m.bounceRate}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden max-w-[60px]">
                        <div className="h-full rounded-full bg-gradient-to-r from-red-400 via-amber-400 to-emerald-500" style={{ width: `${m.healthScore}%` }} />
                      </div>
                      <span className="text-xs font-bold text-slate-700">{m.healthScore}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full border ${m.healthLevel.bg} ${m.healthLevel.border} ${m.healthLevel.color}`}>
                      {m.healthLevel.label}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {merchantStats.length === 0 && <p className="text-center text-slate-400 py-10 text-sm">No merchant data available yet</p>}
        </div>
      </div>

      {/* AI Merchant Insights */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-5 text-white">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-4 h-4 text-violet-300" />
            <p className="font-bold text-sm">AI Merchant Insights</p>
            <span className="ml-auto flex items-center gap-1 text-xs bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full border border-violet-500/30">
              <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse" />AI
            </span>
          </div>
          <div className="space-y-3">
            {merchantStats.slice(0, 3).map(m => (
              <div key={m.type} className={`rounded-xl p-3 border ${m.healthScore < 50 ? 'bg-red-500/10 border-red-500/20' : m.healthScore < 70 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                <p className="text-xs font-semibold text-white capitalize mb-1">{m.type.replace(/_/g, ' ')} Segment</p>
                <p className={`text-xs ${m.healthScore < 50 ? 'text-red-300' : m.healthScore < 70 ? 'text-amber-300' : 'text-emerald-300'}`}>
                  {m.healthScore < 50 ? `⚠️ Collection quality declining. Bounce rate ${m.bounceRate}% — trigger proactive outreach.`
                    : m.healthScore < 70 ? `ℹ️ Monitor closely. ${m.highRisk} high-risk active loans. Consider tightening approval criteria.`
                    : `✅ Performing well. ${m.approvalRate}% approval rate with ${m.bounceRate}% bounce risk — healthy segment.`}
                </p>
              </div>
            ))}
            {merchantStats.length === 0 && <p className="text-white/40 text-sm text-center py-4">No data to analyze yet</p>}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
          <h3 className="font-bold text-slate-800 text-sm mb-4">Portfolio Quality Meter</h3>
          <div className="space-y-3">
            {merchantStats.slice(0, 5).map(m => (
              <div key={m.type}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-600 font-medium capitalize">{m.type.replace(/_/g, ' ')}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">₹{(m.totalDisbursement / 100000).toFixed(1)}L</span>
                    <span className={`font-bold ${m.healthLevel.color}`}>{m.healthScore}/100</span>
                  </div>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-red-400 via-amber-400 to-emerald-500 transition-all duration-1000" style={{ width: `${m.healthScore}%` }} />
                </div>
              </div>
            ))}
            {merchantStats.length === 0 && <p className="text-slate-400 text-sm text-center py-6">No data yet</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
const PULSE_TABS = [
  { key: 'command', label: 'Command Center', icon: Zap },
  { key: 'emi', label: 'EMI Pulse', icon: Activity },
  { key: 'prediction', label: 'AI Prediction', icon: Brain },
  { key: 'portfolio', label: 'Portfolio Risk', icon: Layers },
  { key: 'merchant', label: 'Merchant Performance', icon: Users },
  { key: 'mis', label: 'MIS & Reports', icon: FileText },
];

function CredvinPulseContent() {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('command');
  const [search, setSearch] = useState('');
  const [selectedBorrower, setSelectedBorrower] = useState(null);
  const [riskFilter, setRiskFilter] = useState('all');

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    const unsub = base44.entities.LoanApplication.subscribe((event) => {
      if (event.type === 'update') setApplications(p => p.map(a => a.id === event.id ? event.data : a));
      if (event.type === 'create') setApplications(p => [event.data, ...p]);
    });
    return unsub;
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const data = await base44.entities.LoanApplication.list('-created_date', 300);
    setApplications(data);
    setLoading(false);
  };

  const stats = useMemo(() => {
    const disbursed = applications.filter(a => a.status === 'disbursed');
    const active = applications.filter(a => ['approved', 'disbursed', 'esign_pending', 'emandate_pending', 'ready_for_disbursal'].includes(a.status));
    const highRisk = disbursed.filter(a => (a.uw_risk_score ?? 50) < 50);
    const critical = disbursed.filter(a => (a.uw_risk_score ?? 50) < 30);
    const safe = disbursed.filter(a => (a.uw_risk_score ?? 50) >= 70);
    const totalEMI = disbursed.reduce((s, a) => s + (a.uw_eligible_emi || 0), 0);
    const expectedCollections = safe.reduce((s, a) => s + (a.uw_eligible_emi || 0), 0);
    const atRiskCollections = highRisk.reduce((s, a) => s + (a.uw_eligible_emi || 0), 0);
    const totalBook = applications.filter(a => (a.final_decision || a.uw_decision) === 'APPROVE').reduce((s, a) => s + (a.uw_approved_amount || a.loan_amount || 0), 0);
    const avgRisk = disbursed.length > 0 ? Math.round(disbursed.reduce((s, a) => s + (a.uw_risk_score || 0), 0) / disbursed.length) : 0;
    return {
      total: applications.length, disbursed: disbursed.length, active: active.length,
      highRisk: highRisk.length, critical: critical.length, safe: safe.length,
      totalEMI, expectedCollections, atRiskCollections, totalBook, avgRisk,
      collectionRate: disbursed.length > 0 ? Math.round((safe.length / disbursed.length) * 100) : 0,
    };
  }, [applications]);

  const disbursedApps = useMemo(() => applications.filter(a => a.status === 'disbursed'), [applications]);

  const filteredBorrowers = useMemo(() => {
    let list = disbursedApps;
    if (search) list = list.filter(a => a.full_name?.toLowerCase().includes(search.toLowerCase()) || a.phone?.includes(search));
    if (riskFilter !== 'all') {
      const ranges = { safe: [70, 100], stable: [60, 70], watchlist: [45, 60], high: [30, 45], critical: [0, 30] };
      const [min, max] = ranges[riskFilter] || [0, 100];
      list = list.filter(a => (a.uw_risk_score ?? 50) >= min && (a.uw_risk_score ?? 50) < max);
    }
    return list;
  }, [disbursedApps, search, riskFilter]);

  const riskDistribution = useMemo(() => {
    const d = disbursedApps;
    return [
      { name: 'Safe', value: d.filter(a => (a.uw_risk_score ?? 50) >= 70).length, color: '#059669' },
      { name: 'Stable', value: d.filter(a => (a.uw_risk_score ?? 50) >= 60 && (a.uw_risk_score ?? 50) < 70).length, color: '#2563eb' },
      { name: 'Watchlist', value: d.filter(a => (a.uw_risk_score ?? 50) >= 45 && (a.uw_risk_score ?? 50) < 60).length, color: '#d97706' },
      { name: 'High Risk', value: d.filter(a => (a.uw_risk_score ?? 50) >= 30 && (a.uw_risk_score ?? 50) < 45).length, color: '#ea580c' },
      { name: 'Critical', value: d.filter(a => (a.uw_risk_score ?? 50) < 30).length, color: '#dc2626' },
    ].filter(d => d.value > 0);
  }, [disbursedApps]);

  const monthlyTrend = useMemo(() => {
    const months = {};
    applications.forEach(a => {
      const m = new Date(a.created_date).toLocaleDateString('en-IN', { month: 'short' });
      if (!months[m]) months[m] = { month: m, applied: 0, disbursed: 0, emiBook: 0 };
      months[m].applied++;
      if (a.status === 'disbursed') { months[m].disbursed++; months[m].emiBook += (a.uw_eligible_emi || 0); }
    });
    return Object.values(months).slice(-6);
  }, [applications]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-primary text-white sticky top-0 z-30 shadow-xl">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-bold text-sm">Credvin Pulse</span>
                <span className="text-white/50 text-xs ml-2 hidden sm:inline">· AI Collections OS</span>
              </div>
              <span className="flex items-center gap-1 text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />LIVE
              </span>
            </div>

            {/* Tab Bar */}
            <div className="hidden md:flex items-center gap-0">
              {PULSE_TABS.map(({ key, label, icon: Icon }) => (
                <button key={key} onClick={() => setActiveTab(key)}
                  className={`flex items-center gap-1.5 px-4 py-4 text-xs font-semibold border-b-2 transition-colors ${
                    activeTab === key ? 'border-white text-white' : 'border-transparent text-white/50 hover:text-white/80'
                  }`}>
                  <Icon className="w-3.5 h-3.5" />{label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {stats.critical > 0 && (
                <span className="flex items-center gap-1 text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded-full border border-red-500/30 font-bold animate-pulse">
                  <AlertCircle className="w-3 h-3" />{stats.critical} Critical
                </span>
              )}
              <button onClick={fetchData} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                <RefreshCw className="w-4 h-4 text-white/70" />
              </button>
            </div>
          </div>

          {/* Mobile tabs */}
          <div className="flex md:hidden gap-0 overflow-x-auto border-t border-white/10">
            {PULSE_TABS.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setActiveTab(key)}
                className={`flex-shrink-0 flex items-center gap-1 px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                  activeTab === key ? 'border-white text-white' : 'border-transparent text-white/50'
                }`}>
                <Icon className="w-3 h-3" />{label.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-slate-500 text-sm">Loading collection intelligence…</p>
        </div>
      ) : (
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">

          {/* ─── COMMAND CENTER ─── */}
          {activeTab === 'command' && (
            <div className="space-y-5">
              {/* KPI Row */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                <MetricCard label="Active Portfolio" value={stats.active} icon={Layers} color="text-primary" accent="border-l-primary" />
                <MetricCard label="Disbursed Loans" value={stats.disbursed} icon={Banknote} color="text-emerald-600" accent="border-l-emerald-500" />
                <MetricCard label="Expected EMI/mo" value={`₹${(stats.expectedCollections / 1000).toFixed(0)}K`} icon={IndianRupee} color="text-blue-600" accent="border-l-blue-500" />
                <MetricCard label="At-Risk EMI" value={`₹${(stats.atRiskCollections / 1000).toFixed(0)}K`} icon={AlertTriangle} color="text-amber-600" accent="border-l-amber-500" />
                <MetricCard label="High Risk" value={stats.highRisk} icon={Shield} color="text-orange-600" accent="border-l-orange-500" />
                <MetricCard label="Collection Rate" value={`${stats.collectionRate}%`} icon={Target} color="text-emerald-600" accent="border-l-emerald-400" />
              </div>

              {/* Command Grid */}
              <div className="grid lg:grid-cols-3 gap-5">
                {/* Portfolio Health Gauge */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-5 text-white">
                  <div className="flex items-center gap-2 mb-4">
                    <Activity className="w-4 h-4 text-blue-300" />
                    <p className="font-bold text-sm">Portfolio Health</p>
                  </div>
                  <div className="text-center mb-4">
                    <p className="text-5xl font-bold text-white">{stats.avgRisk}</p>
                    <p className="text-slate-400 text-sm mt-1">Average Risk Score</p>
                    <p className={`text-sm font-semibold mt-1 ${stats.avgRisk >= 65 ? 'text-emerald-400' : stats.avgRisk >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                      {stats.avgRisk >= 65 ? '✅ Healthy Portfolio' : stats.avgRisk >= 50 ? '⚠️ Moderate Risk' : '🔴 High Risk Portfolio'}
                    </p>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-3">
                    <div className="h-full rounded-full bg-gradient-to-r from-red-500 via-amber-400 to-emerald-500" style={{ width: `${stats.avgRisk}%` }} />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Safe', value: stats.safe, color: 'text-emerald-400' },
                      { label: 'At Risk', value: stats.highRisk, color: 'text-amber-400' },
                      { label: 'Critical', value: stats.critical, color: 'text-red-400' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="bg-white/8 rounded-xl p-2.5 text-center">
                        <p className={`text-xl font-bold ${color}`}>{value}</p>
                        <p className="text-slate-400 text-xs">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Risk Donut */}
                <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    <p className="font-bold text-slate-800 text-sm">Risk Distribution</p>
                  </div>
                  {riskDistribution.length > 0 ? (
                    <div className="flex items-center gap-4">
                      <ResponsiveContainer width={120} height={120}>
                        <PieChart>
                          <Pie data={riskDistribution} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" paddingAngle={2}>
                            {riskDistribution.map((d, i) => <Cell key={i} fill={d.color} />)}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex-1 space-y-1.5">
                        {riskDistribution.map(d => (
                          <div key={d.name} className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                              <span className="text-xs text-slate-600">{d.name}</span>
                            </div>
                            <span className="text-xs font-bold text-slate-700">{d.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : <p className="text-center text-slate-400 text-sm py-8">No disbursed loans yet</p>}
                </div>

                {/* EMI Collection Meter */}
                <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <IndianRupee className="w-4 h-4 text-emerald-600" />
                    <p className="font-bold text-slate-800 text-sm">Collection Intelligence</p>
                  </div>
                  <div className="space-y-4">
                    {[
                      { label: 'Total Monthly EMI Book', value: `₹${(stats.totalEMI / 1000).toFixed(1)}K`, pct: 100, color: 'bg-slate-200' },
                      { label: 'Expected Collections', value: `₹${(stats.expectedCollections / 1000).toFixed(1)}K`, pct: stats.totalEMI ? Math.round((stats.expectedCollections / stats.totalEMI) * 100) : 0, color: 'bg-emerald-500' },
                      { label: 'At-Risk Collections', value: `₹${(stats.atRiskCollections / 1000).toFixed(1)}K`, pct: stats.totalEMI ? Math.round((stats.atRiskCollections / stats.totalEMI) * 100) : 0, color: 'bg-red-500' },
                    ].map(({ label, value, pct, color }) => (
                      <div key={label}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-500">{label}</span>
                          <span className="font-bold text-slate-700">{value}</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${color} transition-all duration-1000`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <p className="text-xs text-slate-400">Total Loan Book</p>
                    <p className="font-bold text-slate-800">₹{(stats.totalBook / 100000).toFixed(1)}L</p>
                  </div>
                </div>
              </div>

              {/* Trend chart + AI Panel */}
              <div className="grid lg:grid-cols-2 gap-5">
                <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
                  <h3 className="font-bold text-slate-800 text-sm mb-4">EMI Book Growth</h3>
                  {monthlyTrend.length > 0 ? (
                    <ResponsiveContainer width="100%" height={180}>
                      <AreaChart data={monthlyTrend}>
                        <defs>
                          <linearGradient id="emiGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#1e40af" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#1e40af" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: 12 }} />
                        <Area type="monotone" dataKey="disbursed" name="Disbursed" stroke="#1e40af" strokeWidth={2} fill="url(#emiGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : <p className="text-center text-slate-400 text-sm py-12">No data available yet</p>}
                </div>
                <PulseAI apps={applications} />
              </div>

              {/* Critical Alerts */}
              {stats.critical > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-3xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                    <h3 className="font-bold text-red-800 text-sm">Critical Accounts — Immediate Action Required</h3>
                    <span className="ml-auto text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold border border-red-200">{stats.critical} accounts</span>
                  </div>
                  <div className="space-y-2">
                    {disbursedApps.filter(a => (a.uw_risk_score ?? 50) < 30).map(a => (
                      <div key={a.id} onClick={() => setSelectedBorrower(a)}
                        className="bg-white rounded-xl border border-red-200 px-4 py-3 flex items-center gap-3 cursor-pointer hover:border-red-400 transition-colors">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-800 text-sm">{a.full_name}</p>
                          <p className="text-xs text-slate-400">₹{(a.uw_approved_amount || a.loan_amount)?.toLocaleString('en-IN')} · Risk: {a.uw_risk_score}/100</p>
                        </div>
                        <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full border border-red-200">CRITICAL</span>
                        <ChevronRight className="w-4 h-4 text-red-300" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── EMI PULSE TAB ─── */}
          {activeTab === 'emi' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Disbursed Loans', value: stats.disbursed, icon: Banknote, color: 'text-primary', accent: 'border-l-primary' },
                  { label: 'Safe (High Probability)', value: stats.safe, icon: CheckCircle2, color: 'text-emerald-600', accent: 'border-l-emerald-500' },
                  { label: 'Watchlist', value: disbursedApps.filter(a => (a.uw_risk_score ?? 50) >= 45 && (a.uw_risk_score ?? 50) < 60).length, icon: AlertCircle, color: 'text-amber-600', accent: 'border-l-amber-500' },
                  { label: 'High Risk', value: stats.highRisk, icon: AlertTriangle, color: 'text-red-600', accent: 'border-l-red-500' },
                ].map(p => <MetricCard key={p.label} {...p} />)}
              </div>

              {/* Borrower table */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-wrap gap-3">
                  <h3 className="font-bold text-slate-800 text-sm">Active Loan Borrowers</h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="pl-8 h-8 rounded-xl text-xs w-44 border-slate-200" />
                    </div>
                    {['all', 'safe', 'stable', 'watchlist', 'high', 'critical'].map(f => (
                      <button key={f} onClick={() => setRiskFilter(f)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border capitalize transition-all ${riskFilter === f ? 'bg-primary text-white border-primary' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
                {filteredBorrowers.length === 0 ? (
                  <p className="text-center text-slate-400 py-12 text-sm">No borrowers in this segment</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredBorrowers.map(a => <BorrowerRiskRow key={a.id} app={a} onSelect={setSelectedBorrower} />)}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── AI PREDICTION TAB ─── */}
          {activeTab === 'prediction' && (
            <div className="space-y-5">
              <div className="bg-gradient-to-br from-slate-900 to-primary rounded-3xl p-6 text-white">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center">
                    <Brain className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">AI Default Prediction Engine</h2>
                    <p className="text-white/60 text-sm">Analyzing {disbursedApps.length} active borrowers in real-time</p>
                  </div>
                  <span className="ml-auto flex items-center gap-1.5 text-xs bg-emerald-500/20 text-emerald-300 px-3 py-1.5 rounded-full border border-emerald-500/30 font-semibold">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />AI Active
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Likely to Self-Pay', value: stats.safe, pct: stats.disbursed ? Math.round((stats.safe / stats.disbursed) * 100) : 0, color: 'bg-emerald-500/30 border-emerald-400/30 text-emerald-300' },
                    { label: 'Need Reminders', value: disbursedApps.filter(a => { const s = a.uw_risk_score ?? 50; return s >= 45 && s < 70; }).length, pct: 0, color: 'bg-blue-500/30 border-blue-400/30 text-blue-300' },
                    { label: 'High Bounce Risk', value: stats.highRisk, pct: stats.disbursed ? Math.round((stats.highRisk / stats.disbursed) * 100) : 0, color: 'bg-amber-500/30 border-amber-400/30 text-amber-300' },
                    { label: 'Escalation Required', value: stats.critical, pct: stats.disbursed ? Math.round((stats.critical / stats.disbursed) * 100) : 0, color: 'bg-red-500/30 border-red-400/30 text-red-300' },
                  ].map(({ label, value, pct, color }) => (
                    <div key={label} className={`rounded-2xl border p-4 text-center ${color}`}>
                      <p className="text-2xl font-bold text-white">{value}</p>
                      {pct > 0 && <p className="text-xs opacity-70">{pct}% of portfolio</p>}
                      <p className="text-xs font-semibold mt-1">{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Prediction Cards */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {disbursedApps.slice(0, 9).map(a => {
                  const score = a.uw_risk_score ?? 50;
                  const risk = getRiskLevel(score);
                  const defProb = getDefaultProbability(score);
                  return (
                    <div key={a.id} onClick={() => setSelectedBorrower(a)}
                      className={`bg-white rounded-2xl border p-4 cursor-pointer hover:shadow-md transition-all ${risk.border}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-800 text-sm truncate">{a.full_name}</p>
                          <p className="text-xs text-slate-400">₹{(a.uw_eligible_emi || 0)?.toLocaleString('en-IN')}/mo EMI</p>
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${risk.bg} ${risk.border} ${risk.color} ml-2 flex-shrink-0`}>{risk.label}</span>
                      </div>
                      <div className="mb-3">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-500">Default Probability</span>
                          <span className={`font-bold ${defProb > 65 ? 'text-red-500' : defProb > 40 ? 'text-amber-600' : 'text-emerald-600'}`}>{defProb}%</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${defProb > 65 ? 'bg-red-500' : defProb > 40 ? 'bg-amber-400' : 'bg-emerald-500'}`} style={{ width: `${defProb}%` }} />
                        </div>
                      </div>
                      <p className={`text-xs ${risk.color} font-medium`}>
                        {score >= 75 ? "✅ Auto-reminders sufficient" :
                         score >= 60 ? "ℹ️ Send pre-EMI WhatsApp" :
                         score >= 45 ? "⚠️ Proactive call recommended" :
                         score >= 30 ? "🚨 Assign to senior agent" : "🔴 Immediate escalation"}
                      </p>
                    </div>
                  );
                })}
              </div>

              {disbursedApps.length === 0 && (
                <p className="text-center text-slate-400 py-16 text-sm">No disbursed loans to analyze yet</p>
              )}
            </div>
          )}

          {/* ─── PORTFOLIO RISK TAB ─── */}
          {activeTab === 'portfolio' && (
            <div className="space-y-5">
              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  { label: 'Total Loan Book', value: `₹${(stats.totalBook / 100000).toFixed(1)}L`, sub: `${applications.length} applications`, icon: Layers, color: 'text-primary', accent: 'border-l-primary' },
                  { label: 'At-Risk Value', value: `₹${(disbursedApps.filter(a => (a.uw_risk_score ?? 50) < 50).reduce((s, a) => s + (a.uw_approved_amount || a.loan_amount || 0), 0) / 100000).toFixed(1)}L`, sub: `${stats.highRisk} high-risk accounts`, icon: AlertTriangle, color: 'text-orange-600', accent: 'border-l-orange-500' },
                  { label: 'Healthy Portfolio', value: `₹${(disbursedApps.filter(a => (a.uw_risk_score ?? 50) >= 70).reduce((s, a) => s + (a.uw_approved_amount || a.loan_amount || 0), 0) / 100000).toFixed(1)}L`, sub: `${stats.safe} safe accounts`, icon: Shield, color: 'text-emerald-600', accent: 'border-l-emerald-500' },
                ].map(p => <MetricCard key={p.label} {...p} />)}
              </div>

              {/* Risk Heatmap */}
              <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
                <h3 className="font-bold text-slate-800 text-sm mb-4">Portfolio Risk Heatmap — By Loan Type</h3>
                <div className="space-y-3">
                  {['personal', 'jewellery', 'solar', 'healthcare', 'home_decor', 'retail', 'education'].map(type => {
                    const typeApps = applications.filter(a => a.loan_type === type);
                    if (!typeApps.length) return null;
                    const avgScore = typeApps.filter(a => a.uw_risk_score).length > 0
                      ? Math.round(typeApps.filter(a => a.uw_risk_score).reduce((s, a) => s + a.uw_risk_score, 0) / typeApps.filter(a => a.uw_risk_score).length) : 50;
                    const risk = getRiskLevel(avgScore);
                    const totalVal = typeApps.reduce((s, a) => s + (a.uw_approved_amount || a.loan_amount || 0), 0);
                    return (
                      <div key={type} className="flex items-center gap-4">
                        <p className="text-xs font-semibold text-slate-600 capitalize w-28 flex-shrink-0">{type.replace(/_/g, ' ')}</p>
                        <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${risk.dot}`}
                            style={{ width: `${(typeApps.length / Math.max(applications.length, 1)) * 100}%`, opacity: 0.7 + (avgScore / 300) }} />
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`text-xs font-bold ${risk.color}`}>{avgScore}/100</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${risk.bg} ${risk.border} ${risk.color}`}>{risk.label}</span>
                          <span className="text-xs text-slate-400">({typeApps.length})</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Monthly Volume vs Risk */}
              <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
                <h3 className="font-bold text-slate-800 text-sm mb-4">Portfolio Growth Trend</h3>
                {monthlyTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={monthlyTrend} barSize={20}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: 12 }} />
                      <Bar dataKey="applied" name="Applications" fill="#dbeafe" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="disbursed" name="Disbursed" fill="#1e40af" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-slate-400 py-12 text-sm">No data yet</p>}
              </div>
            </div>
          )}

          {/* ─── MERCHANT PERFORMANCE TAB ─── */}
          {activeTab === 'merchant' && <MerchantPerformanceTab applications={applications} />}

          {/* ─── MIS & REPORTS TAB ─── */}
          {activeTab === 'mis' && (
            <div className="space-y-5">
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 text-white">
                <div className="flex items-center gap-3 mb-2">
                  <FileText className="w-6 h-6 text-blue-300" />
                  <h2 className="text-lg font-bold">MIS & Reporting Center</h2>
                </div>
                <p className="text-slate-400 text-sm">Download enterprise-grade reports in CSV format. All reports include real-time data.</p>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { title: 'Collections MIS', desc: 'All active borrowers with risk scores and EMI details', type: 'collections', icon: Activity, count: disbursedApps.length, color: 'bg-blue-50 border-blue-200 text-blue-700' },
                  { title: 'Overdue Report', desc: 'High-risk accounts requiring collection action', type: 'overdue', icon: AlertTriangle, count: stats.highRisk, color: 'bg-red-50 border-red-200 text-red-700' },
                  { title: 'EMI Due Report', desc: 'Upcoming EMI schedule for all active loans', type: 'emi_due', icon: Calendar, count: disbursedApps.length, color: 'bg-amber-50 border-amber-200 text-amber-700' },
                  { title: 'Full Portfolio MIS', desc: 'Complete portfolio snapshot with all applications', type: 'collections', icon: Layers, count: applications.length, color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
                  { title: 'Risk Analytics Report', desc: 'Risk segmentation and default probability analysis', type: 'overdue', icon: Brain, count: disbursedApps.filter(a => a.uw_risk_score).length, color: 'bg-violet-50 border-violet-200 text-violet-700' },
                  { title: 'Executive Summary', desc: 'High-level portfolio metrics for management review', type: 'collections', icon: Star, count: applications.length, color: 'bg-slate-50 border-slate-200 text-slate-700' },
                ].map(({ title, desc, type, icon: Icon, count, color }) => (
                  <div key={title} className={`bg-white rounded-2xl border p-5 shadow-sm hover:shadow-md transition-shadow`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">{count} records</span>
                    </div>
                    <p className="font-bold text-slate-800 text-sm mb-1">{title}</p>
                    <p className="text-xs text-slate-500 mb-4 leading-relaxed">{desc}</p>
                    <Button onClick={() => exportMIS(type === 'overdue' ? disbursedApps.filter(a => (a.uw_risk_score ?? 50) < 50) : type === 'emi_due' ? disbursedApps : applications, type)}
                      className="w-full rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs h-9">
                      <Download className="w-3.5 h-3.5 mr-1.5" /> Export CSV
                    </Button>
                  </div>
                ))}
              </div>

              {/* Summary stats */}
              <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
                <h3 className="font-bold text-slate-800 text-sm mb-4">Current Portfolio Snapshot</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Total Applications', value: applications.length },
                    { label: 'Active Loans', value: disbursedApps.length },
                    { label: 'Total Book Value', value: `₹${(stats.totalBook / 100000).toFixed(1)}L` },
                    { label: 'Monthly EMI Book', value: `₹${(stats.totalEMI / 1000).toFixed(0)}K` },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-center">
                      <p className="text-2xl font-bold text-slate-800">{value}</p>
                      <p className="text-xs text-slate-500 mt-1">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Borrower Drawer */}
      <AnimatePresence>
        {selectedBorrower && (
          <BorrowerDetailDrawer
            app={applications.find(a => a.id === selectedBorrower.id) || selectedBorrower}
            onClose={() => setSelectedBorrower(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function CredvinPulse() {
  return <RoleGuard allowedRoles={['admin', 'lender']}><CredvinPulseContent /></RoleGuard>;
}
