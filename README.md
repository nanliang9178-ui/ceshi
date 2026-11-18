# 天枢点单 · 多商户扫码点单 SaaS

给街边自营小商户用的扫码点单系统：顾客扫桌码 → 小程序点单 → 微信支付 → 商户后台接单出餐。
**一套代码支持白标交付**：换 logo、主题色、店名、客服电话全部在后台完成，不需要改代码重新开发。

> 🌐 项目网页版：[https://nanliang9178-ui.github.io/ceshi/](https://nanliang9178-ui.github.io/ceshi/) · 完整文档：[docs/guide.html](docs/guide.html)

---

## 一、这套系统包含什么

| 端 | 技术 | 说明 |
| --- | --- | --- |
| 顾客端（网页版，默认） | React 19 + Vite + Tailwind | 扫码直接在手机浏览器打开点单页，不依赖小程序/公众号 |
| 顾客端（小程序，可选） | 微信原生小程序 + TypeScript | 已有认证小程序时可用，落地页同为点单页 |
| 商户后台 | React 19 + Vite + Tailwind | 订单工作台、菜品/桌码管理、经营看板、品牌白标、支付配置、员工权限 |
| 平台后台 | 同上（同一应用，角色切换） | 开通商户、停用/续费、平台总览 |
| 后端 | NestJS 11 + Prisma + SQLite/MySQL + Socket.IO | 多租户隔离、订单状态机、微信支付 v3、实时新单推送 |

### 已实现的完整业务闭环

- 扫普通二维码 → 手机浏览器直接打开点单页 → 自动识别桌号（无需小程序）
- 小程序码（可选）同样落地到点单页
- **堂食 / 外卖双模式**：外卖含收货人、手机号、详细地址校验、配送费、起送价、预计送达时间
- **手机版老板台**（`/boss`）：只保留「今日盈利 / 待做订单 / 我的菜品」三块，手机打开即用
- 菜单分类（含 emoji 图标与左侧营销角标）/ 商品标签（招牌·新品·热销）/ 规格组 / 加料加价 / 售罄估清 / 库存
- 服务端强制重算价格（客户端金额只做展示），下单幂等 + 防重复提交
- 微信支付 v3 JSAPI（商户自有商户号）+ 回调验签解密 + 幂等入账 + 原路退款
- 订单状态机：待支付 → 待接单 → 制作中 → 待取餐 → 已完成（旁支取消/退款）
- 商户端新单 Socket.IO 实时推送 + 语音提示音 + 断线轮询兜底
- 加菜（同桌子订单）、桌台账单汇总、催单、小票打印
- 满减优惠、打包费、起购金额、营业开关、自动接单
- 经营看板：营业额趋势、时段分布、品类占比、热销榜
- 审计日志：改价、退款、支付配置变更全部留痕
- 敏感配置 AES-256-GCM 加密落库，接口永不回显明文

---

## 两端划分

系统严格分成两个互不干扰的入口：

| | 商户端 | 客户端 |
| --- | --- | --- |
| 谁用 | 老板 / 店长 / 店员 | 到店顾客 |
| 怎么进 | 电脑或手机浏览器打开后台并**登录账号** | **只能扫桌面二维码**进入，无任何网址入口 |
| 电脑 | 完整工作台（订单、菜品、桌码、统计、配置） | 不适用（扫码入口在手机） |
| 手机 | 登录后自动进入「老板台」，可一键切到完整后台 | 点单页，免登录 |
| 免登录 | 否，需账号 | 是，首次进入自动分配设备身份 |
| 地址 | `/login` → `/`（电脑）/ `/boss`（手机） | `/t/{桌位scene}`，其他路径只显示「请扫码」 |

- 客户端不提供任何后台入口，也不允许绕过二维码直接访问（没有 scene 时只显示扫码引导）
- 商户端电脑和手机是同一套账号、同一套数据，手机上菜单里也有「老板台（手机）」入口，两边可随时切换

---

## 二、快速开始（3 步跑起来）

> 环境要求：Node.js ≥ 18.18（推荐 20/22）。默认使用 SQLite，**不需要安装数据库**。

```bash
# 1. 安装依赖 + 建库 + 初始化演示数据
npm install
npm run setup

# 2. 启动后端（终端 A）
npm run dev:api

# 3. 启动管理后台（终端 B）
npm run dev:admin
```

访问：

- 管理后台：<http://localhost:5173>
- **老板台（手机版）**：<http://localhost:5173/boss>（手机浏览器打开会自动进入）
- **顾客点单页（网页版）**：`http://localhost:3000/t/{桌位scene}`（后台桌码卡片上可复制）
- API：<http://localhost:3000/api>

### 演示账号

| 角色 | 账号 | 密码 | 商户编码 |
| --- | --- | --- | --- |
| 商户老板（全部权限） | `demo` | `demo888` | `demo` |
| 店员（订单/估清） | `staff` | `staff888` | `demo` |
| 平台运营 | `admin` | `admin888` | — |

> 演示商户「椒香里·川味小馆」已内置 15 个桌位、15 道带规格的菜品、11 笔不同状态的订单。

### 第二个商户样例：隆江猪脚饭

```bash
npm run seed:longjiang
```

会新增一家独立的「阿强隆江猪脚饭（华强北店）」（品牌色 #B4321F，18 道菜、12 个桌位、4 笔演示订单），与川菜店数据互不影响：

| 角色 | 账号 | 密码 | 商户编码 |
| --- | --- | --- | --- |
| 老板 | `zhujiao` | `zhujiao888` | `zhujiao` |
| 店员 | `zjstaff` | `zjstaff888` | `zhujiao` |

用来演示「同一套系统给不同品类商户交付」：扫码点单页、老板台、桌码全部自动换成该商户的品牌与菜单。

### 两种端，四个入口

| 端 | 入口 | 能做什么 |
| --- | --- | --- |
| 商户端（手机） | `/boss` | 看今日盈利、接单/出餐、菜品一键估清、开关接单 |
| 商户端（电脑） | `/` | 完整后台：订单、菜品、桌码、统计、品牌、支付、员工 |
| 客户端（网页版，默认） | 扫桌码 | 手机浏览器打开 → 堂食/外卖 → 点单 → 支付 → 看进度 |
| 客户端（小程序，可选） | 扫小程序码 | 同上，需已认证小程序 |

### 跑通顾客端（网页版，推荐）

1. 把 `apps/api/.env` 的 `PUBLIC_BASE_URL` 改成手机能访问的地址（局域网用电脑 IP），重启 API
2. 打开「桌码管理」，任选桌位，卡片上就是二维码和链接 `http://你的IP:3000/t/{scene}`
3. 手机微信扫一扫 → 直接在浏览器打开点单页，自动带桌号
4. 未配置微信支付时走**演示支付**（`ALLOW_MOCK_PAY=true`），下单后直接标记已支付
5. 回到商户后台「订单工作台」或手机「老板台」，可看到新单并接单 → 出餐 → 完成

### 跑通小程序（可选）

1. 微信开发者工具导入 `apps/miniprogram`，填入已认证的 AppID
2. 后台「小程序配置」填同一个 AppID / AppSecret，选择版本
3. 桌码管理 → 生成小程序码 → 扫码进小程序点单页
4. 开发者工具「详情 → 本地设置」勾选 **不校验合法域名**（本地 API 为 http）

---

## 三、目录结构

```
tianshu-ordering/
├─ apps/
│  ├─ api/                 # NestJS 后端
│  │  ├─ prisma/           # 数据模型 + 种子数据
│  │  └─ src/modules/      # auth / client / menu / order / pay / stats / table / staff / platform
│  ├─ admin/               # React 管理后台（商户 + 平台）
│  ├─ h5/                  # React 网页版点单页（挂在 API 的 /t 路径下）
│  └─ miniprogram/         # 微信小程序（顾客端，可选）
├─ packages/shared/        # 前后端共享的类型、枚举、订单状态机、金额工具
├─ deploy/                 # nginx 配置 + PM2 配置
├─ docker-compose.yml      # MySQL / Redis（可选）
├─ Dockerfile              # 应用镜像（可选）
└─ .env.example            # 环境变量模板
```

---

## 四、白标交付 SOP（核心）

一套代码 → N 个商户品牌，**换 logo 不改代码**。

### 4.1 运行时换装（无需发版，最常用）

商户登录后台 → **品牌白标**：

1. 上传 logo、门店头图、首页轮播图
2. 选主题色 / 辅助色（右侧手机预览实时联动）
3. 填写品牌标语、首页公告、客服电话、版权文案
4. 保存后小程序下次启动即拉取新配置（`GET /api/client/bootstrap` 30 秒缓存）

小程序内所有颜色都走 CSS 变量 `--brand`，后台改色即可整体焕新。

### 4.2 独立小程序发布（一商户一主体）

1. 复制 `apps/miniprogram` 为一个新商户的发布分支/目录
2. 修改 `utils/env.ts`：
   - `API_BASE` → 你的生产域名（如 `https://order.example.com/api`）
   - `DEFAULT_TENANT_CODE` → 该商户编码（平台后台开通后生成）
3. 修改 `app.json` 的 `navigationBarTitleText`、`project.config.json` 的 `appid`
4. 微信公众平台配置服务器域名白名单（request / uploadFile / downloadFile / socket）
5. 上传代码 → 提交审核（类目：餐饮 → 点餐/外卖平台，需营业执照 + 食品经营许可证）

> 平台后台「开通商户」会生成唯一商户编码，可直接用于第 2 步。

### 4.3 聚合模式（一个平台小程序服务多商户）

小程序码 `scene` 携带桌位 `sceneCode`，后端据此解析商户，无需为每个商户发版：
顾客扫谁的桌码就进谁的店。默认商户编码由 `DEFAULT_TENANT_CODE` 兜底。

---

## 五、桌码：扫码直接在浏览器打开点单页（默认方案）

顾客用微信「扫一扫」扫桌码 → **手机浏览器直接打开点单页** → 自动识别桌号 → 下单。
**不需要小程序、不需要公众号、不需要审核**，桌码在后台实时生成，能扫就能用。

### 工作原理

桌码内容是一个普通链接：

```
{PUBLIC_BASE_URL}/t/{桌位scene}
例：http://192.168.137.151:3000/t/o1l3cjtd4e
```

`PUBLIC_BASE_URL` 在 `apps/api/.env` 中配置，必须是**手机能访问到的地址**：

| 场景 | PUBLIC_BASE_URL | 说明 |
| --- | --- | --- |
| 局域网演示 | `http://电脑局域网IP:3000` | 手机与电脑同一 Wi-Fi |
| 正式上线 | `https://order.你的域名.com` | 必须备案 + HTTPS |

改完 `.env` 需要重启 API；桌码页顶部会提示当前地址是否可用（是 localhost 会标黄警告）。

### 上线三步

1. 服务器部署 API（`npm run build` 会同时构建网页版到 `apps/h5/dist`，由 API 挂在 `/t` 下）
2. `.env` 填 `PUBLIC_BASE_URL=https://你的域名`，重启
3. 后台「桌码管理」→ 下载/打印二维码贴桌

### 网页版包含哪些能力

- 堂食 / 外卖切换、桌号自动识别
- 分类切换、规格加料、购物车、备注、用餐人数
- 外卖收货地址校验、配送费、起送价、预计送达
- 下单 → 支付 → 取餐号/预计送达 → 订单进度（6 秒自动刷新）
- 我的订单、取消订单、催单、加菜
- 无需登录：首次进入自动分配设备身份，换手机也不影响下单

### 支付说明

网页版默认走**演示支付**（`ALLOW_MOCK_PAY=true`）：下单后直接标记已支付，适合演示与到店付款。
要在浏览器里真实收款，需要商户号开通「H5 支付」并配置公众号，接入点已留在 `PayService.prepay`；
未开通时页面会提示「请到店向店员付款」，不会卡住下单流程。

### 小程序版本（可选，保留）

`apps/miniprogram` 仍然可用，适合已经有认证小程序的商户。若某个商户要用小程序码，
到「小程序配置」填 AppID/AppSecret，配置版本（release/trial），再生成小程序码即可，落地页同为点单页。

## 六、微信支付接入

**资金流向：顾客 → 商户自有商户号（平台不触碰资金）。** 因此每个商户在后台配置自己的支付参数。

商户后台 → **微信支付**：

| 字段 | 从哪里拿 |
| --- | --- |
| 小程序 AppID | 微信公众平台 → 开发管理 → 开发设置 |
| 小程序 AppSecret | 同上（用于 `code2session` 登录） |
| 商户号 MchID | 微信支付商户平台 → 账户中心 |
| 证书序列号 | 商户平台 → API 安全 → API 证书 |
| APIv3 密钥 | 商户平台 → API 安全（32 位，自行设置并备份） |
| 商户私钥 | `apiclient_key.pem` 文件内容，直接粘贴或上传 |

前置条件：

1. 小程序已认证
2. 商户平台「产品中心 → AppID 账号管理」已关联该小程序
3. 回调地址使用页面展示的 `https://你的域名/api/pay/notify/{商户编码}`

保存后点 **测试连接**：系统会拉取微信支付平台证书并解密校验，
返回「配置校验通过」即表示商户号 / 序列号 / 私钥 / APIv3 密钥全部匹配。

> `ALLOW_MOCK_PAY=false` 可彻底关闭演示支付，强制真实收款。

---

## 七、上线 Checklist

- [ ] 域名完成 ICP 备案，配置 HTTPS（小程序强制 https）
- [ ] 小程序后台配置合法域名：`request`、`socket`（`wss://域名/ws`）、`downloadFile`
- [ ] 小程序类目：餐饮服务（需营业执照、食品经营许可证）
- [ ] 填写小程序隐私协议（收集手机号需说明用途）
- [ ] `.env` 中 `JWT_SECRET` 换成 32 位以上随机串
- [ ] `.env` 中 `CONFIG_ENCRYPTION_KEY` 配置 32 字节 base64（否则生产环境拒绝启动支付配置加密）
- [ ] `PUBLIC_BASE_URL` 改为生产域名（用于支付回调与桌码链接）
- [ ] `ALLOW_MOCK_PAY=false`
- [ ] 数据库定期备份（SQLite：`apps/api/data/app.db`；MySQL：定时 `mysqldump`）
- [ ] `uploads/` 目录纳入备份或切换对象存储
- [ ] 商户微信支付参数逐个「测试连接」通过

生成加密主密钥：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## 八、GitHub 托管与部署

### 首次推送到 GitHub

仓库还没初始化时（当前状态）：

```bash
cd tianshu-ordering   # 换成你本地的项目目录
git init
git add .
git commit -m "feat: 扫码点单 SaaS MVP（商户端 + 网页版客户端）"
git branch -M main
git remote add origin git@github.com:你的账号/tianshu-ordering.git
git push -u origin main
```

也可以用 GitHub CLI 一条命令建仓并推送：

```bash
gh repo create tianshu-ordering --private --source=. --push
```

### 千万不要提交的文件

已在 `.gitignore` 中屏蔽，**不要用 `git add -f` 强推**：

| 文件 | 原因 |
| --- | --- |
| `apps/api/.env` | JWT 密钥、数据库地址、支付配置密钥 |
| `apps/api/data/app.db` | 演示订单与顾客手机号，属于真实数据 |
| `apps/api/uploads/` | 门店图片、桌码、上传文件 |

新环境拉代码后执行 `npm run setup` 会自动建库并灌入演示数据。

### 自动构建检查（已内置）

`.github/workflows/ci.yml` 在每次 push / PR 时执行：

1. `npm ci` + Prisma Client 生成
2. 构建 shared / api / admin / h5，校验三份产物
3. 起一次 API 冒烟：初始化数据库 → 灌演示数据 → 请求 bootstrap 与菜单接口

推送后到仓库 **Actions** 页看绿色对勾即可确认没有构建问题。
部署服务器时直接从仓库拉取构建：

```bash
git clone git@github.com:你的账号/tianshu-ordering.git && cd tianshu-ordering
npm ci
npm run build
```

## 九、生产部署（推荐 PM2 + Nginx）

```bash
# 服务器上
git clone <你的仓库> && cd tianshu-ordering
npm ci
npm run build          # 构建 shared + api + admin

# 配置环境变量
cp .env.example apps/api/.env   # 按需修改
cd apps/api && npx prisma db push && npx ts-node -r tsconfig-paths/register prisma/seed.ts
cd ../..

# 启动 API
pm2 start deploy/ecosystem.config.js
pm2 save && pm2 startup

# 部署后台静态文件
mkdir -p /var/www/tianshu/admin
cp -r apps/admin/dist/* /var/www/tianshu/admin/

# Nginx
cp deploy/nginx.conf /etc/nginx/conf.d/tianshu.conf
# 按需修改 server_name / root 后
nginx -t && nginx -s reload
```

可选：`docker compose up -d` 启动 MySQL 与 Redis 后切换到生产级配置（见下节）。

---

## 十、切换到 MySQL（并发量上来后）

SQLite 单机可支撑约几十家商户 / 日均数千单；更高并发请切 MySQL：

1. `apps/api/prisma/schema.prisma`：
   ```prisma
   datasource db {
     provider = "mysql"   // 由 sqlite 改为 mysql
     url      = env("DATABASE_URL")
   }
   ```
2. `apps/api/.env`：
   ```
   DATABASE_URL="mysql://tianshu:tianshu_pass@127.0.0.1:3306/tianshu"
   REDIS_URL="redis://127.0.0.1:6379"
   ```
3. 重新生成并同步：
   ```bash
   npm run prisma:push
   npm run seed
   ```
4. **状态字段由 String 改为原生 enum 属可选优化**，不改也能正常运行；追求类型严格时可把 `status`、`payStatus` 等改为 MySQL enum 并重新生成客户端。

> 代码里所有查询均为 Prisma 参数化查询，切换数据库不需要改业务代码。
> 金额一律整数分存储，不涉及浮点迁移。

---

## 十一、常见问题

**Q：启动报错「rollup 原生模块被 Application Control 策略拦截」**
Windows 环境安全策略拦截了 rollup 的 `.node` 二进制。用 WASM 版替换即可（Linux 服务器不受影响）：

```bash
npm i -D @rollup/wasm-node@4.68.5 --no-save
rm -rf node_modules/rollup
cp -r node_modules/@rollup/wasm-node node_modules/rollup
npx vite build -w @tianshu/admin   # 或直接 npm run build
```

**Q：没有 Redis 可以吗？**
可以。未配置 `REDIS_URL` 时自动使用进程内缓存与锁，单机部署完全够用。

**Q：扫桌码打不开，或者打开是 localhost 空白页？**
桌码内容就是 `{PUBLIC_BASE_URL}/t/{scene}`。出现空白页说明 `PUBLIC_BASE_URL` 还是 `localhost` —— 手机无法访问电脑的 localhost。
到 `apps/api/.env` 改成电脑局域网 IP（如 `http://192.168.137.151:3000`）或正式域名，重启 API，重新打印桌码即可。
桌码页顶部也会提示当前地址是否可用。

**Q：手机扫码提示「无法访问此网站」？**
依次检查：手机与电脑是否同一 Wi-Fi、`.env` 里的 IP 是否是当前 Wi-Fi 的 IP（换网络会变）、Windows 防火墙是否放行 Node（专用/公用网络都放行）、API 是否在运行。

**Q：网页版能不能真实收款？**
默认是演示支付。浏览器内真实收款需要商户号开通「H5 支付」并接入，代码预留了接入点；未开通时提示「请到店向店员付款」，不影响下单。

**Q：顾客收不到实时状态更新？**
小程序端订单详情每 5 秒轮询一次，即使 WebSocket 不通也能正常刷新。

**Q：能否只给一家店用（不做平台）？**
可以。直接用一个商户账号运营，平台后台仅用于开通与续费，不影响日常使用。

---

## 十二、主要 API

| 模块 | 路径 | 说明 |
| --- | --- | --- |
| 网页版 | `POST /api/h5/login` | 设备标识换 token（免登录进店） |
| 网页版 | `GET /api/h5/capability` | 支付能力探测 |
| 顾客端 | `GET /api/client/bootstrap` | 品牌 + 门店 + 桌号 + 微信配置聚合 |
| | `GET /api/client/menu` | 菜单聚合（60s 缓存） |
| | `POST /api/client/login` | `wx.login` code 换 token |
| | `POST /api/client/orders` | 下单（服务端计价 + 幂等） |
| | `POST /api/client/orders/:id/pay` | 发起支付（模拟/JSAPI） |
| 商户端 | `GET /api/admin/orders` | 订单列表 + 各状态数量 |
| | `POST /api/admin/orders/:id/accept` | 接单（还有 ready / complete / cancel） |
| | `GET/POST /api/admin/menu/*` | 分类、商品、规格、估清 |
| | `POST /api/admin/tables/batch` | 批量建桌 + 生成桌码 |
| | `GET /api/admin/stats/dashboard` | 看板数据 |
| | `PUT /api/admin/store/brand` | 品牌白标配置 |
| 平台端 | `POST /api/platform/tenants` | 开通商户（自动建门店/品牌/老板账号） |
| 支付 | `POST /api/pay/notify/:tenantCode` | 微信支付回调（验签 + 解密 + 幂等） |

完整路由见各 controller 文件。

---

## 十三、后续可扩展方向

- 云打印机（飞鹅 / 易联云）对接：`OrderModule` 已保留出餐事件，接一个 `PrinterPort` 即可
- 会员储值与积分、优惠券、第二份半价
- 外卖配送与骑手端
- 连锁多门店切换（数据模型已保留 `store_id`）
- 对象存储（OSS/COS）：抽象 `StoragePort` 后替换本地磁盘
