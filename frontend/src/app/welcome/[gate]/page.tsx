import { AuthShell } from '@/components/auth-shell';
import { LoginForm } from '@/components/login-form';

export const metadata = {
  title: 'Masuk Pengelola · UNICAL ASSOCIATES REPO',
  // Pintu pengelola tidak boleh muncul di mesin pencari.
  robots: { index: false, follow: false },
};

export default async function WelcomeGatePage({
  params,
}: {
  params: Promise<{ gate: string }>;
}) {
  const { gate } = await params;

  return (
    <AuthShell
      title="Masuk Pengelola"
      subtitle="Halaman khusus admin dan super admin."
    >
      <LoginForm gate={decodeURIComponent(gate)} />
    </AuthShell>
  );
}
