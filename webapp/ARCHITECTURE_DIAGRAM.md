# Dexter Web Interface - Architecture Diagrams

Visual representations of the web interface architecture.

---

## 1. High-Level System Architecture

```mermaid
graph TB
    subgraph Browser["🌐 Browser (Port 5173)"]
        UI[React App]
        Hooks[Custom Hooks<br/>useAgentStream<br/>useSSE]
        API[API Service]

        UI --> Hooks
        Hooks --> API
    end

    subgraph Backend["⚙️ Backend (Port 3000)"]
        Express[Express Server<br/>REST + SSE]
        ConnMgr[Connection Manager<br/>SSE Tracking]
        Plugin[HTTP Channel Plugin]

        Express --> ConnMgr
        Express --> Plugin
    end

    subgraph Gateway["🎯 Gateway Core (Reused)"]
        Runner[Agent Runner]
        Sessions[Session Store]
        Router[Routing Logic]

        Runner --> Sessions
        Runner --> Router
    end

    subgraph Agent["🤖 Agent Execution (Reused)"]
        LLM[LLM Manager<br/>Claude/GPT/etc]
        Tools[Tool Registry<br/>Search/Finance/etc]
        Events[Event Emitter]

        LLM --> Tools
        Tools --> Events
    end

    API -->|HTTP POST| Express
    API -->|SSE GET| Express
    Plugin -->|onMessage| Runner
    Runner -->|onEvent| Plugin
    Plugin -->|sendEvent| ConnMgr
    ConnMgr -->|SSE Stream| API

    style Browser fill:#e3f2fd
    style Backend fill:#fff3e0
    style Gateway fill:#f3e5f5
    style Agent fill:#e8f5e9
```

---

## 2. Critical Design Decision: Channel Plugin Pattern

```mermaid
graph LR
    subgraph Chosen["✅ HTTP Channel Plugin"]
        CP1[Reuses Agent Runner]
        CP2[Reuses Sessions]
        CP3[Reuses Routing]
        CP4[Consistent Pattern]
        CP5[90% Code Reuse]
    end

    subgraph Rejected["❌ Standalone API"]
        SA1[Duplicate Agent Logic]
        SA2[Duplicate Sessions]
        SA3[Duplicate Routing]
        SA4[Inconsistent Pattern]
        SA5[High Maintenance]
    end

    Decision{Architecture<br/>Decision}

    Decision -->|Chosen| Chosen
    Decision -->|Rejected| Rejected

    style Chosen fill:#c8e6c9
    style Rejected fill:#ffcdd2
    style Decision fill:#fff9c4
```

---

## 3. Communication Protocol: SSE vs WebSockets

```mermaid
graph TB
    subgraph SSE["✅ Server-Sent Events"]
        SSE1[Unidirectional<br/>Server → Client]
        SSE2[Auto-Reconnect<br/>Built-in]
        SSE3[HTTP/2<br/>Efficient]
        SSE4[Simple<br/>Implementation]
        SSE5[Natural for<br/>Streaming]
    end

    subgraph WS["❌ WebSockets"]
        WS1[Bidirectional<br/>Unnecessary]
        WS2[Manual<br/>Reconnect]
        WS3[Upgrade<br/>Handshake]
        WS4[Complex<br/>Protocol]
        WS5[Overkill for<br/>One-Way]
    end

    Question{Real-time<br/>Streaming<br/>Protocol?}

    Question -->|Chosen| SSE
    Question -->|Rejected| WS

    style SSE fill:#c8e6c9
    style WS fill:#ffcdd2
    style Question fill:#fff9c4
```

---

## 4. Complete Data Flow Sequence

```mermaid
sequenceDiagram
    participant User as 👤 User
    participant UI as React UI
    participant Hook as useAgentStream
    participant SSE as useSSE
    participant API as Express API
    participant Plugin as HTTP Plugin
    participant Runner as Agent Runner
    participant LLM as LLM

    User->>UI: Types message
    UI->>Hook: sendMessage("Hello")

    Note over Hook: Create message object<br/>Add to messages[]

    Hook->>API: POST /api/chat<br/>{query: "Hello"}

    Note over API: Generate sessionId<br/>Return streamUrl

    API-->>Hook: {sessionId, streamUrl}

    Hook->>SSE: Enable SSE (url)
    SSE->>API: GET /api/chat/:id/stream

    Note over API: Add SSE connection<br/>connectionManager

    API->>Plugin: onMessage(msg)
    Plugin->>Runner: runAgentForMessage()

    Runner->>LLM: Execute query

    loop Agent Processing
        LLM->>Runner: Event (thinking/tool/etc)
        Runner->>Plugin: onEvent(event)
        Plugin->>API: sendEventToClient()
        API->>SSE: SSE: data: {event}
        SSE->>Hook: onEvent(event)
        Hook->>UI: Update messages[].events[]
        UI->>User: Display event
    end

    LLM->>Runner: Final answer
    Runner->>Plugin: onEvent('done')
    Plugin->>API: sendEventToClient()
    API->>SSE: SSE: data: {done}
    SSE->>Hook: onEvent(done)
    Hook->>UI: Update messages[].answer
    UI->>User: Display answer
```

---

## 5. Frontend Component Hierarchy

```mermaid
graph TB
    App[App.tsx<br/>Root Component]
    Chat[ChatContainer<br/>Main Chat UI]
    Header[Header<br/>Title + Controls]
    Error[ErrorBanner<br/>Global Errors]
    Status[StatusBar<br/>Ready/Processing]
    MsgList[MessageList<br/>Scrollable History]
    Input[InputBox<br/>Text Input + Send]

    MsgItem[MessageItem<br/>Single Message]
    Query[UserQuery<br/>Blue Bubble]
    Events[EventStream<br/>Agent Events]
    Answer[AnswerBox<br/>Markdown Answer]

    Thinking[ThinkingIndicator<br/>Animated Dots]
    ToolView[ToolCallView<br/>Tool Execution]

    App --> Chat
    Chat --> Header
    Chat --> Error
    Chat --> Status
    Chat --> MsgList
    Chat --> Input

    MsgList --> MsgItem
    MsgItem --> Query
    MsgItem --> Events
    MsgItem --> Answer

    Events --> Thinking
    Events --> ToolView

    style App fill:#e3f2fd
    style Chat fill:#fff3e0
    style MsgList fill:#f3e5f5
    style MsgItem fill:#e8f5e9
```

---

## 6. State Management Flow

```mermaid
stateDiagram-v2
    [*] --> Ready: App Loads

    Ready --> Sending: User sends message
    Sending --> Connecting: POST /api/chat
    Connecting --> Streaming: SSE connection established

    Streaming --> Thinking: Receive thinking event
    Thinking --> ToolStart: Receive tool_start
    ToolStart --> ToolProgress: Receive tool_progress
    ToolProgress --> ToolEnd: Receive tool_end
    ToolEnd --> Done: Receive done event

    ToolStart --> ToolError: Tool fails
    ToolError --> Done

    Done --> Ready: Message complete

    Streaming --> Cancelled: User clicks cancel
    Cancelled --> Ready

    Ready --> Cleared: User clicks clear
    Cleared --> Ready: History cleared
```

---

## 7. Event Consolidation Strategy

```mermaid
graph TB
    subgraph Input["Raw Events Stream"]
        E1[thinking]
        E2[tool_start web_search]
        E3[tool_progress web_search]
        E4[tool_progress web_search]
        E5[tool_end web_search]
        E6[tool_start financial_search]
        E7[tool_end financial_search]
        E8[done]
    end

    subgraph Process["EventStream Component"]
        Group[Group by Tool Name]
        Render[Render Consolidated]
    end

    subgraph Output["Displayed UI"]
        Think[💭 Thinking Indicator]
        Tool1[🔧 web_search<br/>├─ Args<br/>├─ Progress × 2<br/>└─ Result]
        Tool2[🔧 financial_search<br/>├─ Args<br/>└─ Result]
        Final[✅ Final Answer]
    end

    E1 --> Group
    E2 --> Group
    E3 --> Group
    E4 --> Group
    E5 --> Group
    E6 --> Group
    E7 --> Group
    E8 --> Group

    Group --> Render

    Render --> Think
    Render --> Tool1
    Render --> Tool2
    Render --> Final

    style Input fill:#ffebee
    style Process fill:#fff9c4
    style Output fill:#e8f5e9
```

---

## 8. Technology Stack Decision Tree

```mermaid
graph TB
    Start{Choose<br/>Technology}

    Start -->|Backend| BackendQ{Needs}
    BackendQ -->|HTTP + SSE| ExpressY[✅ Express]
    BackendQ -->|GraphQL| ExpressN[❌ Apollo Server]
    BackendQ -->|gRPC| ExpressN2[❌ Too Complex]

    Start -->|Frontend| FrontendQ{Framework}
    FrontendQ -->|Large Ecosystem| ReactY[✅ React]
    FrontendQ -->|Simpler API| VueN[❌ Vue]
    FrontendQ -->|Smaller Bundle| SvelteN[❌ Svelte]

    Start -->|Styling| StyleQ{Approach}
    StyleQ -->|Rapid Dev| TailwindY[✅ Tailwind]
    StyleQ -->|CSS-in-JS| StyledN[❌ Styled Components]
    StyleQ -->|Component Lib| MuiN[❌ Material-UI]

    Start -->|Build Tool| BuildQ{Dev Experience}
    BuildQ -->|Fast HMR| ViteY[✅ Vite]
    BuildQ -->|Traditional| CRAN[❌ Create React App]
    BuildQ -->|Custom| WebpackN[❌ Webpack]

    Start -->|Real-time| RealtimeQ{Communication}
    RealtimeQ -->|Unidirectional| SSEY[✅ Server-Sent Events]
    RealtimeQ -->|Bidirectional| WSN[❌ WebSockets]
    RealtimeQ -->|Pull-based| PollN[❌ Long Polling]

    style ExpressY fill:#c8e6c9
    style ReactY fill:#c8e6c9
    style TailwindY fill:#c8e6c9
    style ViteY fill:#c8e6c9
    style SSEY fill:#c8e6c9

    style ExpressN fill:#ffcdd2
    style ExpressN2 fill:#ffcdd2
    style VueN fill:#ffcdd2
    style SvelteN fill:#ffcdd2
    style StyledN fill:#ffcdd2
    style MuiN fill:#ffcdd2
    style CRAN fill:#ffcdd2
    style WebpackN fill:#ffcdd2
    style WSN fill:#ffcdd2
    style PollN fill:#ffcdd2
```

---

## 9. Scalability Strategy

```mermaid
graph TB
    subgraph Current["Current Architecture (MVP)"]
        Single[Single Node.js Instance<br/>Port 3000]
        Mem[In-Memory State]
        Local[Localhost Only]
    end

    subgraph Phase2["Phase 2: Horizontal Scaling"]
        LB[Load Balancer<br/>Nginx/HAProxy]
        Node1[Node.js Instance 1]
        Node2[Node.js Instance 2]
        Node3[Node.js Instance 3]
        Redis[Redis<br/>Shared State]

        LB --> Node1
        LB --> Node2
        LB --> Node3

        Node1 --> Redis
        Node2 --> Redis
        Node3 --> Redis
    end

    subgraph Phase3["Phase 3: Production"]
        CDN[CDN<br/>Static Assets]
        K8s[Kubernetes<br/>Container Orchestration]
        DB[PostgreSQL<br/>Persistent Storage]
        Monitor[Monitoring<br/>Prometheus + Grafana]

        CDN --> K8s
        K8s --> DB
        K8s --> Monitor
    end

    Current -->|Scale| Phase2
    Phase2 -->|Deploy| Phase3

    style Current fill:#e3f2fd
    style Phase2 fill:#fff3e0
    style Phase3 fill:#e8f5e9
```

---

## 10. Security Layers (Production)

```mermaid
graph TB
    User[👤 User]

    subgraph Security["🔒 Security Layers"]
        HTTPS[HTTPS/TLS<br/>Encrypted Transport]
        Auth[JWT Authentication<br/>Token Validation]
        Rate[Rate Limiting<br/>Per User/IP]
        CSRF[CSRF Protection<br/>Token Validation]
        XSS[XSS Prevention<br/>react-markdown]
        CORS[CORS<br/>Allowed Origins]
        CSP[Content Security Policy<br/>Headers]
        Input[Input Validation<br/>Sanitization]
    end

    Backend[Backend API]

    User --> HTTPS
    HTTPS --> Auth
    Auth --> Rate
    Rate --> CSRF
    CSRF --> XSS
    XSS --> CORS
    CORS --> CSP
    CSP --> Input
    Input --> Backend

    style Security fill:#ffebee
    style Backend fill:#e8f5e9
```

---

## Viewing These Diagrams

**On GitHub:**
- Diagrams render automatically in markdown files
- Click to zoom

**In VS Code:**
1. Install: [Markdown Preview Mermaid Support](https://marketplace.visualstudio.com/items?itemName=bierner.markdown-mermaid)
2. Open this file
3. Press `Cmd+Shift+V` (macOS) or `Ctrl+Shift+V` (Windows)

**In Obsidian:**
- Built-in Mermaid support
- Diagrams render automatically

**Online:**
- Copy diagram code to [mermaid.live](https://mermaid.live)
- Export as PNG/SVG

---

**Last Updated:** 2026-02-14
