/*
 * Halaman sementara. Isinya cuma memastikan Tailwind, font Inter, dan token Figma
 * sudah jalan. Ganti dengan layar 01-beranda begitu mulai digarap.
 */
export default function Page() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-640 flex-col justify-center gap-16 px-24">
      <p className="text-overline text-muted">PICKATHRIFT</p>
      <h1 className="text-hero">Preloved. Reimagined</h1>
      <p className="text-body text-muted">
        Template frontend siap. Token warna, tipografi, radius, dan shadow sudah ikut board
        Foundation di Figma.
      </p>
      <div className="flex flex-wrap gap-8">
        <span className="rounded-md bg-success-bg px-12 py-6 text-helper text-success">
          Tersedia
        </span>
        <span className="rounded-md bg-warning-bg px-12 py-6 text-helper text-warning">
          Dipesan
        </span>
        <span className="rounded-md bg-sold-bg px-12 py-6 text-helper text-sold">Terjual</span>
      </div>
    </main>
  );
}
