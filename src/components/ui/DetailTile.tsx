/** Recuadro con un dato: etiqueta, valor y una nota opcional debajo. */
export function DetailTile({
  label,
  value,
  caption,
}: {
  label: string
  value: string
  caption?: string
}) {
  return (
    <div className="rounded-lg bg-muted px-2.5 py-2">
      <dt className="text-fg-muted">{label}</dt>
      <dd className="mt-0.5 truncate font-medium text-fg tabular-nums">{value}</dd>
      {caption && <dd className="truncate text-fg-subtle">{caption}</dd>}
    </div>
  )
}
