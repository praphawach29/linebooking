import { Booking, Tenant } from '../types';
import { generateBookingConfirmationFlexMessage } from './flexMessageTemplates';

export const sendLineBookingConfirmation = async (
  booking: Booking,
  tenant: Tenant,
  lineUserId?: string
) => {
  if (!tenant.lineChannelAccessToken || !tenant.settings.lineBookingConfirmationEnabled) {
    return { success: false, message: 'LINE messaging is disabled or missing access token' };
  }

  // Determine the recipient ID: either passed directly or retrieved from booking.userId
  // Assuming the user logged in via LIFF has their LINE user ID saved in booking.userId
  const to = lineUserId || booking.userId;
  
  if (!to || !to.startsWith('U') || to.length !== 33) {
    console.warn('Cannot send LINE confirmation: missing valid LINE user ID', { to });
    return { success: false, message: 'Missing valid LINE user ID' };
  }

  const messages = [generateBookingConfirmationFlexMessage(booking, tenant, tenant.liffId)];

  try {
    const response = await fetch('/api/line/send-booking-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to,
        messages,
        channelAccessToken: tenant.lineChannelAccessToken,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Failed to send LINE confirmation via API:', data);
      return { success: false, error: data };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error sending LINE confirmation:', error);
    return { success: false, error };
  }
};
