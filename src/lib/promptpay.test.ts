import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  generatePromptPayPayload,
  normalizePromptPayTarget,
  crc16,
  isValidPromptPayTarget,
} from '../utils/promptpay';

describe('PromptPay Utility Tests', () => {
  it('normalizes Thai mobile numbers correctly', () => {
    const res = normalizePromptPayTarget('081-234-5678');
    assert.ok(res);
    assert.equal(res?.value, '0066812345678');
    assert.equal(res?.type, 'mobile');
  });

  it('normalizes 13-digit Tax ID correctly', () => {
    const res = normalizePromptPayTarget('1234567890123');
    assert.ok(res);
    assert.equal(res?.value, '1234567890123');
    assert.equal(res?.type, 'national_id');
  });

  it('generates valid EMVCo PromptPay payload with Tag 63 CRC16', () => {
    const payload = generatePromptPayPayload('0812345678', 600);
    assert.ok(payload.startsWith('000201010212')); // Dynamic QR
    assert.ok(payload.includes('A000000677010111')); // PromptPay AID
    assert.ok(payload.includes('5406600.00')); // Amount 600.00
    assert.ok(payload.includes('5802TH')); // Thailand
    assert.ok(payload.includes('6304')); // CRC16 Tag Header

    // Verify CRC checksum match
    const bodyWithoutCrc = payload.slice(0, -4);
    const expectedCrc = crc16(bodyWithoutCrc);
    const actualCrc = payload.slice(-4);
    assert.equal(actualCrc, expectedCrc);
  });

  it('validates PromptPay targets correctly', () => {
    assert.equal(isValidPromptPayTarget('0812345678'), true);
    assert.equal(isValidPromptPayTarget('095-585-1136'), true);
    assert.equal(isValidPromptPayTarget('invalid'), false);
  });
});
