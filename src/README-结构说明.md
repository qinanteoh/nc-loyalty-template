# 程序结构说明：要改哪里，只看那一个文件

App 分成很多小文件。要改一样东西，只打开对应的那个文件就好，其他不用看。
改完运行 `python3 src/build.py vita`（伙伴版本：`python3 src/build.py template`），
系统会自动把所有小文件合起来，变成上传用的 `worker.js` 和课程页 `public/course/index.html`。

> 不要直接改 `worker.js` 或 `public/course/index.html`，下次合起来时会被覆盖。

---

## 一、21 天课程（`src/course/`）

| 要改什么 | 文件 |
|---|---|
| 第 N 天的内容（中文、English、Bahasa Melayu 都在同一个文件） | `days/dayNN.json`，例如第 5 天 = `days/day05.json` |
| 第 N 天的「先想一想」小测验 | 同一个 `days/dayNN.json`，最下面的 `quiz` |
| 课程页的样子、标题、按钮、解锁规则 | `page-top.html`（样子和标题）、`page-bottom.html`（运作方式和按钮文字翻译） |
| 课程里的图片 | `public/course/fig/`、`public/course/img/` |

每一天的文件里面：
- `zh` / `en` / `ms`：三种语言的内容
- `t` 标题、`tag` 标签、`lead` 重点、`intro` 开场、`points` 今天要知道的几件事、`myth` 常见误区、`tips` 小技巧、`task` 今日小任务、`fact` 数字小知识、`share` 分享题
- `quiz`：小测验（`q` 题目、`opts` 选项、`a` 正确答案是第几个，从 0 开始算、`why` 解释）

后台和首页显示的「第 N 天：标题」会自动跟着 `t` 改，不用另外改。

## 二、App 画面（`src/app/`）

| 要改什么 | 文件 |
|---|---|
| 颜色、字体、排版、区块颜色 | `02-style.css` |
| 网页开头（App 名称、图标设定） | `01-page-top.html` |
| 图标 | `10-icons.js` |
| 跟服务器拿资料、自动更新新版本 | `11-store.js` |
| 中文 / English / Bahasa Melayu 切换 | `12-languages.js`（翻译的字在 `src/i18n_src.py`） |
| 手机推送通知、公告 | `13-notifications.js` |
| 等级、NCP 卡显示、礼物卡片等小工具 | `14-helpers.js` |
| 健康检测表、21 天课程入口、BMI | `20-health-and-course.js` |
| 后台「课程」页（会员读到第几天） | `21-admin-course-progress.js` |
| 会员的页面：首页、赚分、兑换、我的、扫码打卡、返回上一页 | `22-member-pages.js` |
| 管理后台各个标签页 | `30-admin-pages.js` |
| 画面怎么刷新、底部选单 | `31-render.js` |
| 弹出窗口和表格（礼物、任务、会员、开卡、扫码相机） | `32-popups-and-forms.js` |
| 按下每个按钮之后做什么 | `33-button-actions.js` |
| 每日打卡报告 | `40-checkin-report.js` |
| 导出 PDF（打卡报告、健康检测表） | `41-pdf.js` |
| 导出 CSV、每日统计 | `42-export.js` |
| App 启动 | `50-start.js` |

## 三、服务器（`src/server/`，资料存 D1）

| 要改什么 | 文件 |
|---|---|
| 等级规则（Gold / Platinum 门槛）、每次打卡几分 | `01-setup.js`（`TIER_RULE`、`DAILY_PTS`） |
| 健康记录要存哪些项目 | `02-helpers.js` |
| 资料库读写 | `03-storage.js` |
| 通知文字（新会员、兑换、核准…） | `04-notifications.js` |
| 积分计算、登入 | `05-members-and-login.js` |
| 会员能做的事：登入、注册、打卡、申请、健康记录 | `10-api-member.js` |
| 后台能做的事：核准、开卡、发公告、改礼物任务 | `11-api-admin.js` |
| 打卡规则（Daily Pass 要核准、10+1、30 天卡） | `12-checkin.js` |
| 网址分配、课程页、图标 | `20-main.js` |

## 四、其他

| 要改什么 | 文件 |
|---|---|
| App 里的英文和马来文翻译 | `src/i18n_src.py`（改完运行 `python3 src/make_i18n.py`） |
| 新伙伴预先放好的礼物、任务 | `export/rewards/`、`export/tasks/` |
