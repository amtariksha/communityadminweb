'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { useSendOtp, useVerifyOtp } from '@/hooks';
import { getUser, setCurrentTenant } from '@/lib/auth';
import { getAdminSocieties } from '@/lib/admin-roles';

type LoginStep = 'phone' | 'otp';

export default function LoginContent(): ReactNode {
  const router = useRouter();
  const { addToast } = useToast();
  const [step, setStep] = useState<LoginStep>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');

  const sendOtp = useSendOtp();
  const verifyOtp = useVerifyOtp();

  function handleSendOtp(e: FormEvent): void {
    e.preventDefault();

    sendOtp.mutate(
      { phone: `+91${phone}` },
      {
        onSuccess() {
          setStep('otp');
        },
        onError(error) {
          addToast({
            title: 'Failed to send OTP',
            description: error.message,
            variant: 'destructive',
          });
        },
      },
    );
  }

  function handleVerifyOtp(e: FormEvent): void {
    e.preventDefault();

    verifyOtp.mutate(
      { phone: `+91${phone}`, otp },
      {
        onSuccess() {
          const user = getUser();
          if (!user) {
            router.push('/login');
            return;
          }

          if (user.isSuperAdmin) {
            router.push('/super-admin');
          } else {
            // Admin panel is restricted to admin-eligible roles only.
            // Pure residents (owner, tenant_resident, etc.) land on
            // /no-access with a pointer to the Flutter app.
            const adminSocieties = getAdminSocieties(user);
            if (adminSocieties.length === 0) {
              const reason = user.societies.length === 0 ? 'none' : 'resident';
              router.push(`/no-access?reason=${reason}`);
            } else if (adminSocieties.length === 1) {
              setCurrentTenant(adminSocieties[0].id);
              router.push('/');
            } else {
              router.push('/select-tenant');
            }
          }
        },
        onError(error) {
          addToast({
            title: 'Verification failed',
            description: error.message,
            variant: 'destructive',
          });
        },
      },
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Welcome Back</CardTitle>
        <CardDescription>Sign in to your society account</CardDescription>
      </CardHeader>
      <CardContent>
        {step === 'phone' && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="flex gap-2">
                <div className="flex h-10 items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground">
                  +91
                </div>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Enter your phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  maxLength={10}
                  required
                  autoFocus
                />
              </div>
              <p className="text-xs text-muted-foreground">
                We will send a one-time password to this number
              </p>
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={sendOtp.isPending || phone.length !== 10}
            >
              {sendOtp.isPending ? 'Sending...' : 'Send OTP'}
            </Button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="otp">Enter OTP</Label>
              <Input
                id="otp"
                type="text"
                inputMode="numeric"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                required
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                OTP sent to +91 {phone}
              </p>
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={verifyOtp.isPending || otp.length !== 6}
            >
              {verifyOtp.isPending ? 'Verifying...' : 'Verify OTP'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => {
                setStep('phone');
                setOtp('');
              }}
            >
              Change Phone Number
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
