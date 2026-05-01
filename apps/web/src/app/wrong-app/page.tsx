import type { Metadata } from 'next';
import WrongAppContent from './wrong-app-content';

export const metadata: Metadata = {
  title: 'Wrong app · Eassy Society',
};

export default function WrongAppPage() {
  return <WrongAppContent />;
}
