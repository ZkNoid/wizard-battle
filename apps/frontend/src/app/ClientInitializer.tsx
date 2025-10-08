'use client';

import dynamicImport from 'next/dynamic';

const Initializer = dynamicImport(() => import('./initializer'), {
  ssr: false,
});

export default function ClientInitializer() {
  return <Initializer />;
}
