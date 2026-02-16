
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - robots.txt (robots file)
     * - sitemap.xml (sitemap file)
     * - dev-auth (dev auth page)
     * - static files with extensions (.svg, .png, .jpg, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|dev-auth|.*\\.(?:svg|png|jpg|jpeg|gif|ico|css|woff|woff2|ttf|eot|wav|mp3|ogg)).*)',
  ],
};
