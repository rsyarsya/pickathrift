export function buyerReturnPath(value: string | null) {
  if (!value) return "/";
  const [pathname = ""] = value.split("?");
  const buyerRoute = /^\/(?:checkout\/[\w-]+|pesanan(?:\/[\w-]+)?|ulasan|profil)$/;
  return buyerRoute.test(pathname) ? value : "/";
}
