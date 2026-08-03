import { Service, TimePricingRule } from '../types';

export interface CalculatedServicePrice {
  finalPrice: number;
  basePrice: number;
  appliedRule?: TimePricingRule;
  isPeakOrCustom: boolean;
}

/**
 * Calculate the effective price for a service at a given time and date.
 * @param service The service item
 * @param bookingTime Time string e.g. "18:00" or "09:30"
 * @param bookingDate Optional YYYY-MM-DD or Date
 */
export function calculateServicePrice(
  service: Service,
  bookingTime?: string,
  bookingDate?: string | Date
): CalculatedServicePrice {
  const basePrice = service.price ?? 0;
  if (!service.timePricingRules || service.timePricingRules.length === 0 || !bookingTime) {
    return {
      finalPrice: basePrice,
      basePrice,
      isPeakOrCustom: false,
    };
  }

  // Determine day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
  let dayOfWeek: number | null = null;
  if (bookingDate) {
    const d = typeof bookingDate === 'string' ? new Date(bookingDate) : bookingDate;
    if (!isNaN(d.getTime())) {
      dayOfWeek = d.getDay();
    }
  }

  // Convert time "HH:mm" to minutes from midnight for easy range comparison
  const timeToMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const targetMins = timeToMinutes(bookingTime);

  // Find matching rule
  const matchedRule = service.timePricingRules.find((rule) => {
    const startMins = timeToMinutes(rule.startTime);
    const endMins = timeToMinutes(rule.endTime);

    // Day of week filter check
    if (
      dayOfWeek !== null &&
      rule.daysOfWeek &&
      rule.daysOfWeek.length > 0 &&
      !rule.daysOfWeek.includes(dayOfWeek)
    ) {
      return false;
    }

    // Overnight range check (e.g. 22:00 to 02:00) vs regular range
    if (endMins < startMins) {
      return targetMins >= startMins || targetMins < endMins;
    }
    return targetMins >= startMins && targetMins < endMins;
  });

  if (matchedRule) {
    return {
      finalPrice: matchedRule.price,
      basePrice,
      appliedRule: matchedRule,
      isPeakOrCustom: matchedRule.price !== basePrice,
    };
  }

  return {
    finalPrice: basePrice,
    basePrice,
    isPeakOrCustom: false,
  };
}

/**
 * Helper to get price range string for a service (e.g., "฿1,000 - ฿1,500")
 */
export function getServicePriceRangeText(service: Service): string {
  const basePrice = service.price ?? 0;
  if (!service.timePricingRules || service.timePricingRules.length === 0) {
    return `฿${basePrice.toLocaleString()}`;
  }

  const allPrices = [basePrice, ...service.timePricingRules.map((r) => r.price)];
  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);

  if (minPrice === maxPrice) {
    return `฿${minPrice.toLocaleString()}`;
  }

  return `฿${minPrice.toLocaleString()} - ฿${maxPrice.toLocaleString()}`;
}
