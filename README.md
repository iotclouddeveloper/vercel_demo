# 拾光-日程管理工具

Next.js App Router + Auth.js Credentials + Prisma(SQLite) dashboard MVP.

## First run

1. Install dependencies:
   - `npm install`
2. Prepare environment variables:
   - Copy `.env.example` to `.env`
   - Set `AUTH_SECRET` and `ADMIN_PASSWORD`
3. Initialize database and admin password hash:
   - `npm run db:push`
   - `npm run db:seed`
4. Start app:
   - `npm run dev`

## Verification checklist

- Open `http://localhost:3000` and confirm redirect to `/login`.
- Login with any username and your `ADMIN_PASSWORD`.
- Add/toggle/delete todos and refresh page, data should persist.

建议一起迁移
web/prisma/dev.db
web/.env（特别是 AUTH_SECRET，不一致会导致登录会话问题）
项目代码本身
新电脑建议步骤
放好 dev.db 到相同相对路径（通常 web/prisma/dev.db）
npm install
npm run db:push（对齐结构，不清数据）
npm run de