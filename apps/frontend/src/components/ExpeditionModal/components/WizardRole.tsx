import { Button } from '@/components/shared/Button';

export default function WizardRole({ role }: { role: string }) {
  return (
    <Button variant="lightGray" className="h-15 w-35">
      <span>{role}</span>
    </Button>
  );
}
