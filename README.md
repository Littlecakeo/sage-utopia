# Sage Utopia

一个柔软有序的中文个人操作系统，用于学习、求职、朋友留言和个人作品展示。

## 云端数据

当前版本支持 Supabase + PostgreSQL。没有配置环境变量时，页面会继续使用本地模式，方便本机预览；配置后，课程、作业、求职、支出、作品集和个人资料会优先读写 Supabase。

1. 在 Supabase SQL Editor 执行 `supabase/schema.sql`。
2. 复制 `.env.example` 为 `.env`，填入：

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

3. 本地运行：

```bash
npm install
npm run serve
```

## Vercel 部署

- Build Command: `npm run build`
- Output Directory: `dist`
- 环境变量：`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`

部署后请依次打开首页、学习中心、求职中心、留言板、关于 Sage，并验证新增、编辑、删除、刷新后数据仍存在。

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
