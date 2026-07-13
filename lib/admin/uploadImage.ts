export async function uploadImage(file: File): Promise<{ url: string; error?: string }> {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };

    if (!res.ok) {
      return { url: '', error: json.error || 'Upload failed' };
    }

    return { url: json.url || '', error: json.url ? undefined : 'No URL returned' };
  } catch {
    return { url: '', error: 'Network error' };
  }
}
