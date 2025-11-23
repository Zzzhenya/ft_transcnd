// Escape HTML to prevent XSS
export function escapeHtml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .replace(/\//g, "&#x2F;");
}

// Sanitize user input before display
export function sanitizeInput(input: string): string {
  if (!input) return '';
  // Remove any HTML tags
  const stripped = input.replace(/<[^>]*>/g, '');
 // Escape remaining special characters
  return escapeHtml(stripped);
}