import { AuthShell } from '@/components/auth-shell';
import { LoginForm } from '@/components/login-form';

export const metadata = { title: 'Masuk · UNICAL ASSOCIATES REPO' };

export default function MasukPage() {
  return (
    <AuthShell
      title="Masuk"
      subtitle="Gunakan email institusi untuk mengakses repositori."
    >
      <LoginForm />
    </AuthShell>
  );
}
