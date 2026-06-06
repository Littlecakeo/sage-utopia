# Sage Utopia

一个柔软有序的中文个人操作系统，用于学习、求职、财务、成长记录和个人作品展示。

## 开发前检查命令

第一次下载项目后先安装依赖：

```bash
npm install
```

日常修改前后建议运行：

```bash
npm run lint
npm run format:check
npm run typecheck
npm run test
npm run build
```

需要检查 Lighthouse 时运行：

```bash
npm run lighthouse
```

如果只是想本地预览静态网站：

```bash
npm run serve
```

然后打开 `http://127.0.0.1:4173/index.html`。

## PR 合并前检查清单

- 页面可以正常打开，首页和学习中心没有空白或明显渲染错误。
- 导航按钮可以点击，`#study` 学习中心路由可以访问。
- 选课、任务、进度等主要按钮仍然可以操作。
- `npm run lint` 通过。
- `npm run format:check` 通过。
- `npm run typecheck` 通过。
- `npm run test` 通过。
- `npm run build` 通过。
- GitHub Actions 里的 Quality、CodeQL、Dependabot 检查没有失败项。
