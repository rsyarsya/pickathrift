import { ApiError } from "@/lib/api";
import { createStore } from "@/lib/store";
import type { SessionUser } from "@/modules/auth/useSession";
import { validateProfile, type ShippingAddress } from "../address";
import { DEMO_ADDRESS } from "./fixtures";

// SEMENTARA: profil lokal sampai endpoint profil tersedia. Checkout memakai alamat yang sama.
const legacyAddresses = createStore<Record<string, ShippingAddress>>({}, "pickathrift.addresses");
const delay = () => new Promise<void>((resolve) => setTimeout(resolve, 450));
const profileDemos = ["default", "validasi", "tersimpan", "gagal-simpan"];

function addressStore(email: string) {
  return createStore<ShippingAddress | null>(null, `pickathrift.profile.${email.toLowerCase()}`);
}

export async function getShippingAddress(email: string) {
  return addressStore(email).get() ?? legacyAddresses.get()?.[email.toLowerCase()] ?? null;
}

export async function getProfile(user: SessionUser, demo: string | null): Promise<ShippingAddress> {
  await delay();
  if (demo === "gagal") throw new ApiError(503, "Profil gagal dimuat.");
  if (demo && profileDemos.includes(demo)) {
    return {
      ...DEMO_ADDRESS,
      ...(demo === "validasi" && { phone: "0812 34", postalCode: "55a81" }),
    };
  }
  return (
    (await getShippingAddress(user.email)) ?? {
      recipient: user.name,
      phone: "",
      street: "",
      city: "",
      postalCode: "",
    }
  );
}

export async function saveProfile(email: string, input: ShippingAddress, demo: string | null) {
  await delay();
  if (Object.keys(validateProfile(input)).length)
    throw new ApiError(422, "Periksa data yang ditandai.");
  if (demo === "gagal-simpan") throw new ApiError(503, "Perubahan gagal disimpan. Coba lagi.");
  const saved: ShippingAddress = {
    recipient: input.recipient.trim(),
    phone: input.phone.trim(),
    street: input.street.trim(),
    city: input.city.trim(),
    postalCode: input.postalCode.trim(),
  };
  const isDemo = Boolean(demo && profileDemos.includes(demo));
  if (!isDemo) {
    try {
      addressStore(email).set(saved, { requireStorage: true });
    } catch {
      throw new ApiError(503, "Penyimpanan profil tidak dapat diakses. Coba lagi.");
    }
  }
  return { address: saved, persisted: !isDemo };
}
