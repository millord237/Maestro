/**
 * Tests for markdown link parser utility
 */

import {
  parseMarkdownLinks,
  extractDomain,
  type ParsedMarkdownLinks,
} from '../../../renderer/utils/markdownLinkParser';

describe('extractDomain', () => {
  it('should extract domain from HTTPS URL', () => {
    expect(extractDomain('https://github.com/user/repo')).toBe('github.com');
  });

  it('should extract domain from HTTP URL', () => {
    expect(extractDomain('http://example.com/page')).toBe('example.com');
  });

  it('should strip www. prefix', () => {
    expect(extractDomain('https://www.github.com/user/repo')).toBe('github.com');
  });

  it('should handle URLs with port numbers', () => {
    expect(extractDomain('https://localhost:3000/path')).toBe('localhost');
  });

  it('should handle URLs with query parameters', () => {
    expect(extractDomain('https://example.com/path?query=value')).toBe('example.com');
  });

  it('should handle subdomain URLs', () => {
    expect(extractDomain('https://docs.github.com/en/pages')).toBe('docs.github.com');
  });

  it('should return original string for invalid URLs', () => {
    expect(extractDomain('not-a-url')).toBe('not-a-url');
  });
});

describe('parseMarkdownLinks', () => {
  describe('wiki-style links', () => {
    it('should parse simple wiki links [[filename]]', () => {
      const content = 'See [[other-doc]] for more info.';
      const result = parseMarkdownLinks(content, 'docs/readme.md');
      
      expect(result.internalLinks).toContain('docs/other-doc.md');
      expect(result.externalLinks).toHaveLength(0);
    });

    it('should parse wiki links with display text [[path|text]]', () => {
      const content = 'Check out [[getting-started|the guide]].';
      const result = parseMarkdownLinks(content, 'docs/readme.md');
      
      expect(result.internalLinks).toContain('docs/getting-started.md');
    });

    it('should parse wiki links with folders [[Folder/Note]]', () => {
      const content = 'See [[subdir/nested-doc]] for details.';
      const result = parseMarkdownLinks(content, 'docs/readme.md');
      
      expect(result.internalLinks).toContain('docs/subdir/nested-doc.md');
    });

    it('should skip image embeds', () => {
      const content = '![[screenshot.png]] and [[doc-link]]';
      const result = parseMarkdownLinks(content, 'docs/readme.md');
      
      expect(result.internalLinks).toContain('docs/doc-link.md');
      expect(result.internalLinks).toHaveLength(1);
    });

    it('should handle multiple wiki links', () => {
      const content = 'Link to [[first]] and [[second]] and [[third]].';
      const result = parseMarkdownLinks(content, 'readme.md');
      
      expect(result.internalLinks).toHaveLength(3);
      expect(result.internalLinks).toContain('first.md');
      expect(result.internalLinks).toContain('second.md');
      expect(result.internalLinks).toContain('third.md');
    });
  });

  describe('standard markdown links', () => {
    it('should parse internal markdown links [text](path.md)', () => {
      const content = 'See the [documentation](./docs/guide.md).';
      const result = parseMarkdownLinks(content, 'readme.md');
      
      expect(result.internalLinks).toContain('docs/guide.md');
    });

    it('should parse relative parent paths [text](../path.md)', () => {
      const content = 'See [parent doc](../other.md).';
      const result = parseMarkdownLinks(content, 'docs/guide.md');
      
      expect(result.internalLinks).toContain('other.md');
    });

    it('should extract external links with domains', () => {
      const content = 'Visit [GitHub](https://github.com).';
      const result = parseMarkdownLinks(content, 'readme.md');
      
      expect(result.externalLinks).toHaveLength(1);
      expect(result.externalLinks[0].url).toBe('https://github.com');
      expect(result.externalLinks[0].domain).toBe('github.com');
    });

    it('should handle multiple external links', () => {
      const content = `
Check [GitHub](https://github.com) and [Google](https://www.google.com).
Also see [Docs](https://docs.example.com/page).
      `;
      const result = parseMarkdownLinks(content, 'readme.md');
      
      expect(result.externalLinks).toHaveLength(3);
      expect(result.externalLinks.map(l => l.domain)).toContain('github.com');
      expect(result.externalLinks.map(l => l.domain)).toContain('google.com');
      expect(result.externalLinks.map(l => l.domain)).toContain('docs.example.com');
    });

    it('should skip anchor links', () => {
      const content = 'See [section](#heading) for details.';
      const result = parseMarkdownLinks(content, 'readme.md');
      
      expect(result.internalLinks).toHaveLength(0);
      expect(result.externalLinks).toHaveLength(0);
    });

    it('should skip mailto links', () => {
      const content = 'Contact [support](mailto:help@example.com).';
      const result = parseMarkdownLinks(content, 'readme.md');
      
      expect(result.internalLinks).toHaveLength(0);
      expect(result.externalLinks).toHaveLength(0);
    });
  });

  describe('front matter parsing', () => {
    it('should parse YAML front matter', () => {
      const content = `---
title: My Document
description: A test document
version: 1.0
---

# Content here
`;
      const result = parseMarkdownLinks(content, 'doc.md');
      
      expect(result.frontMatter.title).toBe('My Document');
      expect(result.frontMatter.description).toBe('A test document');
      expect(result.frontMatter.version).toBe(1.0);
    });

    it('should handle boolean values in front matter', () => {
      const content = `---
draft: true
published: false
---

Content
`;
      const result = parseMarkdownLinks(content, 'doc.md');
      
      expect(result.frontMatter.draft).toBe(true);
      expect(result.frontMatter.published).toBe(false);
    });

    it('should handle quoted strings in front matter', () => {
      const content = `---
title: "Quoted Title"
subtitle: 'Single quoted'
---

Content
`;
      const result = parseMarkdownLinks(content, 'doc.md');
      
      expect(result.frontMatter.title).toBe('Quoted Title');
      expect(result.frontMatter.subtitle).toBe('Single quoted');
    });

    it('should return empty object when no front matter', () => {
      const content = '# Just a heading\n\nSome content.';
      const result = parseMarkdownLinks(content, 'doc.md');
      
      expect(result.frontMatter).toEqual({});
    });

    it('should ignore comments in front matter', () => {
      const content = `---
title: My Doc
# This is a comment
author: John
---

Content
`;
      const result = parseMarkdownLinks(content, 'doc.md');
      
      expect(result.frontMatter.title).toBe('My Doc');
      expect(result.frontMatter.author).toBe('John');
      expect(Object.keys(result.frontMatter)).toHaveLength(2);
    });
  });

  describe('deduplication', () => {
    it('should deduplicate internal links', () => {
      const content = 'See [[doc]] and [[doc]] again.';
      const result = parseMarkdownLinks(content, 'readme.md');
      
      expect(result.internalLinks).toHaveLength(1);
    });

    it('should deduplicate external links', () => {
      const content = `
[GitHub](https://github.com) and [GitHub again](https://github.com).
      `;
      const result = parseMarkdownLinks(content, 'readme.md');
      
      expect(result.externalLinks).toHaveLength(1);
    });

    it('should not deduplicate different paths to same filename', () => {
      const content = '[[docs/readme]] and [[other/readme]]';
      const result = parseMarkdownLinks(content, 'index.md');
      
      expect(result.internalLinks).toHaveLength(2);
    });
  });

  describe('mixed content', () => {
    it('should parse both internal and external links together', () => {
      const content = `---
title: Mixed Doc
---

See [[internal-doc]] for local info.
Check [GitHub](https://github.com) for code.
Also see [another doc](./other.md) here.
      `;
      const result = parseMarkdownLinks(content, 'readme.md');
      
      expect(result.internalLinks).toHaveLength(2);
      expect(result.externalLinks).toHaveLength(1);
      expect(result.frontMatter.title).toBe('Mixed Doc');
    });
  });

  describe('edge cases', () => {
    it('should handle empty content', () => {
      const result = parseMarkdownLinks('', 'doc.md');
      
      expect(result.internalLinks).toHaveLength(0);
      expect(result.externalLinks).toHaveLength(0);
      expect(result.frontMatter).toEqual({});
    });

    it('should handle URL-encoded paths', () => {
      const content = '[doc](./my%20document.md)';
      const result = parseMarkdownLinks(content, 'readme.md');
      
      expect(result.internalLinks).toContain('my document.md');
    });

    it('should handle files at root level', () => {
      const content = '[[sibling]]';
      const result = parseMarkdownLinks(content, 'readme.md');
      
      expect(result.internalLinks).toContain('sibling.md');
    });

    it('should preserve .md extension if already present', () => {
      const content = '[[already.md]]';
      const result = parseMarkdownLinks(content, 'readme.md');
      
      expect(result.internalLinks).toContain('already.md');
    });
  });
});
