# Web5 Modules 技术架构方案

## 1. 项目概述

本项目旨在构建一套标准化的 Web5 基础模块，并通过一个 **Console 控制台应用** 演示这些模块的集成与使用。

### 核心设计理念
1.  **Keystore (独立应用)**: 拥有独立的 Web UI 和域名，作为用户的“网页钱包”，管理私钥安全。
2.  **Modules (DID & PDS)**: **不提供独立访问的 Web UI**，而是作为 **远程模块 (Federated Modules)** 发布。它们封装了核心逻辑和可选的 UI 组件，供宿主应用调用。
3.  **Console (宿主应用)**: 一个标准的 Web5 业务应用 Demo。它没有额外的业务逻辑，专注于展示如何通过集成上述模块来实现用户注册、登录、DID 管理和数据读写等通用功能。

## 2. 总体架构设计

### 2.1 架构拓扑

```mermaid
graph TD
    User((用户))
    
    subgraph "Console App (Host)"
        Dashboard[控制台 UI]
        AuthFlow[认证流程]
        DataManager[数据管理]
    end
    
    subgraph "Keystore App (Standalone)"
        WalletUI[钱包 UI]
        Signer[签名器]
        Storage[(LocalStorage)]
    end
    
    subgraph "Remote Providers"
        DID_Module[DID Module (Remote)]
        PDS_Module[PDS Module (Remote)]
    end

    User -->|访问| Dashboard
    User -->|管理密钥| WalletUI
    
    Dashboard -->|Iframe/Popup| Signer
    Dashboard -->|Federation Import| DID_Module
    Dashboard -->|Federation Import| PDS_Module
```

### 2.2 域名与角色规划

| 应用/模块 | 路径/域名 (Local) | 类型 | 说明 |
| :--- | :--- | :--- | :--- |
| **Console** | `localhost:3000` | **Host App** | 用户入口。集成所有模块，展示 Web5 功能。 |
| **Keystore** | `localhost:3001` | **Standalone App** | 独立应用。提供钱包界面，管理私钥，响应签名请求。 |
| **DID Module**| `localhost:3002` | **Remote Provider** | 静态资源服务。无独立 UI，仅提供 `remoteEntry.js`。 |
| **PDS Module**| `localhost:3003` | **Remote Provider** | 静态资源服务。无独立 UI，仅提供 `remoteEntry.js`。 |

## 3. 详细模块设计

### 3.1 Keystore (Wallet App)
*   **交互模式**: 
    *   **Direct**: 用户直接访问 `localhost:3001` 管理密钥（创建、删除、导出、导入）。
    *   **Bridge**: `Console` 通过隐藏 iframe 加载 `localhost:3001/bridge.html` 建立通信通道。
*   **核心功能**:
    *   生成并管理 `Secp256k1` 密钥对。
    *   使用本地密钥进行签名，验签。
    *   管理可连接 `Keystore` 的 `Web5` 应用白名单。
    *   `bridge` 监听 `postMessage` 事件，进行签名，验签等处理。

### 3.2 DID Module (Remote)
*   **定位**: 纯逻辑与组件库，通过 Module Federation 暴露。
*   **Exports**:
    *   `logic`: `createDID`, `resolveDID` 等函数。
    *   `components`: (可选) `<DIDCard />`, `<DIDBadge />` 等展示型组件。
*   **使用场景**: Console 导入此模块，在“DID 管理”页面调用其逻辑生成 DID，并展示给用户。

### 3.3 PDS Module (Remote)
*   **定位**: 纯逻辑与组件库，通过 Module Federation 暴露。
*   **Exports**:
    *   `logic`: `Web5Client`, `Record.write`, `Record.read` 等函数。
    *   `components`: (可选) `<FileTree />` 等展示型组件。
*   **使用场景**: Console 导入此模块，在“我的数据”页面展示用户在 PDS 上的数据文件。

### 3.4 Console (Demo Host)
*   **功能实现**:
    *   **注册/登录**: 调用 `KeystoreClient.connect()` 获取用户 DID。
    *   **DID 管理**: 使用 `DID Module` 的 API 查询当前 DID 文档，展示在页面上。
    *   **数据读写**: 提供一个简单的表单（如“记事本”），调用 `PDS Module` 将数据写入用户的 DWN/PDS，并读取列表展示。

## 4. 目录结构 (Monorepo)

```text
web5fans/
├── modules/
│   ├── packages/
│   │   ├── sdk-bridge/    # Keystore 通信客户端 (npm包)
│   │   └── types/         # 全局类型定义
│   ├── apps/
│   │   ├── keystore/      # [App] 独立钱包应用
│   │   ├── console/       # [App] 宿主控制台
│   │   ├── did/           # [Remote] DID 模块提供者
│   │   └── pds/           # [Remote] PDS 模块提供者
│   └── pnpm-workspace.yaml
```

## 5. 开发路线图
1.  **Monorepo Setup**: 配置 pnpm workspace 和 TurboRepo (可选)。
2.  **Keystore Core**: 实现密钥生成与存储，开发 Wallet UI。
3.  **Bridge Mechanism**: 实现 Console <-> Keystore 的 iframe 通信。
4.  **Remote Modules**: 配置 Vite Module Federation，导出 DID/PDS 基础函数。
5.  **Console Integration**: 在 Console 中串联流程：登录 -> 拿DID -> 写数据。
