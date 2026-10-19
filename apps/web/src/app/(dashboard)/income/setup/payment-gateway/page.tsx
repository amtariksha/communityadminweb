import { type ReactNode } from 'react';
import { GatewayChargeCard } from '../../../settings/gateway-charge-card';
import { IncomeSetupPage } from '../setup-page';

// Income Tracker › Setup › Payment Gateway (INC-S7, INC-12).
export default function PaymentGatewaySetupPage(): ReactNode {
  return (
    <IncomeSetupPage
      title="Payment Gateway"
      description="Who bears the online-payment charge. Applies to payments started after you save."
    >
      <GatewayChargeCard />
    </IncomeSetupPage>
  );
}
