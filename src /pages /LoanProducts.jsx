import React from 'react';
import { motion } from 'framer-motion';
import { User, Gem, Sun, HeartPulse, Sofa, ShoppingBag, GraduationCap, Smartphone, Home, Car, Bike } from 'lucide-react';
import LoanProductCard from '../components/loans/LoanProductCard';
import EMICalculator from '../components/shared/EMICalculator';
import EligibilityChecker from '../components/shared/EligibilityChecker';

const loanProducts = [
  {
    type: 'personal',
    icon: User,
    title: 'Personal Loan',
    badge: 'Popular',
    description: 'Instant funding for personal needs — weddings, vacations, emergencies, debt consolidation, and more.',
    gradient: 'from-primary to-primary/60',
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    benefits: ['No collateral required', 'Flexible repayment up to 60 months', 'Quick disbursal within 24-48 hours', 'Competitive interest rates from 10.5%'],
    eligibility: ['Age: 21-60 years', 'Minimum income: ₹15,000/month', 'Employment: Salaried or Self-employed', 'Credit score: 650+'],
    documents: ['PAN Card', 'Aadhaar Card', 'Salary Slips', 'Bank Statements', 'Photo'],
  },
  {
    type: 'education',
    icon: GraduationCap,
    title: 'Education Loan',
    badge: 'Study Now',
    description: 'Fund your education dreams — tuition fees, living expenses, study materials, and more with affordable education loans.',
    gradient: 'from-teal-500 to-teal-400',
    iconBg: 'bg-teal-100',
    iconColor: 'text-teal-600',
    benefits: ['Covers full course fees', 'Flexible repayment after course completion', 'Competitive rates from 8.5%', 'No collateral for smaller amounts'],
    eligibility: ['Age: 18-35 years', 'Admission in recognized institution', 'Co-applicant (parent/guardian) required', 'Valid ID proof'],
    documents: ['PAN Card', 'Aadhaar Card', 'Admission Letter', 'Fee Structure', 'Income Proof (Co-applicant)'],
  },
  {
    type: 'retail',
    icon: Smartphone,
    title: 'Consumer Electronics Finance',
    badge: 'Instant EMI',
    description: 'Buy smartphones, laptops, TVs, and all consumer electronics on easy no-cost EMIs. Own it today, pay over time.',
    gradient: 'from-sky-500 to-sky-400',
    iconBg: 'bg-sky-100',
    iconColor: 'text-sky-600',
    benefits: ['Zero-cost EMI on select products', 'Instant approval at partner stores', 'Tenure up to 24 months', 'No processing fee on select brands'],
    eligibility: ['Age: 21-60 years', 'Valid ID & address proof', 'Purchase at partner retail stores', 'Minimum purchase: ₹5,000'],
    documents: ['PAN Card', 'Aadhaar Card', 'Address Proof', 'Purchase Invoice'],
  },
  {
    type: 'healthcare',
    icon: HeartPulse,
    title: 'Healthcare Finance',
    badge: 'No Collateral',
    description: 'Cover medical emergencies and planned treatments at top hospitals. Don\'t let finances come in the way of health.',
    gradient: 'from-red-500 to-red-400',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-500',
    benefits: ['Zero collateral', 'Instant approval for emergencies', 'Covers all medical treatments', 'EMI starting from ₹1,000'],
    eligibility: ['Age: 21-65 years', 'Treatment at partner hospitals', 'Basic income proof', 'Valid ID proof'],
    documents: ['PAN Card', 'Aadhaar Card', 'Hospital Estimate', 'Income Proof', 'Medical Reports'],
  },
  {
    type: 'home_decor',
    icon: Sofa,
    title: 'Home Décor & Interior Finance',
    badge: 'Easy EMI',
    description: 'Transform your home with premium furniture, interior design, and renovation financing. Live in the home you deserve.',
    gradient: 'from-violet-500 to-violet-400',
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-600',
    benefits: ['No down payment options', 'Flexible EMI plans up to 48 months', 'Partner store discounts', 'Quick processing in 24 hours'],
    eligibility: ['Age: 21-60 years', 'Minimum income: ₹15,000/month', 'Salaried or Self-employed'],
    documents: ['PAN Card', 'Aadhaar Card', 'Salary Slips', 'Bank Statements', 'Interior Quotation'],
  },
  {
    type: 'jewellery',
    icon: Gem,
    title: 'Jewellery Loan',
    badge: 'Secured',
    description: 'Unlock the value of your gold and jewellery. Get instant liquidity without selling your precious assets.',
    gradient: 'from-amber-500 to-amber-400',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    benefits: ['Low interest rates from 7%', 'Up to 75% of gold value', 'No income proof required', 'Same-day disbursement'],
    eligibility: ['Age: 18-70 years', 'Gold purity: 18-24 karat', 'Minimum gold weight: 10 grams'],
    documents: ['PAN Card', 'Aadhaar Card', 'Gold/Jewellery', 'Photo'],
  },
  {
    type: 'real_estate',
    icon: Home,
    title: 'Real Estate Finance',
    badge: 'High Value',
    description: 'Finance your dream home, plot purchase, or commercial property with flexible long-tenure real estate loans.',
    gradient: 'from-orange-500 to-orange-400',
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
    benefits: ['High loan amounts up to ₹2 Crore', 'Long tenure up to 20 years', 'Competitive rates from 8.75%', 'Balance transfer available'],
    eligibility: ['Age: 21-65 years', 'Minimum income: ₹25,000/month', 'Credit score: 700+', 'Property in approved locations'],
    documents: ['PAN Card', 'Aadhaar Card', 'Income Proof', 'Property Documents', 'Bank Statements (12 months)'],
  },
  {
    type: 'solar',
    icon: Sun,
    title: 'Solar Finance',
    badge: 'Green Energy',
    description: 'Finance your rooftop solar systems and cut electricity bills by up to 90%. Go green with zero upfront investment.',
    gradient: 'from-green-500 to-green-400',
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    benefits: ['Up to 100% financing', 'Tenure up to 7 years', 'Save up to 90% on electricity', 'Govt. subsidy assistance available'],
    eligibility: ['Property owner or tenant', 'Minimum income: ₹20,000/month', 'Valid address proof', 'Age: 21-65 years'],
    documents: ['PAN Card', 'Aadhaar Card', 'Property Documents', 'Electricity Bill', 'Income Proof'],
  },
  {
    type: 'vehicle_2w',
    icon: Bike,
    title: 'Two-Wheeler Loan',
    badge: 'Easy Ride',
    description: 'Own your dream two-wheeler — bikes, scooters, and electric vehicles — with minimal down payment and quick approvals.',
    gradient: 'from-lime-500 to-lime-400',
    iconBg: 'bg-lime-100',
    iconColor: 'text-lime-600',
    benefits: ['Up to 95% on-road financing', 'Tenure up to 48 months', 'Same-day approval', 'Available for electric vehicles too'],
    eligibility: ['Age: 18-60 years', 'Minimum income: ₹10,000/month', 'Valid driving licence', 'Credit score: 600+'],
    documents: ['PAN Card', 'Aadhaar Card', 'Income Proof', 'Bank Statements', 'Driving Licence', 'Quotation'],
  },
  {
    type: 'vehicle_4w',
    icon: Car,
    title: 'Four-Wheeler Loan',
    badge: 'Drive Now',
    description: 'Finance your new or pre-owned car with competitive rates, high LTV, and flexible repayment options.',
    gradient: 'from-indigo-500 to-indigo-400',
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
    benefits: ['Up to 90% on-road financing', 'Tenure up to 84 months (7 years)', 'New & pre-owned cars eligible', 'Doorstep document collection'],
    eligibility: ['Age: 21-65 years', 'Minimum income: ₹20,000/month', 'Credit score: 650+', 'Valid driving licence'],
    documents: ['PAN Card', 'Aadhaar Card', 'Income Proof', 'Bank Statements', 'Driving Licence', 'Car Quotation / RC Book'],
  },
];

export default function LoanProducts() {
  return (
    <div>
      <section className="bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-secondary font-semibold text-sm uppercase tracking-wider mb-2">Our Products</p>
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground">
              Loan Products
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Explore our comprehensive range of loan products tailored to meet your every financial need.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8">
            {loanProducts.map((loan, i) => (
              <LoanProductCard key={loan.type} loan={loan} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Tools Section */}
      <section className="py-16 lg:py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <p className="text-secondary font-semibold text-sm uppercase tracking-wider mb-2">Financial Tools</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">Plan Your Loan</h2>
          </motion.div>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <EMICalculator />
            <EligibilityChecker />
          </div>
        </div>
      </section>
    </div>
  );
}
