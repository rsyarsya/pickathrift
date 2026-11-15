import type { Product } from "@/modules/catalog/types";

const jacket = (chest: number, length: number, shoulder: number, sleeve: number) => [
  { label: "Lebar dada", cm: chest },
  { label: "Panjang", cm: length },
  { label: "Bahu", cm: shoulder },
  { label: "Lengan", cm: sleeve },
];

const photo = (name: string, count = 1) => Array<string>(count).fill(`/products/${name}.jpg`);

export const PRODUCTS: Product[] = [
  {
    id: "work-jacket-olive",
    name: "Work jacket · olive",
    brand: "Carhartt",
    category: "Jaket",
    size: "L",
    condition: "Sangat baik",
    style: "Workwear",
    color: "Olive",
    price: 185000,
    status: "available",
    images: photo("work-jacket-olive", 4),
    measurements: jacket(58, 69, 48, 62),
    createdAt: "2026-11-08T09:00:00+07:00",
  },
  {
    id: "denim-jacket-blue",
    name: "Denim jacket · blue",
    brand: "Levi's",
    category: "Jaket",
    size: "M",
    condition: "Baik",
    style: "Kasual",
    color: "Biru",
    price: 165000,
    status: "reserved",
    images: photo("denim-jacket-blue"),
    measurements: jacket(54, 64, 45, 60),
    createdAt: "2026-11-07T09:00:00+07:00",
  },
];
