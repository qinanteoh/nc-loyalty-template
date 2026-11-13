# NC Loyalty Program · 营养俱乐部会员 App

会员积分、NCP 卡扫码打卡、礼物兑换，一个 App 全部搞定。顾客不用下载，用手机号码就能注册使用。

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/qinanteoh/nc-loyalty-template)

## 📘 教学
- **还没有 App 的新伙伴**：[新伙伴设定教学](SETUP-GUIDE.md)，一步一步建立你自己的 App
- **已经有 App 的伙伴**：[老伙伴更新教学](UPDATE-GUIDE.md)，一步一步更新到最新版本（资料不会动）

## 你需要准备
- 一个 **GitHub** 账号（免费）：github.com
- 一个 **Cloudflare** 账号（免费）：dash.cloudflare.com
- 一部电脑（第一次设定用电脑比较方便）

## 一键建立你自己的 App（大约 10 分钟）
1. 按上面蓝色的 **Deploy to Cloudflare** 按钮。
2. 用你的 Cloudflare 账号登入，再按提示连接你的 GitHub 账号。
3. 设定页面会出现几栏：
   - **Project name / Worker name**：你的 App 名称，只能用小写英文、数字和横线，例如 `happylife-club`。这会变成你的网址的一部分。
   - **D1 database**：资料库，保持默认就可以，系统会自动建立。
   - **ADMIN_PASSWORD**：填你自己的**后台密码**，请记下来。
4. 按 **Create and deploy / 部署**，等 1 到 2 分钟。
5. 完成后会给你一个网址，例如 `https://happylife-club.你的名称.workers.dev`。

## 开始使用
- **顾客的链接**：就是上面那个网址，发给顾客，或打印二维码。
- **店家的链接**：网址后面加 `#admin`，例如 `https://happylife-club.你的名称.workers.dev/#admin`，输入你的 ADMIN_PASSWORD 进入后台。
- 第一次进后台，请到 **管理 → 首页 → 俱乐部资料**：
  - 改成你的 **俱乐部名称**
  - 上传你的 **Logo**（会变成手机主画面的 App 图标）
  - 填 **手机主画面上的短名称**
- 再到 **管理 → NCP卡**，下载 **打卡二维码海报**，打印贴在店里。
- 礼物、赚分任务、会员等级规则都已经预先放好，可以在后台自己改。

## 功能
- 顾客用手机号码 + 4 位数密码注册登入，登入一次一直保持
- NCP 卡（10+1、30 天），扫码打卡自动扣次数、自动加积分
- Daily Pass：发一次就可以一直用，每次打卡由店家审核后加分
- 打卡二维码两用：还没注册的人扫了会直接到注册页面；新会员注册后由店家核准
- 会员等级自动升级：Silver / Gold / Platinum
- 中文 / English / Bahasa Melayu 三种语言，顾客自己切换
- 手机推送通知：店家发公告、申请通过/被拒绝、NCP 卡快用完，会员手机会收到通知（iPhone 需先把 App 加到主画面）
- 礼物兑换商城（可放照片）、赚分任务申请、店家审核
- 付款确认、每日打卡统计、PDF / Excel 报表导出
- 每日打卡报告：选日期看名单和总数，导出 PDF（手机可直接分享到 WhatsApp）
- 21 天健康课程（含影片），进度存在会员资料
- 健康评估及检测表（Tanita 记录、自动算 BMI、进度图），店家可在后台查看

## 已经设定好的伙伴：怎样更新到最新版本
只要换掉一个文件，**原有的会员、积分、打卡记录都不会动**。
1. 用电脑打开你自己的 GitHub，找到当初部署时建立的那个项目（名字就是你的 App 名称）。
2. 先在这里下载最新的 `worker.js`：打开本页上方的 `worker.js` → 右上角「Download raw file」。
3. 回到你自己的项目，按 **Add file → Upload files**，把刚下载的 `worker.js` 拖进去，按 **Commit changes**。
4. 等 2 分钟，Cloudflare 会自动更新。会员下次打开 App 会自动换成新版本。

> 只换 `worker.js`，**不要**上传或修改 `wrangler.jsonc`，那里面有你自己的资料库设定。

## 档案说明
- `worker.js`：完整的 App 程式（部署的就是这个档案）
- `wrangler.jsonc`：Cloudflare 设定
- `public/course/`：21 天健康课程（网页和图片）
- `src/`：程式原始档，方便以后修改
