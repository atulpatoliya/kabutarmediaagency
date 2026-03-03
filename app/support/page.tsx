export default function SupportPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Support Center</h1>
      <p className="text-gray-600 mb-8">Need help? Reach out to us and we&apos;ll get back to you within 24 hours.</p>

      <div className="grid md:grid-cols-2 gap-6 mb-10">
        <div className="bg-orange-50 border border-orange-100 rounded-xl p-6">
          <h2 className="font-semibold text-gray-900 mb-2">📧 Email Support</h2>
          <p className="text-sm text-gray-600">support@newsmarket.com</p>
          <p className="text-xs text-gray-400 mt-1">Response within 24 hours</p>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl p-6">
          <h2 className="font-semibold text-gray-900 mb-2">📞 Phone Support</h2>
          <p className="text-sm text-gray-600">+91 1234567890</p>
          <p className="text-xs text-gray-400 mt-1">Mon–Sat, 9am–6pm IST</p>
        </div>
      </div>

      <h2 className="text-xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
      <div className="space-y-4">
        {[
          { q: 'How do I sell a news story?', a: 'Apply as a reporter, get verified, then upload your story with a price.' },
          { q: 'How long does buyer access last?', a: 'Buyers get 30 days of exclusive access to purchased content.' },
          { q: 'When do reporters get paid?', a: 'Payment is processed within 24 hours of a successful sale.' },
          { q: 'How is story authenticity verified?', a: 'Our editorial team reviews every story before it goes live.' },
        ].map((faq, i) => (
          <div key={i} className="border border-gray-200 rounded-lg p-4">
            <p className="font-medium text-gray-900 mb-1">{faq.q}</p>
            <p className="text-sm text-gray-600">{faq.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
