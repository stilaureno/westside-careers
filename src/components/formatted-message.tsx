import type { ReactNode } from 'react';

function sanitizeHref(rawHref: string) {
  const href = rawHref.trim();

  if (href.startsWith('/')) {
    return href;
  }

  try {
    const url = new URL(href);

    if (['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol)) {
      return href;
    }
  } catch {
    return null;
  }

  return null;
}

export function renderFormattedMessage(value?: string): ReactNode {
  if (!value) {
    return '-';
  }

  const nodes: ReactNode[] = [];
  const pattern = /<br\s*\/?>|<a\s+[^>]*href=(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null = null;

  while ((match = pattern.exec(value)) !== null) {
    const [fullMatch, , href = '', anchorText = ''] = match;

    if (match.index > lastIndex) {
      nodes.push(value.slice(lastIndex, match.index));
    }

    if (/^<br/i.test(fullMatch)) {
      nodes.push(<br key={`br-${match.index}`} />);
    } else {
      const safeHref = sanitizeHref(href);

      if (safeHref) {
        const isExternal = safeHref.startsWith('http://') || safeHref.startsWith('https://');

        nodes.push(
          <a
            key={`link-${match.index}`}
            href={safeHref}
            target={isExternal ? '_blank' : undefined}
            rel={isExternal ? 'noopener noreferrer' : undefined}
            style={{ color: '#8b1e2d', fontWeight: 600 }}
          >
            {anchorText}
          </a>
        );
      } else {
        nodes.push(anchorText);
      }
    }

    lastIndex = match.index + fullMatch.length;
  }

  if (lastIndex < value.length) {
    nodes.push(value.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : value;
}
