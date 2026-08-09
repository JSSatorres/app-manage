import type { NormalizedContentAssetLink } from "@/types/content-assets"

const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtu.be"])
const GOOGLE_DRIVE_HOSTS = new Set(["drive.google.com", "www.drive.google.com"])

export function normalizeContentAssetLink(input: string): NormalizedContentAssetLink | null {
  if (input.includes("<") || input.includes(">")) {
    return null
  }

  const url = parseHttpsUrl(input)
  if (!url) {
    return null
  }

  if (YOUTUBE_HOSTS.has(url.hostname)) {
    return normalizeYouTubeUrl(url)
  }

  if (GOOGLE_DRIVE_HOSTS.has(url.hostname)) {
    return normalizeGoogleDriveUrl(url)
  }

  return {
    provider: "external_legacy",
    canonicalUrl: url.toString(),
  }
}

function parseHttpsUrl(input: string): URL | null {
  try {
    const url = new URL(input.trim())
    return url.protocol === "https:" && !url.username && !url.password ? url : null
  } catch {
    return null
  }
}

function normalizeYouTubeUrl(url: URL): NormalizedContentAssetLink | null {
  const pathSegments = url.pathname.split("/").filter(Boolean)
  const videoId = url.hostname.endsWith("youtu.be")
    ? pathSegments[0]
    : pathSegments[0] === "shorts"
      ? pathSegments[1]
      : url.searchParams.get("v")

  if (!videoId || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
    return null
  }

  return {
    provider: "youtube",
    canonicalUrl: `https://www.youtube.com/watch?v=${videoId}`,
    externalResourceId: videoId,
    embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`,
  }
}

function normalizeGoogleDriveUrl(url: URL): NormalizedContentAssetLink | null {
  const fileId = extractGoogleDriveFileId(url)

  if (!fileId) {
    return null
  }

  return {
    provider: "google_drive",
    canonicalUrl: `https://drive.google.com/file/d/${fileId}/view`,
    externalResourceId: fileId,
    fileId,
  }
}

function extractGoogleDriveFileId(url: URL): string | null {
  const pathMatch = url.pathname.match(/^\/file\/d\/([A-Za-z0-9_-]{10,})(?:\/|$)/)
  const queryFileId = ["/open", "/uc"].includes(url.pathname) ? url.searchParams.get("id") : null
  const fileId = pathMatch?.[1] ?? queryFileId

  return fileId && /^[A-Za-z0-9_-]{10,}$/.test(fileId) ? fileId : null
}
