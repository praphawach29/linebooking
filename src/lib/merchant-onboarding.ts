export interface MerchantOnboardingInput {
  displayName: string;
  shopName: string;
  businessType: string;
  phone?: string;
}

export interface MerchantOnboardingResponse {
  user: {
    id: string;
    dbUserId: string;
    email: string;
    displayName: string;
    role: 'customer' | 'staff' | 'merchant_admin' | 'platform_admin';
    tenantId: string;
  };
  tenant: {
    id: string;
    name: string;
    slug: string;
    businessType: string;
  };
}

export async function onboardMerchant(
  accessToken: string,
  input: MerchantOnboardingInput,
  options: { apiUrl?: string; fetcher?: typeof fetch } = {},
): Promise<MerchantOnboardingResponse> {
  const fetcher = options.fetcher || fetch;
  const response = await fetcher(`${getApiUrl(options.apiUrl)}/auth/merchant/onboard`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  const payload = await readJson(response);
  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'message' in payload
        ? String(payload.message)
        : `Merchant onboarding failed with status ${response.status}`;
    throw new Error(message);
  }
  return payload as MerchantOnboardingResponse;
}

function getApiUrl(override?: string): string {
  const configured =
    override ??
    (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
      ?.VITE_API_URL;
  const normalized = configured?.trim().replace(/\/+$/, '');
  if (normalized) return normalized;
  if (typeof window !== 'undefined' && window.location) {
    return `${window.location.origin}/api`;
  }
  return 'http://localhost:3000/api';
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}
