function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * Upload a JSON document to the R2 bucket via the Cloudflare REST API
 */
export async function uploadJson(
  fileName: string,
  data: unknown,
): Promise<string> {
  const accountId = requiredEnv("R2_ACCOUNT_ID");
  const bucket = requiredEnv("R2_BUCKET_NAME");
  const token = requiredEnv("R2_API_TOKEN");

  const encodedKey = fileName.split("/").map(encodeURIComponent).join("/");
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${bucket}/objects/${encodedKey}`;

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
    body: JSON.stringify(data, null, 2),
  });

  if (!res.ok) {
    throw new Error(
      `Failed to upload ${fileName} to R2: ${res.status} ${res.statusText} ${await res.text()}`,
    );
  }

  return fileName;
}
