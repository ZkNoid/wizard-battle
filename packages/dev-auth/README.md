# Dev Auth Package

Development authentication package for projects with JWT-based authentication.

## Overview

This package provides a simple development authentication system with:

- Beautiful login page with Formik + Yup validation
- JWT token-based authentication
- Middleware for route protection
- Modern UI with CSS animations

## Environment Variables

Add these variables to your `.env` file:

DEV_AUTH_KEYS - SHOULD BE SPLITTED BY COMMAS WITHOUT ANY SPACING

DEV_AUTH_KEYS=key1,key2,key3,key4 - VALID
DEV_AUTH_KEYS=key1key2 key3 key4 - NOT VALID

```env
# Development Auth Configuration
DEV_AUTH_PROJECT_NAME=some-project
DEV_AUTH_SECRET=your-jwt-secret-key-here
DEV_AUTH_KEYS=key1,key2,key3,key4
```

## Usage

### 1. Create Auth Page

Create a dev auth page in your Next.js app:

PAGE SHOULD BE NAMED EXACTLY "dev-auth"

```tsx
// app/dev-auth/page.tsx
import { DevAuthPage } from '@repo/dev-auth';

export default function DevLoginPage() {
  return <DevAuthPage />;
}
```

### 2. Add Middleware

Export the auth middleware in your app's middleware:

```tsx
// middleware.ts
import { devAuthMiddleware } from '@repo/dev-auth';

export default devAuthMiddleware;

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
```

### 3. Authentication Keys

Authentication Keys should be strong enough, just use this command for generating key

```sh
openssl rand -hex 32
```

## Package Exports

- `DevAuthPage` - React component for the login page
- `devAuthMiddleware` - Next.js middleware for route protection
- `devAuthConfig` - Configuration object
- `login` - Authentication function

## Development

The package uses:

- **Formik** + **Yup** for form validation
- **jose** for JWT token handling
- **React** + **TypeScript**
- **Tailwind CSS** for styling

## Example Implementation

1. User visits protected route
2. Middleware redirects to `/dev-login` if not authenticated
3. User enters authentication key
4. JWT token is set in cookies
5. User is redirected to original destination
