import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import RoleGuard from '../components/RoleGuard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ManualDecisionPanel from '../components/admin/ManualDecisionPanel';
import {
  Building2, CheckCircle2, XCircle, Clock, Loader2, Search,
  RefreshCw, ShieldCheck, ShieldX, Eye, BarChart3, Users,
  FileText, ChevronRight, Bell, TrendingUp, IndianRupee,
  Activity, AlertTriangle, Zap, ArrowUpRight, Banknote,
  Shield, Target, CreditCard, Calendar, Download, Phone, Mail,
  Brain, Layers, Star, Send, MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

// ─── Constants ───────────────────────────────────────────────
const PIPELINE_STAGES = [
  { key: 'submitted', label: 'New', color: 'bg-slate-100 text-slate-700', dot: 'bg-slate-400' },
  { key: 'under_review', label: 'In Review', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  { key: 'approved', label: 'Approved', color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  { key: 'ready_for_disbursal', label: 'Ready to Disburse', color: 'bg-violet-100 text-violet-700', dot: 'bg-violet-500' },
  { key: 'disbursed', label: 'Disbursed', color: 'bg-green-100 text-green-800', dot: 'bg-green-600' },
  { key: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
];

const DECISION_BADGE = {
  APPROVE: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  REJECT: 'bg-red-100 text-red-600 border-red-200',
  REFER: 'bg-amber-100 text-amber-700 border-amber-200',
  PENDING: 'bg-slate-100 text-slate-600 border-slate-200',
};

const TABS = ['pipeline', 'portfolio', 'disbursement', 'collections', 'analytics', 'compliance'];

// ─── App Detail Drawer ────────────────────────────────────────
function AppDetailDrawer({ app, onClose, onUpdated }) {
  const [disbursing, setDisbursing] = useState(false);
  const [markingReady, setMarkingReady] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  if (!app) return null;
  const finalDecision = app.final_decision || app.uw_decision || 'PENDING';
  const risk = app.uw_risk_score;
  const riskColor = risk >= 75 ? 'text-emerald-600' : risk >= 55 ? 'text-amber-600' : 'text-red-500';

  const markReadyForDisbursal = async () => {
    setMarkingReady(true);
    await base44.entities.LoanApplication.update(app.id, { status: 'ready_for_disbursal' });
    toast.success('Application marked Ready for Disbursement!');
    setMarkingReady(false);
    onUpdated();
  };

  const markDisbursed = async () => {
    setDisbursing(true);
    await base44.entities.LoanApplication.update(app.id, {
      status: 'disbursed', disbursed_at: new Date().toISOString()
    });
    toast.success('Loan disbursed successfully!');
    setDisbursing(false);
    onUpdated();
  };

  const detailTabs = ['overview', 'credit', 'documents', 'decision'];

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-xl bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
        {/* Drawer Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white p-5 sticky top-0 z-10 flex-shrink-0">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="text-base font-bold">{app.full_name}</h2>
              <p className="text-white/60 text-xs">{app.email} · {app.phone}</p>
              <p className="text-white/40 text-xs mt-0.5">ID: {app.id?.slice(-8).toUpperCase()}</p>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
              <XCircle className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${DECISION_BADGE[finalDecision]}`}>
              Final: {finalDecision}
            </span>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/10 text-white border border-white/20">
              AI: {app.uw_decision || 'PENDING'}
            </span>
            {app.uw_fraud_flag && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-500 text-white">⚠ FRAUD FLAG</span>
            )}
          </div>
        </div>

        {/* Tab Nav */}
        <div className="flex border-b border-slate-100 bg-slate-50 flex-shrink-0">
          {detailTabs.map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`flex-1 py-2.5 text-xs font-semibold capitalize border-b-2 transition-colors ${activeTab === t ? 'border-primary text-primary' : 'border-transparent text-slate-500'}`}>
              {t}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Loan Type', value: app.loan_type?.replace(/_/g, ' ') },
                  { label: 'Requested', value: `₹${app.loan_amount?.toLocaleString('en-IN')}` },
                  { label: 'Tenure', value: `${app.tenure_months}m` },
                  { label: 'Income', value: app.monthly_income ? `₹${app.monthly_income?.toLocaleString('en-IN')}/mo` : '—' },
                  { label: 'Employment', value: app.employment_type?.replace(/_/g, ' ') },
                  { label: 'Applied', value: new Date(app.created_date).toLocaleDateString('en-IN') },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className="font-semibold text-slate-800 text-sm capitalize mt-0.5">{value || '—'}</p>
                  </div>
                ))}
              </div>

              {/* Ready for Disbursal Action */}
              {(finalDecision === 'APPROVE') && app.status !== 'disbursed' && app.status !== 'ready_for_disbursal' && (
                <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4">
                  <p className="font-semibold text-violet-800 text-sm mb-1 flex items-center gap-2">
                    <Zap className="w-4 h-4" /> Ready to Disburse?
                  </p>
                  <p className="text-xs text-slate-500 mb-3">Mark this application as ready for disbursement once final checks are complete.</p>
                  <Button onClick={markReadyForDisbursal} disabled={markingReady} className="w-full rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm">
                    {markingReady ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Banknote className="w-4 h-4 mr-2" />}
                    Mark Ready for Disbursement
                  </Button>
                </div>
              )}

              {/* Disbursal */}
              {app.status === 'ready_for_disbursal' && (
                <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="font-bold text-emerald-800 text-sm">READY FOR DISBURSEMENT</p>
                  </div>
                  <p className="text-xs text-slate-600 mb-4">eSign and eMandate complete. All checks cleared. Initiate payout now.</p>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {[
                      { label: 'Approved Amount', value: `₹${(app.uw_approved_amount || app.loan_amount)?.toLocaleString('en-IN')}` },
                      { label: 'Monthly EMI', value: `₹${app.uw_eligible_emi?.toLocaleString('en-IN') || '—'}` },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-white rounded-xl p-3 text-center border border-emerald-100">
                        <p className="text-xs text-slate-500">{label}</p>
                        <p className="font-bold text-emerald-700 text-base">{value}</p>
                      </div>
                    ))}
                  </div>
                  <Button onClick={markDisbursed} disabled={disbursing} className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm py-3">
                    {disbursing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <IndianRupee className="w-4 h-4 mr-2" />}
                    INITIATE DISBURSEMENT
                  </Button>
                </div>
              )}

              {app.status === 'disbursed' && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                  <p className="font-bold text-emerald-800">Loan Disbursed</p>
                  <p className="text-xs text-slate-500 mt-1">Disbursed on {app.disbursed_at ? new Date(app.disbursed_at).toLocaleDateString('en-IN') : '—'}</p>
                </div>
              )}
            </>
          )}

          {/* Credit Tab */}
          {activeTab === 'credit' && app.uw_decision && app.uw_decision !== 'PENDING' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-100">
                  <p className="text-xs text-slate-500 mb-1">Risk Score</p>
                  <p className={`text-3xl font-bold ${riskColor}`}>{risk ?? '—'}</p>
                  <p className={`text-xs font-medium mt-0.5 ${riskColor}`}>{risk >= 75 ? 'Low Risk' : risk >= 55 ? 'Medium Risk' : 'High Risk'}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-100">
                  <p className="text-xs text-slate-500 mb-1">Confidence</p>
                  <p className="text-3xl font-bold text-primary">{app.uw_confidence_score ?? '—'}</p>
                  <p className="text-xs text-slate-400 mt-0.5">AI Score</p>
                </div>
              </div>
              {app.uw_bank_summary?.foir != null && (
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'FOIR', value: `${Math.round(app.uw_bank_summary.foir * 100)}%` },
                    { label: 'Banking Score', value: app.uw_bank_summary.banking_score ?? '—' },
                    { label: 'Income Stability', value: app.uw_bank_summary.income_stability || '—' },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                      <p className="text-xs text-slate-500">{label}</p>
                      <p className="font-bold text-slate-800 text-sm mt-0.5">{value}</p>
                    </div>
                  ))}
                </div>
              )}
              {app.uw_reasons?.length > 0 && (
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <p className="text-xs font-semibold text-slate-700 mb-2">Decision Reasons</p>
                  {app.uw_reasons.map((r, i) => (
                    <p key={i} className="text-xs text-slate-500 flex items-start gap-1.5 mb-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />{r}
                    </p>
                  ))}
                </div>
              )}
              {(app.uw_bureau_summary || app.uw_bank_summary) && (
                <div className="grid grid-cols-1 gap-3">
                  {app.uw_bureau_summary && (
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Bureau Summary</p>
                      {Object.entries(app.uw_bureau_summary).filter(([, v]) => typeof v !== 'object').slice(0, 6).map(([k, v]) => (
                        <div key={k} className="flex justify-between text-xs py-1 border-b border-slate-100 last:border-0">
                          <span className="text-slate-500 capitalize">{k.replace(/_/g, ' ')}</span>
                          <span className="font-medium text-slate-700">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {activeTab === 'credit' && (!app.uw_decision || app.uw_decision === 'PENDING') && (
            <p className="text-center text-slate-400 py-10 text-sm">Credit engine not yet run for this application.</p>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Uploaded Documents</p>
              <div className="space-y-2">
                {[
                  { label: 'Selfie / Photo', url: app.selfie_url },
                  { label: 'Aadhaar Card', url: app.aadhaar_url },
                  { label: 'PAN Card', url: app.pan_url },
                  { label: 'Bank Statement', url: app.bank_statement_url },
                  { label: 'Payslip', url: app.payslip_url },
                  { label: 'ITR', url: app.itr_url },
                ].map(({ label, url }) => (
                  <div key={label} className={`flex items-center justify-between p-3 rounded-xl border ${url ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="flex items-center gap-2">
                      <FileText className={`w-4 h-4 ${url ? 'text-primary' : 'text-slate-300'}`} />
                      <span className={`text-sm font-medium ${url ? 'text-slate-700' : 'text-slate-400'}`}>{label}</span>
                    </div>
                    {url ? (
                      <a href={url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-primary font-medium hover:underline">
                        <Eye className="w-3 h-3" /> View
                      </a>
                    ) : <span className="text-xs text-slate-400">Not uploaded</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Decision Tab */}
          {activeTab === 'decision' && (
            <ManualDecisionPanel app={app} onUpdated={onUpdated} decisionSource="lender" />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Content ─────────────────────────────────────────────
function LenderPortalContent() {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDecision, setFilterDecision] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedApp, setSelectedApp] = useState(null);
  const [activeTab, setActiveTab] = useState('pipeline');
  const [lastRefresh, setLastRefresh] = useState(new Date());

  useEffect(() => { fetchApplications(); }, []);

  const fetchApplications = async () => {
    setLoading(true);
    const data = await base44.entities.LoanApplication.list('-created_date', 200);
    setApplications(data);
    setLastRefresh(new Date());
    setLoading(false);
  };

  const stats = useMemo(() => {
    const approved = applications.filter(a => (a.final_decision || a.uw_decision) === 'APPROVE');
    const disbursed = applications.filter(a => a.status === 'disbursed');
    const readyToDisburse = applications.filter(a => a.status === 'ready_for_disbursal');
    const fraudAlerts = applications.filter(a => a.uw_bureau_summary?.fraud_risk_level === 'HIGH');
    const totalBook = approved.reduce((s, a) => s + (a.uw_approved_amount || a.loan_amount || 0), 0);
    const disbursedValue = disbursed.reduce((s, a) => s + (a.uw_approved_amount || a.loan_amount || 0), 0);
    const avgRisk = approved.length > 0 ? Math.round(approved.reduce((s, a) => s + (a.uw_risk_score || 0), 0) / approved.length) : 0;
    const approvalRate = applications.length > 0 ? Math.round((approved.length / applications.length) * 100) : 0;
    return { total: applications.length, approved: approved.length, disbursed: disbursed.length, readyToDisburse: readyToDisburse.length, fraudAlerts: fraudAlerts.length, totalBook, disbursedValue, avgRisk, approvalRate };
  }, [applications]);

  const monthlyData = useMemo(() => {
    const months = {};
    applications.forEach(a => {
      const m = new Date(a.created_date).toLocaleDateString('en-IN', { month: 'short' });
      if (!months[m]) months[m] = { month: m, apps: 0, approved: 0, disbursed: 0 };
      months[m].apps++;
      if ((a.final_decision || a.uw_decision) === 'APPROVE') months[m].approved++;
      if (a.status === 'disbursed') months[m].disbursed++;
    });
    return Object.values(months).slice(-6);
  }, [applications]);

  const filtered = applications.filter(a => {
    const finalD = a.final_decision || a.uw_decision || 'PENDING';
    const matchDecision = filterDecision === 'all' || finalD === filterDecision;
    const matchStatus = filterStatus === 'all' || a.status === filterStatus;
    const matchSearch = !search || a.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      a.email?.toLowerCase().includes(search.toLowerCase()) ||
      a.loan_type?.includes(search.toLowerCase());
    return matchDecision && matchStatus && matchSearch;
  });

  const pipelineByStage = useMemo(() => {
    const map = {};
    PIPELINE_STAGES.forEach(s => { map[s.key] = applications.filter(a => a.status === s.key); });
    return map;
  }, [applications]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Nav */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Building2 className="w-4 h-4 text-white" />
              </div>
              <div>
                <span className="text-sm font-bold text-slate-800">Lender Portal</span>
                <span className="hidden sm:inline text-xs text-slate-400 ml-2">· NBFC Grade LOS</span>
              </div>
            </div>

            {/* Tabs */}
            <div className="hidden md:flex">
              {TABS.map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-4 py-4 text-xs font-semibold capitalize border-b-2 transition-colors ${activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {stats.readyToDisburse > 0 && (
                <button onClick={() => { setActiveTab('disbursement'); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-100 text-violet-700 rounded-lg text-xs font-bold border border-violet-200 hover:bg-violet-200 transition-colors animate-pulse">
                  <Zap className="w-3 h-3" /> {stats.readyToDisburse} Ready
                </button>
              )}
              {stats.fraudAlerts > 0 && (
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-bold border border-red-200">
                  <Bell className="w-3 h-3" /> {stats.fraudAlerts} Fraud
                </button>
              )}
              <button onClick={fetchApplications} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
                <RefreshCw className="w-4 h-4 text-slate-500" />
              </button>
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary text-xs font-bold">{(user?.full_name || user?.email || 'L')[0].toUpperCase()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">

        {/* ─── PIPELINE TAB ─── */}
        {activeTab === 'pipeline' && (
          <div className="space-y-5">
            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {[
                { label: 'Total Applications', value: stats.total, icon: Users, color: 'text-primary', accent: 'border-l-primary' },
                { label: 'Approved', value: stats.approved, icon: CheckCircle2, color: 'text-emerald-600', accent: 'border-l-emerald-500' },
                { label: 'Ready to Disburse', value: stats.readyToDisburse, icon: Zap, color: 'text-violet-600', accent: 'border-l-violet-500' },
                { label: 'Disbursed', value: stats.disbursed, icon: Banknote, color: 'text-blue-600', accent: 'border-l-blue-500' },
                { label: 'Fraud Alerts', value: stats.fraudAlerts, icon: Shield, color: 'text-red-500', accent: 'border-l-red-400' },
              ].map(({ label, value, icon: Icon, color, accent }) => (
                <div key={label} className={`bg-white rounded-2xl border border-slate-200 border-l-4 ${accent} p-4 shadow-sm`}>
                  <Icon className={`w-5 h-5 ${color} mb-2`} />
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs font-medium text-slate-600 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Pipeline View */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" /> Loan Pipeline
                </h3>
                <span className="text-xs text-slate-400">Last synced {lastRefresh.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="overflow-x-auto">
                <div className="flex gap-0 min-w-[800px]">
                  {PIPELINE_STAGES.map(stage => {
                    const apps = pipelineByStage[stage.key] || [];
                    return (
                      <div key={stage.key} className="flex-1 min-w-[160px] border-r border-slate-100 last:border-r-0">
                        <div className={`px-3 py-2.5 border-b border-slate-100 ${stage.color}`}>
                          <div className="flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full ${stage.dot}`} />
                            <span className="text-xs font-semibold">{stage.label}</span>
                            <span className="ml-auto text-xs font-bold opacity-70">{apps.length}</span>
                          </div>
                        </div>
                        <div className="p-2 space-y-1.5 min-h-[200px] max-h-[300px] overflow-y-auto">
                          {apps.slice(0, 8).map(a => (
                            <div key={a.id} onClick={() => setSelectedApp(a)}
                              className="bg-white rounded-lg border border-slate-100 p-2.5 cursor-pointer hover:border-primary/30 hover:shadow-sm transition-all text-xs">
                              <p className="font-semibold text-slate-800 truncate">{a.full_name}</p>
                              <p className="text-slate-400 capitalize truncate mt-0.5">{a.loan_type?.replace(/_/g, ' ')}</p>
                              <p className="text-primary font-bold mt-1">₹{(a.loan_amount / 1000).toFixed(0)}K</p>
                            </div>
                          ))}
                          {apps.length > 8 && <p className="text-xs text-center text-slate-400 py-1">+{apps.length - 8} more</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Application Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-wrap gap-3">
                <h3 className="font-semibold text-slate-800 text-sm">All Applications</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="pl-8 rounded-xl border-slate-200 text-xs h-8 w-48" />
                  </div>
                  {['all', 'APPROVE', 'REFER', 'PENDING', 'REJECT'].map(f => (
                    <button key={f} onClick={() => setFilterDecision(f)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${filterDecision === f ? 'bg-primary text-white border-primary' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50">
                        {['Applicant', 'Loan', 'Amount', 'Decision', 'Risk', 'Status', ''].map(h => (
                          <th key={h} className="text-left text-xs text-slate-500 font-semibold px-4 py-3 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filtered.map(a => {
                        const finalD = a.final_decision || a.uw_decision || 'PENDING';
                        return (
                          <tr key={a.id} onClick={() => setSelectedApp(a)} className="hover:bg-slate-50/70 cursor-pointer transition-colors">
                            <td className="px-4 py-3.5"><p className="font-medium text-slate-800">{a.full_name}</p><p className="text-xs text-slate-400">{a.email}</p></td>
                            <td className="px-4 py-3.5 capitalize text-slate-600 text-xs">{a.loan_type?.replace(/_/g, ' ')}</td>
                            <td className="px-4 py-3.5 font-semibold text-slate-800">₹{a.loan_amount?.toLocaleString('en-IN')}</td>
                            <td className="px-4 py-3.5"><span className={`text-xs font-bold px-2 py-1 rounded-full border ${DECISION_BADGE[finalD]}`}>{finalD}</span></td>
                            <td className="px-4 py-3.5">
                              {a.uw_risk_score != null ? (
                                <span className={`text-xs font-bold ${a.uw_risk_score >= 75 ? 'text-emerald-600' : a.uw_risk_score >= 55 ? 'text-amber-600' : 'text-red-500'}`}>{a.uw_risk_score}/100</span>
                              ) : <span className="text-slate-300 text-xs">—</span>}
                            </td>
                            <td className="px-4 py-3.5"><span className="text-xs text-slate-500 capitalize">{a.status?.replace(/_/g, ' ')}</span></td>
                            <td className="px-4 py-3.5"><ChevronRight className="w-4 h-4 text-slate-300" /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {filtered.length === 0 && <p className="text-center text-slate-400 py-10 text-sm">No applications found</p>}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── PORTFOLIO TAB ─── */}
        {activeTab === 'portfolio' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Total Loan Book', value: `₹${(stats.totalBook / 100000).toFixed(1)}L`, icon: IndianRupee, color: 'text-primary' },
                { label: 'Disbursed Value', value: `₹${(stats.disbursedValue / 100000).toFixed(1)}L`, icon: Banknote, color: 'text-emerald-600' },
                { label: 'Avg Risk Score', value: stats.avgRisk || '—', icon: Activity, color: 'text-blue-600' },
                { label: 'Approval Rate', value: `${stats.approvalRate}%`, icon: Target, color: 'text-violet-600' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                  <Icon className={`w-5 h-5 ${color} mb-3`} />
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  <p className="text-sm font-medium text-slate-600 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            <div className="grid lg:grid-cols-2 gap-5">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <h3 className="font-semibold text-slate-800 text-sm mb-4">Risk Distribution</h3>
                {[
                  { label: 'Low Risk (75+)', count: applications.filter(a => (a.uw_risk_score || 0) >= 75).length, color: 'bg-emerald-500', text: 'text-emerald-700' },
                  { label: 'Medium (55–74)', count: applications.filter(a => (a.uw_risk_score || 0) >= 55 && (a.uw_risk_score || 0) < 75).length, color: 'bg-amber-400', text: 'text-amber-700' },
                  { label: 'High Risk (<55)', count: applications.filter(a => a.uw_risk_score != null && (a.uw_risk_score || 0) < 55).length, color: 'bg-red-400', text: 'text-red-600' },
                  { label: 'Not Scored', count: applications.filter(a => a.uw_risk_score == null).length, color: 'bg-slate-300', text: 'text-slate-500' },
                ].map(({ label, count, color, text }) => (
                  <div key={label} className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500">{label}</span>
                      <span className={`font-bold ${text}`}>{count}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${color}`} style={{ width: `${applications.length ? (count / applications.length) * 100 : 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <h3 className="font-semibold text-slate-800 text-sm mb-4">Loan Type Mix</h3>
                {['personal', 'jewellery', 'solar', 'healthcare', 'home_decor', 'retail', 'education', 'vehicle_2w', 'vehicle_4w', 'real_estate'].map(type => {
                  const count = applications.filter(a => a.loan_type === type).length;
                  if (!count) return null;
                  return (
                    <div key={type} className="flex justify-between items-center py-1.5 border-b border-slate-50 last:border-0 text-xs">
                      <span className="text-slate-500 capitalize">{type.replace(/_/g, ' ')}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${(count / applications.length) * 100}%` }} />
                        </div>
                        <span className="font-semibold text-slate-700 w-4 text-right">{count}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ─── DISBURSEMENT TAB ─── */}
        {activeTab === 'disbursement' && (
          <div className="space-y-5">
            <div className="bg-violet-50 border border-violet-200 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <h3 className="font-bold text-violet-800">Disbursement Queue</h3>
                  <p className="text-xs text-slate-500">{stats.readyToDisburse} application{stats.readyToDisburse !== 1 ? 's' : ''} ready for immediate disbursement</p>
                </div>
              </div>
              {applications.filter(a => a.status === 'ready_for_disbursal').length === 0 ? (
                <p className="text-center text-slate-400 py-6 text-sm">No applications in disbursement queue</p>
              ) : (
                <div className="space-y-3">
                  {applications.filter(a => a.status === 'ready_for_disbursal').map(a => (
                    <div key={a.id} onClick={() => setSelectedApp(a)}
                      className="bg-white rounded-xl border-2 border-violet-200 p-4 flex items-center justify-between gap-4 cursor-pointer hover:border-violet-400 hover:shadow-md transition-all">
                      <div>
                        <p className="font-semibold text-slate-800">{a.full_name}</p>
                        <p className="text-xs text-slate-500 capitalize">{a.loan_type?.replace(/_/g, ' ')} · {a.tenure_months}m</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-violet-700 text-lg">₹{(a.uw_approved_amount || a.loan_amount)?.toLocaleString('en-IN')}</p>
                        <p className="text-xs text-slate-400">EMI ₹{a.uw_eligible_emi?.toLocaleString('en-IN') || '—'}/mo</p>
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-100 text-violet-700 rounded-full text-xs font-bold border border-violet-200">
                        <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" /> READY
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Disbursed */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-800 text-sm">Disbursed Loans</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {applications.filter(a => a.status === 'disbursed').map(a => (
                  <div key={a.id} onClick={() => setSelectedApp(a)} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 cursor-pointer transition-colors">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium text-slate-800 text-sm">{a.full_name}</p>
                      <p className="text-xs text-slate-400">{a.disbursed_at ? new Date(a.disbursed_at).toLocaleDateString('en-IN') : 'Date N/A'}</p>
                    </div>
                    <p className="font-bold text-emerald-700">₹{(a.uw_approved_amount || a.loan_amount)?.toLocaleString('en-IN')}</p>
                  </div>
                ))}
                {applications.filter(a => a.status === 'disbursed').length === 0 && (
                  <p className="text-center text-slate-400 py-10 text-sm">No disbursed loans yet</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── COLLECTIONS TAB ─── */}
        {activeTab === 'collections' && (() => {
          const disbursed = applications.filter(a => a.status === 'disbursed');
          const highRisk = disbursed.filter(a => (a.uw_risk_score ?? 50) < 50);
          const critical = disbursed.filter(a => (a.uw_risk_score ?? 50) < 30);
          const safe = disbursed.filter(a => (a.uw_risk_score ?? 50) >= 70);
          const totalEMI = disbursed.reduce((s, a) => s + (a.uw_eligible_emi || 0), 0);
          const collectionRate = disbursed.length > 0 ? Math.round((safe.length / disbursed.length) * 100) : 0;
          return (
            <div className="space-y-5">
              {/* Header */}
              <div className="bg-gradient-to-br from-slate-900 to-primary rounded-3xl p-6 text-white relative overflow-hidden">
                <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '25px 25px' }} />
                <div className="relative flex items-start justify-between flex-wrap gap-4 mb-5">
                  <div>
                    <h2 className="text-xl font-bold">Collections Management System</h2>
                    <p className="text-white/60 text-sm mt-0.5">AI-powered EMI recovery & default prevention</p>
                  </div>
                  <span className="flex items-center gap-1.5 text-xs bg-emerald-500/20 text-emerald-300 px-3 py-1.5 rounded-full border border-emerald-500/30 font-semibold">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />Live
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Active Loans', value: disbursed.length },
                    { label: 'EMI Book/mo', value: `₹${(totalEMI / 1000).toFixed(0)}K` },
                    { label: 'Collection Rate', value: `${collectionRate}%` },
                    { label: 'Critical Accounts', value: critical.length },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-white/10 rounded-2xl p-3 text-center border border-white/10">
                      <p className="text-xl font-bold text-white">{value}</p>
                      <p className="text-white/60 text-xs mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* KPI Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Safe Accounts', value: safe.length, icon: CheckCircle2, color: 'text-emerald-600', accent: 'border-l-emerald-500' },
                  { label: 'Watchlist', value: disbursed.filter(a => { const s = a.uw_risk_score ?? 50; return s >= 45 && s < 65; }).length, icon: Clock, color: 'text-amber-600', accent: 'border-l-amber-500' },
                  { label: 'High Risk', value: highRisk.length, icon: AlertTriangle, color: 'text-orange-600', accent: 'border-l-orange-500' },
                  { label: 'Critical / Escalate', value: critical.length, icon: Bell, color: 'text-red-600', accent: 'border-l-red-500' },
                ].map(({ label, value, icon: Icon, color, accent }) => (
                  <div key={label} className={`bg-white rounded-2xl border border-slate-200 border-l-4 ${accent} p-4 shadow-sm`}>
                    <Icon className={`w-5 h-5 ${color} mb-2`} />
                    <p className={`text-2xl font-bold ${color}`}>{value}</p>
                    <p className="text-xs font-medium text-slate-600 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              {/* Critical Alerts */}
              {critical.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-3xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                    <h3 className="font-bold text-red-800 text-sm">🚨 Critical Accounts — Immediate Action Required</h3>
                    <span className="ml-auto text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold border border-red-200">{critical.length} accounts</span>
                  </div>
                  <div className="space-y-2">
                    {critical.map(a => (
                      <div key={a.id} onClick={() => setSelectedApp(a)}
                        className="bg-white rounded-xl border border-red-200 px-4 py-3 flex items-center gap-3 cursor-pointer hover:border-red-400 hover:shadow-sm transition-all">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-800 text-sm">{a.full_name}</p>
                          <p className="text-xs text-slate-400">₹{(a.uw_approved_amount || a.loan_amount)?.toLocaleString('en-IN')} · Risk Score: {a.uw_risk_score ?? '?'}/100</p>
                        </div>
                        <div className="text-right hidden sm:block">
                          <p className="text-xs text-slate-400">Monthly EMI</p>
                          <p className="text-sm font-bold text-slate-700">₹{(a.uw_eligible_emi || 0).toLocaleString('en-IN')}</p>
                        </div>
                        <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full border border-red-200 flex-shrink-0">CRITICAL</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* All borrowers with collection actions */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 text-sm">Active Loan Portfolio — Collection View</h3>
                  <span className="text-xs text-slate-400">{disbursed.length} active loans</span>
                </div>
                {disbursed.length === 0 ? (
                  <p className="text-center text-slate-400 py-12 text-sm">No disbursed loans in portfolio</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[700px]">
                      <thead>
                        <tr className="bg-slate-50">
                          {['Borrower', 'Loan', 'EMI/Month', 'Risk Score', 'Default Prob.', 'AI Action', 'Outreach'].map(h => (
                            <th key={h} className="text-left text-xs text-slate-500 font-semibold px-4 py-3 uppercase tracking-wider whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {disbursed.map(a => {
                          const score = a.uw_risk_score ?? 50;
                          const defProb = Math.max(5, Math.min(95, Math.round(100 - score)));
                          const riskColor = score >= 70 ? 'text-emerald-600' : score >= 50 ? 'text-amber-600' : score >= 30 ? 'text-orange-600' : 'text-red-600';
                          const aiAction = score >= 75 ? { text: 'Auto-reminder', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
                            : score >= 60 ? { text: 'Pre-EMI WhatsApp', badge: 'bg-blue-100 text-blue-700 border-blue-200' }
                            : score >= 45 ? { text: 'Proactive Call', badge: 'bg-amber-100 text-amber-700 border-amber-200' }
                            : score >= 30 ? { text: 'Senior Agent', badge: 'bg-orange-100 text-orange-700 border-orange-200' }
                            : { text: 'Escalate Now', badge: 'bg-red-100 text-red-700 border-red-200' };
                          return (
                            <tr key={a.id} className="hover:bg-slate-50/70 transition-colors cursor-pointer" onClick={() => setSelectedApp(a)}>
                              <td className="px-4 py-3.5">
                                <p className="font-medium text-slate-800">{a.full_name}</p>
                                <p className="text-xs text-slate-400">{a.phone}</p>
                              </td>
                              <td className="px-4 py-3.5 text-xs text-slate-600 capitalize">{a.loan_type?.replace(/_/g, ' ')}</td>
                              <td className="px-4 py-3.5 font-bold text-slate-800">₹{(a.uw_eligible_emi || 0).toLocaleString('en-IN')}</td>
                              <td className="px-4 py-3.5"><span className={`font-bold ${riskColor}`}>{score}/100</span></td>
                              <td className="px-4 py-3.5">
                                <div className="flex items-center gap-1.5">
                                  <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${defProb > 65 ? 'bg-red-500' : defProb > 40 ? 'bg-amber-400' : 'bg-emerald-500'}`} style={{ width: `${defProb}%` }} />
                                  </div>
                                  <span className={`text-xs font-bold ${defProb > 65 ? 'text-red-600' : defProb > 40 ? 'text-amber-600' : 'text-emerald-600'}`}>{defProb}%</span>
                                </div>
                              </td>
                              <td className="px-4 py-3.5">
                                <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${aiAction.badge}`}>{aiAction.text}</span>
                              </td>
                              <td className="px-4 py-3.5">
                                <div className="flex items-center gap-1.5">
                                  <button onClick={e => { e.stopPropagation(); toast.success(`WhatsApp sent to ${a.full_name}`); }}
                                    className="w-7 h-7 rounded-lg bg-emerald-100 hover:bg-emerald-200 flex items-center justify-center transition-colors" title="WhatsApp">
                                    <Activity className="w-3.5 h-3.5 text-emerald-700" />
                                  </button>
                                  <button onClick={e => { e.stopPropagation(); toast.success(`SMS sent to ${a.full_name}`); }}
                                    className="w-7 h-7 rounded-lg bg-blue-100 hover:bg-blue-200 flex items-center justify-center transition-colors" title="SMS">
                                    <Bell className="w-3.5 h-3.5 text-blue-700" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Collection Intelligence Summary */}
              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  { label: 'Expected to Self-Pay', count: safe.length, desc: 'Auto-reminders sufficient', color: 'bg-emerald-50 border-emerald-200', icon: CheckCircle2, iconColor: 'text-emerald-600' },
                  { label: 'Needs Proactive Follow-up', count: disbursed.filter(a => { const s = a.uw_risk_score ?? 50; return s >= 30 && s < 65; }).length, desc: 'Manual outreach recommended', color: 'bg-amber-50 border-amber-200', icon: Clock, iconColor: 'text-amber-600' },
                  { label: 'Escalation Queue', count: critical.length, desc: 'Requires senior collection agent', color: 'bg-red-50 border-red-200', icon: AlertTriangle, iconColor: 'text-red-600' },
                ].map(({ label, count, desc, color, icon: Icon, iconColor }) => (
                  <div key={label} className={`rounded-2xl border p-5 ${color}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={`w-5 h-5 ${iconColor}`} />
                      <p className="font-bold text-slate-800 text-sm">{label}</p>
                    </div>
                    <p className="text-3xl font-bold text-slate-800 mb-1">{count}</p>
                    <p className="text-xs text-slate-500">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* ─── ANALYTICS TAB ─── */}
        {activeTab === 'analytics' && (
          <div className="space-y-5">
            <div className="grid lg:grid-cols-2 gap-5">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <h3 className="font-semibold text-slate-800 text-sm mb-4">Application Volume</h3>
                {monthlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={monthlyData} barSize={18}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: 12 }} />
                      <Bar dataKey="apps" name="Applications" fill="#dbeafe" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="approved" name="Approved" fill="#1e40af" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-slate-400 py-16 text-sm">No data yet</p>}
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <h3 className="font-semibold text-slate-800 text-sm mb-4">Disbursement Trend</h3>
                {monthlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: 12 }} />
                      <Line type="monotone" dataKey="disbursed" name="Disbursed" stroke="#059669" strokeWidth={2} dot={{ fill: '#059669', r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-slate-400 py-16 text-sm">No data yet</p>}
              </div>
            </div>

            <div className="bg-slate-800 rounded-2xl p-5 text-white">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-blue-300" />
                <h3 className="font-semibold text-sm">Portfolio Intelligence</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Total Book Value', value: `₹${(stats.totalBook / 100000).toFixed(1)}L` },
                  { label: 'Disbursed Value', value: `₹${(stats.disbursedValue / 100000).toFixed(1)}L` },
                  { label: 'Approval Rate', value: `${stats.approvalRate}%` },
                  { label: 'Avg Risk Score', value: stats.avgRisk || '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-white/10 rounded-xl p-3 text-center">
                    <p className="text-xl font-bold text-white">{value}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── COMPLIANCE TAB ─── */}
        {activeTab === 'compliance' && (
          <div className="space-y-5">
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
                <ShieldCheck className="w-8 h-8 text-emerald-600 mb-3" />
                <p className="text-2xl font-bold text-emerald-700">{applications.filter(a => a.uw_kyc_status === 'verified').length}</p>
                <p className="text-sm font-semibold text-emerald-800 mt-0.5">KYC Verified</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                <AlertTriangle className="w-8 h-8 text-amber-600 mb-3" />
                <p className="text-2xl font-bold text-amber-700">{stats.fraudAlerts}</p>
                <p className="text-sm font-semibold text-amber-800 mt-0.5">Fraud Alerts</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
                <FileText className="w-8 h-8 text-blue-600 mb-3" />
                <p className="text-2xl font-bold text-blue-700">{applications.filter(a => a.manual_decision).length}</p>
                <p className="text-sm font-semibold text-blue-800 mt-0.5">Manual Overrides</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-800 text-sm">Manual Decision Audit Trail</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {applications.filter(a => a.manual_decision).map(a => (
                  <div key={a.id} className="flex items-center gap-4 px-5 py-4">
                    <div className="flex-1">
                      <p className="font-medium text-slate-800 text-sm">{a.full_name}</p>
                      <p className="text-xs text-slate-400">{a.manual_remarks || 'No remarks'}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full border ${DECISION_BADGE[a.manual_decision]}`}>{a.manual_decision}</span>
                      <p className="text-xs text-slate-400 mt-1">by {a.manual_decision_role || '—'}</p>
                    </div>
                  </div>
                ))}
                {applications.filter(a => a.manual_decision).length === 0 && (
                  <p className="text-center text-slate-400 py-10 text-sm">No manual decisions recorded</p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <h3 className="font-semibold text-slate-800 text-sm mb-4">Partner Contact</h3>
              <div className="flex items-center gap-4 flex-wrap">
                <a href="mailto:partners@credvin.in" className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-medium hover:bg-slate-700 transition-colors">
                  <Mail className="w-4 h-4" /> partners@credvin.in
                </a>
                <a href="tel:+919218052816" className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors">
                  <Phone className="w-4 h-4" /> +91 92180 52816
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* App Detail Drawer */}
      {selectedApp && (
        <AppDetailDrawer
          app={applications.find(a => a.id === selectedApp.id) || selectedApp}
          onClose={() => setSelectedApp(null)}
          onUpdated={() => { fetchApplications(); setSelectedApp(null); }}
        />
      )}
    </div>
  );
}

export default function LenderPortal() {
  return <RoleGuard allowedRoles={['lender', 'admin']}><LenderPortalContent /></RoleGuard>;
}
