import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserCheck, ArrowRight, CheckCircle2, ChevronLeft, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const STEPS = [
  { label: 'Basic Profile', sub: 'Tell us a bit about yourself' },
  { label: 'Loan Requirement', sub: 'What do you need?' },
  { label: 'Verification', sub: 'Quick ID check' },
];

const EMPLOYMENT_OPTIONS = [
  { value: 'salaried', label: 'Salaried' },
  { value: 'self_employed', label: 'Self Employed' },
  { value: 'business_owner', label: 'Business Owner' },
  { value: 'freelancer', label: 'Freelancer' },
];

const LOAN_PURPOSE_OPTIONS = [
  'Personal Need', 'Medical Emergency', 'Home Renovation',
  'Education', 'Business Expansion', 'Vehicle Purchase',
  'Electronics / Consumer Goods', 'Wedding', 'Travel', 'Other',
];

export default function EligibilityChecker() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const navigate = useNavigate();

  const [data, setData] = useState({
    full_name: '', phone: '', city: '', employment_type: '',
    loan_amount: '', loan_purpose: '', monthly_income: '', existing_emi: '',
    pan: '', consent: false,
  });

  const update = (k, v) => setData(p => ({ ...p, [k]: v }));

  const canNext = () => {
    if (step === 0) return data.full_name && data.phone && data.employment_type;
    if (step === 1) return data.loan_amount && data.monthly_income;
    if (step === 2) return data.consent;
    return true;
  };

  const handleSubmit = async () => {
    setLoading(true);
    const income = parseInt(data.monthly_income) || 0;
    const amount = parseInt(data.loan_amount) || 0;
    const existingEmi = parseInt(data.existing_emi) || 0;
    const foir = income > 0 ? (existingEmi + (amount / 60)) / income : 1;
    const eligible = income >= 10000 && amount <= income * 60 && foir <= 0.6;

    setResult({
      eligible,
      maxAmount: Math.floor(income * 50),
      emi: Math.round((amount * 0.01167)),
    });

    if (eligible) {
      try {
        await base44.entities.LoanApplication.create({
          full_name: data.full_name,
          phone: data.phone,
          employment_type: data.employment_type,
          monthly_income: income,
          loan_amount: amount,
          loan_type: 'personal',
          tenure_months: 24,
          status: 'submitted',
          email: `${data.phone}@credvin.app`,
          admin_notes: `Eligibility check: city=${data.city}, purpose=${data.loan_purpose}, pan=${data.pan}`,
        });
        toast.success('Application started! Complete your details to proceed.');
      } catch (e) {}
    }
    setLoading(false);
  };

  const slideVariants = {
    enter: { x: 40, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: -40, opacity: 0 },
  };

  if (result) {
    return (
      <Card className="border-0 shadow-lg overflow-hidden">
        <CardContent className="p-0">
          {result.eligible ? (
            <div>
              <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 text-white text-center">
                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-8 h-8 text-white" />
                </div>
                <p className="text-sm font-medium text-white/80 mb-1">You are eligible for up to</p>
                <p className="text-3xl font-bold">₹{(data.monthly_income * 50 / 100000).toFixed(1)}L</p>
              </div>
              <div className="p-5 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                    <p className="text-xs text-slate-500">Est. EMI</p>
                    <p className="font-bold text-slate-800">₹{result.emi.toLocaleString('en-IN')}/mo</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                    <p className="text-xs text-slate-500">Quick Approval</p>
                    <p className="font-bold text-emerald-700">Minutes</p>
                  </div>
                </div>
                <div className="bg-blue-50 rounded-xl p-3 border border-blue-100 text-sm text-blue-800">
                  🚀 Your application journey has started! Complete full details to get final approval.
                </div>
                <Button onClick={() => navigate('/ApplyLoan')} className="w-full bg-primary hover:bg-primary/90 rounded-xl font-semibold">
                  Complete Application <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <button onClick={() => { setResult(null); setStep(0); }} className="w-full text-xs text-slate-400 hover:text-slate-600 transition-colors py-1">
                  Start Over
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3">
                <UserCheck className="w-7 h-7 text-amber-600" />
              </div>
              <p className="font-bold text-slate-800 mb-2">May Not Meet Criteria</p>
              <p className="text-sm text-slate-500 leading-relaxed mb-4">Based on the details provided, you may not qualify currently. Our team can help explore options for you.</p>
              <Button variant="outline" className="w-full rounded-xl" onClick={() => navigate('/Contact')}>Talk to Us</Button>
              <button onClick={() => { setResult(null); setStep(0); }} className="w-full text-xs text-slate-400 mt-2 hover:text-slate-600 py-1">Try Again</button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg overflow-hidden">
      <CardHeader className="pb-0 pt-5 px-5">
        <div className="flex items-center justify-between mb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <UserCheck className="w-4 h-4 text-secondary" />
            Check Eligibility
          </CardTitle>
          <span className="text-xs text-slate-400">{step + 1} of {STEPS.length}</span>
        </div>
        {/* Step indicators */}
        <div className="flex gap-1.5 mb-1">
          {STEPS.map((s, i) => (
            <div key={i} className={`flex-1 h-1 rounded-full transition-all duration-300 ${i <= step ? 'bg-primary' : 'bg-slate-200'}`} />
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-2">{STEPS[step].sub}</p>
      </CardHeader>

      <CardContent className="px-5 pb-5 pt-4">
        <AnimatePresence mode="wait">
          <motion.div key={step} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }}>

            {/* Step 1 */}
            {step === 0 && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Full Name</label>
                  <Input value={data.full_name} onChange={e => update('full_name', e.target.value)} placeholder="Your full name" className="rounded-xl" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Mobile Number</label>
                  <Input value={data.phone} onChange={e => update('phone', e.target.value)} placeholder="+91 XXXXX XXXXX" className="rounded-xl" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 block">City</label>
                  <Input value={data.city} onChange={e => update('city', e.target.value)} placeholder="Your city" className="rounded-xl" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Employment Type</label>
                  <Select value={data.employment_type} onValueChange={v => update('employment_type', v)}>
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {EMPLOYMENT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Step 2 */}
            {step === 1 && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 block">How much do you need? (₹)</label>
                  <Input type="number" value={data.loan_amount} onChange={e => update('loan_amount', e.target.value)} placeholder="e.g. 200000" className="rounded-xl" />
                  {data.loan_amount && <p className="text-xs text-primary mt-1">₹{parseInt(data.loan_amount || 0).toLocaleString('en-IN')}</p>}
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Purpose</label>
                  <Select value={data.loan_purpose} onValueChange={v => update('loan_purpose', v)}>
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select purpose" /></SelectTrigger>
                    <SelectContent>{LOAN_PURPOSE_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Monthly Income (₹)</label>
                  <Input type="number" value={data.monthly_income} onChange={e => update('monthly_income', e.target.value)} placeholder="e.g. 45000" className="rounded-xl" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Existing EMIs/month (₹) <span className="text-slate-400 font-normal">optional</span></label>
                  <Input type="number" value={data.existing_emi} onChange={e => update('existing_emi', e.target.value)} placeholder="e.g. 5000 or 0" className="rounded-xl" />
                </div>
              </div>
            )}

            {/* Step 3 */}
            {step === 2 && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 block">PAN / Aadhaar <span className="text-slate-400 font-normal">optional for now</span></label>
                  <Input value={data.pan} onChange={e => update('pan', e.target.value)} placeholder="ABCDE1234F or last 4 digits of Aadhaar" className="rounded-xl" />
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                  <p className="text-xs text-blue-700 font-medium mb-1">Why we ask this</p>
                  <p className="text-xs text-blue-600">A basic identity check helps us give you an accurate eligibility result instantly.</p>
                </div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={data.consent} onChange={e => update('consent', e.target.checked)} className="accent-primary mt-0.5" />
                  <span className="text-xs text-slate-600 leading-relaxed">
                    I agree to Credvin's <span className="text-primary underline">Terms & Conditions</span> and consent to my data being used to check loan eligibility with partner lenders.
                  </span>
                </label>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex gap-2 mt-5">
          {step > 0 && (
            <Button variant="outline" size="sm" onClick={() => setStep(s => s - 1)} className="rounded-xl">
              <ChevronLeft className="w-4 h-4" />
            </Button>
          )}
          {step < 2 ? (
            <Button onClick={() => setStep(s => s + 1)} disabled={!canNext()} className="flex-1 bg-primary hover:bg-primary/90 rounded-xl font-semibold">
              Continue <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={!canNext() || loading} className="flex-1 bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-xl font-semibold">
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Checking...</> : 'Check Eligibility'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
