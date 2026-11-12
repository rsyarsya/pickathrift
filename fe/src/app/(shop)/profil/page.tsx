import { Suspense } from "react";
import { ProfileScreen } from "@/modules/profile/components/ProfileScreen";

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <p className="p-16" role="status">
          Memuat profil…
        </p>
      }
    >
      <ProfileScreen />
    </Suspense>
  );
}
