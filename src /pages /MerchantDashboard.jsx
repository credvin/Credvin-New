import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import RoleGuard from '../components/RoleGuard';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Users, TrendingUp, CheckCircle2, XCircle, Clock, Loader2,
  Search, RefreshCw, ShieldCheck, AlertTriangle,
  ChevronRight, Copy, Download, Banknote, BarChart3,
  Target, Activity, ArrowUpRight, ArrowDownRight, Minus,
  IndianRupee, FileText, Brain
} from 'lucide-react';
import { toast } from 'sonner';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const decisionBadge = {
  APPROVE: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  REJECT: 'bg-red-100 text-red-600 border-red-200',
  REFER: 'bg-amber-100 text-amber-700 border-amber-200',
  PENDING: 'bg-slate-100 text-slate-600 border-slate-200',
};

function exportCSV(applications) {
  const headers = ['Name', 'Email', 'Phone', 'Loan Type', 'Amount', 'Status', 'Decision', 'Risk Score', 'Applied Date'];
  const rows = applications.map(a => [
    a.full_name, a.email, a.phone,
    a.loan_type?.replace(/_/g, ' '), a.loan_amount, a.status,
    a.final_decision || a.uw_decision || 'PENDING',
    a.uw_risk_score || '', new Date(a.created_date).toLocaleDateString('en-IN')
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${v || ''}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `credvin_merchant_report_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
  toast.success('Report downloaded!');
}

function StatCard({ label, value, sub, icon: Icon, trend, color = 'text-slate-800', bg = 'bg-white' }) {
  return (
    <div className={`${bg} rounded-2xl border border-slate-200 p-5 shadow-sm`}>
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
        {trend !== undefined && (
          <span className={`text-xs font-semibold flex items-center gap-0.5 px-2 py-1 rounded-full ${
            trend > 0 ? 'bg-emerald-100 text-emerald-700' : trend < 0 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'
          }`}>
            {trend > 0 ? <ArrowUpRight className="w-3 h-3" /> : trend < 0 ? <ArrowDownRight className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
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

function MerchantDashboardContent() {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dealerData, setDealerData] = useState(null);
  const [misMonths, setMisMonths] = useState(1);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => { if (user?.email) fetchData(); }, [user]);

  const fetchData = async () => {
    setLoading(true);
    const [dealers, apps] = await Promise.all([
      base44.entities.DealerOnboarding.filter({ email: user.email }, '-created_date', 1),
      base44.entities.LoanApplication.filter({ created_by: user.email }, '-created_date', 100),
    ]);
    if (dealers.length > 0) setDealerData(dealers[0]);
    setApplications(apps);
    setLoading(false);
  };

  const stats = useMemo(() => {
    const approved = applications.filter(a => (a.final_decision || a.uw_decision) === 'APPROVE');
    const rejected = applications.filter(a => (a.final_decision || a.uw_decision) === 'REJECT');
    const pending = applications.filter(a => !(a.final_decision || a.uw_decision) || (a.final_decision || a.uw_decision) === 'PENDING');
    const disbursed = applications.filter(a => a.status === 'disbursed');
    const totalValue = approved.reduce((s, a) => s + (a.uw_approved_amount || a.loan_amount || 0), 0);
    const avgRiskScore = applications.filter(a => a.uw_risk_score).length > 0
      ? Math.round(applications.filter(a => a.uw_risk_score).reduce((s, a) => s + a.uw_risk_score, 0) / applications.filter(a => a.uw_risk_score).length) : 0;
    return {
      total: applications.length, approved: approved.length, rejected: rejected.length,
      pending: pending.length, disbursed: disbursed.length, totalValue,
      conversionRate: applications.length > 0 ? Math.round((approved.length / applications.length) * 100) : 0,
      avgRiskScore, avgLoanAmount: applications.length > 0 ? Math.round(applications.reduce((s, a) => s + (a.loan_amount || 0), 0) / applications.length) : 0,
    };
  }, [applications]);

  // Monthly trend data
  const monthlyData = useMemo(() => {
    const months = {};
    applications.forEach(a => {
      const m = new Date(a.created_date).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
      if (!months[m]) months[m] = { month: m, total: 0, approved: 0, value: 0 };
      months[m].total++;
      if ((a.final_decision || a.uw_decision) === 'APPROVE') {
        months[m].approved++;
        months[m].value += (a.uw_approved_amount || a.loan_amount || 0);
      }
    });
    return Object.values(months).slice(-6);
  }, [applications]);

  // Loan type breakdown
  const loanTypeData = useMemo(() => {
    const types = {};
    applications.forEach(a => {
      const t = (a.loan_type || 'other').replace(/_/g, ' ');
      types[t] = (types[t] || 0) + 1;
    });
    return Object.entries(types).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [applications]);

  const PIE_COLORS = ['#1e40af', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0891b2'];

  const filtered = applications.filter(a =>
    a.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    a.email?.toLowerCase().includes(search.toLowerCase()) ||
    a.phone?.includes(search)
  );

  const getMISApplications = () => {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - Math.min(misMonths, 3));
    return applications.filter(a => new Date(a.created_date) >= cutoff);
  };

  const copyReferralLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/ApplyLoan?ref=${user?.email}`);
    toast.success('Referral link copied!');
  };

  const TABS = ['overview', 'analytics', 'emi pulse', 'applications', 'reports'];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between py-3.5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
                <span className="text-white font-bold text-sm">{(dealerData?.dealer_name || user?.full_name || 'M')[0].toUpperCase()}</span>
              </div>
              <div>
                <h1 className="text-sm font-bold text-slate-800">{dealerData?.dealer_name || user?.full_name || 'Merchant'}</h1>
                <p className="text-xs text-slate-500">Partner Merchant · {dealerData?.city || 'India'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {dealerData?.status === 'approved' && (
                <span className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-1.5 rounded-full border border-emerald-200">
                  <ShieldCheck className="w-3 h-3" /> Verified Partner
                </span>
              )}
              <button onClick={copyReferralLink} className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-slate-700">
                <Copy className="w-3 h-3" /> Referral Link
              </button>
              <button onClick={fetchData} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
                <RefreshCw className="w-4 h-4 text-slate-500" />
              </button>
            </div>
          </div>
          {/* Tab Nav */}
          <div className="flex gap-0 border-t border-slate-100 -mx-4 px-4">
            {TABS.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-4 py-2.5 text-xs font-semibold capitalize border-b-2 transition-colors ${
                  activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}>{tab}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
          <>
            {/* Incomplete Onboarding Banner */}
            {dealerData && dealerData.status !== 'approved' && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Partner onboarding is {dealerData.status}</p>
                    <p className="text-xs text-amber-700">Complete your onboarding to access all features.</p>
                  </div>
                </div>
                <Link to="/PartnerOnboarding"><Button size="sm" className="rounded-lg text-xs">Complete <ChevronRight className="w-3 h-3 ml-1" /></Button></Link>
              </div>
            )}

            {/* ─── OVERVIEW TAB ─── */}
            {activeTab === 'overview' && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  <StatCard label="Total Applications" value={stats.total} icon={Users} color="text-primary" />
                  <StatCard label="Approved" value={stats.approved} icon={CheckCircle2} color="text-emerald-600" />
                  <StatCard label="Rejected" value={stats.rejected} icon={XCircle} color="text-red-500" />
                  <StatCard label="Pending" value={stats.pending} icon={Clock} color="text-amber-600" />
                  <StatCard label="Disbursed" value={stats.disbursed} icon={Banknote} color="text-primary" />
                  <StatCard label="Approval Rate" value={`${stats.conversionRate}%`} icon={Target} color="text-primary" />
                </div>

                <div className="grid lg:grid-cols-3 gap-5">
                  {/* Approval funnel */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <h3 className="font-semibold text-slate-800 text-sm mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" />Pipeline</h3>
                    {[
                      { label: 'Applications', count: stats.total, color: 'bg-primary', pct: 100 },
                      { label: 'Approved', count: stats.approved, color: 'bg-emerald-500', pct: stats.total ? (stats.approved / stats.total) * 100 : 0 },
                      { label: 'Disbursed', count: stats.disbursed, color: 'bg-blue-500', pct: stats.total ? (stats.disbursed / stats.total) * 100 : 0 },
                    ].map(({ label, count, color, pct }) => (
                      <div key={label} className="mb-3">
                        <div className="flex justify-between text-xs mb-1"><span className="text-slate-500">{label}</span><span className="font-bold text-slate-700">{count}</span></div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    ))}
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <p className="text-xs text-slate-500">Total Approved Value</p>
                      <p className="text-xl font-bold text-slate-800">₹{(stats.totalValue / 100000).toFixed(2)}L</p>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <h3 className="font-semibold text-slate-800 text-sm mb-4">Quick Actions</h3>
                    <div className="space-y-2">
                      {[
                        { label: 'Submit New Application', icon: FileText, href: '/ApplyLoan', color: 'bg-primary text-white' },
                        { label: 'Complete Partner Onboarding', icon: ShieldCheck, href: '/PartnerOnboarding', color: 'bg-slate-800 text-white' },
                        { label: 'View Loan Products', icon: Banknote, href: '/LoanProducts', color: 'bg-slate-100 text-slate-700' },
                      ].map(({ label, icon: Icon, href, color }) => (
                        <Link key={label} to={href} className={`flex items-center gap-3 px-4 py-3 rounded-xl ${color} hover:opacity-90 transition-opacity`}>
                          <Icon className="w-4 h-4" />
                          <span className="text-sm font-medium">{label}</span>
                          <ChevronRight className="w-4 h-4 ml-auto" />
                        </Link>
                      ))}
                      <button onClick={copyReferralLink} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors w-full">
                        <Copy className="w-4 h-4" />
                        <span className="text-sm font-medium">Copy Referral Link</span>
                        <ChevronRight className="w-4 h-4 ml-auto" />
                      </button>
                    </div>
                  </div>

                  {/* Key Metrics */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <h3 className="font-semibold text-slate-800 text-sm mb-4">Key Metrics</h3>
                    <div className="space-y-4">
                      {[
                        { label: 'Avg Loan Size', value: `₹${stats.avgLoanAmount.toLocaleString('en-IN')}` },
                        { label: 'Avg Risk Score', value: stats.avgRiskScore ? `${stats.avgRiskScore}/100` : '—' },
                        { label: 'Approval Rate', value: `${stats.conversionRate}%` },
                        { label: 'Total Portfolio', value: `₹${(stats.totalValue / 100000).toFixed(1)}L` },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                          <span className="text-xs text-slate-500">{label}</span>
                          <span className="text-sm font-bold text-slate-800">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Recent Applications */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between p-5 border-b border-slate-100">
                    <h3 className="font-semibold text-slate-800 text-sm">Recent Applications</h3>
                    <button onClick={() => setActiveTab('applications')} className="text-xs text-primary font-medium hover:underline">View All</button>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {applications.slice(0, 5).map(a => {
                      const fd = a.final_decision || a.uw_decision || 'PENDING';
                      return (
                        <div key={a.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-800 text-sm truncate">{a.full_name}</p>
                            <p className="text-xs text-slate-400 capitalize">{a.loan_type?.replace(/_/g, ' ')}</p>
                          </div>
                          <p className="font-semibold text-slate-700 text-sm">₹{a.loan_amount?.toLocaleString('en-IN')}</p>
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${decisionBadge[fd]}`}>{fd}</span>
                          <p className="text-xs text-slate-400 hidden sm:block">{new Date(a.created_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ─── ANALYTICS TAB ─── */}
            {activeTab === 'analytics' && (
              <div className="space-y-5">
                <div className="grid lg:grid-cols-2 gap-5">
                  {/* Monthly Applications Chart */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <h3 className="font-semibold text-slate-800 text-sm mb-4">Monthly Application Trend</h3>
                    {monthlyData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={monthlyData} barSize={20}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                          <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: 12 }} />
                          <Bar dataKey="total" name="Applications" fill="#1e40af" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="approved" name="Approved" fill="#059669" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <p className="text-center text-slate-400 py-10 text-sm">No data yet</p>}
                  </div>

                  {/* Loan Type Distribution */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <h3 className="font-semibold text-slate-800 text-sm mb-4">Loan Type Distribution</h3>
                    {loanTypeData.length > 0 ? (
                      <div className="flex items-center gap-4">
                        <ResponsiveContainer width={140} height={140}>
                          <PieChart>
                            <Pie data={loanTypeData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={3}>
                              {loanTypeData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="flex-1 space-y-2">
                          {loanTypeData.slice(0, 5).map((item, i) => (
                            <div key={item.name} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                                <span className="text-xs text-slate-600 capitalize">{item.name}</span>
                              </div>
                              <span className="text-xs font-bold text-slate-700">{item.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : <p className="text-center text-slate-400 py-10 text-sm">No data yet</p>}
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Applications', value: stats.total, icon: Users, sub: 'All time' },
                    { label: 'Approval Rate', value: `${stats.conversionRate}%`, icon: Target, sub: 'Success ratio' },
                    { label: 'Avg Risk Score', value: stats.avgRiskScore || '—', icon: Activity, sub: 'AI credit score' },
                    { label: 'Portfolio Value', value: `₹${(stats.totalValue / 100000).toFixed(1)}L`, icon: IndianRupee, sub: 'Approved value' },
                  ].map(({ label, value, icon: Icon, sub }) => (
                    <div key={label} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                      <Icon className="w-5 h-5 text-primary mb-3" />
                      <p className="text-2xl font-bold text-slate-800">{value}</p>
                      <p className="text-sm font-medium text-slate-600 mt-0.5">{label}</p>
                      <p className="text-xs text-slate-400">{sub}</p>
                    </div>
                  ))}
                </div>

                {/* Risk Distribution */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                  <h3 className="font-semibold text-slate-800 text-sm mb-4">Credit Risk Segmentation</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Low Risk (70+)', count: applications.filter(a => (a.uw_risk_score || 0) >= 70).length, color: 'bg-emerald-50 border-emerald-200', textColor: 'text-emerald-700' },
                      { label: 'Medium (50–69)', count: applications.filter(a => (a.uw_risk_score || 0) >= 50 && (a.uw_risk_score || 0) < 70).length, color: 'bg-amber-50 border-amber-200', textColor: 'text-amber-700' },
                      { label: 'High Risk (<50)', count: applications.filter(a => a.uw_risk_score != null && (a.uw_risk_score || 0) < 50).length, color: 'bg-red-50 border-red-200', textColor: 'text-red-600' },
                      { label: 'Not Scored', count: applications.filter(a => a.uw_risk_score == null).length, color: 'bg-slate-50 border-slate-200', textColor: 'text-slate-500' },
                    ].map(({ label, count, color, textColor }) => (
                      <div key={label} className={`rounded-xl border p-4 text-center ${color}`}>
                        <p className={`text-3xl font-bold ${textColor}`}>{count}</p>
                        <p className="text-xs text-slate-600 mt-1">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ─── APPLICATIONS TAB ─── */}
            {activeTab === 'applications' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between p-5 border-b border-slate-100 flex-wrap gap-3">
                  <h3 className="font-semibold text-slate-800">All Applications ({filtered.length})</h3>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, phone..." className="pl-9 rounded-xl w-60 border-slate-200" />
                  </div>
                </div>
                {filtered.length === 0 ? (
                  <p className="text-center text-slate-400 py-12 text-sm">No applications found</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50">
                          {['Customer', 'Loan Type', 'Amount', 'Applied', 'Status', 'Decision', 'Score'].map(h => (
                            <th key={h} className="text-left text-xs text-slate-500 font-semibold px-5 py-3 uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filtered.map(a => {
                          const fd = a.final_decision || a.uw_decision || 'PENDING';
                          return (
                            <tr key={a.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="px-5 py-4"><p className="font-medium text-slate-800">{a.full_name}</p><p className="text-xs text-slate-400">{a.phone}</p></td>
                              <td className="px-5 py-4 text-slate-600 capitalize text-xs">{a.loan_type?.replace(/_/g, ' ')}</td>
                              <td className="px-5 py-4 font-semibold text-slate-800">₹{a.loan_amount?.toLocaleString('en-IN')}</td>
                              <td className="px-5 py-4 text-slate-400 text-xs">{new Date(a.created_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}</td>
                              <td className="px-5 py-4"><span className="text-xs text-slate-500 capitalize">{a.status?.replace(/_/g, ' ')}</span></td>
                              <td className="px-5 py-4"><span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${decisionBadge[fd]}`}>{fd}</span></td>
                              <td className="px-5 py-4">{a.uw_risk_score != null ? <span className={`text-xs font-bold ${a.uw_risk_score >= 70 ? 'text-emerald-600' : a.uw_risk_score >= 50 ? 'text-amber-600' : 'text-red-500'}`}>{a.uw_risk_score}/100</span> : <span className="text-slate-300 text-xs">—</span>}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ─── EMI PULSE TAB ─── */}
            {activeTab === 'emi pulse' && (
              <div className="space-y-5">
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 text-white">
                  <div className="flex items-center gap-2 mb-1">
                    <Activity className="w-5 h-5 text-blue-300" />
                    <h3 className="font-bold text-sm">Merchant EMI Pulse</h3>
                    <span className="ml-auto text-xs text-slate-400 bg-slate-700 px-2 py-0.5 rounded-full">AI-Powered</span>
                  </div>
                  <p className="text-slate-400 text-xs mb-4">Track upcoming EMIs from your customers and get AI-powered repayment insights.</p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Due This Week', value: applications.filter(a => {
                          if (!a.first_emi_date) return false;
                          const next = new Date(a.first_emi_date);
                          const now = new Date(); const week = new Date(); week.setDate(week.getDate() + 7);
                          return next >= now && next <= week;
                        }).length, color: 'text-amber-400' },
                      { label: 'Active Loans', value: applications.filter(a => a.status === 'disbursed').length, color: 'text-emerald-400' },
                      { label: 'High Risk', value: applications.filter(a => a.uw_bureau_summary?.fraud_risk_level === 'HIGH').length, color: 'text-red-400' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="bg-white/10 rounded-xl p-3 text-center">
                        <p className={`text-2xl font-bold ${color}`}>{value}</p>
                        <p className="text-slate-400 text-xs mt-0.5">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI Insights */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                  <h3 className="font-semibold text-slate-800 text-sm mb-4 flex items-center gap-2">
                    <Brain className="w-4 h-4 text-primary" />AI Repayment Insights
                  </h3>
                  <div className="space-y-3">
                    {applications.filter(a => (a.final_decision || a.uw_decision) === 'APPROVE').length > 0 ? (
                      <>
                        <div className="flex items-start gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-semibold text-emerald-800">{applications.filter(a => (a.uw_risk_score || 0) >= 70).length} customers have high repayment probability</p>
                            <p className="text-xs text-slate-500 mt-0.5">Low risk score — likely to pay on time</p>
                          </div>
                        </div>
                        {applications.filter(a => (a.uw_risk_score || 0) < 55 && a.uw_risk_score != null).length > 0 && (
                          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-semibold text-amber-800">{applications.filter(a => (a.uw_risk_score || 0) < 55 && a.uw_risk_score != null).length} customers may need follow-up</p>
                              <p className="text-xs text-slate-500 mt-0.5">Consider reaching out before EMI due date</p>
                            </div>
                          </div>
                        )}
                        <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                          <TrendingUp className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-semibold text-blue-800">Your approval rate is {stats.conversionRate}%</p>
                            <p className="text-xs text-slate-500 mt-0.5">{stats.conversionRate >= 60 ? 'Strong portfolio quality — maintain this!' : 'Focus on quality applicants to improve approval rate'}</p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <p className="text-center text-slate-400 py-6 text-sm">Submit loan applications to see AI insights</p>
                    )}
                  </div>
                </div>

                {/* Customer EMI Status Table */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100">
                    <h3 className="font-semibold text-slate-800 text-sm">Customer Repayment Tracker</h3>
                  </div>
                  {applications.filter(a => ['approved','disbursed','ready_for_disbursal','esign_pending','emandate_pending'].includes(a.status)).length === 0 ? (
                    <p className="text-center text-slate-400 py-10 text-sm">No active loan customers yet</p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {applications.filter(a => ['approved','disbursed','ready_for_disbursal','esign_pending','emandate_pending'].includes(a.status)).slice(0, 10).map(a => {
                        const riskScore = a.uw_risk_score;
                        const riskColor = riskScore >= 70 ? 'text-emerald-600 bg-emerald-50' : riskScore >= 50 ? 'text-amber-600 bg-amber-50' : 'text-red-500 bg-red-50';
                        return (
                          <div key={a.id} className="flex items-center gap-4 px-5 py-3.5">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-slate-800 text-sm truncate">{a.full_name}</p>
                              <p className="text-xs text-slate-400">EMI ₹{a.uw_eligible_emi?.toLocaleString('en-IN') || '—'}/mo · {a.tenure_months}m</p>
                            </div>
                            <div className="text-center hidden sm:block">
                              <p className="text-xs text-slate-400">Status</p>
                              <p className="text-xs font-semibold text-slate-600 capitalize">{a.status?.replace(/_/g, ' ')}</p>
                            </div>
                            {riskScore != null && (
                              <span className={`text-xs font-bold px-2 py-1 rounded-full ${riskColor}`}>{riskScore}/100</span>
                            )}
                            <div className="text-right">
                              <p className="font-semibold text-slate-700 text-sm">₹{(a.uw_approved_amount || a.loan_amount)?.toLocaleString('en-IN')}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ─── REPORTS TAB ─── */}
            {activeTab === 'reports' && (
              <div className="space-y-5">
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm max-w-lg">
                  <h3 className="font-semibold text-slate-800 text-sm mb-2">MIS Report Download</h3>
                  <p className="text-xs text-slate-500 mb-5">Export your application data as a CSV/Excel report for analysis.</p>
                  <div className="space-y-2 mb-5">
                    {[1, 2, 3].map(m => (
                      <label key={m} className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${misMonths === m ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-slate-300'}`}>
                        <input type="radio" name="mis" checked={misMonths === m} onChange={() => setMisMonths(m)} className="accent-primary" />
                        <span className="text-sm font-medium text-slate-700">Last {m} Month{m > 1 ? 's' : ''}</span>
                        <span className="ml-auto text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{getMISApplications().length} records</span>
                      </label>
                    ))}
                  </div>
                  <Button onClick={() => exportCSV(getMISApplications())} className="w-full rounded-xl bg-slate-800 hover:bg-slate-700 font-semibold">
                    <Download className="w-4 h-4 mr-2" /> Download CSV Report
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function MerchantDashboard() {
  return <RoleGuard allowedRoles={['merchant', 'admin']}><MerchantDashboardContent /></RoleGuard>;
}
