import { Metadata } from 'next';
import Link from 'next/link';
import { Instagram, MapPin, Mail, Clock } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Contact Us | Cluster Fascination',
  description: 'Get in touch with the Cluster Fascination team via WhatsApp, Instagram, or visit our location.',
};

export default function ContactPage() {
  return (
    <main className="min-h-screen pt-24 pb-32 overflow-hidden bg-background">
      {/* Header Section */}
      <section className="relative w-full max-w-7xl mx-auto px-6 md:px-12 mb-16 md:mb-24">
        <div className="absolute top-10 left-10 w-64 h-64 bg-accent-gold/5 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="flex flex-col items-center text-center max-w-2xl mx-auto pt-12 md:pt-16 space-y-6">
          <span className="text-accent-gold uppercase tracking-[0.3em] text-xs font-semibold">Get in Touch</span>
          <h1 className="text-4xl md:text-5xl font-heading leading-tight tracking-wide">
            We'd love to hear from you.
          </h1>
          <p className="text-text-secondary">
            Whether you have a question about our collections, need help with an order, or just want to share your thoughts, our team is ready to assist you.
          </p>
        </div>
      </section>

      {/* Main Content: Contact Methods */}
      <section className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-2 gap-12 relative z-10">
        
        {/* Left Column: Direct Links Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* WhatsApp Direct */}
          <a 
            href="https://wa.me/916282660237" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex flex-col items-center text-center p-8 border border-border bg-card hover:border-accent-gold transition-colors duration-300 group"
          >
            <div className="w-12 h-12 rounded-full border border-border flex items-center justify-center mb-6 group-hover:border-accent-gold group-hover:text-accent-gold transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
              </svg>
            </div>
            <h3 className="font-heading text-lg mb-2">WhatsApp</h3>
            <p className="text-text-secondary text-sm mb-4">Message us directly for quick assistance.</p>
            <span className="text-xs uppercase tracking-widest text-accent-gold mt-auto font-medium">Chat Now</span>
          </a>

          {/* WhatsApp Group */}
          <a 
            href="https://chat.whatsapp.com/CNiGdxAEIAh3VxRXFo6Yyc" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex flex-col items-center text-center p-8 border border-border bg-card hover:border-accent-gold transition-colors duration-300 group"
          >
            <div className="w-12 h-12 rounded-full border border-border flex items-center justify-center mb-6 group-hover:border-accent-gold group-hover:text-accent-gold transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <h3 className="font-heading text-lg mb-2">Community Group</h3>
            <p className="text-text-secondary text-sm mb-4">Join our VIP group for exclusive updates.</p>
            <span className="text-xs uppercase tracking-widest text-accent-gold mt-auto font-medium">Join Group</span>
          </a>

          {/* Instagram */}
          <a 
            href="https://www.instagram.com/clusterfascination?igsh=MXJhamx5ejljdWkzZQ==" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex flex-col items-center text-center p-8 border border-border bg-card hover:border-accent-gold transition-colors duration-300 group"
          >
            <div className="w-12 h-12 rounded-full border border-border flex items-center justify-center mb-6 group-hover:border-accent-gold group-hover:text-accent-gold transition-colors">
              <Instagram className="w-6 h-6" />
            </div>
            <h3 className="font-heading text-lg mb-2">Instagram</h3>
            <p className="text-text-secondary text-sm mb-4">Follow us for styling tips and new drops.</p>
            <span className="text-xs uppercase tracking-widest text-accent-gold mt-auto font-medium">Follow Us</span>
          </a>

          {/* Google Details */}
          <a 
            href="https://share.google/4HYEkxNDVewBf09NS" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex flex-col items-center text-center p-8 border border-border bg-card hover:border-accent-gold transition-colors duration-300 group"
          >
            <div className="w-12 h-12 rounded-full border border-border flex items-center justify-center mb-6 group-hover:border-accent-gold group-hover:text-accent-gold transition-colors">
              <MapPin className="w-6 h-6" />
            </div>
            <h3 className="font-heading text-lg mb-2">Location</h3>
            <p className="text-text-secondary text-sm mb-4">Find us on Google and share your feedback!</p>
            <span className="text-xs uppercase tracking-widest text-accent-gold mt-auto font-medium">View Map</span>
          </a>
        </div>

        {/* Right Column: Contact Information */}
        <div className="bg-card border border-border p-8 md:p-12 h-full flex flex-col justify-center relative overflow-hidden">
          <div className="absolute bottom-0 right-0 w-48 h-48 bg-accent-gold/5 blur-[80px] rounded-full pointer-events-none" />
          
          <h2 className="text-2xl font-heading mb-8 relative z-10">Store Information</h2>
          
          <ul className="space-y-8 relative z-10">
            <li className="flex items-start gap-4">
              <MapPin className="w-5 h-5 text-accent-gold shrink-0 mt-0.5" />
              <div>
                <strong className="block text-sm font-medium mb-1">Our Location</strong>
                <p className="text-text-secondary text-sm leading-relaxed">
                  Kazhakkoottam<br />
                  Thiruvananthapuram, Kerala<br />
                  India
                </p>
              </div>
            </li>
            
            <li className="flex items-start gap-4">
              <Clock className="w-5 h-5 text-accent-gold shrink-0 mt-0.5" />
              <div>
                <strong className="block text-sm font-medium mb-1">Business Hours</strong>
                <p className="text-text-secondary text-sm leading-relaxed">
                  Available Online 24/7<br />
                  Customer Support: 10:00 AM - 11:00 PM (IST)
                </p>
              </div>
            </li>
            
            <li className="flex items-start gap-4">
              <Mail className="w-5 h-5 text-accent-gold shrink-0 mt-0.5" />
              <div>
                <strong className="block text-sm font-medium mb-1">Email Support</strong>
                <p className="text-text-secondary text-sm leading-relaxed">
                  Looking for additional help?<br />
                  <a href="mailto:support@clusterfascination.com" className="text-accent-gold hover:underline mt-1 inline-block">support@clusterfascination.com</a>
                </p>
              </div>
            </li>
          </ul>
        </div>
      </section>

      {/* Map / Bottom Accent */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 mt-20">
        <div className="w-full h-px bg-gradient-to-r from-transparent via-accent-gold/30 to-transparent" />
      </div>
    </main>
  );
}
