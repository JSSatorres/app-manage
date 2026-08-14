type SiteEnvironment = Readonly<Record<string, string | undefined>>;

const LOCAL_SITE_URL = "http://localhost:3000";

function parseAppUrl(value: string): URL {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error("APP_URL debe ser una URL válida");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("APP_URL debe usar http o https");
  }

  return new URL(url.origin);
}

function parseVercelUrl(value: string): URL {
  const url = value.startsWith("http://") || value.startsWith("https://")
    ? value
    : `https://${value}`;

  return new URL(url);
}

export function getSiteUrl(
  environment: SiteEnvironment = process.env,
): URL {
  const appUrl = environment.APP_URL?.trim();
  if (appUrl) return parseAppUrl(appUrl);

  const vercelUrl =
    environment.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    environment.VERCEL_URL?.trim();

  return vercelUrl ? parseVercelUrl(vercelUrl) : new URL(LOCAL_SITE_URL);
}
