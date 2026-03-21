import { type NextRequest, NextResponse } from 'next/server';

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Exclude login and registration pages from proxy checks
  const publicPaths = ['/login', '/master-admin/login', '/apply-buyer', '/apply-reporter', '/privacy', '/terms', '/support'];
  if (publicPaths.includes(pathname)) {
    return NextResponse.next();
  }

  // Routes that require admin access
  const adminRoutes = ['/dashboard/admin'];

  const isAdminRoute = adminRoutes.some((route) => pathname.startsWith(route));

  if (isAdminRoute) {
    const hasSupabaseAuthCookie = request.cookies
      .getAll()
      .some((cookie) => cookie.name.startsWith('sb-') && cookie.name.includes('auth-token'));

    if (!hasSupabaseAuthCookie) {
      return NextResponse.redirect(new URL('/master-admin/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};