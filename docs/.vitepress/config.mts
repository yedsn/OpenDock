import { defineConfig } from 'vitepress'

const githubRepo = 'https://github.com/yedsn/OpenDock'
const giteeRepo = 'https://gitee.com/hongxiaojian/open-dock'
const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'OpenDock'
const base = process.env.DOCS_BASE ?? (process.env.GITHUB_ACTIONS === 'true' ? `/${repoName}/` : '/')

export default defineConfig({
  title: 'OpenDock',
  description: '面向开发者和专业用户的桌面资源集合与启动工具。',
  lang: 'zh-CN',
  base,
  cleanUrls: true,
  lastUpdated: true,
  head: [
    ['link', { rel: 'icon', type: 'image/png', href: `${base}favicon.png` }],
    ['meta', { name: 'theme-color', content: '#168CFF' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'OpenDock' }],
    ['meta', { property: 'og:description', content: '一个面向开发者和专业用户的桌面资源集合与启动工具。' }]
  ],
  themeConfig: {
    logo: '/logo.png',
    nav: [
      { text: '首页', link: '/' },
      { text: '使用说明', link: '/guide/quick-start' },
      { text: '开发文档', link: '/develop/setup' },
      { text: 'GitHub', link: githubRepo }
    ],
    sidebar: {
      '/guide/': [
        {
          text: '使用说明',
          items: [
            { text: '快速开始', link: '/guide/quick-start' },
            { text: '核心概念', link: '/guide/core-concepts' },
            { text: '资源与打开', link: '/guide/resources-and-open' }
          ]
        },
        {
          text: '扩展与同步',
          items: [
            { text: '插件开发', link: '/guide/plugin-development' },
            { text: 'WebDAV 同步', link: '/guide/webdav-sync' }
          ]
        }
      ],
      '/develop/': [
        {
          text: '开发说明',
          items: [
            { text: '开发环境', link: '/develop/setup' },
            { text: '构建与发布', link: '/develop/build-and-release' },
            { text: '发布与自动更新', link: '/develop/release-and-update' }
          ]
        }
      ],
      '/reference/': [
        {
          text: '参考',
          items: [
            { text: '项目结构', link: '/reference/project-structure' },
            { text: '常用命令', link: '/reference/commands' },
            { text: '站点与发布说明', link: '/reference/site-deployment' }
          ]
        }
      ]
    },
    socialLinks: [
      { icon: 'github', link: githubRepo }
    ],
    search: {
      provider: 'local'
    },
    editLink: {
      pattern: `${githubRepo}/edit/master/docs/:path`,
      text: '在 GitHub 上编辑此页'
    },
    outline: {
      label: '页面导航'
    },
    docFooter: {
      prev: '上一页',
      next: '下一页'
    },
    lastUpdated: {
      text: '最后更新于'
    },
    footer: {
      message: 'Released under AGPL-3.0-or-later.',
      copyright: 'Copyright 2026 OpenDock Contributors'
    }
  }
})
