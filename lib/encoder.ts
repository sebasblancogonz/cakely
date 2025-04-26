export async function hashBusinessId(businessId: number): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(String(businessId));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return hashHex;
}
