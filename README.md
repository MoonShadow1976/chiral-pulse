# CHIRAL PULSE · 手性脉冲

> A Death Stranding skin + BB vital-signs monitor for the
> [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) web UI.
> The **whole interface** is re-skinned in the Death Stranding look (the
> DeepSeek whale mark keeps its brand blue), and a live **heartbeat paper
> feed** runs under the composer stats — its pulse accelerates the moment
> the agent starts thinking or a tool begins executing.

`dsh-plugin` · `deepseek-harness` · `ui-plugin` · `death-stranding` · `bb-pod` · `ecg` · `theme`

![CHIRAL PULSE 新会话界面](assets/chiral-pulse-hero.png)

---

## 这是什么

**CHIRAL PULSE(手性脉冲)** 是一款 DeepSeek Harness Web 界面插件,两层设计:

### 1. 全局皮肤 —— 整个界面都是死亡搁浅

不再是小框:插件重映射整个 `--dsw-*` 设计平台调色板,所有组件(侧栏、气泡、
输入区、设置页)自动换装,不动任何布局结构:

- **暗色主题**:DS 蓝黑机身(`#05070a` 起) + 琥珀发丝线边框 + 琥珀悬停微光;
- **亮色主题**:集装箱沙纸色调("冥滩白"),同样琥珀描边;
- **氛围层**:全屏 CRT 扫描线、手性晶格(60°/120° 交错)、四角渐晕,
  全部 pointer-transparent,不挡任何操作;
- **鲸鱼 logo 保留**:DeepSeek 品牌蓝原样不动,左上角标识一切照旧;
- 主题切换(亮/暗/跟随系统)完全兼容,两套皮肤都做齐了。

### 2. 心跳走纸 —— 融入输入区,不突兀

挂在数据行(`conversation.composer.dock` 的 StatsLine)下方的一条 26px
"监护仪走纸":滚动的心电波形是主角,右侧小字 BPM 与状态轮播。
**不重复任何数据** —— turns/tokens 那些 StatsLine 本来就有。

**BPM 是实时心跳,跟随 Agent 的每一次活动:**

| 状态 | 来源 | BPM 加成 |
|---|---|---|
| 模型正在思考/生成 | 快照 `partial` 非空 | +38 |
| 工具正在执行 | 快照 `runningCalls` 非空 | +52 |
| 会话回合进行中 | 快照 `running` | +10 |
| 空闲 | 10 秒步骤窗口速率 | 基准(~42 入睡) |

BPM 目标用 lerp 平滑——思考一开始,脉搏立刻拉高;工作落地,缓缓回落。
上限 150,下限 42。

## 安装

### 发布后（推荐）

```sh
dsh plugin --profile web chiral-pulse
```

该包同时声明 `dsh.bundle`(内含 `cordis.patch.yml` roster 行)与
`dsh.client`(浏览器半边),`dsh plugin` 安装后会自动加入 profile 的
bundle 层,无需手写配置。

### 本地开发安装

把包链接进 profile 的 `node_modules`,再在
`$DSH_HOME/profiles/web/cordis.patch.yml` 追加一行:

```yaml
- insert:
    - id: ui-chiral-pulse
      name: 'chiral-pulse'
```

```powershell
New-Item -ItemType Junction -Path "$env:USERPROFILE\.dsh\profiles\web\node_modules\chiral-pulse" -Target "D:\path\to\chiral-pulse"
```

用户 patch 层是热加载的:无需重启 `dsh web`。之后**刷新浏览器页面**即可
(新增插件行不在旧页面的启动图里,HMR 只重载已有行)。

### 卸载

从 profile patch 中移除该行并删除 junction;发布版则
`dsh plugin --profile web remove chiral-pulse`。

## 构建

```sh
pnpm install   # 构建只需要 tsdown;也可直接复用本机已有的 tsdown 二进制
pnpm bundle    # 产出 lib/index.js (node 半边) + lib/client.js (浏览器半边)
pnpm typecheck # tsc --noEmit(tsconfig 已用 paths 指向 harness 的类型产物)
```

`tsdown.config.ts` 完整复刻了 harness 仓库内共享预设的产物契约:
`lib/client.js` 是懒 CJS 闭包工厂,通过
`window.__ModuleLoader__.load({ id, factory })` 注册;仅平台种子模块
(`react` 家族等)保持 external,由加载器模块表应答;其余全部内联。
**绝不值导入其他插件包** —— 模块表无法应答,纯类型导入会被擦除,安全。

## 发布

1. `pnpm publish --access public`(发布到 npm);
2. 把仓库托管到 GitHub,并**为你的插件仓库添加
   [`dsh-plugin`](https://github.com/topics/dsh-plugin) 话题**,便于被发现
   (参见 [deepseek-harness 的插件指南](https://github.com/deepseek-ai/deepseek-harness))。

## 工作原理

- **主题**:ui-theme 的设计平台里 alias 令牌引用静态令牌,插件只重映射
  `body[data-ds-dark-theme]` / `body:not([data-ds-dark-theme])` 两套静态色,
  全应用自动跟随;brand 蓝(鲸鱼)刻意不动。
- **数据**:走纸条零自持状态 —— `useProjection('sessionStats')` 提供步骤
  窗口,BPM 实时加成来自 `useSession` 快照的 `partial` / `runningCalls` /
  `running`;波形由纯函数 ECG 合成器(`src/client/ecg.ts`,PQRST 高斯凸包)
  按当前 BPM 滚动生成,rAF 循环直写 SVG 属性,React 只在快照/秒针/尺寸
  变化时重渲染。

## License

MIT
