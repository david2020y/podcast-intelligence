import { getAppMode } from "@/lib/config";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { mockStore, newId, nowIso, attachEpisodeExtras } from "@/lib/mock/store";
import type { Collection, CollectionItem } from "@/lib/types";

export async function listCollections(userId: string): Promise<Collection[]> {
  const { mockMode } = getAppMode();
  if (mockMode) {
    return mockStore.collections
      .filter((c) => c.userId === userId)
      .map((c) => ({
        ...c,
        itemCount: mockStore.collectionItems.filter((i) => i.collectionId === c.id).length,
      }));
  }
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("collections")
    .select("*, collection_items(count)")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    itemCount: (row as unknown as { collection_items: { count: number }[] }).collection_items?.[0]?.count ?? 0,
  }));
}

export async function getCollection(id: string, userId: string): Promise<Collection | null> {
  const { mockMode } = getAppMode();
  if (mockMode) {
    const c = mockStore.collections.find((x) => x.id === id && x.userId === userId);
    if (!c) return null;
    return { ...c, itemCount: mockStore.collectionItems.filter((i) => i.collectionId === id).length };
  }
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("collections")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    userId: data.user_id,
    name: data.name,
    description: data.description,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function createCollection(userId: string, name: string, description?: string): Promise<Collection> {
  const { mockMode } = getAppMode();
  if (mockMode) {
    const c: Collection = {
      id: newId(),
      userId,
      name,
      description: description ?? null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      itemCount: 0,
    };
    mockStore.collections.unshift(c);
    return c;
  }
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("collections")
    .insert({ user_id: userId, name, description: description ?? null })
    .select("*")
    .single();
  if (error) throw error;
  return {
    id: data.id,
    userId: data.user_id,
    name: data.name,
    description: data.description,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function updateCollection(
  id: string,
  userId: string,
  patch: { name?: string; description?: string }
): Promise<void> {
  const { mockMode } = getAppMode();
  if (mockMode) {
    const c = mockStore.collections.find((x) => x.id === id && x.userId === userId);
    if (!c) return;
    Object.assign(c, patch, { updatedAt: nowIso() });
    return;
  }
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("collections").update(patch).eq("id", id).eq("user_id", userId);
  if (error) throw error;
}

export async function deleteCollection(id: string, userId: string): Promise<void> {
  const { mockMode } = getAppMode();
  if (mockMode) {
    mockStore.collections = mockStore.collections.filter((c) => !(c.id === id && c.userId === userId));
    mockStore.collectionItems = mockStore.collectionItems.filter((i) => i.collectionId !== id);
    return;
  }
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("collections").delete().eq("id", id).eq("user_id", userId);
  if (error) throw error;
}

export async function listCollectionItems(collectionId: string): Promise<CollectionItem[]> {
  const { mockMode } = getAppMode();
  if (mockMode) {
    return mockStore.collectionItems
      .filter((i) => i.collectionId === collectionId)
      .map((i) => {
        const ep = mockStore.episodes.find((e) => e.id === i.episodeId);
        return { ...i, episode: ep ? attachEpisodeExtras(ep) : undefined };
      });
  }
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("collection_items")
    .select("*, podcast_episodes(*, podcast_shows(id, title, cover_url, author, source_platform))")
    .eq("collection_id", collectionId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    collectionId: row.collection_id,
    episodeId: row.episode_id,
    note: row.note,
    createdAt: row.created_at,
  }));
}

export async function addItemToCollection(
  collectionId: string,
  episodeId: string,
  note?: string
): Promise<CollectionItem> {
  const { mockMode } = getAppMode();
  if (mockMode) {
    const existing = mockStore.collectionItems.find(
      (i) => i.collectionId === collectionId && i.episodeId === episodeId
    );
    if (existing) {
      if (note !== undefined) existing.note = note;
      return existing;
    }
    const item: CollectionItem = { id: newId(), collectionId, episodeId, note: note ?? null, createdAt: nowIso() };
    mockStore.collectionItems.unshift(item);
    return item;
  }
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("collection_items")
    .upsert({ collection_id: collectionId, episode_id: episodeId, note: note ?? null }, { onConflict: "collection_id,episode_id" })
    .select("*")
    .single();
  if (error) throw error;
  return { id: data.id, collectionId: data.collection_id, episodeId: data.episode_id, note: data.note, createdAt: data.created_at };
}

export async function removeItemFromCollection(collectionId: string, episodeId: string): Promise<void> {
  const { mockMode } = getAppMode();
  if (mockMode) {
    mockStore.collectionItems = mockStore.collectionItems.filter(
      (i) => !(i.collectionId === collectionId && i.episodeId === episodeId)
    );
    return;
  }
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("collection_items")
    .delete()
    .eq("collection_id", collectionId)
    .eq("episode_id", episodeId);
  if (error) throw error;
}
