import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { User, Gem, Sun, HeartPulse, Sofa, ShoppingBag, GraduationCap, ArrowRight, Smartphone, Home, Car, Bike } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const loans = [
  { icon: User, title: 'Personal Loans', type: 'personal', description: 'Instant funding for personal needs – weddings, travel, emergencies, and more.', color: 'bg-primary/10 text-primary' },
  { icon: GraduationCap, title: 'Education Loans', type: 'education', description: 'Fund your education — tuition, living expenses, and study materials with affordable loans.', color: 'bg-teal-100 text-teal-600' },
  { icon: Smartphone, title: 'Consumer Electronics', type: 'retail', description: 'Buy smartphones, laptops, TVs and electronics on easy no-cost EMIs.', color: 'bg-sky-100 text-sky-600' },
  { icon: HeartPulse, title: 'Healthcare Loans', type: 'healthcare', description: 'Cover medical emergencies and planned treatments without financial stress.', color: 'bg-red-100 text-red-500' },
  { icon: Sofa, title: 'Home Décor & Interior', type: 'home_decor', description: 'Transform your home with furniture, interior design and improvement financing.', color: 'bg-violet-100 text-violet-600' },
  { icon: Gem, title: 'Jewellery Loans', type: 'jewellery', description: 'Unlock the value of your gold and jewellery with quick, secure loans.', color: 'bg-amber-100 text-amber-600' },
  { icon: Home, title: 'Real Estate Finance', type: 'real_estate', description: 'Finance your dream home, plot or commercial property with competitive rates.', color: 'bg-orange-100 text-orange-600' },
  { icon: Sun, title: 'Solar Loans', type: 'solar', description: 'Finance your solar energy systems and save up to 90% on electricity bills.', color: 'bg-green-100 text-green-600' },
  { icon: Bike, title: 'Two-Wheeler Loan', type: 'vehicle_2w', description: 'Own your dream bike or scooter with minimal down payment and instant approval.', color: 'bg-lime-100 text-lime-600' },
  { icon: Car, title: 'Four-Wheeler Loan', type: 'vehicle_4w', description: 'Finance your new or pre-owned car with high LTV and flexible repayment.', color: 'bg-indigo-100 text-indigo-600' },
];

export default function LoanCategories() {
  return (
    <section className="py-20 lg:py-28 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="text-center mb-14">
          <p className="text-secondary font-semibold text-sm uppercase tracking-wider mb-2">Our Products</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">Loan Solutions for Every Need</h2>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto text-lg">
            Choose from our wide range of loan products designed to help you achieve your goals.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {loans.map((loan, i) => (
            <motion.div key={loan.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.06 }}>
              <Card className="group h-full border-0 shadow-sm hover:shadow-xl transition-all duration-300 bg-card">
                <CardContent className="p-5 flex flex-col h-full">
                  <div className={`w-12 h-12 rounded-2xl ${loan.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <loan.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground mb-1.5">{loan.title}</h3>
                  <p className="text-muted-foreground leading-relaxed flex-1 text-sm">{loan.description}</p>
                  <Link to={`/ApplyLoan?type=${loan.type}`}>
                    <Button variant="ghost" className="mt-4 p-0 text-primary hover:text-primary/80 font-semibold group/btn text-sm">
                      Apply Now
                      <ArrowRight className="ml-1 w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mt-10">
          <Link to="/LoanProducts">
            <Button variant="outline" className="rounded-xl px-8 font-semibold border-primary text-primary hover:bg-primary hover:text-white">
              View All Products <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
