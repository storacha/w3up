export const isCloudflareWorkers =
  typeof navigator !== 'undefined' &&
  navigator?.userAgent === 'Cloudflare-Workers'
