# CHIRAL PULSE · 手性脉冲

> A Death Stranding-styled **BB pod vital-signs monitor** for the
> [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) web UI.
> The session's **heartbeat waveform is the hero** — and the pulse is real,
> not decoration: it reacts to the agent's live activity.

`dsh-plugin` · `deepseek-harness` · `ui-plugin` · `death-stranding` · `bb-pod` · `ecg`

---

## 这是什么

**CHIRAL PULSE（手性脉冲）** 是一款 DeepSeek Harness Web 界面插件:一个
《死亡搁浅》风格的 **BB 舱生命体征监视器**,常驻在输入框上方
(`conversation.input.dock` 插槽)。

- **心跳波形是主体** —— 一条连续滚动的 PQRST 心电波形,琥珀色辉光,
  附一道青色"手性重影"线条,右侧有明亮的扫描头;
- **BPM 是真实数据** —— 以 10 秒滑动窗口统计会话 `sessionStats` 的步骤增量:
  空闲时 BB 处于"睡眠"状态(约 42 BPM),Agent 忙碌冲刺时最高 150 BPM;
  每次真实的工具步骤落地,都会在波形的 R 峰上触发一次可见的"搏动";
- **死亡搁浅美学** —— 近黑机身 + 琥珀发丝线、HUD 四角括号、CRT 扫描线、
  手性晶格(60°/120° 交错)、琥珀径向光晕;
- **生命体征读数** —— 轮次 / 步骤、首字延迟 TTFT、输出速率 TOK·S⁻¹、
  输入输出 token、缓存命中率、上下文占用条(奥卓克扫描)、
  以 `sessionId` 派生的 **KNOT 结** 编号;
- **手性时钟** —— 从 **19:49:19** 开始的死亡搁浅式倒计时,循环往复;
- **状态轮播** —— `LINK STABLE` / `BB BONDED` / `NO VOIDOUT DETECTED` /
  `KEEP ON KEEPING ON` …;
- 点击 BB 舱或右侧箭头展开/收起体征面板(偏好记忆在 localStorage),
  完整支持 `prefers-reduced-motion`。

## 安装

### 发布后（推荐）

```sh
dsh plugin --profile web @dsh-plugins/chiral-pulse
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
      name: '@dsh-plugins/chiral-pulse'
```

```powershell
New-Item -ItemType Junction -Path "$env:USERPROFILE\.dsh\profiles\web\node_modules\@dsh-plugins\chiral-pulse" -Target "D:\path\to\chiral-pulse"
```

用户 patch 层是热加载的:无需重启 `dsh web`。之后**刷新浏览器页面**即可
(新增插件行不在旧页面的启动图里,HMR 只重载已有行)。

### 卸载

从 profile patch 中移除该行并删除 junction;发布版则
`dsh plugin --profile web remove @dsh-plugins/chiral-pulse`。

## 构建

```sh
pnpm install   # 构建只需要 tsdown;也可直接复用本机已有的 tsdown 二进制
pnpm bundle    # 产出 lib/index.js (node 半边) + lib/client.js (浏览器半边)
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

## 数据来源

插件零自持状态:所有数字经由会话标准套件的 `useProjection` 读取
`sessionStats` / `tokenUsage` / `contextPressure` 投影(host 端由
`dsh-session-stats` 与 `dsh-token-meter` 提供),波形由纯函数 ECG 合成器
(`src/client/ecg.ts`,PQRST 高斯凸包)按当前 BPM 滚动生成,rAF 循环直写
SVG 属性,React 只在投影/秒针/尺寸变化时重渲染。

## License

MIT
