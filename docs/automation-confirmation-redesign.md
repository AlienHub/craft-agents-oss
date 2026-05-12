# Automation Confirmation 重设计方案

## 背景

当前自动化确认卡片（`AutomationConfirmationCard`）是作为独立消息（`role: 'automation-confirmation'`）存在的，这种设计在用户调试场景下存在问题。

### 问题

当用户处于自动化步骤的调试阶段时，可能需要多次调整输入内容。但当前设计的 confirm 卡片是基于创建时的静态快照，**不会随着用户调整而更新显示内容**。

```
用户期望的流程：
步骤1 完成 → 显示 confirm（内容 A）
                ↓
        用户输入 prompt 调整
                ↓
        模型输出 → confirm 应显示最新内容（内容 A'）
                ↓
        用户满意 → 点 Confirm → 步骤2

当前实现的问题：
步骤1 完成 → 显示 confirm（内容 A，静态快照）
                ↓
        用户输入 prompt 调整
                ↓
        模型输出 → confirm 仍显示旧内容 A（不会更新）
```

---

## 新设计原则

### 核心思路

**Automation Confirm 嵌入到 assistant 消息的 annotation 中**，而不是作为独立消息存在。每次 `text_complete` 结束后刷新 annotation 内容。

### 设计类比

Automation Confirm 的新设计与现有的 **SubmitPlan** 模式高度一致：

| 阶段 | Plan 模式 | Automation Confirm（新设计） |
|------|----------|---------------------------|
| 触发时机 | agent 调用 SubmitPlan | 自动化步骤完成 |
| 显示位置 | assistant 消息旁 | assistant 消息旁 |
| 调试期间 | 用户可以继续对话，内容不变 | 用户可以继续对话，annotation 刷新（内容写死在配置中） |
| 确认后 | 点 Accept 执行 plan | 点 Confirm 执行后续步骤 |
| 取消 | 点 Reject 或关闭 → 取消 plan | 点 Cancel → 中断自动化（会话可继续） |

---

## 流程设计

### 标准流程

```
1. 自动化触发 → 创建新会话
2. 步骤1 执行 → 等待 assistant text_complete
3. 添加 annotation → 在最新 assistant 消息上添加 pending 状态的 automationConfirm annotation
4. 用户可以：
   - 输入 prompt 调整 → text_complete → annotation 内容刷新（从自动化配置重新拉取）
   - 点 Confirm → status → confirmed → 执行 onConfirmPrompt 或 onConfirmActions → 进入步骤2
   - 点 Cancel → status → cancelled → 中断自动化流程（但会话保持，用户可继续手动操作）
5. 后续步骤循环执行，直到 automation 结束
```

### 调试期间的 annotation 行为

```
[Assistant 消息 1] ← 步骤1完成，annotation 在此消息上（status: pending）
[用户 prompt 1]
[Assistant 消息 2] ← annotation 移动到这条消息，内容刷新
[用户 prompt 2]
[Assistant 消息 3] ← annotation 移动到这条消息，内容刷新
[用户点 Confirm]
→ status → confirmed，annotation 保持在消息 3 上
→ 执行后续步骤
```

**关键点**：
- Annotation 只存在于**最新的 assistant 消息**上
- 每次 `text_complete` 结束后，检查最新 assistant 消息是否有 pending 的 annotation
- 如果有，从自动化配置重新拉取内容并更新 annotation（虽然内容写死，但流程保持一致）
- 之前的消息不需要保留 annotation 的渲染

---

## 状态设计

### Annotation Status

| 状态 | 含义 |
|------|------|
| `pending` | 等待用户确认（调试状态） |
| `confirmed` | 用户点了 Confirm，继续自动化流程 |
| `cancelled` | 用户点了 Cancel，中断自动化流程 |

### Cancellation 行为

- **中断范围**：中断当前 automation 的后续步骤执行
- **会话保留**：用户会话保持，可以继续手动操作
- **不可恢复**：Cancel 后无法恢复 automation 流程

---

## 与现有 Plan 模式的差异

1. **内容来源**：
   - Plan：内容来自用户写的 plan markdown 文件
   - Automation Confirm：内容来自自动化配置文件中的 `confirm` action 配置

2. **刷新机制**：
   - Plan：调试期间内容不变
   - Automation Confirm：每次 `text_complete` 后从配置重新拉取（虽然内容写死，但保持一致的刷新逻辑）

3. **多步骤支持**：
   - Plan：单次确认，无多步骤概念
   - Automation Confirm：可能有多步骤 prompt → confirm → prompt → confirm 的流程

---

## 未来可能的优化

1. **Confirm 内容动态化**：如果未来需要 confirm 内容动态化，当前架构已支持（每次从配置重新拉取）
2. **多个 Confirm 支持**：同一个 session 可能需要多个并发的 pending confirm annotation（未来考虑）

---

## 待技术实现确认

1. annotation 刷新触发的具体实现位置
2. 多步骤 automation 中 matcherId 的管理方式
3. 前端渲染的组件复用（是否复用现有 PlanCard 样式）