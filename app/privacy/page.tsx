export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
      <p className="text-sm text-gray-400 mb-8">Last updated: March 2025</p>
      <div className="space-y-6 text-gray-700 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Information We Collect</h2>
          <p>We collect name, email address, and professional details when you register. Payment information is processed securely by Razorpay and is never stored on our servers.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">How We Use Your Information</h2>
          <p>Your information is used to operate the platform, process payments, verify reporter identity, and send important updates about your account and transactions.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Data Security</h2>
          <p>We use industry-standard encryption and Supabase Row Level Security to protect your data. We do not sell your personal information to third parties.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Contact Us</h2>
          <p>For privacy-related questions, contact us at privacy@newsmarket.com</p>
        </section>
      </div>
    </div>
  );
}
