import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { env } from "@/lib/env";

export type StoredAsset = {
  key: string;
  uri: string;
  mediaType: string;
  bytes: number;
};

export type AssetStorage = {
  put(params: { key: string; bytes: Buffer; mediaType: string }): Promise<StoredAsset>;
  getPublicUrl(key: string): string;
  delete(key: string): Promise<void>;
};

class LocalAssetStorage implements AssetStorage {
  private root = path.resolve(env.localAssetRoot);
  private publicBase = env.publicAssetBaseUrl.replace(/\/$/, "");

  async put(params: { key: string; bytes: Buffer; mediaType: string }) {
    const safeKey = sanitizeKey(params.key);
    const fullPath = path.join(this.root, safeKey);
    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, params.bytes);
    return {
      key: safeKey,
      uri: this.getPublicUrl(safeKey),
      mediaType: params.mediaType,
      bytes: params.bytes.length
    };
  }

  getPublicUrl(key: string) {
    return `${this.publicBase}/${sanitizeKey(key).split(path.sep).join("/")}`;
  }

  async delete(key: string) {
    await rm(path.join(this.root, sanitizeKey(key)), { force: true });
  }
}

class S3CompatibleAssetStorage implements AssetStorage {
  async put(): Promise<StoredAsset> {
    throw new Error("S3 asset storage is not configured in this build. Use ASSET_STORAGE_DRIVER=local.");
  }

  getPublicUrl(): string {
    throw new Error("S3 asset storage is not configured in this build. Use ASSET_STORAGE_DRIVER=local.");
  }

  async delete() {
    throw new Error("S3 asset storage is not configured in this build. Use ASSET_STORAGE_DRIVER=local.");
  }
}

export function assetStorage(): AssetStorage {
  if (env.assetStorageDriver === "s3") {
    return new S3CompatibleAssetStorage();
  }

  return new LocalAssetStorage();
}

export function extensionForMediaType(mediaType: string) {
  if (mediaType.includes("jpeg") || mediaType.includes("jpg")) return "jpg";
  if (mediaType.includes("webp")) return "webp";
  if (mediaType.includes("gif")) return "gif";
  if (mediaType.includes("svg")) return "svg";
  return "png";
}

function sanitizeKey(key: string) {
  return key
    .replaceAll("\\", "/")
    .split("/")
    .filter((part) => part && part !== "." && part !== "..")
    .map((part) => part.replace(/[^a-zA-Z0-9._-]/g, "_"))
    .join(path.sep);
}
