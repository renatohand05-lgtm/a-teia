import "server-only";

import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export type StoredObject = {
  key: string;
  url: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
};

/**
 * Storage preparado para importações. Sprint 0: disco local.
 * Produção pode trocar para Vercel Blob sem alterar os serviços de domínio.
 */
export async function storeFile(file: {
  filename: string;
  mimeType: string;
  bytes: Buffer;
}): Promise<StoredObject> {
  const driver = process.env.STORAGE_DRIVER ?? "local";
  if (driver === "vercel-blob") {
    throw new Error("STORAGE_DRIVER=vercel-blob está preparado, mas ainda não está ativo.");
  }

  const key = `${new Date().toISOString().slice(0, 10)}/${randomUUID()}-${sanitize(file.filename)}`;
  const destDir = path.join(process.cwd(), "storage", path.dirname(key));
  await mkdir(destDir, { recursive: true });
  await writeFile(path.join(process.cwd(), "storage", key), file.bytes);

  return {
    key,
    url: `/storage/${key}`,
    filename: file.filename,
    mimeType: file.mimeType,
    sizeBytes: file.bytes.length,
  };
}

function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
}
