// Converts between structured section `content` JSON and simple textarea-based
// admin form fields. Array-like content (cards, images, faq items, buttons) is
// edited as small delimited text blocks so the admin UI needs no extra
// client-side framework, while still allowing full HTML inside text fields.

function parseLines(text) {
  return (text || '').split('\n').map(l => l.trim()).filter(Boolean);
}

function parseBlocks(text) {
  return (text || '')
    .split(/^---\s*$/m)
    .map(b => b.trim())
    .filter(Boolean);
}

function parseButtons(text) {
  return parseLines(text).map(line => {
    const [t, href, style] = line.split('|').map(s => (s || '').trim());
    return { text: t || '', href: href || '#', style: style === 'outline' ? 'outline' : 'primary' };
  });
}

function buttonsToText(buttons) {
  return (buttons || []).map(b => `${b.text} | ${b.href} | ${b.style || 'primary'}`).join('\n');
}

const SPECS = {
  html: {
    label: 'Raw HTML block',
    toFields(content) {
      return { html: content.html || '' };
    },
    fromFields(body) {
      return { html: body.html || '' };
    },
  },
  hero: {
    label: 'Hero banner',
    toFields(content) {
      return {
        heading: content.heading || '',
        intro: (content.intro || []).join('\n\n'),
        buttons: buttonsToText(content.buttons),
      };
    },
    fromFields(body) {
      return {
        heading: body.heading || '',
        intro: (body.intro || '').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean),
        buttons: parseButtons(body.buttons),
      };
    },
  },
  cta: {
    label: 'Call-to-action band',
    toFields(content) {
      return {
        heading: content.heading || '',
        body: content.body || '',
        buttons: buttonsToText(content.buttons),
      };
    },
    fromFields(body) {
      return {
        heading: body.heading || '',
        body: body.body || '',
        buttons: parseButtons(body.buttons),
      };
    },
  },
  imagegrid: {
    label: 'Image grid',
    toFields(content) {
      return {
        heading: content.heading || '',
        subheading: content.subheading || '',
        note: content.note || '',
        images: (content.images || [])
          .map(i => `${i.src || ''} | ${i.alt || ''} | ${i.caption || ''}`)
          .join('\n'),
      };
    },
    fromFields(body) {
      const images = parseLines(body.images).map(line => {
        const [src, alt, caption] = line.split('|').map(s => (s || '').trim());
        return { src: src || '', alt: alt || '', caption: caption || '' };
      });
      return {
        heading: body.heading || '',
        subheading: body.subheading || '',
        note: body.note || '',
        images,
      };
    },
  },
  faq: {
    label: 'FAQ list',
    toFields(content) {
      return {
        heading: content.heading || '',
        subheading: content.subheading || '',
        items: (content.items || [])
          .map(i => `${i.question}\n${i.answer}`)
          .join('\n---\n'),
      };
    },
    fromFields(body) {
      const items = parseBlocks(body.items).map(block => {
        const lines = block.split('\n');
        const question = lines.shift() || '';
        return { question: question.trim(), answer: lines.join('\n').trim() };
      });
      return {
        heading: body.heading || '',
        subheading: body.subheading || '',
        items,
      };
    },
  },
};

// "cards" has its own richer spec defined after SPECS to allow the helper
// functions above to be reused.
SPECS.cards = {
  label: 'Card grid',
  toFields(content) {
    return {
      heading: content.heading || '',
      subheading: content.subheading || '',
      columns: String(content.columns || 3),
      cards: (content.cards || [])
        .map(c => `${c.title}\n${c.body}`)
        .join('\n---\n'),
    };
  },
  fromFields(body) {
    const cards = parseBlocks(body.cards).map(block => {
      const lines = block.split('\n');
      const title = lines.shift() || '';
      return { title: title.trim(), body: lines.join('\n').trim() };
    });
    return {
      heading: body.heading || '',
      subheading: body.subheading || '',
      columns: Number(body.columns) === 2 ? 2 : 3,
      cards,
    };
  },
};

const SECTION_TYPES = Object.keys(SPECS);

module.exports = { SPECS, SECTION_TYPES };
