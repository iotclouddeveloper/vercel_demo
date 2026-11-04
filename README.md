# 拾光 · 前端演示版

Next.js 静态日历应用，无数据库、登录或服务端 API。

- 日历查看、日常/工作/学习分类切换
- 新增、编辑、删除事项，拖动复制事项
- 数据保存在当前浏览器 localStorage，不跨设备同步；清除浏览器数据会删除记录

## 本地开发

```sh
npm install
npm run dev
```

## Vercel 部署

推送代码至 GitHub，然后在 Vercel 导入项目。Framework Preset 选择 Next.js，Build Command 使用 `npm run build`，Output Directory 使用 `out`（如未自动识别则手动填写）。不需要 DATABASE_URL、AUTH_SECRET 或任何环境变量。

```sh
npm run build
```

构建生成 `out/` 静态站点。`/login` 保留为同样的演示页面，旧书签仍可访问。

原 SQLite 数据不会导入前端演示版。
