import { Check, X } from 'lucide-react';

type CellValue = string | boolean;

export function ComparisonTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: { feature: string; values: CellValue[] }[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="pb-3 pr-4 text-left font-semibold text-foreground">Feature</th>
            {headers.map((header) => (
              <th key={header} className="pb-3 pr-4 text-left font-semibold text-foreground">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr key={row.feature}>
              <td className="py-3 pr-4 font-medium text-foreground">{row.feature}</td>
              {row.values.map((value, i) => (
                <td key={i} className="py-3 pr-4 text-muted-foreground">
                  {typeof value === 'boolean' ? (
                    value ? (
                      <Check className="h-5 w-5 text-green-500" />
                    ) : (
                      <X className="h-5 w-5 text-red-400" />
                    )
                  ) : (
                    value
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
