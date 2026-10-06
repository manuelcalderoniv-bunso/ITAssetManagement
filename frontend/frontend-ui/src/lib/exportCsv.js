/** Escapes a value for CSV and wraps it in quotes when needed. */
function cell(value) {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function downloadCsv(filename, rows, columns) {
  const header = columns.map((c) => cell(c.label)).join(",");
  const body = rows
    .map((row) => columns.map((c) => cell(row[c.key])).join(","))
    .join("\n");

  // BOM so Excel opens UTF-8 correctly
  const blob = new Blob(["\uFEFF" + header + "\n" + body], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
