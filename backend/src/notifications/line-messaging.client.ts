import { Injectable } from '@nestjs/common';

const LINE_API = 'https://api.line.me/v2/bot';

export class LineMessagingApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'LineMessagingApiError';
  }

  get retryable() {
    return this.status === 429 || this.status >= 500;
  }
}

@Injectable()
export class LineMessagingClient {
  async pushMessage(
    accessToken: string,
    to: string,
    messages: Record<string, unknown>[],
  ): Promise<{ requestId: string | null }> {
    const response = await fetch(`${LINE_API}/message/push`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to, messages }),
    });

    if (!response.ok) {
      throw await this.toError(response);
    }

    return { requestId: response.headers.get('x-line-request-id') };
  }

  async getQuota(
    accessToken: string,
  ): Promise<{ type: 'limited' | 'none'; value: number | null; totalUsage: number }> {
    const headers = { Authorization: `Bearer ${accessToken}` };
    const [quotaResponse, usageResponse] = await Promise.all([
      fetch(`${LINE_API}/message/quota`, { headers }),
      fetch(`${LINE_API}/message/quota/consumption`, { headers }),
    ]);

    if (!quotaResponse.ok) throw await this.toError(quotaResponse);
    if (!usageResponse.ok) throw await this.toError(usageResponse);

    const quota = (await quotaResponse.json()) as { type: 'limited' | 'none'; value?: number };
    const usage = (await usageResponse.json()) as { totalUsage?: number };
    return {
      type: quota.type,
      value: quota.type === 'limited' ? Number(quota.value || 0) : null,
      totalUsage: Number(usage.totalUsage || 0),
    };
  }

  private async toError(response: Response): Promise<LineMessagingApiError> {
    let body: { message?: string; details?: Array<{ message?: string }> } = {};
    try {
      body = (await response.json()) as typeof body;
    } catch {
      // LINE can occasionally return a non-JSON upstream error.
    }
    const detail = body.details?.map((item) => item.message).filter(Boolean).join('; ');
    return new LineMessagingApiError(
      detail || body.message || `LINE Messaging API returned HTTP ${response.status}`,
      response.status,
      response.headers.get('x-line-accepted-request-id') || undefined,
    );
  }
}
