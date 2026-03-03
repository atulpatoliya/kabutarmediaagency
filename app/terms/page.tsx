export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
      <p className="text-sm text-gray-400 mb-8">Last updated: March 2025</p>
      <div className="space-y-6 text-gray-700 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Platform Use</h2>
          <p>NewsMarket is a marketplace for buying and selling exclusive news content. By registering, you agree to use the platform lawfully and ethically.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Reporter Obligations</h2>
          <p>Reporters must only submit original, factually accurate news content. Plagiarism or fabrication will result in immediate account suspension and legal action.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Buyer Rights</h2>
          <p>Buyers receive exclusive rights to purchased content for 30 days from the date of purchase. Redistribution without consent is prohibited.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Commission &amp; Payments</h2>
          <p>NewsMarket retains 20% commission on each sale. Reporters receive the remaining 80% within 24 hours of a completed transaction.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Contact</h2>
          <p>For legal inquiries: legal@newsmarket.com</p>
        </section>
      </div>
    </div>
  );
}
