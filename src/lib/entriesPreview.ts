import {apiFetch} from './api'

export type PreviewResult =
    | { kind: 'text'; truncated: boolean; text: string; contentType: string }
    | { kind: 'blob'; blob: Blob; contentType: string }
    | { kind: 'redirect'; url: string }
    | { kind: 'nopreview'; downloadUrl: string }

export async function loadPreview(uuid: string): Promise<PreviewResult> {
    const res = await apiFetch(`/api/entries/${uuid}/preview`, {
    // const res = await apiFetch(`/api/entries/e3596205-93ee-4c46-bf1d-b2e04c2d9e98/preview`, {

        method: 'GET',
        // Let fetch follow redirects so we receive the final 200 response
        redirect: 'follow' as RequestRedirect,
    })

    if (res.status === 200) {
        const ct = res.headers.get('Content-Type') || ''
        const truncated = res.headers.get('X-Preview-Truncated') === 'true'
        if (ct.startsWith('text/')) {
            const text = await res.text()
            return {kind: 'text', truncated, text, contentType: ct}
        }
        const blob = await res.blob()
        return {kind: 'blob', blob, contentType: ct}
    }

    if (res.status === 302) {
        const loc = res.headers.get('Location')
        if (!loc) throw new Error('Redirect missing Location')
        return {kind: 'redirect', url: loc}
    }

    if (res.status === 204) {
        const dl = res.headers.get('X-Download-URL')
        return {kind: 'nopreview', downloadUrl: dl ?? ''}
    }

    if (res.status === 401) throw new Error('Unauthorized')
    if (res.status === 404) throw new Error('Not found')
    throw new Error(`Unexpected status ${res.status}`)
}

export function startDownload(uuid: string) {
    // Browser will follow 302 to the signed URL; download starts automatically
    window.location.href = `/api/entries/${uuid}/download`
}
