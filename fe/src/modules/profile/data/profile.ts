import { apiData, ApiError } from "@/lib/api";
import { getToken } from "@/lib/auth-token";
import { authState, type AuthUser } from "@/modules/auth/lib/auth-service";
import {
  hasAddress,
  normalizePhone,
  validateProfile,
  type ProfileValues,
  type ShippingAddress,
} from "../address";

export type Profile = AuthUser & { phone: string; address: ShippingAddress | null };

function clearLegacyProfile(email: string) {
  try {
    localStorage.removeItem(`pickathrift.profile.${email.toLowerCase()}`);
    localStorage.removeItem("pickathrift.addresses");
  } catch {
    // Profil API tetap berfungsi ketika penyimpanan browser diblokir.
  }
}

async function requestProfile(init?: RequestInit) {
  const token = getToken();
  const userId = authState.get().user?.id;
  const profile = await apiData<Profile>("/api/users/me", init);
  if (getToken() !== token || authState.get().user?.id !== userId)
    throw new ApiError(401, "Sesi berubah. Masuk kembali untuk melanjutkan.");
  clearLegacyProfile(profile.email);
  return profile;
}

export function profileToValues(profile: Profile): ProfileValues {
  return {
    name: profile.name,
    accountPhone: profile.phone,
    recipient: "",
    phone: "",
    street: "",
    city: "",
    postalCode: "",
    ...profile.address,
  };
}

export async function getShippingAddress() {
  return (await requestProfile()).address;
}

export function getProfile(): Promise<Profile> {
  return requestProfile();
}

export async function saveProfile(input: ProfileValues, requireAddress = false) {
  if (Object.keys(validateProfile(input, requireAddress)).length)
    throw new ApiError(422, "Periksa data yang ditandai.");
  const address: ShippingAddress = {
    recipient: input.recipient.trim(),
    phone: normalizePhone(input.phone),
    street: input.street.trim(),
    city: input.city.trim(),
    postalCode: input.postalCode.trim(),
  };
  const profile = await requestProfile({
    method: "PATCH",
    body: JSON.stringify({
      name: input.name.trim(),
      phone: normalizePhone(input.accountPhone),
      ...(hasAddress(input) ? { address } : {}),
    }),
  });
  const current = authState.get();
  if (current.user?.id === profile.id)
    authState.set({
      ...current,
      user: { ...current.user, name: profile.name, address: profile.address },
    });
  return profile;
}
