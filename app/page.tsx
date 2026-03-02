import Link from "next/link";
import { ArrowRight, ShieldCheck, Newspaper, Banknote } from "lucide-react";

export default function Home() {
  return (
    <div className="bg-white">
      {/* Hero Section */}
      <div className="relative isolate px-6 pt-14 lg:px-8">
        <div className="mx-auto max-w-2xl py-32 sm:py-48 lg:py-56 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            Exclusive Digital News Marketplace
          </h1>
          <p className="mt-6 text-lg tracking-tight text-gray-600 px-4">
            The premium platform for reporters to sell exclusive news stories directly to media houses and agencies. One story. One buyer. 30 days of exclusive access.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link
              href="/marketplace"
              className="rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              Browse Marketplace
            </Link>
            <Link href="/apply-reporter" className="text-sm font-semibold leading-6 text-gray-900 group">
              Apply as a Reporter <ArrowRight className="inline w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>

      {/* Feature Section */}
      <div className="bg-gray-50 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-blue-600">Secure & Exclusive</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Everything you need to buy and sell news
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-2 lg:gap-y-16">
              <div className="relative pl-16">
                <dt className="text-base font-semibold leading-7 text-gray-900">
                  <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                    <ShieldCheck className="h-6 w-6 text-white" aria-hidden="true" />
                  </div>
                  Exclusive Rights
                </dt>
                <dd className="mt-2 text-base leading-7 text-gray-600">
                  Once a story is purchased, it is removed from the marketplace immediately ensuring total exclusivity.
                </dd>
              </div>
              <div className="relative pl-16">
                <dt className="text-base font-semibold leading-7 text-gray-900">
                  <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                    <Newspaper className="h-6 w-6 text-white" aria-hidden="true" />
                  </div>
                  Verified Reporters
                </dt>
                <dd className="mt-2 text-base leading-7 text-gray-600">
                  All news content is provided by our verified reporters and undergoes administrative review before publishing.
                </dd>
              </div>
              <div className="relative pl-16">
                <dt className="text-base font-semibold leading-7 text-gray-900">
                  <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                    <Banknote className="h-6 w-6 text-white" aria-hidden="true" />
                  </div>
                  Fair Compensation
                </dt>
                <dd className="mt-2 text-base leading-7 text-gray-600">
                  Reporters set their price and get paid within 24 hours of their story being sold on the platform.
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
