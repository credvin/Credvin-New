import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ApplicationDetailModal from '../components/admin/ApplicationDetailModal';
import { runUnderwritingEngine } from '../components/admin/UnderwritingEngine';
import {
  Brain, Search, RefreshCw, CheckCircle2, XCircle, Clock,
  Loader2, ShieldX, ChevronRight, AlertTriangle, Zap,
  TrendingUp, Activity, BarChart3, Shield, Users,
  IndianRupee, FileText, Eye, ShieldCheck, Bell
} from 'lucide-react';
import { toast } from 'sonner';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const decisionStyle = {
  APPROVE: { badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', row: 'hover:bg-emerald-50/50' },
  REJECT:  { badge: 'bg-red-100 text-red-600 border-red-200', dot: 'bg-red-500', row: 'hover:bg-red-50/30' },
  REFER:   { badge: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-400', row: 'hover:bg-amber-50/50' },
  PENDING: { badge: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400', row: 'hover:bg-slate-50' },
};

const fraudStyle = {
  HIGH:   'bg-red-100 text-red-700 border-red-200',
  MEDIUM: 'bg-amber-100 text-amber-700 border-amber-200',
  LOW:    'bg-emerald-100 text-emerald-700 border-emerald-200',
};

const TABS = ['dashboard', 'applications', 'fraud', 'analytics'];

export default function UnderwritingDashboard() {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedApp, setSelectedApp] = useState(null);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [runningIds, setRunningIds] = useState(new Set());
  const [activeTab, setActiveTab] = useState('dashboard');
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const isAdmin = user?.role === 'admin';

  useEffect(() => { if (isAdmin) fetchApplications(); }, [isAdmin]);

  const fetchApplications = async () => {
    setLoading(true);
    const data = await base44.entities.LoanApplication.list('-created_date', 200);
    setApplications(data);
    setLastRefresh(new Date());
    setLoading(false);
  };

  const buildUpdatePayload = (result) => ({
    uw_decision: result.decision,
    uw_confidence_score: result.confidence_score,
    uw_risk_score: result.risk_score,
    uw_approved_amount: result.approved_amount,
    uw_eligible_emi: result.eligible_emi,
    uw_interest_rate: result.interest_rate_pct,
    uw_fraud_flag: result.fraud_flag,
    uw_kyc_status: result.kyc_status,
    uw_reasons: result.reasons,
    uw_risk_flags: result.risk_flags,
    uw_bureau_summary: {
      ...(result.bureau_summary || {}),
      fraud_risk_level: result.fraud_risk_level,
      probability_of_default_pct: result.probability_of_default_pct,
      risk_score_1000: result.risk_score_1000,
      positive_factors: result.positive_factors,
      explanation: result.explanation,
      underwriter_notes: result.underwriter_notes,
      early_warning: result.early_warning,
    },
    uw_bank_summary: {
      ...(result.bank_summary || {}),
      foir: result.foir,
      banking_score: result.banking_score,
      abb: result.abb,
      income_stability: result.income_stability,
    },
    uw_processed_at: new Date().toISOString(),
    status: ({ APPROVE: 'approved', REJECT: 'rejected', REFER: 'under_review' })[result.decision] || 'under_review',
    final_decision: result.decision,
  });

  const runSingle = async (app, e) => {
    e?.stopPropagation();
    setRunningIds(prev => new Set([...prev, app.id]));
    toast.info(`Evaluating ${app.full_name}...`);
    const result = await runUnderwritingEngine(app);
    await base44.entities.LoanApplication.update(app.id, buildUpdatePayload(result));
    const fraudLabel = result.fraud_risk_level === 'HIGH' ? ' ⚠️ FRAUD HIGH' : result.fraud_risk_level === 'MEDIUM' ? ' · Fraud Medium' : '';
    toast.success(`${app.full_name}: ${result.decision}${fraudLabel}`);
    setRunningIds(prev => { const s = new Set(prev); s.delete(app.id); return s; });
    fetchApplications();
  };

  const runBulkPending = async () => {
    const pending = applications.filter(a => !a.uw_decision || a.uw_decision === 'PENDING');
    if (!pending.length) { toast.info('No pending applications'); return; }
    setBulkRunning(true);
    toast.info(`Processing ${pending.length} applications...`);
    for (const app of pending) {
      setRunningIds(prev => new Set([...prev, app.id]));
      const result = await runUnderwritingEngine(app);
      await base44.entities.LoanApplication.update(app.id, buildUpdatePayload(result));
      setRunningIds(prev => { const s = new Set(prev); s.delete(app.id); return s; });
    }
    toast.success('Batch evaluation complete!');
    setBulkRunning(false);
    fetchApplications();
  };

  const stats = useMemo(() => {
    const scored = applications.filter(a => a.uw_decision && a.uw_decision !== 'PENDING');
    const pending = applications.filter(a => !a.uw_decision || a.uw_decision === 'PENDING');
    const approved = applications.filter(a => a.uw_decision === 'APPROVE');
    const rejected = applications.filter(a => a.uw_decision === 'REJECT');
    const referred = applications.filter(a => a.uw_decision === 'REFER');
    const fraudHigh = applications.filter(a => a.uw_bureau_summary?.fraud_risk_level === 'HIGH');
    const fraudMedium = applications.filter(a => a.uw_bureau_summary?.fraud_risk_level === 'MEDIUM');
    const avgRisk = scored.length > 0 ? Math.round(scored.reduce((s, a) => s + (a.uw_risk_score || 0), 0) / scored.length) : 0;
    const totalValue = approved.reduce((s, a) => s + (a.uw_approved_amount || a.loan_amount || 0), 0);
    const approvalRate = scored.length > 0 ? Math.round((approved.length / scored.length) * 100) : 0;
    return { total: applications.length, scored: scored.length, pending: pending.length, approved: approved.length, rejected: rejected.length, referred: referred.length, fraudHigh: fraudHigh.length, fraudMedium: fraudMedium.length, avgRisk, totalValue, approvalRate };
  }, [applications]);

  const monthlyData = useMemo(() => {
    const months = {};
    applications.forEach(a => {
      const m = new Date(a.created_date).toLocaleDateString('en-IN', { month: 'short' });
      if (!months[m]) months[m] = { month: m, total: 0, approved: 0, rejected: 0 };
      months[m].total++;
      if (a.uw_decision === 'APPROVE') months[m].approved++;
      if (a.uw_decision === 'REJECT') months[m].rejected++;
    });
    return Object.values(months).slice(-6);
  }, [applications]);

  const filtered = applications.filter(a => {
    const matchSearch = a.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      a.email?.toLowerCase().includes(search.toLowerCase()) || a.phone?.includes(search);
    const matchFilter = filter === 'all' || (a.uw_decision || 'PENDING') === filter;
    return matchSearch && matchFilter;
  });

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center max-w-sm p-8 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <ShieldX className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-800">Access Restricted</h2>
          <p className="text-slate-500 mt-2 text-sm">This area is restricted to administrators only.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            {/* Brand */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Brain className="w-4 h-4 text-white" />
              </div>
              <div>
                <span className="text-sm font-bold text-slate-800">Credvin UW</span>
                <span className="hidden sm:inline text-xs text-slate-400 ml-2">v2.0 · NBFC Grade</span>
              </div>
            </div>

            {/* Tab Nav */}
            <div className="hidden md:flex items-center gap-0">
              {TABS.map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-4 py-4 text-xs font-semibold capitalize border-b-2 transition-colors ${
                    activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}>{tab === 'fraud' ? '⚠ Fraud' : tab}</button>
              ))}
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-2">
              {stats.fraudHigh > 0 && (
                <button onClick={() => setActiveTab('fraud')} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-semibold border border-red-200 hover:bg-red-200 transition-colors">
                  <Bell className="w-3 h-3" /> {stats.fraudHigh} Fraud Alert{stats.fraudHigh > 1 ? 's' : ''}
                </button>
              )}
              <Button onClick={runBulkPending} disabled={bulkRunning || stats.pending === 0} size="sm"
                className="bg-primary hover:bg-primary/90 rounded-lg text-xs font-semibold hidden sm:flex">
                {bulkRunning ? <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" />Processing...</> : <><Zap className="w-3 h-3 mr-1.5" />Run Pending ({stats.pending})</>}
              </Button>
              <button onClick={fetchApplications} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
                <RefreshCw className="w-4 h-4 text-slate-500" />
              </button>
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary text-xs font-bold">{(user?.full_name || user?.email || 'A')[0].toUpperCase()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-[1400px] mx-auto w-full px-4 sm:px-6 py-6">

        {/* ─── DASHBOARD TAB ─── */}
        {activeTab === 'dashboard' && (
          <div className="space-y-5">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {[
                { label: 'Total Applications', value: stats.total, icon: Users, sub: 'All time', color: 'text-primary', accent: 'border-l-primary' },
                { label: 'Approval Rate', value: `${stats.approvalRate}%`, icon: TrendingUp, sub: 'Of scored apps', color: 'text-emerald-600', accent: 'border-l-emerald-500' },
                { label: 'Avg Risk Score', value: stats.avgRisk || '—', icon: Activity, sub: 'Portfolio avg', color: 'text-blue-600', accent: 'border-l-blue-500' },
                { label: 'Fraud Alerts', value: stats.fraudHigh, icon: Shield, sub: `+${stats.fraudMedium} medium`, color: 'text-red-500', accent: 'border-l-red-400' },
                { label: 'Portfolio Value', value: `₹${(stats.totalValue / 100000).toFixed(1)}L`, icon: IndianRupee, sub: 'Approved', color: 'text-emerald-600', accent: 'border-l-emerald-500' },
              ].map(({ label, value, icon: Icon, sub, color, accent }) => (
                <div key={label} className={`bg-white rounded-2xl border border-slate-200 border-l-4 ${accent} p-5 shadow-sm`}>
                  <div className="flex items-start justify-between mb-3">
                    <Icon className={`w-5 h-5 ${color}`} />
                  </div>
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs font-medium text-slate-700 mt-1">{label}</p>
                  <p className="text-xs text-slate-400">{sub}</p>
                </div>
              ))}
            </div>

            <div className="grid lg:grid-cols-3 gap-5">
              {/* Application Trend */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-800 text-sm">Application Trend</h3>
                  <span className="text-xs text-slate-400">Last 6 months</span>
                </div>
                {monthlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={monthlyData} barSize={16}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                      <Bar dataKey="total" name="Total" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="approved" name="Approved" fill="#059669" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="rejected" name="Rejected" fill="#f87171" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[180px] flex items-center justify-center text-slate-400 text-sm">No data yet</div>
                )}
              </div>

              {/* Decision Breakdown */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <h3 className="font-semibold text-slate-800 text-sm mb-4">Decision Breakdown</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Approved', count: stats.approved, color: 'bg-emerald-500', textColor: 'text-emerald-700', pct: stats.total ? (stats.approved / stats.total) * 100 : 0 },
                    { label: 'Rejected', count: stats.rejected, color: 'bg-red-400', textColor: 'text-red-600', pct: stats.total ? (stats.rejected / stats.total) * 100 : 0 },
                    { label: 'Referred', count: stats.referred, color: 'bg-amber-400', textColor: 'text-amber-700', pct: stats.total ? (stats.referred / stats.total) * 100 : 0 },
                    { label: 'Pending', count: stats.pending, color: 'bg-slate-300', textColor: 'text-slate-500', pct: stats.total ? (stats.pending / stats.total) * 100 : 0 },
                  ].map(({ label, count, color, textColor, pct }) => (
                    <div key={label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-500 font-medium">{label}</span>
                        <span className={`font-bold ${textColor}`}>{count} <span className="text-slate-400 font-normal">({Math.round(pct)}%)</span></span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Pending Evaluation</span>
                    <span className="font-bold text-amber-600">{stats.pending}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Last Updated</span>
                    <span className="font-medium text-slate-600">{lastRefresh.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                <Button onClick={runBulkPending} disabled={bulkRunning || stats.pending === 0}
                  className="w-full mt-4 rounded-xl bg-primary hover:bg-primary/90 font-semibold text-xs">
                  {bulkRunning ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Processing...</> : <><Zap className="w-3 h-3 mr-1" />Process Pending</>}
                </Button>
              </div>
            </div>

            {/* Risk Heatmap */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <h3 className="font-semibold text-slate-800 text-sm mb-4">Risk Score Distribution</h3>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { range: '90–100', label: 'Excellent', count: applications.filter(a => (a.uw_risk_score || 0) >= 90).length, bg: 'bg-emerald-600' },
                  { range: '75–89', label: 'Very Good', count: applications.filter(a => (a.uw_risk_score || 0) >= 75 && (a.uw_risk_score || 0) < 90).length, bg: 'bg-emerald-400' },
                  { range: '60–74', label: 'Good', count: applications.filter(a => (a.uw_risk_score || 0) >= 60 && (a.uw_risk_score || 0) < 75).length, bg: 'bg-amber-400' },
                  { range: '40–59', label: 'Fair', count: applications.filter(a => (a.uw_risk_score || 0) >= 40 && (a.uw_risk_score || 0) < 60).length, bg: 'bg-orange-400' },
                  { range: '0–39', label: 'High Risk', count: applications.filter(a => a.uw_risk_score != null && (a.uw_risk_score || 0) < 40).length, bg: 'bg-red-500' },
                ].map(({ range, label, count, bg }) => (
                  <div key={range} className="text-center">
                    <div className={`${bg} rounded-xl p-3 mb-2`}>
                      <p className="text-2xl font-bold text-white">{count}</p>
                    </div>
                    <p className="text-xs font-semibold text-slate-600">{range}</p>
                    <p className="text-xs text-slate-400">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── APPLICATIONS TAB ─── */}
        {activeTab === 'applications' && (
          <div className="space-y-4">
            {/* Filters Bar */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search applicant, email, phone..."
                  className="pl-9 rounded-xl border-slate-200 bg-slate-50 focus:bg-white" />
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {['all', 'PENDING', 'APPROVE', 'REFER', 'REJECT'].map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      filter === f ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}>{f}</button>
                ))}
              </div>
              <span className="text-xs text-slate-400 ml-auto">{filtered.length} of {applications.length}</span>
            </div>

            {/* Application Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-0 px-5 py-3 bg-slate-50 border-b border-slate-100">
                {[['Applicant', 4], ['Loan', 2], ['Amount', 2], ['AI Decision', 2], ['Score', 1], ['Actions', 1]].map(([h, span]) => (
                  <div key={h} className={`col-span-${span} text-xs font-semibold text-slate-500 uppercase tracking-wider`}>{h}</div>
                ))}
              </div>

              {loading ? (
                <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-16 text-slate-400 text-sm">No applications found</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filtered.map(app => {
                    const decision = app.uw_decision || 'PENDING';
                    const ds = decisionStyle[decision] || decisionStyle.PENDING;
                    const fraudLevel = app.uw_bureau_summary?.fraud_risk_level || 'LOW';
                    const isRunning = runningIds.has(app.id);
                    return (
                      <div key={app.id}
                        onClick={() => setSelectedApp(app)}
                        className={`grid grid-cols-12 gap-0 px-5 py-4 cursor-pointer transition-colors ${ds.row}`}>
                        {/* Applicant */}
                        <div className="col-span-4 flex items-center gap-3 min-w-0">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${ds.dot}`} />
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800 text-sm truncate">{app.full_name}</p>
                            <p className="text-xs text-slate-400 truncate">{app.email}</p>
                          </div>
                        </div>
                        {/* Loan Type */}
                        <div className="col-span-2 flex items-center">
                          <span className="text-xs text-slate-600 capitalize">{app.loan_type?.replace(/_/g, ' ')}</span>
                        </div>
                        {/* Amount */}
                        <div className="col-span-2 flex items-center">
                          <span className="text-sm font-semibold text-slate-700">₹{app.loan_amount?.toLocaleString('en-IN')}</span>
                        </div>
                        {/* Decision + Fraud */}
                        <div className="col-span-2 flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${ds.badge}`}>{decision}</span>
                          {fraudLevel !== 'LOW' && (
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${fraudStyle[fraudLevel]}`}>
                              {fraudLevel === 'HIGH' ? '⚠ HIGH' : '! MED'}
                            </span>
                          )}
                        </div>
                        {/* Score */}
                        <div className="col-span-1 flex items-center">
                          {app.uw_risk_score != null ? (
                            <div>
                              <p className={`text-sm font-bold ${app.uw_risk_score >= 70 ? 'text-emerald-600' : app.uw_risk_score >= 50 ? 'text-amber-600' : 'text-red-500'}`}>{app.uw_risk_score}</p>
                              {app.uw_bank_summary?.foir != null && <p className="text-xs text-slate-400">F:{Math.round(app.uw_bank_summary.foir * 100)}%</p>}
                            </div>
                          ) : <span className="text-slate-300 text-sm">—</span>}
                        </div>
                        {/* Actions */}
                        <div className="col-span-1 flex items-center gap-1.5 justify-end" onClick={e => e.stopPropagation()}>
                          <button onClick={(e) => runSingle(app, e)} disabled={isRunning}
                            className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors"
                            title={decision === 'PENDING' ? 'Run Engine' : 'Re-run'}>
                            {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
                          </button>
                          <button onClick={() => setSelectedApp(app)} className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── FRAUD TAB ─── */}
        {activeTab === 'fraud' && (
          <div className="space-y-5">
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { label: 'High Risk Alerts', count: stats.fraudHigh, bg: 'bg-red-50 border-red-200', text: 'text-red-700', desc: 'Auto-rejected by engine' },
                { label: 'Medium Risk', count: stats.fraudMedium, bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', desc: 'Flagged for review' },
                { label: 'Clear Applications', count: applications.filter(a => !a.uw_bureau_summary?.fraud_risk_level || a.uw_bureau_summary?.fraud_risk_level === 'LOW').length, bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', desc: 'Low fraud risk' },
              ].map(({ label, count, bg, text, desc }) => (
                <div key={label} className={`rounded-2xl border p-5 ${bg}`}>
                  <p className={`text-3xl font-bold ${text}`}>{count}</p>
                  <p className={`text-sm font-semibold ${text} mt-1`}>{label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <h3 className="font-semibold text-slate-800 text-sm">Fraud Flagged Applications</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {applications.filter(a => a.uw_bureau_summary?.fraud_risk_level && a.uw_bureau_summary.fraud_risk_level !== 'LOW').map(app => {
                  const fraudLevel = app.uw_bureau_summary?.fraud_risk_level || 'LOW';
                  return (
                    <div key={app.id} onClick={() => setSelectedApp(app)}
                      className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 cursor-pointer transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-800 text-sm">{app.full_name}</p>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${fraudStyle[fraudLevel]}`}>{fraudLevel}</span>
                        </div>
                        <p className="text-xs text-slate-400">{app.email} · ₹{app.loan_amount?.toLocaleString('en-IN')}</p>
                      </div>
                      <div className="text-xs text-slate-400">{new Date(app.created_date).toLocaleDateString('en-IN')}</div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  );
                })}
                {applications.filter(a => a.uw_bureau_summary?.fraud_risk_level && a.uw_bureau_summary.fraud_risk_level !== 'LOW').length === 0 && (
                  <div className="text-center py-12 text-slate-400 text-sm">
                    <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
                    No fraud alerts detected
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── ANALYTICS TAB ─── */}
        {activeTab === 'analytics' && (
          <div className="space-y-5">
            <div className="grid lg:grid-cols-2 gap-5">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <h3 className="font-semibold text-slate-800 text-sm mb-4">Monthly Volume & Approvals</h3>
                {monthlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={monthlyData} barSize={18}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: 12 }} />
                      <Bar dataKey="total" name="Applications" fill="#dbeafe" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="approved" name="Approved" fill="#1e40af" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-slate-400 py-10 text-sm">No data yet</p>}
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <h3 className="font-semibold text-slate-800 text-sm mb-4">Loan Type Distribution</h3>
                <div className="space-y-3">
                  {['personal', 'jewellery', 'solar', 'healthcare', 'home_decor', 'retail', 'education'].map(type => {
                    const count = applications.filter(a => a.loan_type === type).length;
                    const pct = applications.length > 0 ? (count / applications.length) * 100 : 0;
                    return (
                      <div key={type}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-500 capitalize">{type.replace(/_/g, ' ')}</span>
                          <span className="font-semibold text-slate-700">{count}</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Portfolio Health */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <h3 className="font-semibold text-slate-800 text-sm mb-4">Portfolio Health Summary</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Total Portfolio', value: `₹${(stats.totalValue / 100000).toFixed(2)}L`, sub: 'Approved value', textColor: 'text-primary' },
                  { label: 'Avg Risk Score', value: stats.avgRisk || '—', sub: 'Portfolio average', textColor: stats.avgRisk >= 70 ? 'text-emerald-600' : stats.avgRisk >= 50 ? 'text-amber-600' : 'text-red-500' },
                  { label: 'Approval Rate', value: `${stats.approvalRate}%`, sub: 'Of scored', textColor: 'text-primary' },
                  { label: 'Fraud Rate', value: `${stats.total > 0 ? Math.round((stats.fraudHigh / stats.total) * 100) : 0}%`, sub: 'High risk flags', textColor: 'text-red-500' },
                ].map(({ label, value, sub, textColor }) => (
                  <div key={label} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <p className={`text-2xl font-bold ${textColor}`}>{value}</p>
                    <p className="text-sm font-medium text-slate-700 mt-0.5">{label}</p>
                    <p className="text-xs text-slate-400">{sub}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Confidence Stats */}
            <div className="bg-slate-800 rounded-2xl p-5 text-white">
              <div className="flex items-center gap-2 mb-4">
                <Brain className="w-5 h-5 text-blue-300" />
                <h3 className="font-semibold text-sm">AI Engine Statistics</h3>
                <span className="ml-auto text-xs text-slate-400 bg-slate-700 px-2 py-1 rounded-full">v2.0 NBFC Grade</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Applications Scored', value: stats.scored },
                  { label: 'Pending Queue', value: stats.pending },
                  { label: 'Fraud Detected', value: stats.fraudHigh + stats.fraudMedium },
                  { label: 'Avg Confidence', value: applications.filter(a => a.uw_confidence_score).length > 0
                    ? Math.round(applications.filter(a => a.uw_confidence_score).reduce((s, a) => s + a.uw_confidence_score, 0) / applications.filter(a => a.uw_confidence_score).length) + '%'
                    : '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-white/10 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-white">{value}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Application Detail Modal */}
      {selectedApp && (
        <ApplicationDetailModal
          app={applications.find(a => a.id === selectedApp.id) || selectedApp}
          open={!!selectedApp}
          onClose={() => setSelectedApp(null)}
          onUpdated={fetchApplications}
        />
      )}
    </div>
  );
}
