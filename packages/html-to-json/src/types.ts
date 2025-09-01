// ------------------------------------------------------------
// src/types.ts
// ------------------------------------------------------------
export type Block =
  | { type: "heading"; level: 1 | 2 | 3 | 4 | 5 | 6; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | {
      type: "table";
      caption?: string;
      headers: string[];
      rows: string[][];
      as_objects: Record<string, string>[];
    };

export interface Doc {
  id: string;
  source_url?: string | null;
  title: string;
  fetched_at: string; // ISO
  lang?: string | null;
  blocks: Block[];
  tags: string[];
  properties: Record<string, unknown>;
  plain_text: string;
  embeddings: number[] | null;
}
