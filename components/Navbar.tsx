import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link href="/" className="flex-shrink-0 flex items-center">
              <span className="text-xl font-bold text-blue-900">ExclusiveNews</span>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/marketplace" className="text-gray-700 hover:text-blue-900 px-3 py-2 rounded-md text-sm font-medium">Marketplace</Link>
            <Link href="/login" className="text-gray-700 hover:text-blue-900 px-3 py-2 rounded-md text-sm font-medium">Login</Link>
            <Link href="/signup" className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-medium">Sign Up</Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
