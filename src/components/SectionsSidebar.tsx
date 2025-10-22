import {useState, useEffect, useImperativeHandle, forwardRef} from 'react'
import {apiJson} from '../lib/api'

export type Section = Record<string, Entry[]>

type Entry = {
    uuid: string
    name: string
    description: string
    kind: string
    createdAt: string
    updatedAt: string
}

function SectionList({ title, items, onItemClick }: { title: string; items: Entry[]; onItemClick?: (entry: Entry, index: number) => void }) {
    return (
        <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">{title}</h3>
            {items.length === 0 ? (
                <div className="text-sm text-base-content/50">No matches</div>
            ) : (
                <ul className="space-y-2">
                    {items.map((entry, idx) => (
                        <li key={entry.uuid}>
                            <button
                                type="button"
                                onClick={() => onItemClick?.(entry, idx)}
                                className="w-full text-left p-3 rounded-box bg-base-100 border border-base-300 hover:border-primary hover:shadow transition"
                            >
                                {entry.name ? (
                                    <div className="text-sm">Name: {entry.name}</div>
                                ) : null}
                                <div className="text-xs opacity-70">
                                    Type: <span className="font-mono">{entry.kind}</span>
                                </div>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}

export type SectionsSidebarHandle = {
    refresh: () => Promise<void>
}

type SectionsSidebarProps = {
    limit?: number
    onItemClick?: (entry: Entry, index: number) => void
}

function groupEntriesByDate(entries: Entry[]): Record<string, Entry[]> {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const twoDaysAgo = new Date(today)
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)
    const twoWeeksAgo = new Date(today)
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)

    const groups: { [key: string]: Entry[] } = {
        'Today': [],
        'Yesterday': [],
        '2 days ago': [],
        'This week': [],
        '2 weeks ago': [],
        'Older': [],
    }

    entries.forEach((entry) => {
        const entryDate = new Date(entry.createdAt)
        if (entryDate >= today) {
            groups['Today'].push(entry)
        } else if (entryDate >= yesterday) {
            groups['Yesterday'].push(entry)
        } else if (entryDate >= twoDaysAgo) {
            groups['2 days ago'].push(entry)
        } else if (entryDate >= weekAgo) {
            groups['This week'].push(entry)
        } else if (entryDate >= twoWeeksAgo) {
            groups['2 weeks ago'].push(entry)
        } else {
            groups['Older'].push(entry)
        }
    })
    
    return groups;

    // return Object.entries(groups)
    //     .filter(([, items]) => items.length > 0)
    //     .map(([title, items]) => ({
    //         title,
    //         items: items.map((e) => `${e.kind}: ${e.name}`),
    //     }))
}

const SectionsSidebar = forwardRef<SectionsSidebarHandle, SectionsSidebarProps>(
    ({ limit = 10, onItemClick }, ref) => {
        const [sections, setSections] = useState<Section>({})
        const [loading, setLoading] = useState(true)
        const [error, setError] = useState<string | null>(null)

        const fetchRecent = async () => {
            try {
                setLoading(true)
                setError(null)
                const entries = await apiJson<Entry[]>(`/api/entries/recent?limit=${limit}`)
                const groupsMap = groupEntriesByDate(entries)
                // Sort entries within each group by createdAt desc
                const sorted: Section = Object.fromEntries(
                    Object.entries(groupsMap).map(([label, arr]) => [
                        label,
                        [...arr].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
                    ])
                )
                setSections(sorted)
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Failed to load recent entries'
                setError(message)
                setSections({})
            } finally {
                setLoading(false)
            }
        }

        useEffect(() => {
            void fetchRecent()
        }, [limit])

        useImperativeHandle(ref, () => ({
            refresh: fetchRecent,
        }))

        if (loading) {
            return (
                <aside
                    className="w-[20%] max-w-sm min-w-[240px] bg-base-200 border-r border-base-300 p-4 overflow-y-auto">
                    <div className="text-sm text-base-content/50">Loading...</div>
                </aside>
            )
        }

        if (error) {
            return (
                <aside
                    className="w-[20%] max-w-sm min-w-[240px] bg-base-200 border-r border-base-300 p-4 overflow-y-auto">
                    <div className="text-sm text-error">{error}</div>
                </aside>
            )
        }

        const order = ['Today', 'Yesterday', '2 days ago', 'This week', '2 weeks ago', 'Older']
        const hasAny = Object.values(sections).some((arr) => arr.length > 0)

        return (
            <aside className="w-[20%] max-w-sm min-w-[240px] bg-base-200 border-r border-base-300 p-4 overflow-y-auto">
                {!hasAny ? (
                    <div className="text-sm text-base-content/50">No recent entries</div>
                ) : (
                    order.map((label) => {
                        const items = sections[label] ?? []
                        if (items.length === 0) return null
                        return <SectionList key={label} title={label} items={items} onItemClick={onItemClick} />
                    })
                )}
            </aside>
        )
    }
)

SectionsSidebar.displayName = 'SectionsSidebar'

export default SectionsSidebar
