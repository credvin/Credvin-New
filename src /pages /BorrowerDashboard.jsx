import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import RoleGuard from '../components/RoleGuard';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2, XCircle, Clock, Loader2, FileText, Banknote,
  ArrowRight, ShieldCheck, RefreshCw, IndianRupee,
  Calendar, Phone, Mail, PenLine, CreditCard, Sparkles, User,
  AlertCircle, ChevronRight, Activity, Wallet, Brain,
  Send, MessageSquare, Bell, TrendingUp, Star, Zap, Shield, Copy
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { generateLoanId } from '@/utils/loanId';

// ─── Status Journey Config ───────────────────────────────────
const JOURNEY_STEPS = [
  { key: 'submitted', label: 'Applied', desc: 'Application received', icon: FileText, color: 'bg-blue-500' },
  { key: 'under_review', label: 'Under Review', desc: 'AI credit assessment running', icon: Activity, color: 'bg-amber-500' },
  { key: 'approved', label: 'Approved', desc: 'Loan offer ready', icon: CheckCircle2, color: 'bg-emerald-500' },
  { key: 'esign_pending', label: 'eSign', desc: 'Sign your agreement', icon: PenLine, color: 'bg-violet-500' },
  { key: 'emandate_pending', label: 'eMandate', desc: 'Setup auto-pay', icon: CreditCard, color: 'bg-purple-500' },
  { key: 'ready_for_disbursal', label: 'Payout Ready', desc: 'Funds being released', icon: Sparkles, color: 'bg-primary' },
  { key: 'disbursed', label: 'Disbursed', desc: 'Money in your account', icon: Banknote, color: 'bg-green-600' },
];

const STATUS_INDEX = {
  submitted: 0, under_review: 1, approved: 2, rejected: 2,
  esign_pending: 3, emandate_pending: 4, ready_for_disbursal: 5, disbursed: 6
};

const DECISION_CONFIG = {
  APPROVE: {
    gradient: 'from-emerald-600 to-emerald-500',
    bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800',
    icon: CheckCircle2, iconColor: 'text-emerald-600',
    title: 'Loan Approved! 🎉',
    subtitle: 'Your application has been approved. Complete the steps below to receive your funds.',
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  REJECT: {
    gradient: 'from-red-600 to-red-500',
    bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800',
    icon: XCircle, iconColor: 'text-red-500',
    title: 'Not Approved',
    subtitle: 'Your application does not meet current criteria. You may reapply after 90 days.',
    badge: 'bg-red-100 text-red-700 border-red-200',
  },
  REFER: {
    gradient: 'from-amber-500 to-amber-400',
    bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800',
    icon: Clock, iconColor: 'text-amber-600',
    title: 'Under Manual Review',
    subtitle: 'Our credit team is reviewing your application. Expect an update within 24 hours.',
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  PENDING: {
    gradient: 'from-blue-600 to-blue-500',
    bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800',
    icon: Brain, iconColor: 'text-blue-500',
    title: 'Under AI Review',
    subtitle: 'Our AI credit engine is evaluating your profile. This usually takes a few minutes.',
    badge: 'bg-blue-100 text-blue-700 border-blue-200',
  },
};

// ─── AI Quick Messages ───────────────────────────────────────
const AI_QUICK_MESSAGES = [
  "What is my loan status?",
  "How do I complete eSign?",
  "When will I get my money?",
  "How is my EMI calculated?",
  "What is NACH/eMandate?",
];

// ─── AI Responses ────────────────────────────────────────────
function getAIResponse(message, app) {
  const status = app?.status || 'submitted';
  const decision = app?.final_decision || app?.uw_decision || 'PENDING';
  const emi = app?.uw_eligible_emi;
  const amount = app?.uw_approved_amount || app?.loan_amount;
  const tenure = app?.tenure_months;

  if (/status|stage|where/i.test(message)) {
    const statusMap = {
      submitted: "Your application has been submitted and is in our queue. Our AI engine will evaluate it shortly — usually within a few minutes.",
      under_review: "Your application is currently being reviewed by our AI credit engine. We're analyzing your financial profile. This typically takes 10–30 minutes.",
      approved: "Great news! Your loan has been approved. The next step is to complete your eSign (digital signature) and then set up your eMandate (auto-pay). Check the Actions section below.",
      esign_pending: "Your loan is approved! Please complete your eSign (digital signature on the loan agreement). Click the 'Sign Agreement' button below — it takes less than 2 minutes.",
      emandate_pending: "eSign done! Now please set up your eMandate (auto-debit authorization) so your EMIs are deducted automatically every month. This ensures no missed payments.",
      ready_for_disbursal: "🎉 Excellent! Your loan is ready for disbursement. Funds are being processed and should be credited to your account within 30–60 minutes. Sit tight!",
      disbursed: "Your loan has been successfully disbursed! The funds are in your account. Your first EMI will be due on the 5th of next month.",
      rejected: "Unfortunately, your current application didn't meet our eligibility criteria. You can reapply after 90 days or contact our support for personalized guidance."
    };
    return statusMap[status] || "Your application is being processed. Please check back shortly.";
  }

  if (/esign|sign|agreement|signature/i.test(message)) {
    return "eSign is your digital signature on the loan agreement. It's completely online — no paperwork needed! Click 'Sign Agreement' in your dashboard, review the terms, and sign digitally. It takes less than 2 minutes and is fully legally valid.";
  }

  if (/emandate|nach|auto.?pay|auto.?debit/i.test(message)) {
    return "eMandate (or NACH) is an authorization that allows us to automatically deduct your EMI from your bank account on the due date (5th of each month). This prevents missed payments and keeps your credit score healthy. It's quick to set up — just authorize through your bank's net banking.";
  }

  if (/emi|monthly|payment|repay/i.test(message)) {
    if (emi && amount && tenure) {
      return `Your monthly EMI is ₹${emi.toLocaleString('en-IN')}. This is calculated based on your approved amount of ₹${amount.toLocaleString('en-IN')} over ${tenure} months at the agreed interest rate. Your first EMI will be due on the 5th of next month after disbursement.`;
    }
    return "Your EMI is calculated based on your approved loan amount, tenure, and interest rate using a standard reducing balance formula. Once your loan is approved, your exact EMI will be displayed in your dashboard.";
  }

  if (/money|fund|disburse|credit|account|when/i.test(message)) {
    if (status === 'ready_for_disbursal') return "🚀 Your funds are being processed RIGHT NOW! Expected credit time: 30–60 minutes. You'll receive an SMS confirmation once credited.";
    if (status === 'disbursed') return "Your funds have already been disbursed! Check your bank account. If you don't see them within 24 hours, please contact our support.";
    return "Funds are typically credited within 30–60 minutes after all steps (eSign + eMandate) are complete and the lender approves disbursement. Make sure to complete all pending actions in your dashboard.";
  }

  if (/document|upload|kyc|aadhaar|pan/i.test(message)) {
    return "For your loan, we need: Aadhaar Card, PAN Card, Last 6 months bank statement, and a selfie/photo. If you're salaried — salary slips are helpful. Self-employed — ITR is recommended. All documents should be clear and readable.";
  }

  if (/top.?up|more loan|additional|extra/i.test(message)) {
    if (decision === 'APPROVE' && status === 'disbursed') {
      return `Based on your good repayment profile, you may be eligible for a top-up loan after 3 months of regular EMI payments. Our system will automatically notify you when you become eligible!`;
    }
    return "Top-up loans become available after 3 months of regular EMI payments on your existing loan. Maintain a good repayment track record and we'll proactively inform you about pre-approved offers!";
  }

  return `I'm Credvin's AI assistant! I can help you understand:\n\n• Your loan status & next steps\n• How EMI is calculated\n• eSign & eMandate process\n• Disbursement timelines\n• Document requirements\n\nAsk me anything about your loan!`;
}

// ─── AI Chat ─────────────────────────────────────────────────
function AIAssistant({ app }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'ai', text: `Hi! 👋 I'm your Credvin AI assistant. I can help you understand your loan status, explain next steps, and answer any questions instantly. What would you like to know?` }
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, open]);

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    setTyping(true);
    await new Promise(r => setTimeout(r, 800 + Math.random() * 600));
    const response = getAIResponse(msg, app);
    setMessages(prev => [...prev, { role: 'ai', text: response }]);
    setTyping(false);
  };

  return (
    <>
      {/* FAB */}
      <button onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-gradient-to-br from-primary to-primary/80 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform">
        <Brain className="w-6 h-6 text-white" />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-96 bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
            style={{ maxHeight: '75vh' }}>
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-primary/80 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Credvin AI</p>
                  <p className="text-white/70 text-xs flex items-center gap-1"><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />Always Available</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">×</button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user' ? 'bg-primary text-white rounded-br-sm' : 'bg-white border border-slate-100 text-slate-700 rounded-bl-sm shadow-sm'
                  }`}>{m.text}</div>
                </div>
              ))}
              {typing && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-100 px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm flex gap-1">
                    {[0,1,2].map(i => <span key={i} className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Quick replies */}
            <div className="px-3 pt-2 pb-1 bg-white border-t border-slate-100 flex gap-1.5 overflow-x-auto">
              {AI_QUICK_MESSAGES.slice(0, 3).map(q => (
                <button key={q} onClick={() => sendMessage(q)}
                  className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full bg-primary/8 text-primary border border-primary/20 hover:bg-primary/15 transition-colors">
                  {q}
                </button>
              ))}
            </div>

            {/* Input */}
            <div className="p-3 bg-white border-t border-slate-100 flex gap-2">
              <input value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                placeholder="Ask anything about your loan..."
                className="flex-1 text-sm px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-slate-50" />
              <button onClick={() => sendMessage()} disabled={!input.trim()}
                className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center disabled:opacity-40 hover:bg-primary/90 transition-colors">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Journey Tracker ─────────────────────────────────────────
function JourneyTracker({ status }) {
  const current = STATUS_INDEX[status] ?? 0;
  const isRejected = status === 'rejected';
  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex items-start min-w-[580px] relative">
        {/* Progress line behind */}
        <div className="absolute top-4 left-6 right-6 h-0.5 bg-slate-100" style={{ zIndex: 0 }}>
          <div className="h-full bg-gradient-to-r from-primary to-primary/50 transition-all duration-1000"
            style={{ width: `${Math.max(0, (current / (JOURNEY_STEPS.length - 1)) * 100)}%` }} />
        </div>
        {JOURNEY_STEPS.map((step, i) => {
          const done = i < current;
          const active = i === current;
          const Icon = step.icon;
          const isRejectedStep = isRejected && i === 2;
          return (
            <div key={step.key} className="flex flex-col items-center flex-1 relative" style={{ zIndex: 1 }}>
              <motion.div
                initial={{ scale: 0.8 }} animate={{ scale: active ? 1.15 : 1 }}
                className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                  isRejectedStep ? 'bg-red-100 border-red-400' :
                  done ? 'bg-primary border-primary' :
                  active ? 'bg-white border-primary shadow-lg shadow-primary/20' :
                  'bg-white border-slate-200'
                }`}>
                {done && !isRejectedStep ? <CheckCircle2 className="w-4 h-4 text-white" /> :
                 isRejectedStep ? <XCircle className="w-4 h-4 text-red-500" /> :
                 <Icon className={`w-3.5 h-3.5 ${active ? 'text-primary' : 'text-slate-300'}`} />}
                {active && <span className="absolute inset-0 rounded-full border-2 border-primary animate-ping opacity-30" />}
              </motion.div>
              <p className={`text-xs mt-1.5 font-semibold text-center leading-tight max-w-[60px] ${active ? 'text-primary' : done ? 'text-slate-600' : 'text-slate-300'}`}>{step.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── EMI Tracker ─────────────────────────────────────────────
function EMITracker({ app }) {
  if (!app || app.status !== 'disbursed' || !app.uw_eligible_emi || !app.tenure_months) return null;

  const disbursedDate = app.disbursed_at ? new Date(app.disbursed_at) : new Date(app.updated_date);
  const firstEMI = app.first_emi_date ? new Date(app.first_emi_date) : new Date(disbursedDate.getFullYear(), disbursedDate.getMonth() + 1, 5);
  const now = new Date();
  const totalEMIs = app.tenure_months;
  const monthsPassed = Math.max(0, (now.getFullYear() - firstEMI.getFullYear()) * 12 + now.getMonth() - firstEMI.getMonth() + (now.getDate() >= 5 ? 1 : 0));
  const paidEMIs = Math.min(monthsPassed, totalEMIs);
  const remaining = totalEMIs - paidEMIs;
  const emiAmt = app.uw_eligible_emi;
  const pct = Math.round((paidEMIs / totalEMIs) * 100);
  const schedule = Array.from({ length: Math.min(totalEMIs, 6) }, (_, i) => ({
    num: i + 1,
    date: new Date(firstEMI.getFullYear(), firstEMI.getMonth() + i, 5),
    paid: i < paidEMIs,
    due: i === paidEMIs,
  }));

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl overflow-hidden">
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">EMI Repayment</p>
            <p className="text-white font-bold text-lg mt-0.5">Active Loan</p>
          </div>
          <div className="text-right">
            <p className="text-slate-400 text-xs">Monthly EMI</p>
            <p className="text-2xl font-bold text-white">₹{emiAmt.toLocaleString('en-IN')}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-5">
          {[
            { label: 'Paid', value: paidEMIs, color: 'text-emerald-400' },
            { label: 'Remaining', value: remaining, color: 'text-amber-400' },
            { label: 'Total', value: totalEMIs, color: 'text-white' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white/10 rounded-2xl p-3 text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-slate-400 text-xs">{label}</p>
            </div>
          ))}
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-400">Repayment Progress</span>
            <span className="text-emerald-400 font-bold">{pct}%</span>
          </div>
          <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, delay: 0.3 }}
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400" />
          </div>
        </div>

        {/* Next EMIs */}
        <div className="grid grid-cols-6 gap-1.5">
          {schedule.map(({ num, date, paid, due }) => (
            <div key={num} className={`rounded-xl p-2 text-center ${paid ? 'bg-emerald-500/20 border border-emerald-500/30' : due ? 'bg-amber-500/20 border border-amber-400/50' : 'bg-white/5 border border-white/10'}`}>
              <p className={`text-xs font-bold ${paid ? 'text-emerald-400' : due ? 'text-amber-400' : 'text-slate-500'}`}>#{num}</p>
              {paid ? <CheckCircle2 className="w-3 h-3 text-emerald-400 mx-auto mt-0.5" /> : due ? <AlertCircle className="w-3 h-3 text-amber-400 mx-auto mt-0.5" /> : <Clock className="w-3 h-3 text-slate-600 mx-auto mt-0.5" />}
              <p className={`text-xs mt-0.5 ${paid ? 'text-emerald-400' : due ? 'text-amber-400' : 'text-slate-600'}`}>{date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
            </div>
          ))}
        </div>
        {totalEMIs > 6 && <p className="text-xs text-slate-500 text-center mt-2">+ {totalEMIs - 6} more EMIs</p>}

        {/* Financials */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
            <p className="text-xs text-slate-400">Paid So Far</p>
            <p className="font-bold text-emerald-400 text-base">₹{(paidEMIs * emiAmt).toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <p className="text-xs text-slate-400">Outstanding</p>
            <p className="font-bold text-white text-base">₹{(remaining * emiAmt).toLocaleString('en-IN')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Content ─────────────────────────────────────────────
function calculateFirstEMIDate(completedAt) {
  if (!completedAt) return null;
  const d = new Date(completedAt);
  return d.getDate() <= 25 ? new Date(d.getFullYear(), d.getMonth() + 1, 5) : new Date(d.getFullYear(), d.getMonth() + 2, 5);
}

function BorrowerDashboardContent() {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [actionLoading, setActionLoading] = useState('');

  useEffect(() => {
    if (user?.email) fetchApplications();
  }, [user]);

  // Real-time subscription
  useEffect(() => {
    const unsub = base44.entities.LoanApplication.subscribe((event) => {
      if (event.type === 'update') {
        setApplications(prev => prev.map(a => a.id === event.id ? event.data : a));
        if (event.data.status === 'ready_for_disbursal') {
          toast.success('🎉 Your loan is ready for disbursement!', { duration: 8000 });
        }
      }
    });
    return unsub;
  }, []);

  const fetchApplications = async () => {
    setLoading(true);
    const data = await base44.entities.LoanApplication.filter({ email: user.email }, '-created_date', 20);
    setApplications(data);
    if (data.length > 0 && !selected) setSelected(data[0]);
    setLoading(false);
  };

  const app = selected ? applications.find(a => a.id === selected.id) || selected : null;
  const finalDecision = app?.final_decision || app?.uw_decision || 'PENDING';
  const dc = DECISION_CONFIG[finalDecision] || DECISION_CONFIG.PENDING;

  const handleESign = async () => {
    setActionLoading('esign');
    const now = new Date().toISOString();
    const emandateDone = app?.emandate_completed;
    const newStatus = emandateDone ? 'ready_for_disbursal' : 'emandate_pending';
    const emiDate = emandateDone ? calculateFirstEMIDate(now) : null;
    await base44.entities.LoanApplication.update(app.id, {
      esign_completed: true, esign_completed_at: now, status: newStatus,
      ...(emiDate && { first_emi_date: emiDate.toISOString() })
    });
    toast.success('eSign completed!');
    setActionLoading('');
    fetchApplications();
  };

  const handleEMandate = async () => {
    setActionLoading('emandate');
    const now = new Date().toISOString();
    const esignDone = app?.esign_completed;
    const completedAt = app?.esign_completed_at || now;
    const emiDate = calculateFirstEMIDate(completedAt);
    await base44.entities.LoanApplication.update(app.id, {
      emandate_completed: true, emandate_completed_at: now,
      status: esignDone ? 'ready_for_disbursal' : 'esign_pending',
      ...(esignDone && emiDate && { first_emi_date: emiDate.toISOString() })
    });
    toast.success('eMandate setup complete!');
    setActionLoading('');
    fetchApplications();
  };

  const formatDate = (iso) => iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-50">
      {/* Top Bar */}
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              {app?.selfie_url ? (
                <img src={app.selfie_url} alt="Profile" className="w-10 h-10 rounded-2xl object-cover border-2 border-primary/20 shadow-lg" />
              ) : (
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20">
                  <span className="text-white font-bold text-sm">{(user?.full_name || user?.email || 'U')[0].toUpperCase()}</span>
                </div>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">{user?.full_name || 'Borrower'}</p>
              {app && (
                <button onClick={() => { navigator.clipboard.writeText(generateLoanId(app)); toast.success('Loan ID copied!'); }}
                  className="flex items-center gap-1 text-xs text-primary/70 hover:text-primary transition-colors mt-0.5 group">
                  <span className="font-mono font-semibold">{generateLoanId(app)}</span>
                  <Copy className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchApplications} className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
              <RefreshCw className="w-4 h-4 text-slate-400" />
            </button>
            <Link to="/ApplyLoan">
              <Button size="sm" className="bg-primary rounded-xl font-semibold text-xs px-4 shadow-lg shadow-primary/20">
                Apply <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-24 pt-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
            <p className="text-slate-500 text-sm">Loading your dashboard…</p>
          </div>
        ) : applications.length === 0 ? (
          <div className="mt-8">
            <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center shadow-sm">
              <div className="w-20 h-20 bg-gradient-to-br from-primary/10 to-blue-100 rounded-3xl flex items-center justify-center mx-auto mb-5">
                <Wallet className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">No Loan Applications</h2>
              <p className="text-slate-500 text-sm mb-6 leading-relaxed">Start your loan journey. Get approved in minutes with our AI-powered platform.</p>
              <Link to="/ApplyLoan">
                <Button className="bg-primary rounded-2xl px-8 py-3 font-semibold shadow-lg shadow-primary/20">
                  Apply for a Loan <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
            {/* Features preview */}
            <div className="grid grid-cols-3 gap-3 mt-4">
              {[
                { icon: Zap, label: 'AI Decision', sub: 'In minutes', color: 'text-amber-500 bg-amber-50' },
                { icon: Shield, label: 'Bank Grade', sub: 'Secure', color: 'text-primary bg-blue-50' },
                { icon: Star, label: 'Best Rates', sub: 'From 10.5%', color: 'text-emerald-600 bg-emerald-50' },
              ].map(({ icon: Icon, label, sub, color }) => (
                <div key={label} className="bg-white rounded-2xl border border-slate-100 p-4 text-center">
                  <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mx-auto mb-2`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-700">{label}</p>
                  <p className="text-xs text-slate-400">{sub}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Application Selector (if multiple) */}
            {applications.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {applications.map(a => {
                  const fd = a.final_decision || a.uw_decision || 'PENDING';
                  const isActive = selected?.id === a.id;
                  return (
                    <button key={a.id} onClick={() => setSelected(a)}
                      className={`flex-shrink-0 px-4 py-2 rounded-2xl text-xs font-semibold border transition-all ${
                        isActive ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-white border-slate-200 text-slate-600'
                      }`}>
                      {a.loan_type?.replace(/_/g, ' ')} · ₹{(a.loan_amount / 1000).toFixed(0)}K
                    </button>
                  );
                })}
              </div>
            )}

            {app && (
              <AnimatePresence mode="wait">
                <motion.div key={app.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

                  {/* Hero Status Card */}
                  <div className={`bg-gradient-to-br ${dc.gradient} rounded-3xl p-5 text-white shadow-xl shadow-primary/10 relative overflow-hidden`}>
                  <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                  <div className="relative">
                    {/* Profile + Loan ID row */}
                    <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/15">
                      {app.selfie_url ? (
                        <img src={app.selfie_url} alt="Profile" className="w-12 h-12 rounded-2xl object-cover border-2 border-white/30 shadow-lg flex-shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0 border-2 border-white/20">
                          <User className="w-6 h-6 text-white/80" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white text-sm truncate">{app.full_name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-white/60 text-xs font-mono">{generateLoanId(app)}</span>
                          <button onClick={() => { navigator.clipboard.writeText(generateLoanId(app)); toast.success('Loan ID copied!'); }}
                            className="w-4 h-4 flex items-center justify-center text-white/50 hover:text-white transition-colors">
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/20 text-white border border-white/20 capitalize flex-shrink-0">
                        {app.loan_type?.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-white/70 text-xs font-medium uppercase tracking-wider">Credvin Loan</p>
                        <h2 className="text-2xl font-bold mt-0.5">{dc.title}</h2>
                      </div>
                      <div className="text-right">
                        <p className="text-white/60 text-xs">{finalDecision === 'APPROVE' ? 'Approved' : 'Requested'}</p>
                        <p className="text-2xl font-bold">₹{(app.uw_approved_amount || app.loan_amount)?.toLocaleString('en-IN')}</p>
                      </div>
                    </div>
                      <p className="text-white/80 text-sm leading-relaxed mb-4">{dc.subtitle}</p>
                      {finalDecision === 'APPROVE' && app.uw_eligible_emi && (
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { label: 'Monthly EMI', value: `₹${app.uw_eligible_emi.toLocaleString('en-IN')}` },
                            { label: 'Tenure', value: `${app.tenure_months}m` },
                            { label: 'Rate', value: app.uw_interest_rate ? `${app.uw_interest_rate}% p.a.` : 'Competitive' },
                          ].map(({ label, value }) => (
                            <div key={label} className="bg-white/15 rounded-xl p-2.5 text-center backdrop-blur-sm">
                              <p className="text-white text-sm font-bold">{value}</p>
                              <p className="text-white/60 text-xs">{label}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      {app.manual_decision && app.manual_remarks && (
                        <div className="mt-3 bg-white/10 rounded-xl px-3 py-2 text-xs text-white/80 backdrop-blur-sm flex items-start gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                          Reviewed by <strong className="capitalize">{app.manual_decision_role}</strong>: {app.manual_remarks}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Real-time status ping for ready_for_disbursal */}
                  {app.status === 'ready_for_disbursal' && (
                    <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
                      <div>
                        <p className="font-bold text-emerald-800 text-sm">💸 Funds are being released!</p>
                        <p className="text-xs text-slate-500">Expected credit to your account: 30–60 minutes</p>
                      </div>
                    </div>
                  )}

                  {/* Journey Tracker */}
                  <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-slate-800 text-sm">Your Loan Journey</h3>
                      <span className="text-xs text-slate-400 capitalize bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">{app.status?.replace(/_/g, ' ')}</span>
                    </div>
                    <JourneyTracker status={app.status || 'submitted'} />
                  </div>

                  {/* Pending Actions — eSign + eMandate */}
                  {finalDecision === 'APPROVE' && app.status !== 'disbursed' && (
                    <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm">
                      <h3 className="font-bold text-slate-800 text-sm mb-4">Required Actions</h3>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {[
                          {
                            key: 'esign', done: app.esign_completed, doneAt: app.esign_completed_at,
                            title: 'Sign Agreement', desc: 'Digitally sign your loan contract',
                            icon: PenLine, action: handleESign, btnLabel: 'Sign Now',
                            urgency: !app.esign_completed,
                          },
                          {
                            key: 'emandate', done: app.emandate_completed, doneAt: app.emandate_completed_at,
                            title: 'Setup AutoPay', desc: 'Authorise monthly EMI auto-debit',
                            icon: CreditCard, action: handleEMandate, btnLabel: 'Authorise',
                            urgency: app.esign_completed && !app.emandate_completed,
                          }
                        ].map(({ key, done, doneAt, title, desc, icon: Icon, action, btnLabel, urgency }) => (
                          <div key={key} className={`rounded-2xl border p-4 transition-all ${
                            done ? 'bg-emerald-50 border-emerald-200' : urgency ? 'bg-primary/5 border-primary/30 shadow-sm' : 'bg-slate-50 border-slate-100'
                          }`}>
                            <div className="flex items-center gap-2 mb-2">
                              {done ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <Icon className={`w-5 h-5 ${urgency ? 'text-primary' : 'text-slate-400'}`} />}
                              <p className="font-semibold text-slate-800 text-sm">{title}</p>
                              {urgency && !done && <span className="ml-auto text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Pending</span>}
                            </div>
                            <p className="text-xs text-slate-500 mb-3">{desc}</p>
                            {done ? (
                              <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Done · {formatDate(doneAt)}
                              </p>
                            ) : (
                              <Button size="sm" onClick={action} disabled={actionLoading === key}
                                className={`rounded-xl w-full font-semibold text-xs ${urgency ? 'bg-primary hover:bg-primary/90 shadow-md shadow-primary/20' : 'bg-slate-800 hover:bg-slate-700'} text-white`}>
                                {actionLoading === key ? <Loader2 className="w-3 h-3 animate-spin" /> : btnLabel}
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                      {app.esign_completed && app.emandate_completed && (
                        <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-sm text-emerald-800 font-semibold">
                          <CheckCircle2 className="w-4 h-4" /> All done! Ready for disbursement.
                        </div>
                      )}
                    </div>
                  )}

                  {/* EMI Tracker */}
                  <EMITracker app={app} />

                  {/* Disbursed Banner */}
                  {app.status === 'disbursed' && !app.tenure_months && (
                    <div className="bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-3xl p-5 text-white text-center">
                      <Banknote className="w-10 h-10 mx-auto mb-2 opacity-90" />
                      <p className="font-bold text-lg">Loan Disbursed!</p>
                      <p className="text-white/80 text-sm mt-1">First EMI due {formatDate(app.first_emi_date) || '5th of next month'}</p>
                    </div>
                  )}

                  {/* Loan Details */}
                  <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm">
                    <h3 className="font-bold text-slate-800 text-sm mb-4">Loan Information</h3>
                    <div className="grid grid-cols-2 gap-2.5">
                      {[
                        { label: 'Loan Type', value: app.loan_type?.replace(/_/g, ' ') },
                        { label: 'Amount', value: `₹${app.loan_amount?.toLocaleString('en-IN')}` },
                        { label: 'Tenure', value: `${app.tenure_months || '—'} months` },
                        { label: 'Employment', value: app.employment_type?.replace(/_/g, ' ') },
                        { label: 'Applied On', value: formatDate(app.created_date) },
                        { label: 'Loan ID', value: generateLoanId(app) },
                      ].map(({ label, value }) => (
                        <div key={label} className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                          <p className="text-xs text-slate-400">{label}</p>
                          <p className="font-semibold text-slate-800 text-sm capitalize mt-0.5">{value || '—'}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Credit Score */}
                  {app.uw_risk_score != null && (
                    <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm">
                      <div className="flex items-center gap-2 mb-4">
                        <Brain className="w-4 h-4 text-primary" />
                        <h3 className="font-bold text-slate-800 text-sm">Credit Assessment</h3>
                        <span className="ml-auto text-xs text-slate-400">AI-powered</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        {[
                          { label: 'Risk Score', value: app.uw_risk_score, color: app.uw_risk_score >= 70 ? '#059669' : app.uw_risk_score >= 50 ? '#d97706' : '#dc2626' },
                          { label: 'Confidence', value: app.uw_confidence_score, color: '#1e40af' },
                        ].map(({ label, value, color }) => (
                          <div key={label} className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-xs text-slate-500">{label}</span>
                              <span className="text-sm font-bold" style={{ color }}>{value}/100</span>
                            </div>
                            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${value}%`, backgroundColor: color }} />
                            </div>
                          </div>
                        ))}
                      </div>
                      {app.uw_reasons?.slice(0, 2).map((r, i) => (
                        <p key={i} className="text-xs text-slate-500 flex items-start gap-2 mb-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary/60 mt-1.5 flex-shrink-0" />{r}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Support */}
                  <div className="bg-slate-900 rounded-3xl p-5 flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="font-semibold text-white text-sm">Need Human Support?</p>
                      <p className="text-xs text-slate-400 mt-0.5">Mon–Sat, 9AM–6PM</p>
                    </div>
                    <div className="flex gap-2">
                      <a href="tel:+919218052816" className="flex items-center gap-1.5 px-3.5 py-2 bg-white text-slate-900 rounded-xl text-xs font-bold hover:bg-slate-100 transition-colors">
                        <Phone className="w-3 h-3" /> Call
                      </a>
                      <Link to="/Contact">
                        <button className="flex items-center gap-1.5 px-3.5 py-2 bg-white/10 text-white rounded-xl text-xs font-medium hover:bg-white/20 transition-colors">
                          <Mail className="w-3 h-3" /> Email
                        </button>
                      </Link>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        )}
      </div>

      {/* AI Assistant FAB */}
      <AIAssistant app={app} />
    </div>
  );
}

export default function BorrowerDashboard() {
  return <RoleGuard allowedRoles={['borrower', 'user', 'admin']}><BorrowerDashboardContent /></RoleGuard>;
}
