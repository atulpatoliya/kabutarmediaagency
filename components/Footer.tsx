import Link from 'next/link';
import Image from 'next/image';
import { Newspaper, Mail, Phone, MapPin } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Brand */}
        <div className="col-span-1 md:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Image
              src="/Kabutar media logo.webp"
              alt="Kabutar Media"
              width={40}
              height={40}
              className="rounded-md object-contain"
            />
            <span className="text-white font-bold text-xl">Kabutar Media</span>
          </div>
          <p className="text-sm text-gray-400 leading-relaxed max-w-sm">
            India&apos;s leading marketplace for exclusive news stories. Connecting verified
            reporters with media agencies.
          </p>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              <span>support@newsmarket.com</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-primary" />
              <span>+91 1234567890</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <span>Mumbai, Maharashtra, India</span>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h3 className="text-white font-semibold mb-4">Quick Links</h3>
          <ul className="space-y-2 text-sm">
            {[
              { href: '/marketplace', label: 'Marketplace' },
              { href: '/apply-reporter', label: 'Become a Reporter' },
              { href: '/login', label: 'Sign In' },
              { href: '/signup', label: 'Create Account' },
            ].map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-primary transition-colors">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Legal */}
        <div>
          <h3 className="text-white font-semibold mb-4">Legal</h3>
          <ul className="space-y-2 text-sm">
            {[
              { href: '/terms', label: 'Terms of Service' },
              { href: '/privacy', label: 'Privacy Policy' },
              { href: '/support', label: 'Support Center' },
            ].map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-primary transition-colors">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-gray-800 py-4 text-center text-xs text-gray-500">
        <p>© {new Date().getFullYear()} Kabutar Media. All rights reserved.</p>
      </div>
    </footer>
  );
}