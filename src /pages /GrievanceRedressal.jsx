import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { CheckCircle, MessageSquare, Clock, Phone, Mail, FileText } from 'lucide-react';

const STEPS = [
  { title: 'Submit Grievance', desc: 'Fill in the online form or write to us', icon: FileText },
  { title: 'Acknowledgement', desc: 'We acknowledge within 2 business days', icon: CheckCircle },
  { title: 'Investigation', desc: 'Our team investigates your concern', icon: Clock },
  { title: 'Resolution', desc: 'Resolution communicated within 15 days', icon: MessageSquare },
];

export default function GrievanceRedressal() {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      toast.error('Please fill all required fields');
      return;
    }
    setSubmitting(true);
    await base44.entities.ContactInquiry.create({
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      subject: `[GRIEVANCE] ${formData.subject}`,
      message: formData.message,
    });
    setSubmitted(true);
    setSubmitting(false);
    toast.success('Grievance submitted! We will respond within 2 business days.');
  };

  return (
    <div className="min-h-screen bg-background">
      <section className="bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-4xl font-bold text-foreground">Grievance Redressal</h1>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
              We are committed to resolving customer grievances promptly and fairly. Your concerns matter to us.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">

          {/* Process */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="bg-card rounded-2xl border border-border p-8">
              <h2 className="text-xl font-bold text-foreground mb-6">Our Grievance Process</h2>
              <div className="grid sm:grid-cols-4 gap-4">
                {STEPS.map((step, i) => (
                  <div key={step.title} className="text-center">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <step.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="text-xs font-bold text-primary mb-1">Step {i + 1}</div>
                    <p className="font-semibold text-foreground text-sm">{step.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{step.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Policy */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <div className="bg-card rounded-2xl border border-border p-8 space-y-6">
              <h2 className="text-xl font-bold text-foreground">Grievance Redressal Policy</h2>

              <div>
                <h3 className="font-semibold text-foreground mb-2">Scope</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  This policy applies to all grievances related to services provided by Credvin Finance Private Limited, including loan facilitation, customer service, documentation, disbursement issues, and any other service-related concerns.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">How to Lodge a Grievance</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {[
                    'Email: credvin001@gmail.com (Subject: GRIEVANCE)',
                    'Phone: +91 92180 52816 (Mon–Sat, 9AM–6PM)',
                    'Written letter to our registered office in Pune',
                    'Online form below on this page',
                  ].map(item => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />{item}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">Resolution Timelines</h3>
                <div className="grid sm:grid-cols-3 gap-3">
                  {[
                    { label: 'Acknowledgement', time: 'Within 2 Business Days', color: 'bg-blue-50 border-blue-200 text-blue-800' },
                    { label: 'Investigation', time: 'Within 7 Business Days', color: 'bg-amber-50 border-amber-200 text-amber-800' },
                    { label: 'Final Resolution', time: 'Within 15 Business Days', color: 'bg-green-50 border-green-200 text-green-800' },
                  ].map(({ label, time, color }) => (
                    <div key={label} className={`rounded-xl border p-3 text-center ${color}`}>
                      <p className="text-xs font-semibold">{label}</p>
                      <p className="text-xs mt-0.5">{time}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">Escalation</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  If you are not satisfied with the resolution provided, you may escalate your grievance to the Grievance Officer at the address below. If still unresolved, you may approach the Banking Ombudsman or appropriate regulatory authority.
                </p>
              </div>

              <div className="p-4 bg-muted/50 rounded-xl">
                <p className="font-semibold text-foreground text-sm">Grievance Officer</p>
                <p className="text-muted-foreground text-sm mt-1">Credvin Finance Private Limited</p>
                <p className="text-muted-foreground text-sm">Email: credvin001@gmail.com</p>
                <p className="text-muted-foreground text-sm">Phone: +91 92180 52816</p>
                <p className="text-muted-foreground text-sm">Pune, Maharashtra – 411001</p>
              </div>
            </div>
          </motion.div>

          {/* Grievance Form */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="bg-card rounded-2xl border border-border p-8">
              <h2 className="text-xl font-bold text-foreground mb-6">Submit a Grievance</h2>
              {submitted ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-secondary" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">Grievance Submitted</h3>
                  <p className="text-muted-foreground">We will acknowledge your grievance within 2 business days and resolve it within 15 business days.</p>
                  <Button className="mt-6 rounded-xl" onClick={() => { setSubmitted(false); setFormData({ name: '', email: '', phone: '', subject: '', message: '' }); }}>
                    Submit Another
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                      <Label>Full Name *</Label>
                      <Input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} className="mt-1" placeholder="Your full name" required />
                    </div>
                    <div>
                      <Label>Email *</Label>
                      <Input type="email" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} className="mt-1" placeholder="your@email.com" required />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                      <Label>Phone</Label>
                      <Input value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} className="mt-1" placeholder="+91 XXXXX XXXXX" />
                    </div>
                    <div>
                      <Label>Subject</Label>
                      <Input value={formData.subject} onChange={e => setFormData(p => ({ ...p, subject: e.target.value }))} className="mt-1" placeholder="Brief subject of grievance" />
                    </div>
                  </div>
                  <div>
                    <Label>Grievance Details *</Label>
                    <textarea
                      value={formData.message}
                      onChange={e => setFormData(p => ({ ...p, message: e.target.value }))}
                      rows={5}
                      placeholder="Please describe your grievance in detail..."
                      className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                      required
                    />
                  </div>
                  <Button type="submit" disabled={submitting} className="bg-primary hover:bg-primary/90 rounded-xl font-semibold px-8">
                    {submitting ? 'Submitting...' : 'Submit Grievance'}
                  </Button>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
