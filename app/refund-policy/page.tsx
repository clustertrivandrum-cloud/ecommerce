import type { Metadata } from 'next';
import { AlertTriangle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Refund and Return Policy',
  description: 'Our refund, return, and cancellation policies for all Cluster Fascination orders.',
  alternates: { canonical: '/refund-policy' },
};

export default function RefundPolicyPage() {
  return (
    <main className="max-w-4xl mx-auto px-6 md:px-12 py-16 md:py-24 min-h-screen">
      <div className="border-b border-border pb-8 mb-10">
        <h1 className="text-3xl md:text-5xl font-heading tracking-tight">Refund and Return Policy</h1>
      </div>

      <div className="bg-[#fff3cd]/50 border-2 border-[#ffc107] rounded-xl p-6 md:p-8 mb-12">
        <h4 className="text-[#856404] text-xl font-bold mb-4 flex items-center gap-3 font-heading uppercase tracking-wider">
          <AlertTriangle className="w-6 h-6" />
          Important Policy Notice
        </h4>
        <p className="mb-2 text-[#856404] text-lg font-bold tracking-widest">
          NO COD | NO RETURNS | NO REFUNDS
        </p>
        <p className="text-[#856404] leading-relaxed m-0">
          All sales are final. Please review your order carefully before completing your purchase.
        </p>
      </div>

      <div className="space-y-12 text-text-secondary leading-relaxed">
        
        <section>
          <h2 className="text-xl font-heading text-text-primary mb-4 tracking-wider uppercase">Overview</h2>
          <p>
            At Cluster Fascination, we strive to provide the highest quality fashion jewellery & accessories products to our customers. We want to ensure you are completely satisfied with your purchase, which is why we encourage you to review product details, images, and descriptions carefully before placing your order.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-heading text-text-primary mb-4 tracking-wider uppercase">Payment Policy</h2>
          <p>
            <strong className="text-text-primary">Cash on Delivery (COD) is NOT available.</strong> All orders must be paid for online using our secure payment gateway (Razorpay) at the time of purchase. We accept Credit Cards, Debit Cards, UPI, Net Banking, and Digital Wallets.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-heading text-text-primary mb-4 tracking-wider uppercase">Return Policy</h2>
          <p className="mb-4">
            <strong className="text-text-primary">We do not accept returns or exchanges.</strong> All sales are final. Once an order is placed and confirmed, it cannot be returned or exchanged for any reason, including but not limited to:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Change of mind</li>
            <li>Size or color preferences</li>
            <li>Product not meeting expectations</li>
            <li>Accidental orders</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-heading text-text-primary mb-4 tracking-wider uppercase">Refund Policy</h2>
          <p>
            <strong className="text-text-primary">We do not offer refunds.</strong> All purchases are final and non-refundable. This policy applies to all products, regardless of the reason for the refund request.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-heading text-text-primary mb-4 tracking-wider uppercase">Defective or Damaged Products</h2>
          <p className="mb-4">
            In the rare event that you receive a product that is defective or damaged due to our error, please contact us immediately at <strong className="text-text-primary select-all">team@clusterfascination.com</strong> within 24 hours of delivery with:
          </p>
          <ul className="list-disc pl-5 space-y-2 mb-4">
            <li>Your order number</li>
            <li>Clear photographs of the defect or damage</li>
            <li>Description of the issue</li>
          </ul>
          <p>
            We will review your case and, if approved, may offer a replacement for the same product (subject to availability). This is the only exception to our no-return, no-refund policy.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-heading text-text-primary mb-4 tracking-wider uppercase">Order Cancellation</h2>
          <p>
            Orders can only be cancelled before they are shipped. Once an order has been shipped, cancellation is not possible. To cancel an order, please contact us immediately at <strong className="text-text-primary select-all">team@clusterfascination.com</strong> with your order number.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-heading text-text-primary mb-4 tracking-wider uppercase">Quality Assurance</h2>
          <p className="mb-4">
            We take great care in ensuring the quality of our products. All items are carefully inspected before shipping. We encourage customers to:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Review product descriptions, images, and specifications carefully</li>
            <li>Check sizing information before ordering</li>
            <li>Contact us with any questions before placing an order</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-heading text-text-primary mb-4 tracking-wider uppercase">Contact Us</h2>
          <p>
            If you have any questions about this policy or need assistance with your order, please contact us at <strong className="text-text-primary select-all">team@clusterfascination.com</strong>. Our customer service team is here to help ensure you have the best shopping experience possible.
          </p>
        </section>

        <div className="border-t border-border pt-8 mt-12 bg-card p-6 rounded-lg text-sm text-text-primary/70">
          <p className="italic">
            <strong className="not-italic text-text-primary">Note:</strong> By placing an order on our website, you acknowledge that you have read, understood, and agree to this Refund and Return Policy.
          </p>
        </div>

      </div>
    </main>
  );
}
