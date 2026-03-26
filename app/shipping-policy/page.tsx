import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Shipping & Store Policy',
  description: 'Learn about our shipping options, delivery times, and store policies at Cluster Fascination.',
  alternates: { canonical: '/shipping-policy' },
};

export default function ShippingPolicyPage() {
  return (
    <main className="max-w-4xl mx-auto px-6 md:px-12 py-16 md:py-24 min-h-screen">
      <div className="border-b border-border pb-8 mb-12">
        <h1 className="text-3xl md:text-5xl font-heading tracking-tight">Store Policy</h1>
      </div>

      <div className="space-y-16 text-text-secondary leading-relaxed">
        
        <section>
          <h2 className="text-2xl font-heading text-text-primary mb-8 tracking-wider uppercase border-b border-border/50 pb-3">General</h2>
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-bold text-text-primary mb-2">1. Do I have to create an account to make a purchase?</h3>
              <p>You don&apos;t need any registration or account creation to browse through our store.</p>
            </div>
            <div>
              <h3 className="text-lg font-bold text-text-primary mb-2">2. How can I see my orders?</h3>
              <p>You can go to the My Orders section on the storefront and see your orders.</p>
            </div>
            <div>
              <h3 className="text-lg font-bold text-text-primary mb-2">3. Is ordering on your website secure?</h3>
              <p>Absolutely. We value your privacy and uphold your data to the highest safety standards. All transactions are completely secure and processed with secure paths via reputed payment gateways following global standards. All information is access controlled and cannot be released.</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-heading text-text-primary mb-8 tracking-wider uppercase border-b border-border/50 pb-3">Shipping</h2>
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-bold text-text-primary mb-2">1. Do you deliver Pan-India?</h3>
              <p>Yes. We serve more than 28000 pin codes across India.</p>
            </div>
            <div>
              <h3 className="text-lg font-bold text-text-primary mb-2">2. What are the general shipping or delivery timelines?</h3>
              <p>We take 24-48 hours to process your order and prepare it for logistics partner to pick-up. The logistics partner takes 4-6 days to deliver the product post pick-up.</p>
            </div>
            <div>
              <h3 className="text-lg font-bold text-text-primary mb-2">3. What are the shipping charges associated with an order?</h3>
              <p className="mb-3">Our delivery charges are as follows:</p>
              <ul className="list-disc pl-5 space-y-2 mb-3">
                <li><strong className="text-text-primary">Within Kerala:</strong> ₹49</li>
                <li><strong className="text-text-primary">Tamil Nadu, Karnataka & Andhra Pradesh:</strong> ₹49</li>
                <li><strong className="text-text-primary">Other States:</strong> ₹79</li>
                <li><strong className="text-text-primary">Orders above ₹799:</strong> FREE delivery</li>
              </ul>
              <p>The applicable shipping charges will be calculated and displayed at checkout based on your delivery location.</p>
            </div>
            <div>
              <h3 className="text-lg font-bold text-text-primary mb-2">4. How do I track my order?</h3>
              <p>You can track your orders from email and Whatsapp notifications from our logistics partner.</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-heading text-text-primary mb-8 tracking-wider uppercase border-b border-border/50 pb-3">Payments</h2>
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-bold text-text-primary mb-2">1. What payment methods do you accept?</h3>
              <p className="mb-3">You can pay for your orders using any of the payment methods below:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Cards (Visa, Mastercard, Rupay, Discover, Amex)</li>
                <li>UPI</li>
                <li>Net Banking</li>
                <li>Wallets</li>
                <li>BNPL (Buy Now, Pay Later)</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-bold text-text-primary mb-2">2. Do you offer COD (Cash on Delivery)?</h3>
              <p>Yes, we offer Cash on Delivery (COD) as a payment option. You can also use other online payment methods as mentioned in the above FAQ.</p>
            </div>
            <div>
              <h3 className="text-lg font-bold text-text-primary mb-2">3. Will I get automatic refund for failed payments?</h3>
              <p>Yes. You will get an automated refund into your original payment source within 7-10 working days.</p>
            </div>
            <div>
              <h3 className="text-lg font-bold text-text-primary mb-2">4. What if I have issues with my order?</h3>
              <p>Please reach out to us from the Whatsapp icon on storefront. We will try to resolve all your issues on priority.</p>
            </div>
          </div>
        </section>

      </div>
    </main>
  );
}
