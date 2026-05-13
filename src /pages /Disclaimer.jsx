import React from 'react';
import { motion } from 'framer-motion';

export default function Disclaimer() {
  return (
    <div className="min-h-screen bg-background">
      <section className="bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-4xl font-bold text-foreground">Disclaimer</h1>
            <p className="mt-3 text-muted-foreground">Credvin Finance Private Limited</p>
          </motion.div>
        </div>
      </section>

      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="bg-card rounded-2xl border border-border p-8 space-y-8">
              <p className="text-muted-foreground leading-relaxed">
                The information provided on this website by Credvin Finance Private Limited ("Credvin") is for general informational purposes only. All information on the site is provided in good faith, however we make no representation or warranty of any kind, express or implied, regarding the accuracy, adequacy, validity, reliability, availability or completeness of any information on the site.
              </p>

              <div>
                <h2 className="text-xl font-bold text-foreground mb-3">Not Financial Advice</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Nothing on this website constitutes financial, investment, legal, or tax advice. The content is provided for informational purposes only and should not be relied upon as a substitute for professional advice. You should consult your own financial, legal, or tax advisor before making any financial decisions.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-bold text-foreground mb-3">Loan Facilitation Only</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Credvin is a technology-driven loan facilitation platform. We do not provide loans directly, nor do we make credit decisions. All loans are provided by our partner banks and NBFCs. Loan approval, interest rates, and terms are solely determined by the respective lending partner based on their credit policies.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-bold text-foreground mb-3">No Guarantee of Services</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Credvin does not guarantee the availability of any particular loan product, interest rate, or loan amount. Product availability may change without prior notice. Submission of an application does not guarantee approval or disbursement.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-bold text-foreground mb-3">Third-Party Links</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Our website may contain links to third-party websites. These links are provided for your convenience only. We have no control over the content of those sites and accept no responsibility for them or for any loss or damage that may arise from your use of them.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-bold text-foreground mb-3">Accuracy of Information</h2>
                <p className="text-muted-foreground leading-relaxed">
                  While we make every effort to ensure the accuracy of information on our website, we cannot guarantee that the content is always current, complete, or error-free. Credvin reserves the right to modify, update, or remove any content at any time without prior notice.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-bold text-foreground mb-3">Limitation of Liability</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Under no circumstances shall Credvin Finance Private Limited be liable for any direct, indirect, incidental, consequential, or punitive damages arising out of your access to, or use of, this website or the services provided herein.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-bold text-foreground mb-3">Regulatory Compliance</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Credvin operates in compliance with applicable laws and regulations. All lending partners are regulated by the Reserve Bank of India (RBI) or other appropriate regulatory authorities. Credvin itself acts as a facilitator and not as a lender.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-bold text-foreground mb-3">Contact</h2>
                <div className="p-4 bg-muted/50 rounded-xl">
                  <p className="font-semibold text-foreground">Credvin Finance Private Limited</p>
                  <p className="text-muted-foreground text-sm mt-1">Email: credvin001@gmail.com</p>
                  <p className="text-muted-foreground text-sm">Phone: 9218052816</p>
                  <p className="text-muted-foreground text-sm">Pune, Maharashtra, India</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
