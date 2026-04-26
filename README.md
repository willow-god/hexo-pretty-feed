# hexo-pretty-feed

[![NPM version](https://badge.fury.io/js/hexo-pretty-feed.svg)](https://www.npmjs.com/package/hexo-pretty-feed)

一个基于 Hexo 的 Feed 生成插件，用于输出更易阅读、可插入 XSL 样式的 Atom 1.0 / RSS 2.0 订阅文件，并增强封面图、摘要与正文内容的生成行为。

本插件基于 [hexo-generator-feed](https://github.com/hexojs/hexo-generator-feed) 修改，额外提供了以下能力：

- 支持 Atom / RSS 2.0 输出
- 支持插入 XSL 样式文件，美化 XML 在浏览器中的展示
- 支持文章封面图 `cover` / `image`
- 支持自动识别常见附件 MIME 类型
- 支持在 `content` 中自动补入封面图
- 支持在未开启全文输出时，仍为 `content` 提供“封面图 + 摘要”内容
- 支持可选的 XSLT Polyfill，用于缓解 Chrome 等环境对 XSLT 支持减弱的问题

> 注意：浏览器对 XSLT 的支持正在逐步减弱，尤其是 Chrome 系浏览器。因此，XSL 主要适合用于“浏览器直看 XML”场景；对于订阅器本身的兼容性，建议优先依赖标准 Feed 字段本身，而不是只依赖 XSL 展示层。

---

## 目录

- [安装](#安装)
- [快速开始](#快速开始)
- [功能说明](#功能说明)
  - [1. 文章封面图](#1-文章封面图)
  - [2. 摘要生成规则](#2-摘要生成规则)
  - [3. content 生成规则](#3-content-生成规则)
  - [4. enclosure 行为](#4-enclosure-行为)
- [配置说明](#配置说明)
  - [完整配置示例](#完整配置示例)
  - [配置项一览](#配置项一览)
  - [content 相关行为详解](#content-相关行为详解)
- [Front-matter 用法](#front-matter-用法)
- [输出示例](#输出示例)
  - [Atom 示例](#atom-示例)
  - [RSS 2.0 示例](#rss-20-示例)
- [推荐配置](#推荐配置)
  - [1. 想让订阅器里直接阅读全文](#1-想让订阅器里直接阅读全文)
  - [2. 只想给摘要，但仍希望有封面图](#2-只想给摘要但仍希望有封面图)
  - [3. 想在浏览器中直接美观查看 XML](#3-想在浏览器中直接美观查看-xml)
  - [4. 站点部署在子路径下](#4-站点部署在子路径下)
- [常见问题 FAQ](#常见问题-faq)

---

## 安装

```bash
npm install hexo-pretty-feed --save
```

安装完成后，插件会在 Hexo 构建时自动参与生成 Feed，一般不需要额外注册。

---

## 快速开始

在站点根目录的 `_config.yml` 中添加：

```yaml
feed:
  enable: true
  type: atom
  path: atom.xml
  limit: 20
  content: true
  content_limit: 140
  content_limit_delim: ''
  pretty_atom_file: /config/feed/atom.xsl
  pretty_rss2_file: /config/feed/rss2.xsl
  enable_xslt_polyfill: false
```

如果你希望同时输出 Atom 和 RSS 2.0：

```yaml
feed:
  type:
    - atom
    - rss2
  path:
    - atom.xml
    - rss2.xml
```

---

## 功能说明

### 1. 文章封面图

你可以在文章的 [Front-matter](https://hexo.io/zh-cn/docs/front-matter) 中设置：

```yaml
---
title: 我的文章
date: 2024-01-01 12:00:00
cover: /images/my-cover.webp
---
```

或者：

```yaml
---
title: 我的文章
date: 2024-01-01 12:00:00
image: /images/my-cover.jpg
---
```

两者都存在时，优先级如下：

```text
image > cover
```

支持常见格式，包括但不限于：

- `jpg`
- `jpeg`
- `png`
- `gif`
- `webp`
- `svg`
- `bmp`
- `ico`
- `avif`

此外，也支持部分非图片附件类型的 MIME 识别，例如：

- `mp3`
- `mp4`
- `webm`
- `pdf`

### 2. 摘要生成规则

插件会为每篇文章生成摘要，并用于：

- Atom 的 `summary`
- RSS 2.0 的 `description`
- `content: false` 时的 `content` 文本部分回退内容

摘要来源优先级如下：

```text
description > intro > excerpt > 截断后的 post.content
```

也就是说：

1. 如果设置了 `description`，优先使用它
2. 否则如果设置了 `intro`，使用 `intro`
3. 否则如果设置了 `excerpt`，使用 `excerpt`
4. 如果都没有，则从正文 `post.content` 中截取摘要

当需要从正文截取摘要时：

- 默认截取前 `140` 个字符
- 可以通过 `content_limit` 修改长度
- 可以通过 `content_limit_delim` 指定截断分隔符，例如 `<!-- more -->`

### 3. `content` 生成规则

这是本插件当前最重要的增强点之一。

#### 当 `content: true`

Feed 中的 `content` 会输出：

```text
封面图 + 全文
```

行为细节：

- 如果文章存在 `image` 或 `cover`，会优先把封面图插入到 `content` 顶部
- 如果正文中已经包含 `<img>` 标签，则不会重复插入封面图
- 正文内容会原样保留（仅做必要的控制字符清理）

#### 当 `content: false`

Feed 中的 `content` **仍然会输出**，内容为：

```text
封面图 + 摘要
```

这样做的目的，是为了兼容那些：

- 不展示 `enclosure` 的阅读器
- 只读取 `content`、不重视 `enclosure` 的阅读器
- 希望看到封面图，但又不想输出全文的场景

换句话说，`content: false` 现在表示：

- 不输出全文
- 但依旧输出一个可展示的内容块
- 该内容块至少包含摘要；若有封面图，则摘要前面还会带上封面图

### 4. `enclosure` 行为

如果文章配置了 `image` 或 `cover`，插件仍然会继续生成 enclosure：

- RSS 2.0 中使用 `<enclosure ... />`
- Atom 中使用 `<link rel="enclosure" ... />`

这部分行为**不会因为 `content` 补图而被取消**。

也就是说，当前插件会同时保留两套兼容路径：

1. 标准 enclosure / enclosure link
2. `content` 中的内联封面图

这样做的原因是：不同订阅器对 `enclosure` 的支持程度并不一致，而 `content` 内联图片通常更容易被直接渲染出来。

---

## 配置说明

### 完整配置示例

```yaml
feed:
  enable: true
  type: atom
  path: atom.xml
  limit: 20
  hub: ''
  content: true
  content_limit: 140
  content_limit_delim: ''
  order_by: -date
  icon: ''
  autodiscovery: true
  pretty_atom_file: /config/feed/atom.xsl
  pretty_rss2_file: /config/feed/rss2.xsl
  enable_xslt_polyfill: false
```

### 常见配置模板

下面给出几组更适合直接复制使用的配置示例。

#### 1. 只输出 Atom，保留全文与封面图

适合场景：

- 只打算提供 Atom
- 希望阅读器内可直接阅读全文
- 希望 `content` 中直接展示封面图

```yaml
feed:
  enable: true
  type: atom
  path: atom.xml
  limit: 20
  content: true
  content_limit: 140
  order_by: -date
```

说明：

- `summary` 会输出摘要
- `content` 会输出“封面图 + 全文”
- 如果正文中已有 `<img>`，不会重复插入封面图
- 如果文章设置了 `image` 或 `cover`，仍会继续生成 enclosure link

#### 2. 只输出 Atom，只给摘要但保留封面图

适合场景：

- 不希望在 Feed 中暴露全文
- 希望订阅器中仍能看到封面图和摘要
- 希望尽量兼顾更多阅读器的展示效果

```yaml
feed:
  enable: true
  type: atom
  path: atom.xml
  limit: 20
  content: false
  content_limit: 160
  content_limit_delim: '<!-- more -->'
  order_by: -date
```

说明：

- `summary` 输出摘要
- `content` 仍会输出，但内容是“封面图 + 摘要”
- 当正文包含 `<!-- more -->` 时，会优先截断到分隔符前

#### 3. 只输出 RSS 2.0，保留全文与封面图

适合场景：

- 主要面向偏 RSS 的阅读器或服务
- 希望在 `content:encoded` 中输出完整内容
- 同时保留 `<enclosure>`

```yaml
feed:
  enable: true
  type: rss2
  path: rss2.xml
  limit: 20
  content: true
  order_by: -date
```

说明：

- RSS 的 `description` 会输出摘要
- RSS 的 `content:encoded` 会输出“封面图 + 全文”
- 如果文章设置了 `image` 或 `cover`，会继续输出 `<enclosure>`

#### 4. 只输出 RSS 2.0，只给摘要但保留封面图

```yaml
feed:
  enable: true
  type: rss2
  path: rss2.xml
  limit: 20
  content: false
  content_limit: 160
  content_limit_delim: '<!-- more -->'
  order_by: -date
```

说明：

- `description` 输出摘要
- `content:encoded` 输出“封面图 + 摘要”
- 适合不想分发全文，但仍希望阅读器能显示更完整卡片内容的场景

#### 5. 同时输出 Atom 和 RSS 2.0

适合场景：

- 既想兼容 Atom，也想兼容 RSS 2.0
- 希望两个 Feed 一起提供
- 想让不同订阅器自己选择更偏好的类型

```yaml
feed:
  enable: true
  type:
    - atom
    - rss2
  path:
    - atom.xml
    - rss2.xml
  limit: 20
  content: true
  order_by: -date
```

说明：

- `type` 和 `path` 数组顺序需要一一对应
- 这个配置下会同时生成 `atom.xml` 和 `rss2.xml`
- 如果未手动填写 `path`，插件也会按类型自动推断默认文件名

#### 6. Atom + RSS 2.0 + XSL 美化

适合场景：

- 希望在浏览器中直接打开 Feed 时更美观
- 已经在 `source/` 下准备好对应 XSL 文件

```yaml
feed:
  enable: true
  type:
    - atom
    - rss2
  path:
    - atom.xml
    - rss2.xml
  content: true
  pretty_atom_file: /config/feed/atom.xsl
  pretty_rss2_file: /config/feed/rss2.xsl
```

建议目录结构：

```text
source/
└── config/
    └── feed/
        ├── atom.xsl
        └── rss2.xsl
```

#### 7. Atom + RSS 2.0 + XSL + Polyfill

适合场景：

- 你不仅要插入 XSL
- 还希望在浏览器原生 XSLT 支持较差时，尽量维持可视化显示能力

```yaml
feed:
  enable: true
  type:
    - atom
    - rss2
  path:
    - atom.xml
    - rss2.xml
  content: true
  pretty_atom_file: /config/feed/atom.xsl
  pretty_rss2_file: /config/feed/rss2.xsl
  enable_xslt_polyfill: true
```

说明：

- 只有在配置了 `pretty_atom_file` / `pretty_rss2_file` 的前提下，polyfill 才会生效
- 构建时会额外生成：

```text
/xslt-polyfill.min.js
```

- 注入到 Feed XML 中的脚本路径会基于 Hexo `root` 自动生成

#### 8. 子路径部署示例

适合场景：

- 站点不是部署在域名根目录
- 而是部署在类似 `https://example.com/blog/` 这样的子路径下

Hexo 站点配置示例：

```yaml
url: https://example.com/blog
root: /blog/
```

Feed 配置示例：

```yaml
feed:
  enable: true
  type:
    - atom
    - rss2
  path:
    - atom.xml
    - rss2.xml
  content: true
  pretty_atom_file: /config/feed/atom.xsl
  pretty_rss2_file: /config/feed/rss2.xsl
  enable_xslt_polyfill: true
```

此时典型输出路径通常会是：

- Feed：
  - `/blog/atom.xml`
  - `/blog/rss2.xml`
- Polyfill：
  - `/blog/xslt-polyfill.min.js`

也就是说，polyfill 注入路径不会写死成 `/xslt-polyfill.min.js`，而是会自动带上 `root` 前缀，更适合子目录部署场景。

### 配置项一览

> 小提示：如果你开启了 `enable_xslt_polyfill`，但没有配置 `pretty_atom_file` 或 `pretty_rss2_file`，那么 polyfill 不会生效，因为它只服务于已启用 XSL 的 Feed。

| 配置项 | 类型 | 默认值 | 说明 |
|---|---|---:|---|
| `enable` | `boolean` | `true` | 是否启用插件 |
| `type` | `string \| string[]` | `atom` | 输出类型，可为 `atom`、`rss2`，或数组同时输出多个 |
| `path` | `string \| string[]` | `type + '.xml'` | 输出路径；多类型时应与 `type` 顺序对应 |
| `limit` | `number` | `20` | 最多包含的文章数，`0` 表示不限制 |
| `hub` | `string` | `''` | PubSubHubbub hub 地址 |
| `content` | `boolean` | `true` | 是否输出全文；关闭时仍会输出“封面图 + 摘要”的 `content` |
| `content_limit` | `number` | `140` | 未输出全文时，摘要的默认截断长度 |
| `content_limit_delim` | `string` | `''` | 摘要截断分隔符，例如 `<!-- more -->` |
| `order_by` | `string` | `-date` | 文章排序方式 |
| `icon` | `string` | `''` | Feed 图标；若未设置且配置了邮箱，则可能回退为 Gravatar |
| `autodiscovery` | `boolean` | `true` | 是否自动向 HTML `<head>` 中插入 Feed 发现标签 |
| `pretty_atom_file` | `string` | `''` | Atom 的 XSL 文件路径 |
| `pretty_rss2_file` | `string` | `''` | RSS 2.0 的 XSL 文件路径 |
| `enable_xslt_polyfill` | `boolean` | `false` | 是否插入 XSLT Polyfill 脚本 |

### `content` 相关行为详解

这是最容易混淆、也最值得说明的配置项。

#### `content: true`

输出效果：

- `summary` / `description`：输出摘要
- `content`：输出封面图 + 全文
- `enclosure`：继续输出

适合场景：

- 希望订阅器内可直接阅读全文
- 希望订阅器里直接看到封面图
- 不介意 Feed 体积更大

#### `content: false`

输出效果：

- `summary` / `description`：输出摘要
- `content`：输出封面图 + 摘要
- `enclosure`：继续输出

适合场景：

- 不想在 Feed 中暴露全文
- 仍希望订阅器能直接看到封面图和摘要
- 想兼顾较好的订阅器展示效果

你可以把它理解为：

- `summary` 是“摘要字段”
- `content` 是“实际展示内容字段”
- `enclosure` 是“附件声明字段”

三者并不互斥，而是共同工作。

---

## Front-matter 用法

### 仅设置封面图

```yaml
---
title: 我的文章
cover: /images/cover.webp
---
```

### 使用 `image` 并覆盖 `cover`

```yaml
---
title: 我的文章
cover: /images/cover.webp
image: /images/feed-cover.jpg
---
```

### 自定义摘要

```yaml
---
title: 我的文章
description: 这是用于 Feed 的自定义摘要。
---
```

### 使用 `intro` 或 `excerpt`

```yaml
---
title: 我的文章
intro: 这是一段简短导语。
---
```

```yaml
---
title: 我的文章
excerpt: 这是一段摘要内容。
---
```

### 借助分隔符截断正文摘要

```yaml
feed:
  content: false
  content_limit: 300
  content_limit_delim: '<!-- more -->'
```

当正文中存在：

```html
<p>这是摘要部分</p>
<!-- more -->
<p>这是正文剩余部分</p>
```

则摘要会优先截取到分隔符之前。

---

## 输出示例

### Atom 示例

以下示例演示的是：

- 文章存在封面图
- `summary` 输出摘要
- `content` 输出“封面图 + 摘要或全文”
- enclosure link 同时保留
- 当你开启全文时，`content` 中第二段会变成完整正文，而不是仅摘要

```xml
<?xml version="1.0" encoding="utf-8"?>
<?xml-stylesheet type="text/xsl" href="/config/feed/atom.xsl"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>My Blog</title>
  <link href="https://example.com/atom.xml" rel="self"/>
  <link href="https://example.com/" rel="alternate"/>
  <entry>
    <title>我的文章</title>
    <link href="https://example.com/posts/hello/" rel="alternate"/>
    <link href="https://example.com/images/cover.webp" rel="enclosure" type="image/webp"/>
    <summary><![CDATA[文章摘要...]]></summary>
    <content><![CDATA[
<p><img src="https://example.com/images/cover.webp" alt="我的文章" /></p>
<p>文章摘要...</p>
]]></content>
    <published>2024-01-01T12:00:00.000Z</published>
    <updated>2024-01-01T12:00:00.000Z</updated>
  </entry>
</feed>
```


### RSS 2.0 示例

```xml
<?xml version="1.0" encoding="utf-8"?>
<?xml-stylesheet type="text/xsl" href="/config/feed/rss2.xsl"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>My Blog</title>
    <item>
      <title>我的文章</title>
      <link>https://example.com/posts/hello/</link>
      <enclosure url="https://example.com/images/cover.webp" type="image/webp"/>
      <description><![CDATA[文章摘要...]]></description>
      <content:encoded><![CDATA[
<p><img src="https://example.com/images/cover.webp" alt="我的文章" /></p>
<p>文章摘要...</p>
]]></content:encoded>
    </item>
  </channel>
</rss>
```

---

## XSL 与 Polyfill 说明

### XSL 文件路径写法

`pretty_atom_file` 和 `pretty_rss2_file` 支持两种路径方式。

#### 1. 网站路径（推荐）

以 `/` 开头，直接作为最终站点 URL 引用：

```yaml
pretty_atom_file: /config/feed/atom.xsl
pretty_rss2_file: /config/feed/rss2.xsl
```

生成效果类似：

```xml
<?xml-stylesheet type="text/xsl" href="/config/feed/atom.xsl"?>
```

这种方式最适合已经把 XSL 文件放入 `source/` 目录的场景。

例如：

```text
source/config/feed/atom.xsl
source/config/feed/rss2.xsl
```

构建后通常会被复制到：

```text
public/config/feed/atom.xsl
public/config/feed/rss2.xsl
```

#### 2. 本地文件路径

也可以写相对路径或绝对路径：

```yaml
pretty_atom_file: ./source/config/feed/atom.xsl
```

这种方式适合本地维护路径时使用，但如果你只是希望部署后的站点正常引用，通常还是推荐“网站路径”。

### `enable_xslt_polyfill`

由于部分浏览器对 XSLT 的原生支持正在减弱，开启该选项后，插件会在生成的 Feed XML 中插入 polyfill 脚本，以便在需要 XSL 渲染的场景下继续工作。

不过，这个开关**只有在对应 Feed 已配置 XSL 路径时才会生效**：

- Atom 需要同时配置 `pretty_atom_file`
- RSS 2.0 需要同时配置 `pretty_rss2_file`

也就是说：

- 如果你只开启 `enable_xslt_polyfill: true`，但没有配置对应的 XSL 文件路径，那么不会插入 polyfill
- 只有在“确实要插入 XSL”的前提下，polyfill 才会一起插入

开启后：

- Atom：脚本插入到 `<feed>` 内
- RSS 2.0：脚本插入到 `<channel>` 内
- 构建时会自动额外输出一个站点根路径资源：

```text
/xslt-polyfill.min.js
```

脚本引用路径会基于 Hexo 的 `root` 自动生成，而不是使用相对路径。因此：

- 部署在根目录时，通常会得到 `/xslt-polyfill.min.js`
- 部署在子路径（如 `/blog/`）时，通常会得到 `/blog/xslt-polyfill.min.js`

这样可以避免 Feed 文件位于不同目录时，相对路径失效的问题。

示例：

```yaml
feed:
  pretty_atom_file: /config/feed/atom.xsl
  pretty_rss2_file: /config/feed/rss2.xsl
  enable_xslt_polyfill: true
```

---

## 注意事项

### 1. `content` 与 `summary` 会同时存在

这是有意设计，不是重复输出错误。

- `summary` / `description` 负责摘要语义
- `content` 负责展示更完整的可读内容
- `enclosure` 负责声明附件资源

不同阅读器会侧重读取不同字段，因此保留多种标准字段通常更稳妥。

### 2. 封面图可能同时出现在 `content` 和 `enclosure`

这同样是有意设计。

- `enclosure` 适合支持附件的阅读器
- `content` 内联图片适合直接渲染型阅读器

### 3. 正文已有图片时不会重复补图

如果文章正文中已经包含 `<img>`，插件不会再次把 `cover` / `image` 插到顶部，避免出现重复头图。

### 4. `image` 优先级高于 `cover`

如果两者同时存在，插件会优先使用 `image`。

### 5. 未显式设置 `path` 时会自动推断

- `type: atom` 时默认输出 `atom.xml`
- `type: rss2` 时默认输出 `rss2.xml`
- 数组模式下会按 `type` 顺序自动推断对应文件名


---

## 推荐配置

如果你不想逐个推敲配置项，可以直接参考下面几种推荐策略。

### 1. 想让订阅器里直接阅读全文

推荐配置：

```yaml
feed:
  enable: true
  type:
    - atom
    - rss2
  path:
    - atom.xml
    - rss2.xml
  limit: 20
  content: true
  order_by: -date
```

推荐理由：

- `summary` / `description` 保留摘要语义
- `content` / `content:encoded` 提供完整正文
- 封面图会优先插入到内容头部
- 同时保留 enclosure，兼容更多阅读器

适合：

- 个人博客全文订阅
- 希望读者无需跳回站点也能完整阅读
- 更看重阅读器内体验，而不是节省 Feed 体积

### 2. 只想给摘要，但仍希望有封面图

推荐配置：

```yaml
feed:
  enable: true
  type:
    - atom
    - rss2
  path:
    - atom.xml
    - rss2.xml
  limit: 20
  content: false
  content_limit: 160
  content_limit_delim: '<!-- more -->'
  order_by: -date
```

推荐理由：

- 不输出全文，控制 Feed 体积
- `content` 仍保留“封面图 + 摘要”
- 对一些不展示 enclosure 的阅读器更友好
- 对习惯用 `<!-- more -->` 的 Hexo 用户很实用

适合：

- 只希望 Feed 作为“文章预览”入口
- 想让读者点击回站阅读全文
- 希望兼顾封面图展示效果

### 3. 想在浏览器中直接美观查看 XML

推荐配置：

```yaml
feed:
  enable: true
  type:
    - atom
    - rss2
  path:
    - atom.xml
    - rss2.xml
  content: true
  pretty_atom_file: /config/feed/atom.xsl
  pretty_rss2_file: /config/feed/rss2.xsl
  enable_xslt_polyfill: true
```

推荐理由：

- 直接打开 Feed XML 时有更好的可读性
- 启用 polyfill 后，可缓解部分浏览器对 XSLT 支持减弱的问题
- 只有在确实配置了 XSL 时才会启用 polyfill，行为更合理

适合：

- 希望 Feed 在浏览器中看起来不那么“原始”
- 有自定义 XSL 模板需求
- 需要同时兼顾站点视觉展示与订阅能力

### 4. 站点部署在子路径下

推荐配置：

```yaml
url: https://example.com/blog
root: /blog/

feed:
  enable: true
  type:
    - atom
    - rss2
  path:
    - atom.xml
    - rss2.xml
  content: true
  pretty_atom_file: /config/feed/atom.xsl
  pretty_rss2_file: /config/feed/rss2.xsl
  enable_xslt_polyfill: true
```

推荐理由：

- polyfill 脚本路径会自动生成成 `/blog/xslt-polyfill.min.js`
- 不需要你手动为子路径部署改脚本引用
- 更适合 GitHub Pages 子项目、反向代理子目录等场景

适合：

- 站点不在域名根目录
- 需要同时启用 XSL 和 polyfill
- 希望配置更稳，减少路径踩坑

---

## 常见问题 FAQ

### 1. 为什么 `content: false` 了，Feed 里还是有 `content`？

这是当前插件的有意设计。

`content: false` 表示：

- 不输出全文
- 但仍输出一个可展示的内容块
- 这个内容块默认是“封面图 + 摘要”

这样做是为了提升订阅器兼容性，因为有些阅读器对 `content` 的展示明显好于 `enclosure`。

### 2. 为什么封面图会同时出现在 `content` 和 `enclosure`？

因为这两个字段承担的职责不同：

- `enclosure` 更偏“附件声明”
- `content` 更偏“实际展示内容”

有些阅读器更擅长处理 `enclosure`，有些则更倾向直接渲染 `content`。两边都保留，兼容性通常更好。

### 3. 为什么正文里已经有图了，还要判断是否插入封面？

插件会先检测正文里是否已经存在 `<img>`。

如果已经有图，就不会再把 `cover` / `image` 插到顶部，避免出现：

- 双头图
- 重复图片
- 阅读器中视觉冗余

### 4. `image` 和 `cover` 同时存在时用哪个？

优先级是：

```text
image > cover
```

如果两者都设置了，插件会优先使用 `image`。

### 5. 我开启了 `enable_xslt_polyfill`，为什么没有生效？

最常见原因是：你没有配置对应的 XSL 路径。

例如：

- Atom 需要 `pretty_atom_file`
- RSS 2.0 需要 `pretty_rss2_file`

只有在“该 Feed 真的启用了 XSL”时，polyfill 才会注入。

### 6. 为什么 polyfill 不再用 `./xslt-polyfill.min.js` 这种相对路径？

因为相对路径在这些场景下容易出问题：

- feed 文件放在子目录
- 站点部署在子路径
- 浏览器对 XML 当前 URL 的解析与预期不一致

现在改为基于 Hexo `root` 生成绝对站点路径，更稳一些。例如：

- 根目录部署：`/xslt-polyfill.min.js`
- 子路径部署：`/blog/xslt-polyfill.min.js`

### 7. 我应该优先用 Atom 还是 RSS 2.0？

如果没有特殊历史兼容负担，通常建议：

- **两个都输出**，让订阅器自己选
- 如果只能选一个，很多现代场景下 **Atom 更清晰一些**
- 如果你的生态或读者更依赖传统 RSS 工具，也可以优先保留 RSS 2.0

### 8. 我应该把 XSL 文件放在哪里？

最推荐的方式是放在 Hexo 的 `source/` 目录下，例如：

```text
source/config/feed/atom.xsl
source/config/feed/rss2.xsl
```

然后配置：

```yaml
pretty_atom_file: /config/feed/atom.xsl
pretty_rss2_file: /config/feed/rss2.xsl
```

这样部署后路径最直观，也最容易和 polyfill 配合。

---

## 相关项目

- [RSS.Beauty](https://github.com/ccbikai/RSS.Beauty)

---

如果你发现某类订阅器对 `summary`、`content`、`enclosure` 的支持表现不同，欢迎提交 Issue 或 PR，一起继续完善兼容性表现。
