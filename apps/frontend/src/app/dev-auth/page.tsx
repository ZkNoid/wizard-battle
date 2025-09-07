import { DevAuthPage } from '@repo/dev-auth';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Protected Page',
  description: 'You probably arrived here by accident',
  robots: {
    index: false,
    follow: false,
  },
};

export default function DevLoginPage() {
  return <DevAuthPage />;
}
