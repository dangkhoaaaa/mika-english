import { useCallback, useEffect, useState } from "react";
import { api, setAuthToken } from "@/lib/api";
import { getAccessToken } from "@/lib/session";

/** Danh sách id từ vựng đã lưu (bookmark). */
export function useBookmarkIds() {
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    setAuthToken(token);
    setLoading(true);
    try {
      const res = await api.get<string[]>("/api/v1/bookmarks?idsOnly=1");
      const list = Array.isArray(res.data) ? res.data : [];
      setIds(new Set(list));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const toggle = useCallback(
    (vocabularyId: string, bookmarked: boolean) => {
      setIds((prev) => {
        const next = new Set(prev);
        if (bookmarked) next.add(vocabularyId);
        else next.delete(vocabularyId);
        return next;
      });
    },
    [],
  );

  return { bookmarkIds: ids, bookmarkLoading: loading, refreshBookmarks: refresh, toggleBookmarkLocal: toggle };
}
