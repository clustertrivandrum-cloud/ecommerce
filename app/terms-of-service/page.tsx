import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms and conditions governing the use of the Cluster Fascination website and all orders.',
  alternates: { canonical: '/terms-of-service' },
};

export default function TermsOfServicePage() {
  return (
    <main className="max-w-4xl mx-auto px-6 md:px-12 py-16 md:py-24 min-h-screen">
      <div className="border-b border-border pb-8 mb-10">
        <h1 className="text-3xl md:text-5xl font-heading tracking-tight">Terms of Service</h1>
      </div>

      <div className="space-y-12 text-text-secondary leading-relaxed">
        
        <section>
          <h2 className="text-xl font-heading text-text-primary mb-4 tracking-wider uppercase">User Agreement</h2>
          <p>
            By accessing the Cluster Fascination's website, the user agrees to the accompanying terms and conditions of this site. Any orders and purchases made through this site are also governed by these terms and conditions. It is at our discretion to alter these website terms and conditions without notice at any time.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-heading text-text-primary mb-4 tracking-wider uppercase">Governing Laws</h2>
          <p>
            This website is governed by the laws and the courts of the state of Karnataka. Any orders placed on this site and use of this site must follow in accordance with applicable provincial and national law. It is the responsibility of the user to comply with said laws.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-heading text-text-primary mb-4 tracking-wider uppercase">Website Errors</h2>
          <p>
            It is our prerogative to correct any errors or inaccuracies and change or update information on this website at any time without notice. This includes price and item availability.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-heading text-text-primary mb-4 tracking-wider uppercase">Payment Terms</h2>
          <p>
            <strong className="text-text-primary">Cash on Delivery (COD) is NOT available.</strong> All orders must be paid for online at the time of purchase using our secure payment gateway. We accept Credit Cards, Debit Cards, UPI, Net Banking, and Digital Wallets through Razorpay. Payment must be completed before your order is processed and shipped. We do not accept any form of cash payment or payment on delivery.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-heading text-text-primary mb-4 tracking-wider uppercase">Refund and Return Policy</h2>
          <p>
            <strong className="text-text-primary">All sales are final.</strong> We do not accept returns, exchanges, or offer refunds for any reason, except in cases of defective or damaged products due to our error (as detailed in our Refund Policy). By placing an order, you acknowledge and agree to this policy. Please review product details carefully before completing your purchase.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-heading text-text-primary mb-4 tracking-wider uppercase">Shipping</h2>
          <p>
            All items will be delivered by a third party and delivery is therefore governed by the third party's shipping contracts. While all efforts will be made to deliver items as quickly as possible via commercial contracts, we are not responsible for delivery delays beyond our control. We maintain the right to hold shipments to certain addresses or cancel orders at our discretion.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-heading text-text-primary mb-4 tracking-wider uppercase">Links</h2>
          <p>
            This site provides links to other websites. All of these linked websites are completely independent of Cluster Fascination. We have no control of, and hold no liability for, the content and subsequent use of these aforementioned sites. Any access to websites via web links found on this website are to be utilized at the risk of the user.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-heading text-text-primary mb-4 tracking-wider uppercase">Copyright Consideration</h2>
          <p>
            All textual and graphic content on this site, its organization and presentation, and organization and domain name are the property of, and/or licensed by, Cluster Fascination. The materials on this site may not be copied, reproduced, posted, or republished in any way. The republication or use of these materials on any other website is prohibited. All copyright logos, and service marks displayed on this site are registered. Use of them is prohibited.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-heading text-text-primary mb-4 tracking-wider uppercase">Liability Disclaimer</h2>
          <p className="mb-4">
            This website should be accessed and used with discretion. Although reasonable efforts have been made to ensure the website is current and contains no inaccuracies or errors, we cannot guarantee these will not occur. When a mistake is noticed, we will correct it as soon as possible and make reasonable efforts to notify affected users. This could mean that orders not yet shipped may be cancelled or postponed. This agreement between Cluster Fascination and the user supersedes any and all prior agreements and understandings pertaining to this subject matter. We are not responsible for lost, incomplete, illegible, misdirected or stolen messages/ mail, unavailable connections, failed, incomplete, garbled, or delayed transmissions, online failures, hardware, software, or other technical malfunctions or disturbances, whether these circumstances affect, disrupt, or corrupt communications or not.
          </p>
          <p>
            Cluster Fascination, owners and employees are not liable for any damages arising out of, or related to use of or access to, our site or linked sites, whether these damages are foreseeable or not and whether or not we have been advised of the possibility, including, without limitation, direct, indirect, special, consequential, incidental or punitive damaged.
          </p>
        </section>

      </div>
    </main>
  );
}
