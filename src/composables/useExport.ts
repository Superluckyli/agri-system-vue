import * as XLSX from 'xlsx'

export interface ExportColumn {
  header: string
  key: string
  formatter?: (value: unknown) => string | number
}

export function useExport() {
  function exportToXlsx(
    data: Record<string, unknown>[],
    columns: ExportColumn[],
    filename: string,
  ) {
    const rows = data.map((row) =>
      Object.fromEntries(
        columns.map((col) => [
          col.header,
          col.formatter ? col.formatter(row[col.key]) : (row[col.key] ?? ''),
        ]),
      ),
    )
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
    XLSX.writeFile(wb, `${filename}.xlsx`)
  }

  return { exportToXlsx }
}
