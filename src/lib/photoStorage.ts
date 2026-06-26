import { supabase, isSupabaseConfigured } from './supabase';
import type { ProofPhoto } from './types';

const RETENTION_MS = 2 * 24 * 60 * 60 * 1000; // 2 days
const BUCKET = 'proof-photos';

export async function uploadPhoto(
  dataUrl: string,
  userId: string,
  capturedAt: string
): Promise<{ url: string; storageType: 'supabase' | 'local' }> {
  if (!isSupabaseConfigured || !supabase) {
    return { url: dataUrl, storageType: 'local' };
  }
  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const path = `${userId}/${new Date(capturedAt).getTime()}.jpg`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, blob, { contentType: 'image/jpeg', upsert: true });

    if (error) return { url: dataUrl, storageType: 'local' };

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return { url: data.publicUrl, storageType: 'supabase' };
  } catch {
    return { url: dataUrl, storageType: 'local' };
  }
}

export async function cleanupOldPhotos(
  photos: ProofPhoto[],
  onDelete: (id: string) => void
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const now = Date.now();

  for (const photo of photos) {
    if (photo.storageType !== 'supabase') continue;
    const age = now - new Date(photo.capturedAt).getTime();
    if (age < RETENTION_MS) continue;

    try {
      const urlObj = new URL(photo.imageUrl);
      // Extract path after /object/public/{bucket}/
      const parts = urlObj.pathname.split(`/${BUCKET}/`);
      const path = parts[1];
      if (path) {
        await supabase.storage.from(BUCKET).remove([decodeURIComponent(path)]);
      }
    } catch {}
    onDelete(photo.id);
  }
}
