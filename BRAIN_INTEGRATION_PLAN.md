# Plan de Integración Open WebUI + Brain

## Visión General

Adaptar Open WebUI como interfaz de usuario para el sistema agéntico **Brain**, 
manteniendo la experiencia de usuario familiar pero añadiendo capacidades avanzadas
de visualización inspiradas en Kimi.com.

```
┌─────────────────────────────────────────────────────────────────┐
│                     Open WebUI (Adaptado)                       │
│  ┌───────────┬─────────────────────┬────────────────────────┐  │
│  │  SIDEBAR  │       CHAT          │      ARTEFACTOS        │  │
│  │           │                     │                        │  │
│  │ Agentes:  │  • Thinking block   │  • Slides Viewer       │  │
│  │ • Chat    │  • Action blocks    │  • Document Viewer     │  │
│  │ • Slides  │  • Outline view     │  • Console Output      │  │
│  │ • Docs    │  • Chat messages    │  • Code Preview        │  │
│  │ • Code    │                     │  • Sources Panel       │  │
│  └───────────┴─────────────────────┴────────────────────────┘  │
└─────────────────────────┬───────────────────────────────────────┘
                          │ OpenAI API + Eventos SSE extendidos
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                          BRAIN                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                 Orquestador Agéntico                      │  │
│  │   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │  │
│  │   │ Search  │ │ Slides  │ │  Docs   │ │ Sandbox │       │  │
│  │   │ Agent   │ │ Agent   │ │  Agent  │ │  Exec   │       │  │
│  │   └─────────┘ └─────────┘ └─────────┘ └─────────┘       │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Fase 1: Entorno de Desarrollo

### 1.1 Configuración Local

```bash
# Frontend (Svelte)
cd /Users/jordip/cursor/open-webui
npm install
npm run dev  # Puerto 5173 por defecto

# Backend (Python) - en otra terminal
cd /Users/jordip/cursor/open-webui/backend
pip install -r requirements.txt
./start.sh  # Puerto 8080
```

### 1.2 Variables de Entorno

Crear `.env` en la raíz:
```env
# Desarrollo
VITE_API_BASE_URL=http://localhost:8080

# Brain connection (para producción)
BRAIN_API_URL=http://localhost:8000/v1
BRAIN_API_KEY=sk-brain-xxx
```

---

## Fase 2: Protocolo de Comunicación Brain → Open WebUI

### 2.1 Eventos SSE Extendidos

Brain enviará eventos estructurados dentro del stream de chat completions:

```typescript
// Formato: data: {"type": "xxx", ...}\n\n

interface BrainEvents {
  // Texto normal (compatible OpenAI)
  text: {
    type: "text";
    content: string;
  };
  
  // Razonamiento visible (como "Think" de Kimi)
  thinking: {
    type: "thinking";
    content: string;
    collapsed?: boolean;
  };
  
  // Acciones del agente (búsquedas, creación de archivos, etc.)
  action: {
    type: "action";
    action_type: "search" | "file_create" | "code_exec" | "api_call";
    title: string;
    status: "running" | "completed" | "error";
    details?: string;
    results_count?: number;
    expandable?: boolean;
  };
  
  // Outline/estructura (para presentaciones, documentos)
  outline: {
    type: "outline";
    title: string;
    items: Array<{
      id: string;
      number: number;
      title: string;
      description?: string;
      tag?: string;  // "Cover", "Agenda", "Final", etc.
    }>;
  };
  
  // Artefacto generado
  artifact: {
    type: "artifact";
    artifact_type: "slides" | "document" | "html" | "code" | "console";
    title: string;
    content: string;  // HTML, markdown, o código
    format?: "html" | "markdown" | "json";
    downloadable?: boolean;
    editable?: boolean;
  };
  
  // Fuentes consultadas
  sources: {
    type: "sources";
    sources: Array<{
      url: string;
      title: string;
      snippet?: string;
      favicon?: string;
      date?: string;
    }>;
  };
  
  // Progreso general
  progress: {
    type: "progress";
    stage: string;
    percentage?: number;
    message?: string;
  };
}
```

### 2.2 Ejemplo de Stream Completo

```
data: {"type":"thinking","content":"El usuario quiere una presentación..."}

data: {"type":"action","action_type":"search","title":"Investigar modelos IA","status":"running"}

data: {"type":"sources","sources":[{"url":"https://...","title":"AI Comparison 2025"}]}

data: {"type":"action","action_type":"search","title":"Investigar modelos IA","status":"completed","results_count":27}

data: {"type":"outline","title":"Slide Outline","items":[{"id":"1","number":1,"title":"Comparativa IA","tag":"Cover"}]}

data: {"type":"text","content":"He creado una presentación con 12 diapositivas..."}

data: {"type":"artifact","artifact_type":"slides","title":"Comparativa IA 2025","content":"<html>...","format":"html"}

data: [DONE]
```

---

## Fase 3: Componentes UI a Crear

### 3.1 Estructura de Archivos

```
src/lib/components/
├── brain/                          # Nuevos componentes Brain
│   ├── AgentSidebar.svelte         # Sidebar con agentes especializados
│   ├── AgentIcon.svelte            # Iconos para cada tipo de agente
│   ├── ThinkingBlock.svelte        # Bloque de razonamiento colapsable
│   ├── ActionBlock.svelte          # Acción del agente (search, file, etc.)
│   ├── OutlineView.svelte          # Vista de outline/estructura
│   ├── SourcesPanel.svelte         # Panel lateral de fuentes
│   └── ProgressIndicator.svelte    # Indicador de progreso
│
├── artifacts/                      # Viewers de artefactos extendidos
│   ├── ArtifactContainer.svelte    # Contenedor general
│   ├── SlidesViewer.svelte         # Visor de presentaciones
│   ├── DocumentViewer.svelte       # Visor de documentos
│   ├── ConsoleViewer.svelte        # Consola/terminal output
│   ├── CodeViewer.svelte           # Visor de código con syntax highlight
│   └── ArtifactToolbar.svelte      # Barra de herramientas (download, edit, etc.)
│
└── chat/
    └── Messages/
        └── BrainMessageRenderer.svelte  # Renderer adaptado para eventos Brain
```

### 3.2 Componentes Detallados

#### AgentSidebar.svelte
```svelte
<!-- Sidebar con agentes especializados -->
<script>
  export let agents = [
    { id: 'chat', name: 'Chat', icon: 'message', description: 'Conversación general' },
    { id: 'slides', name: 'Slides', icon: 'presentation', description: 'Crear presentaciones' },
    { id: 'docs', name: 'Docs', icon: 'document', description: 'Análisis de documentos' },
    { id: 'code', name: 'Code', icon: 'code', description: 'Programación y sandbox' },
    { id: 'research', name: 'Research', icon: 'search', description: 'Investigación profunda' },
  ];
  export let selectedAgent = 'chat';
</script>
```

#### ThinkingBlock.svelte
```svelte
<!-- Bloque "Think" colapsable -->
<script>
  export let content: string;
  export let collapsed = true;
</script>

<div class="thinking-block">
  <button on:click={() => collapsed = !collapsed}>
    <span class="icon">💭</span>
    <span>Think</span>
    <span class="chevron">{collapsed ? '▶' : '▼'}</span>
  </button>
  {#if !collapsed}
    <div class="thinking-content">{content}</div>
  {/if}
</div>
```

#### ActionBlock.svelte
```svelte
<!-- Acción del agente expandible -->
<script>
  export let action: {
    action_type: string;
    title: string;
    status: string;
    results_count?: number;
    details?: string;
  };
  let expanded = false;
</script>

<div class="action-block status-{action.status}">
  <div class="action-header" on:click={() => expanded = !expanded}>
    <span class="icon">{getIcon(action.action_type)}</span>
    <span class="title">{action.title}</span>
    {#if action.results_count}
      <span class="badge">{action.results_count} results</span>
    {/if}
    <span class="status-icon">{action.status === 'running' ? '⏳' : '✓'}</span>
  </div>
  {#if expanded && action.details}
    <div class="action-details">{action.details}</div>
  {/if}
</div>
```

#### SlidesViewer.svelte
```svelte
<!-- Visor de presentaciones -->
<script>
  export let content: string;  // HTML de las slides
  export let title: string;
  
  let currentSlide = 0;
  let slides: HTMLElement[] = [];
  
  function parseSlides(html: string) {
    // Parsear HTML y extraer slides individuales
  }
</script>

<div class="slides-viewer">
  <div class="slides-header">
    <h3>{title}</h3>
    <div class="slide-nav">
      <button on:click={() => currentSlide--}>←</button>
      <span>{currentSlide + 1} / {slides.length}</span>
      <button on:click={() => currentSlide++}>→</button>
    </div>
    <div class="slides-actions">
      <button>Download</button>
      <button>Fullscreen</button>
    </div>
  </div>
  <div class="slides-content">
    <iframe srcdoc={content} />
  </div>
  <div class="slides-thumbnails">
    {#each slides as slide, i}
      <div class="thumbnail" class:active={i === currentSlide} on:click={() => currentSlide = i}>
        <!-- Mini preview -->
      </div>
    {/each}
  </div>
</div>
```

---

## Fase 4: Modificaciones al Layout

### 4.1 Layout Adaptativo 3 Columnas

Modificar `src/routes/(app)/+layout.svelte`:

```svelte
<script>
  import { showArtifacts, showSources } from '$lib/stores';
</script>

<div class="app-layout" class:with-artifacts={$showArtifacts} class:with-sources={$showSources}>
  <!-- Sidebar izquierdo: Agentes + Chat History -->
  <aside class="sidebar-left">
    <AgentSidebar />
    <ChatHistory />
  </aside>
  
  <!-- Área principal: Chat -->
  <main class="chat-area">
    <slot />
  </main>
  
  <!-- Panel derecho: Artefactos o Fuentes -->
  {#if $showArtifacts || $showSources}
    <aside class="sidebar-right">
      {#if $showArtifacts}
        <ArtifactContainer />
      {:else if $showSources}
        <SourcesPanel />
      {/if}
    </aside>
  {/if}
</div>

<style>
  .app-layout {
    display: grid;
    grid-template-columns: 240px 1fr;
    height: 100vh;
  }
  
  .app-layout.with-artifacts,
  .app-layout.with-sources {
    grid-template-columns: 240px 1fr 400px;
  }
  
  @media (max-width: 1024px) {
    .app-layout.with-artifacts,
    .app-layout.with-sources {
      grid-template-columns: 1fr;
    }
    .sidebar-right {
      position: fixed;
      right: 0;
      top: 0;
      bottom: 0;
      width: 100%;
      z-index: 50;
    }
  }
</style>
```

---

## Fase 5: Procesamiento de Eventos Brain

### 5.1 Parser de Eventos

Crear `src/lib/utils/brainEvents.ts`:

```typescript
export interface BrainEvent {
  type: string;
  [key: string]: any;
}

export function parseBrainEvent(data: string): BrainEvent | null {
  try {
    return JSON.parse(data);
  } catch {
    // Fallback: texto plano como evento text
    return { type: 'text', content: data };
  }
}

export function isBrainEvent(data: any): boolean {
  return data && typeof data.type === 'string';
}
```

### 5.2 Store de Estado Brain

Crear `src/lib/stores/brain.ts`:

```typescript
import { writable, derived } from 'svelte/store';

// Estado actual del agente
export const currentAgent = writable('chat');

// Eventos acumulados del mensaje actual
export const brainEvents = writable<BrainEvent[]>([]);

// Thinking content
export const thinkingContent = writable<string | null>(null);

// Acciones actuales
export const currentActions = writable<Action[]>([]);

// Outline actual
export const currentOutline = writable<OutlineItem[] | null>(null);

// Artefacto actual
export const currentArtifact = writable<Artifact | null>(null);

// Fuentes
export const currentSources = writable<Source[]>([]);

// Derivado: hay contenido para mostrar en panel derecho
export const hasRightPanel = derived(
  [currentArtifact, currentSources],
  ([$artifact, $sources]) => $artifact !== null || $sources.length > 0
);

// Reset al iniciar nuevo mensaje
export function resetBrainState() {
  brainEvents.set([]);
  thinkingContent.set(null);
  currentActions.set([]);
  currentOutline.set(null);
  // No resetear artifact y sources para mantener visibles
}
```

---

## Fase 6: Mock Server para Desarrollo

### 6.1 Crear Mock Brain Server

Crear `dev/mock-brain-server.js`:

```javascript
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// Mock models endpoint
app.get('/v1/models', (req, res) => {
  res.json({
    object: 'list',
    data: [
      { id: 'brain-chat', object: 'model', owned_by: 'brain' },
      { id: 'brain-slides', object: 'model', owned_by: 'brain' },
      { id: 'brain-docs', object: 'model', owned_by: 'brain' },
      { id: 'brain-code', object: 'model', owned_by: 'brain' },
    ]
  });
});

// Mock chat completions con eventos Brain
app.post('/v1/chat/completions', (req, res) => {
  const { messages, stream } = req.body;
  const userMessage = messages[messages.length - 1].content;
  
  if (stream) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    
    // Simular flujo de eventos
    const events = generateMockEvents(userMessage);
    let i = 0;
    
    const interval = setInterval(() => {
      if (i < events.length) {
        res.write(`data: ${JSON.stringify(events[i])}\n\n`);
        i++;
      } else {
        res.write('data: [DONE]\n\n');
        res.end();
        clearInterval(interval);
      }
    }, 500);
  } else {
    res.json({
      id: 'mock-response',
      object: 'chat.completion',
      choices: [{ message: { role: 'assistant', content: 'Mock response' } }]
    });
  }
});

function generateMockEvents(prompt) {
  // Detectar si pide slides
  if (prompt.toLowerCase().includes('presentación') || prompt.toLowerCase().includes('slides')) {
    return [
      { type: 'thinking', content: 'El usuario quiere una presentación. Voy a analizar los requisitos...' },
      { type: 'action', action_type: 'search', title: 'Investigando tema', status: 'running' },
      { type: 'action', action_type: 'search', title: 'Investigando tema', status: 'completed', results_count: 15 },
      { type: 'sources', sources: [
        { url: 'https://example.com', title: 'Artículo relevante', snippet: 'Información útil...' }
      ]},
      { type: 'outline', title: 'Estructura de la presentación', items: [
        { id: '1', number: 1, title: 'Introducción', tag: 'Cover' },
        { id: '2', number: 2, title: 'Contenido', tag: 'Agenda' },
        { id: '3', number: 3, title: 'Conclusiones', tag: 'Final' },
      ]},
      { type: 'text', content: 'He creado una presentación con 3 diapositivas.' },
      { type: 'artifact', artifact_type: 'slides', title: 'Mi Presentación', content: MOCK_SLIDES_HTML, format: 'html' },
    ];
  }
  
  // Default: chat normal
  return [
    { type: 'text', content: 'Esta es una respuesta de prueba del mock server.' }
  ];
}

const MOCK_SLIDES_HTML = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: system-ui; background: #1a1a2e; color: white; margin: 0; }
    .slide { min-height: 100vh; display: flex; flex-direction: column; justify-content: center; padding: 60px; }
    h1 { font-size: 3rem; color: #00d9ff; }
    h2 { font-size: 2rem; }
  </style>
</head>
<body>
  <div class="slide">
    <span style="color: #00d9ff; font-size: 0.9rem;">PRESENTACIÓN</span>
    <h1>Título de Ejemplo</h1>
    <p>Subtítulo descriptivo aquí</p>
  </div>
  <div class="slide">
    <h2>Agenda</h2>
    <ul>
      <li>Punto 1</li>
      <li>Punto 2</li>
      <li>Punto 3</li>
    </ul>
  </div>
</body>
</html>
`;

app.listen(8000, () => {
  console.log('Mock Brain server running on http://localhost:8000');
});
```

---

## Fase 7: Cronograma de Implementación

### Semana 1: Fundamentos
- [x] Configurar entorno de desarrollo
- [ ] Crear mock server Brain
- [ ] Implementar parser de eventos Brain
- [ ] Crear stores de estado

### Semana 2: Componentes Base
- [ ] ThinkingBlock
- [ ] ActionBlock
- [ ] OutlineView
- [ ] SourcesPanel

### Semana 3: Artefactos
- [ ] ArtifactContainer
- [ ] SlidesViewer
- [ ] ConsoleViewer
- [ ] CodeViewer

### Semana 4: Layout y Sidebar
- [ ] AgentSidebar
- [ ] Layout 3 columnas
- [ ] Responsive design
- [ ] Integración completa

### Semana 5: Pulido e Integración
- [ ] Conectar con Brain real
- [ ] Testing E2E
- [ ] Optimización de rendimiento
- [ ] Documentación

---

## Comandos Útiles

```bash
# Desarrollo frontend
npm run dev

# Desarrollo con backend local
npm run dev & cd backend && ./start.sh

# Mock Brain server
node dev/mock-brain-server.js

# Build producción
npm run build

# Lint y format
npm run lint
npm run format
```

---

## Notas Importantes

1. **Compatibilidad hacia atrás**: Mantener compatibilidad con modelos OpenAI normales
2. **Feature flags**: Usar flags para activar/desactivar features Brain
3. **Fallbacks**: Si Brain no envía eventos especiales, renderizar como chat normal
4. **Performance**: Los artefactos pueden ser grandes, usar virtualización si es necesario
