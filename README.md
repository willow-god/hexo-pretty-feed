# hexo-pretty-feed

[![NPM version](https://badge.fury.io/js/hexo-pretty-feed.svg)](https://www.npmjs.com/package/hexo-pretty-feed)

生成美观的 Atom 1.0 或 RSS 2.0 Feed，支持插入 XSL 样式美化输出。

> 目前 Chrome 正在逐步废弃XSL方案，本插件正在寻求一种更为现代化的实现，将在未来上线。

本插件基于 [hexo-generator-feed](https://github.com/hexojs/hexo-generator-feed) 修改，增加了 XSL 样式支持、封面图（`cover`/`image`）以及 MIME 类型自动识别等功能。

## 安装

```bash
npm install hexo-pretty-feed --save
```

## 使用

安装后插件会自动工作，无需额外操作。

### 文章封面图

在文章的 [Front-matter](https://hexo.io/zh-cn/docs/front-matter) 中添加 `cover` 或 `image` 字段：

```yaml
---
title: 我的文章
date: 2024-01-01 12:00:00
cover: /images/my-cover.webp   # 支持 cover
# 或者
image: /images/my-cover.jpg    # 也支持 image（优先级更高）
---
```

支持常见图片格式：`jpg`、`jpeg`、`png`、`gif`、`webp`、`svg`、`avif` 等。

### 文章摘要

在 Front-matter 中可选择添加 `description`、`intro` 或 `excerpt` 字段来自定义摘要。若未设置，插件将使用文章摘要或前 140 字符作为摘要内容。

## 配置

在 `_config.yml` 中添加：

```yaml
# RSS订阅源
# hexo-pretty-feed
feed:
  enable: true
  type: atom
  path: atom.xml
  limit: 25
  content: false
  content_limit: 40
  pretty_atom_file: /config/feed/atom.xsl
  pretty_rss2_file: /config/feed/rss2.xsl
```

### 可用配置项

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| **enable** | 启用插件 | `true` |
| **type** | Feed 类型：`atom`、`rss2`，或同时输出多个（数组） | `atom` |
| **path** | 输出路径。多类型时需与 `type` 一一对应 | `type + '.xml'` |
| **limit** | 最多包含的文章数。`0` 表示不限制 | `20` |
| **hub** | PubSubHubbub 的 hub 地址（可选） | `''` |
| **content** | 是否在 Feed 中包含完整文章内容 | `true` |
| **content_limit** | 未包含全文时的摘要字符数 | `140` |
| **content_limit_delim** | 摘要截断的分隔符 | `''` |
| **order_by** | 文章排序方式 | `-date` |
| **icon** | Feed 图标，默认使用邮箱对应的 Gravatar | `''` |
| **autodiscovery** | 是否在 HTML `<head>` 中添加自动发现标签 | `true` |
| **pretty_atom_file** | Atom XSL 样式文件路径，留空则不插入 | `''` |
| **pretty_rss2_file** | RSS2 XSL 样式文件路径，留空则不插入 | `''` |

#### 多类型输出示例

```yaml
feed:
  type:
    - atom
    - rss2
  path:
    - atom.xml
    - rss2.xml
  pretty_atom_file: /config/feed/atom.xsl
  pretty_rss2_file: /config/feed/rss2.xsl
```

#### XSL 路径说明

`pretty_atom_file` 和 `pretty_rss2_file` 支持两种路径：

1. **网站路径**（推荐）：以 `/` 开头，直接作为 URL 引用
   ```yaml
   pretty_atom_file: /config/feed/atom.xsl
   ```
   生成的 XML：
   ```xml
   <?xml-stylesheet type="text/xsl" href="/config/feed/atom.xsl"?>
   ```

2. **本地文件路径**：相对或绝对路径，文件需存在于本地
   ```yaml
   pretty_atom_file: ./source/config/feed/atom.xsl
   ```

使用网站路径时，需确保 XSL 文件已部署到网站对应目录（如 `source/config/feed/` 下的文件会被 Hexo 复制到 `public/config/feed/`）。

## 输出示例

### Atom（atom.xml）

```xml
<?xml version="1.0" encoding="utf-8"?>
<?xml-stylesheet type="text/xsl" href="/config/feed/atom.xsl"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>My Blog</title>
  <link href="https://example.com/atom.xml" rel="self"/>
  <link href="https://example.com/"/>
  <entry>
    <title>我的文章</title>
    <link href="https://example.com/posts/hello/"/>
    <link href="https://example.com/images/cover.webp" rel="enclosure" type="image/webp"/>
    <summary>文章摘要...</summary>
    <published>2024-01-01T12:00:00.000Z</published>
  </entry>
</feed>
```

### RSS 2.0（rss2.xml）

```xml
<?xml version="1.0" encoding="utf-8"?>
<?xml-stylesheet type="text/xsl" href="/config/feed/rss2.xsl"?>
<rss version="2.0">
  <channel>
    <title>My Blog</title>
    <item>
      <title>我的文章</title>
      <link>https://example.com/posts/hello/</link>
      <enclosure url="https://example.com/images/cover.webp" type="image/webp"/>
      <description>文章摘要...</description>
    </item>
  </channel>
</rss>
```

## 相关项目

- [RSS.Beauty](https://github.com/ccbikai/RSS.Beauty) - 本项目灵感启发

---

欢迎在 [GitHub](https://github.com/willow-god/hexo-pretty-feed/issues) 提交反馈与 PR ❤️
