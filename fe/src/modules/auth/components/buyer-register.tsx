import { AuthShell } from "./auth-shell";
import { BuyerRegisterContent } from "./buyer-register-content";

export function BuyerRegister() {
  return (
    <AuthShell photoSrc="/images/auth/buyer-register.png" variant="register">
      <BuyerRegisterContent />
    </AuthShell>
  );
}
