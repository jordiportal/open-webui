import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8001;

// ============================================
// Mock Models Endpoint
// ============================================
app.get('/v1/models', (req, res) => {
  console.log('📋 GET /v1/models');
  res.json({
    object: 'list',
    data: [
      { id: 'brain-chat', object: 'model', created: Date.now(), owned_by: 'brain' },
      { id: 'brain-slides', object: 'model', created: Date.now(), owned_by: 'brain' },
      { id: 'brain-docs', object: 'model', created: Date.now(), owned_by: 'brain' },
      { id: 'brain-code', object: 'model', created: Date.now(), owned_by: 'brain' },
      { id: 'brain-research', object: 'model', created: Date.now(), owned_by: 'brain' },
    ]
  });
});

// ============================================
// Mock Chat Completions
// ============================================
app.post('/v1/chat/completions', async (req, res) => {
  const { messages, stream, model } = req.body;
  const userMessage = messages[messages.length - 1]?.content || '';
  
  console.log(`\n🧠 POST /v1/chat/completions`);
  console.log(`   Model: ${model}`);
  console.log(`   Stream: ${stream}`);
  console.log(`   Message: "${userMessage.substring(0, 50)}..."`);

  if (stream) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    const events = generateMockEvents(userMessage, model);
    
    for (const event of events) {
      // Formato OpenAI SSE con nuestros eventos custom en el content
      const chunk = {
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: model,
        choices: [{
          index: 0,
          delta: {
            // Para eventos Brain, usamos un formato especial
            content: event.type === 'text' 
              ? event.content 
              : `\n<!--BRAIN_EVENT:${JSON.stringify(event)}-->\n`,
          },
          finish_reason: null
        }]
      };
      
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      
      // Simular delay entre eventos
      await sleep(event.delay || 300);
    }
    
    // Evento final
    const finalChunk = {
      id: `chatcmpl-${Date.now()}`,
      object: 'chat.completion.chunk',
      created: Math.floor(Date.now() / 1000),
      model: model,
      choices: [{ index: 0, delta: {}, finish_reason: 'stop' }]
    };
    res.write(`data: ${JSON.stringify(finalChunk)}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
    
  } else {
    // Non-streaming response
    res.json({
      id: `chatcmpl-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: model,
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: 'Esta es una respuesta de prueba (non-streaming).'
        },
        finish_reason: 'stop'
      }],
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 }
    });
  }
});

// ============================================
// Event Generators
// ============================================

function generateMockEvents(prompt, model) {
  const lowerPrompt = prompt.toLowerCase();
  
  // Detectar tipo de petición
  if (lowerPrompt.includes('presentación') || lowerPrompt.includes('slides') || model === 'brain-slides') {
    return generateSlidesEvents(prompt);
  }
  
  if (lowerPrompt.includes('busca') || lowerPrompt.includes('investiga') || model === 'brain-research') {
    return generateResearchEvents(prompt);
  }
  
  if (lowerPrompt.includes('código') || lowerPrompt.includes('programa') || model === 'brain-code') {
    return generateCodeEvents(prompt);
  }
  
  // Default: chat normal con thinking
  return generateChatEvents(prompt);
}

function generateChatEvents(prompt) {
  return [
    { type: 'thinking', content: `Analizando la petición del usuario: "${prompt.substring(0, 50)}..."`, delay: 500 },
    { type: 'text', content: 'Hola! ', delay: 100 },
    { type: 'text', content: 'Esta es una respuesta ', delay: 100 },
    { type: 'text', content: 'de prueba del ', delay: 100 },
    { type: 'text', content: 'mock server Brain. ', delay: 100 },
    { type: 'text', content: '\n\nPuedes probar diferentes comandos:\n', delay: 200 },
    { type: 'text', content: '- "Crea una presentación sobre X"\n', delay: 100 },
    { type: 'text', content: '- "Busca información sobre Y"\n', delay: 100 },
    { type: 'text', content: '- "Escribe código para Z"', delay: 100 },
  ];
}

function generateSlidesEvents(prompt) {
  return [
    { type: 'thinking', content: `El usuario quiere una presentación. Analizando requisitos:\n\n1. Tema: ${prompt}\n2. Idioma: Español\n3. Estimando 8-10 slides`, delay: 800 },
    
    { type: 'action', action_type: 'search', title: 'Investigando el tema', status: 'running', delay: 300 },
    { type: 'action', action_type: 'search', title: 'Investigando el tema', status: 'completed', results_count: 23, delay: 1500 },
    
    { type: 'sources', sources: [
      { url: 'https://wikipedia.org/wiki/Tema', title: 'Wikipedia - Información general', snippet: 'Artículo completo sobre el tema...', favicon: '🌐' },
      { url: 'https://medium.com/articulo', title: 'Medium - Análisis profundo', snippet: 'Un análisis detallado de...', favicon: '📝' },
      { url: 'https://research.com/paper', title: 'Paper académico', snippet: 'Investigación científica sobre...', favicon: '📊' },
    ], delay: 500 },
    
    { type: 'action', action_type: 'file_create', title: 'Generando estructura de slides', status: 'running', delay: 300 },
    
    { type: 'outline', title: 'Estructura de la Presentación', items: [
      { id: '1', number: 1, title: 'Introducción', description: 'Contexto y objetivos', tag: 'Cover' },
      { id: '2', number: 2, title: 'Contenido', description: 'Agenda de la presentación', tag: 'Agenda' },
      { id: '3', number: 3, title: 'Punto Principal 1', description: 'Desarrollo del primer tema' },
      { id: '4', number: 4, title: 'Punto Principal 2', description: 'Desarrollo del segundo tema' },
      { id: '5', number: 5, title: 'Datos y Estadísticas', description: 'Evidencia y métricas', tag: 'Data' },
      { id: '6', number: 6, title: 'Conclusiones', description: 'Resumen y próximos pasos', tag: 'Final' },
    ], delay: 1000 },
    
    { type: 'action', action_type: 'file_create', title: 'Generando estructura de slides', status: 'completed', delay: 500 },
    
    { type: 'text', content: '\n\n✅ **Presentación generada exitosamente**\n\n', delay: 300 },
    { type: 'text', content: 'He creado una presentación con **6 diapositivas** que incluye:\n', delay: 200 },
    { type: 'text', content: '- Portada con título e introducción\n', delay: 100 },
    { type: 'text', content: '- Agenda con los puntos a tratar\n', delay: 100 },
    { type: 'text', content: '- Contenido principal desarrollado\n', delay: 100 },
    { type: 'text', content: '- Datos y estadísticas relevantes\n', delay: 100 },
    { type: 'text', content: '- Conclusiones y recomendaciones\n\n', delay: 100 },
    { type: 'text', content: 'Puedes ver la presentación en el panel lateral →', delay: 200 },
    
    { type: 'artifact', artifact_type: 'slides', title: 'Presentación Generada', content: MOCK_SLIDES_HTML, format: 'html', downloadable: true, delay: 500 },
  ];
}

function generateResearchEvents(prompt) {
  return [
    { type: 'thinking', content: `Iniciando investigación sobre: "${prompt}"\n\nPlan:\n1. Buscar fuentes primarias\n2. Analizar información\n3. Sintetizar hallazgos`, delay: 600 },
    
    { type: 'action', action_type: 'search', title: 'Búsqueda inicial', status: 'running', delay: 200 },
    { type: 'action', action_type: 'search', title: 'Búsqueda inicial', status: 'completed', results_count: 45, delay: 1200 },
    
    { type: 'sources', sources: [
      { url: 'https://example1.com', title: 'Fuente Principal', snippet: 'Información relevante encontrada...', date: '2025-01-15' },
      { url: 'https://example2.com', title: 'Análisis Secundario', snippet: 'Datos complementarios sobre...', date: '2025-01-10' },
      { url: 'https://example3.com', title: 'Estudio Reciente', snippet: 'Últimas investigaciones indican...', date: '2025-01-20' },
    ], delay: 400 },
    
    { type: 'action', action_type: 'search', title: 'Búsqueda profunda', status: 'running', delay: 200 },
    { type: 'action', action_type: 'search', title: 'Búsqueda profunda', status: 'completed', results_count: 28, delay: 1000 },
    
    { type: 'text', content: '## Resultados de la Investigación\n\n', delay: 300 },
    { type: 'text', content: 'He encontrado **73 fuentes** relevantes sobre el tema.\n\n', delay: 200 },
    { type: 'text', content: '### Hallazgos Principales:\n\n', delay: 200 },
    { type: 'text', content: '1. **Punto clave 1**: Lorem ipsum dolor sit amet...\n', delay: 150 },
    { type: 'text', content: '2. **Punto clave 2**: Consectetur adipiscing elit...\n', delay: 150 },
    { type: 'text', content: '3. **Punto clave 3**: Sed do eiusmod tempor...\n\n', delay: 150 },
    { type: 'text', content: 'Las fuentes consultadas están disponibles en el panel lateral.', delay: 200 },
  ];
}

function generateCodeEvents(prompt) {
  return [
    { type: 'thinking', content: `Analizando requisitos de código:\n- Lenguaje: Python (detectado)\n- Tipo: Script/función\n- Complejidad: Media`, delay: 500 },
    
    { type: 'action', action_type: 'code_exec', title: 'Preparando entorno sandbox', status: 'running', delay: 200 },
    { type: 'action', action_type: 'code_exec', title: 'Preparando entorno sandbox', status: 'completed', delay: 800 },
    
    { type: 'text', content: 'He creado el siguiente código:\n\n', delay: 200 },
    { type: 'text', content: '```python\n', delay: 100 },
    { type: 'text', content: 'def ejemplo():\n', delay: 100 },
    { type: 'text', content: '    """Función de ejemplo generada por Brain"""\n', delay: 100 },
    { type: 'text', content: '    resultado = []\n', delay: 100 },
    { type: 'text', content: '    for i in range(10):\n', delay: 100 },
    { type: 'text', content: '        resultado.append(i ** 2)\n', delay: 100 },
    { type: 'text', content: '    return resultado\n', delay: 100 },
    { type: 'text', content: '\n', delay: 50 },
    { type: 'text', content: 'if __name__ == "__main__":\n', delay: 100 },
    { type: 'text', content: '    print(ejemplo())\n', delay: 100 },
    { type: 'text', content: '```\n\n', delay: 100 },
    
    { type: 'action', action_type: 'code_exec', title: 'Ejecutando código', status: 'running', delay: 200 },
    
    { type: 'artifact', artifact_type: 'console', title: 'Output del Sandbox', content: '$ python script.py\n[0, 1, 4, 9, 16, 25, 36, 49, 64, 81]\n\nProcess finished with exit code 0', format: 'text', delay: 1000 },
    
    { type: 'action', action_type: 'code_exec', title: 'Ejecutando código', status: 'completed', delay: 300 },
    
    { type: 'text', content: '✅ **Código ejecutado exitosamente**\n\nEl resultado está disponible en la consola del panel lateral.', delay: 200 },
  ];
}

// ============================================
// Mock HTML Content
// ============================================

const MOCK_SLIDES_HTML = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', system-ui, sans-serif; 
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: #e4e4e7;
    }
    .slide { 
      min-height: 100vh; 
      display: flex; 
      flex-direction: column; 
      justify-content: center;
      padding: 80px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    .badge {
      display: inline-block;
      background: rgba(0, 217, 255, 0.2);
      color: #00d9ff;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 600;
      letter-spacing: 1px;
      margin-bottom: 24px;
    }
    h1 { 
      font-size: 4rem; 
      font-weight: 700;
      line-height: 1.1;
      margin-bottom: 16px;
    }
    h1 .highlight {
      color: #00d9ff;
    }
    .subtitle {
      font-size: 1.4rem;
      color: #a1a1aa;
      max-width: 600px;
      line-height: 1.6;
    }
    .stats {
      display: flex;
      gap: 40px;
      margin-top: 48px;
    }
    .stat {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .stat-icon {
      width: 40px;
      height: 40px;
      background: rgba(0, 217, 255, 0.1);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
    }
    .stat-label {
      font-size: 0.85rem;
      color: #a1a1aa;
    }
    
    /* Slide 2: Agenda */
    .agenda-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
      margin-top: 48px;
    }
    .agenda-item {
      background: rgba(255,255,255,0.05);
      border-radius: 16px;
      padding: 32px;
      transition: transform 0.2s, background 0.2s;
    }
    .agenda-item:hover {
      background: rgba(255,255,255,0.08);
      transform: translateY(-4px);
    }
    .agenda-number {
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, #00d9ff 0%, #0099cc 100%);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.2rem;
      font-weight: 700;
      margin-bottom: 16px;
    }
    .agenda-title {
      font-size: 1.2rem;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .agenda-desc {
      font-size: 0.9rem;
      color: #a1a1aa;
    }
    
    h2 {
      font-size: 2.5rem;
      margin-bottom: 16px;
    }
    .section-badge {
      color: #00d9ff;
      font-size: 0.9rem;
      font-weight: 600;
      letter-spacing: 2px;
      margin-bottom: 8px;
    }
  </style>
</head>
<body>
  <!-- Slide 1: Cover -->
  <div class="slide">
    <span class="badge">📊 PRESENTACIÓN GENERADA POR BRAIN</span>
    <h1>Título de la <span class="highlight">Presentación</span></h1>
    <p class="subtitle">
      Esta es una presentación de ejemplo generada automáticamente. 
      Incluye diseño moderno, estadísticas y estructura profesional.
    </p>
    <div class="stats">
      <div class="stat">
        <div class="stat-icon">📄</div>
        <div>
          <div class="stat-value">6</div>
          <div class="stat-label">SLIDES</div>
        </div>
      </div>
      <div class="stat">
        <div class="stat-icon">⏱️</div>
        <div>
          <div class="stat-value">5min</div>
          <div class="stat-label">LECTURA</div>
        </div>
      </div>
    </div>
  </div>
  
  <!-- Slide 2: Agenda -->
  <div class="slide">
    <span class="section-badge">AGENDA</span>
    <h2>Contenido</h2>
    <div class="agenda-grid">
      <div class="agenda-item">
        <div class="agenda-number">01</div>
        <div class="agenda-title">Introducción</div>
        <div class="agenda-desc">Contexto y objetivos principales</div>
      </div>
      <div class="agenda-item">
        <div class="agenda-number">02</div>
        <div class="agenda-title">Análisis</div>
        <div class="agenda-desc">Datos y métricas clave</div>
      </div>
      <div class="agenda-item">
        <div class="agenda-number">03</div>
        <div class="agenda-title">Resultados</div>
        <div class="agenda-desc">Hallazgos principales</div>
      </div>
      <div class="agenda-item">
        <div class="agenda-number">04</div>
        <div class="agenda-title">Impacto</div>
        <div class="agenda-desc">Beneficios y ROI</div>
      </div>
      <div class="agenda-item">
        <div class="agenda-number">05</div>
        <div class="agenda-title">Plan</div>
        <div class="agenda-desc">Próximos pasos</div>
      </div>
      <div class="agenda-item">
        <div class="agenda-number">06</div>
        <div class="agenda-title">Conclusión</div>
        <div class="agenda-desc">Resumen y cierre</div>
      </div>
    </div>
  </div>
  
  <!-- Slide 3: Content -->
  <div class="slide">
    <span class="section-badge">SECCIÓN 01</span>
    <h2>Punto Principal</h2>
    <p class="subtitle" style="margin-top: 24px;">
      Lorem ipsum dolor sit amet, consectetur adipiscing elit. 
      Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
      Ut enim ad minim veniam, quis nostrud exercitation ullamco.
    </p>
    <div class="stats" style="margin-top: 32px;">
      <div class="stat">
        <div class="stat-icon">📈</div>
        <div>
          <div class="stat-value">+45%</div>
          <div class="stat-label">CRECIMIENTO</div>
        </div>
      </div>
      <div class="stat">
        <div class="stat-icon">👥</div>
        <div>
          <div class="stat-value">1.2M</div>
          <div class="stat-label">USUARIOS</div>
        </div>
      </div>
      <div class="stat">
        <div class="stat-icon">⭐</div>
        <div>
          <div class="stat-value">4.8</div>
          <div class="stat-label">RATING</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
`;

// ============================================
// Utilities
// ============================================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// Start Server
// ============================================

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   🧠 Mock Brain Server                                   ║
║                                                          ║
║   Running on: http://localhost:${PORT}                    ║
║                                                          ║
║   Endpoints:                                             ║
║   - GET  /v1/models                                      ║
║   - POST /v1/chat/completions                            ║
║                                                          ║
║   Test commands:                                         ║
║   - "Crea una presentación sobre X"  → Slides artifact   ║
║   - "Busca información sobre Y"      → Research mode     ║
║   - "Escribe código para Z"          → Code + console    ║
║   - Any other message                → Chat mode         ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
  `);
});
