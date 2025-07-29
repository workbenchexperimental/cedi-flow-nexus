import { AuthGuard } from '@/components/pipr/AuthGuard';
import { Dashboard } from '@/components/pipr/Dashboard';

const Index = () => {
  return (
    <AuthGuard>
      <Dashboard />
    </AuthGuard>
  );
};

export default Index;
