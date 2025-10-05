export type Section = { title: string; items: string[] }

function SectionList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      {items.length === 0 ? (
        <div className="text-sm text-base-content/50">No matches</div>
      ) : (
        <ul className="space-y-2">
          {items.map((it, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm text-base-content/80">
              <span className="mt-0.5">•</span>
              <span>{it}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function SectionsSidebar({ sections }: { sections: Section[] }) {
  return (
    <aside className="w-[20%] max-w-sm min-w-[240px] bg-base-200 border-r border-base-300 p-4 overflow-y-auto">
      {sections.map((sec, i) => (
        <SectionList key={i} title={sec.title} items={sec.items} />
      ))}
    </aside>
  )
}
