'use strict';

const { generateRssFeed, generateAtomFeed } = require('feedsmith');
const { gravatar, full_url_for, encodeURL } = require('hexo-util');
const { join } = require('path');

function composePosts(posts, feedConfig) {
  const { limit, order_by } = feedConfig;

  let processedPosts = posts.sort(order_by || '-date');
  processedPosts = processedPosts.filter(post => post.draft !== true);

  if (limit) processedPosts = processedPosts.limit(limit);

  return processedPosts;
}

function composeFeed(config, path, context, posts) {
  const { feed: feedConfig, url: urlConfig, email } = config;
  const { icon: iconConfig, hub } = feedConfig;

  let url = urlConfig;
  if (url[url.length - 1] !== '/') url += '/';

  let icon = '';
  if (iconConfig) icon = full_url_for.call(context, iconConfig);
  else if (email) icon = gravatar(email);

  const feedUrl = full_url_for.call(context, path);
  const currentYear = new Date().getFullYear();

  return {
    title: config.title,
    description: config.subtitle || config.description,
    url,
    feedUrl,
    icon,
    hub,
    language: config.language,
    author: { name: config.author, email: config.email },
    copyright: config.author && `All rights reserved ${currentYear}, ${config.author}`,
    updated: posts.first().updated ? posts.first().updated.toDate() : posts.first().date.toDate()
  };
}

function composeFeedLinks(feedUrl, hub, type) {
  const links = [{ href: encodeURL(feedUrl), rel: 'self', type }];
  if (hub) links.push({ href: encodeURL(hub), rel: 'hub' });
  return links;
}

function composeItemDescription(post, feedConfig) {
  const { content_limit, content_limit_delim } = feedConfig;

  if (post.description) {
    return post.description;
  } else if (post.intro) {
    return post.intro;
  } else if (post.excerpt) {
    return post.excerpt;
  } else if (post.content) {
    const short_content = post.content.substring(0, content_limit || 140);
    if (content_limit_delim) {
      const delim_pos = short_content.lastIndexOf(content_limit_delim);
      if (delim_pos > -1) {
        return short_content.substring(0, delim_pos);
      }
    }
    return short_content;
  }
  return '';
}

function composeContentWithCover(post, content, context) {
  if (!content) return '';

  const cleanContent = content.replace(/[\x00-\x1F\x7F]/g, '');
  const imageUrl = post.image || post.cover;
  const hasImageInContent = /<img\s/i.test(cleanContent);

  if (imageUrl && !hasImageInContent) {
    const fullImageUrl = full_url_for.call(context, imageUrl);
    return `<p><img src="${fullImageUrl}" alt="${post.title}" /></p>\n${cleanContent}`;
  }

  return cleanContent;
}

function composeItemContent(post, feedConfig, context, description) {
  const { content } = feedConfig;
  const sourceContent = content && post.content ? post.content : description;

  return composeContentWithCover(post, sourceContent, context);
}

function composeItemCategories(post) {
  const items = [
    ...(post.categories ? post.categories.toArray() : []),
    ...(post.tags ? post.tags.toArray() : [])
  ];
  return items.map(item => ({ name: item.name, domain: item.permalink }));
}

function getMimeType(url) {
  const ext = url.split('.').pop().toLowerCase();
  const mimeTypes = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    bmp: 'image/bmp',
    ico: 'image/x-icon',
    avif: 'image/avif',
    mp3: 'audio/mpeg',
    mp4: 'video/mp4',
    webm: 'video/webm',
    pdf: 'application/pdf'
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

function composeItem(post, feedConfig, context) {
  const imageUrl = post.image || post.cover;
  const description = composeItemDescription(post, feedConfig);
  return {
    title: post.title,
    link: encodeURL(full_url_for.call(context, post.permalink)),
    description,
    published: post.date.toDate(),
    updated: post.updated ? post.updated.toDate() : post.date.toDate(),
    content: composeItemContent(post, feedConfig, context, description),
    enclosures: imageUrl && [{ url: full_url_for.call(context, imageUrl), type: getMimeType(imageUrl) }],
    categories: composeItemCategories(post)
  };
}

function composeRssItem(feed, item) {
  return {
    title: item.title,
    link: item.link,
    guid: item.link,
    description: item.description,
    pubDate: item.published,
    authors: [feed.author],
    content: { encoded: item.content },
    enclosures: item.enclosures,
    categories: item.categories
  };
}

function composeAtomEntry(feed, item) {
  const entryLinks = [
    { href: item.link, rel: 'alternate' },
    ...(item.enclosures || []).map(enclosure => ({ href: enclosure.url, rel: 'enclosure', type: enclosure.type }))
  ];

  return {
    title: item.title,
    id: item.link,
    links: entryLinks,
    summary: item.description,
    content: item.content,
    published: item.published,
    updated: item.updated || item.published,
    authors: feed.author.name && [feed.author],
    categories: item.categories.map(cat => ({ term: cat.name, scheme: cat.domain }))
  };
}

function injectXsl(xml, xslPath) {
  if (!xslPath) return xml;
  const xslInstruction = `<?xml-stylesheet type="text/xsl" href="${xslPath}"?>`;
  return xml.replace(/(<\?xml[^?]*\?>)/, `$1\n${xslInstruction}`);
}

function getRootRelativePath(root, file) {
  let normalizedRoot = root || '/';

  if (!normalizedRoot.startsWith('/')) normalizedRoot = `/${normalizedRoot}`;
  if (!normalizedRoot.endsWith('/')) normalizedRoot += '/';

  return `${normalizedRoot}${file}`;
}

function injectXsltPolyfill(xml, feedConfig, xslPath, root) {
  if (!feedConfig.enable_xslt_polyfill || !xslPath) return xml;

  const scriptPath = getRootRelativePath(root, 'xslt-polyfill.min.js');
  const scriptTag = `<script xmlns="http://www.w3.org/1999/xhtml" src="${scriptPath}"></script>`;

  // Atom: insert after <feed> opening tag
  if (/<feed[^>]*>/.test(xml)) {
    return xml.replace(/(<feed[^>]*>)/, `$1\n  ${scriptTag}`);
  }

  // RSS2: insert after <channel> opening tag
  if (/<channel>/.test(xml)) {
    return xml.replace(/(<channel>)/, `$1\n    ${scriptTag}`);
  }

  return xml;
}

function generateRss(feed, items, feedConfig, root) {
  const links = composeFeedLinks(feed.feedUrl, feed.hub, 'application/rss+xml');

  let xml = generateRssFeed({
    title: feed.title,
    description: feed.description,
    link: encodeURL(feed.url),
    language: feed.language,
    copyright: feed.copyright,
    generator: 'Hexo',
    lastBuildDate: feed.updated,
    image: feed.icon && {
      url: feed.icon,
      title: feed.title,
      link: encodeURL(feed.url)
    },
    atom: { links },
    items: items.map(item => composeRssItem(feed, item))
  }, { lenient: true });

  const xslPath = feedConfig.pretty_rss2_file;
  xml = injectXsl(xml, xslPath);
  xml = injectXsltPolyfill(xml, feedConfig, xslPath, root);

  return xml;
}

function generateAtom(feed, items, feedConfig, root) {
  const links = [
    { href: encodeURL(feed.url), rel: 'alternate' },
    ...composeFeedLinks(feed.feedUrl, feed.hub)
  ];

  let xml = generateAtomFeed({
    title: feed.title,
    id: encodeURL(feed.url),
    subtitle: feed.description,
    updated: feed.updated,
    links,
    generator: { text: 'Hexo', uri: 'https://hexo.io/' },
    icon: feed.icon,
    rights: feed.copyright,
    authors: feed.author.name && [feed.author],
    entries: items.map(item => composeAtomEntry(feed, item)),
    language: feed.language
  }, { lenient: true });

  const xslPath = feedConfig.pretty_atom_file;
  xml = injectXsl(xml, xslPath);
  xml = injectXsltPolyfill(xml, feedConfig, xslPath, root);

  return xml;
}

module.exports = function(locals, type, path) {
  const { config } = this;
  const { feed: feedConfig } = config;

  const posts = composePosts(locals.posts, feedConfig);

  if (posts.length <= 0) {
    feedConfig.autodiscovery = false;
    return;
  }

  const feed = composeFeed(config, path, this, posts);
  const items = posts.toArray().map(post => composeItem(post, feedConfig, this));

  let data;
  switch (type) {
    case 'rss2':
      data = generateRss(feed, items, feedConfig, config.root);
      break;
    default:
      data = generateAtom(feed, items, feedConfig, config.root);
  }

  return {
    path,
    data
  };
};