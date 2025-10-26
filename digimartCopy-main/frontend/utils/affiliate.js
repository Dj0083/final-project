import { api, API_BASE } from '../config/api';

/**
 * Generate an affiliate link for a partnered request and specific product.
 * Returns both the app deep link and the short tracking link.
 *
 * @param {number|string} requestId - affiliate_partner_requests.id
 * @param {number|string} productId - products.id
 * @returns {Promise<{link: string, short_link: string, affiliate_code: string}>}
 */
export async function generateAffiliateLinkForProduct(requestId, productId) {
  if (!requestId) throw new Error('requestId is required');
  if (!productId) throw new Error('productId is required');
  const res = await api.get(`/api/seller/affiliate/requests/${requestId}/product-link`, {
    params: { product_id: productId }
  });
  const link = res.data?.link || '';
  const short_link = res.data?.short_link || '';
  const affiliate_code = res.data?.affiliate_code || '';
  return { link, short_link, affiliate_code };
}

/**
 * Build a short tracking link directly if you already know the affiliate code.
 * This does not validate the code and skips server-side partner checks.
 *
 * @param {number|string} productId
 * @param {string} affiliateCode
 * @returns {string}
 */
export function buildShortAffiliateLink(productId, affiliateCode) {
  if (!productId) throw new Error('productId is required');
  if (!affiliateCode) throw new Error('affiliateCode is required');
  // Prefer API_BASE as backend host
  return `${API_BASE}/p/${encodeURIComponent(productId)}?aff=${encodeURIComponent(affiliateCode)}`;
}
