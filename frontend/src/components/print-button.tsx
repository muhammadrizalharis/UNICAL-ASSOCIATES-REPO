'use client';

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
    >
      🖨 Cetak / Simpan PDF
    </button>
  );
}
