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
      let eventContent;
      
      if (event.type === 'text') {
        eventContent = event.content;
      } else if (event.type === 'artifact' && event.content) {
        // Para artifacts, codificar el contenido HTML en base64 para evitar conflictos
        const eventCopy = { ...event };
        eventCopy.content_base64 = Buffer.from(event.content).toString('base64');
        delete eventCopy.content; // No enviar el contenido sin codificar
        eventContent = `\n<!--BRAIN_EVENT:${JSON.stringify(eventCopy)}-->\n`;
      } else {
        eventContent = `\n<!--BRAIN_EVENT:${JSON.stringify(event)}-->\n`;
      }
      
      const chunk = {
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: model,
        choices: [{
          index: 0,
          delta: {
            content: eventContent,
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
  // Generate slides dynamically, one at a time
  const events = [
    { type: 'thinking', content: `El usuario quiere una presentación. Analizando requisitos:\n\n1. Tema: ${prompt}\n2. Idioma: Español\n3. Estimando 5 slides`, delay: 600 },
    
    { type: 'action', action_type: 'search', title: 'Investigando el tema', status: 'running', delay: 200 },
    { type: 'action', action_type: 'search', title: 'Investigando el tema', status: 'completed', results_count: 23, delay: 1000 },
    
    { type: 'sources', sources: [
      { url: 'https://wikipedia.org/wiki/AI', title: 'Wikipedia - Inteligencia Artificial', snippet: 'La inteligencia artificial es...', favicon: '🌐' },
      { url: 'https://openai.com/research', title: 'OpenAI Research', snippet: 'Últimos avances en IA...', favicon: '🤖' },
      { url: 'https://arxiv.org/ai', title: 'Papers de IA', snippet: 'Investigaciones recientes...', favicon: '📊' },
    ], delay: 400 },
    
    { type: 'action', action_type: 'slides', title: 'Generando presentación', status: 'running', delay: 200 },
    
    { type: 'text', content: '\n\n🎨 **Generando presentación...**\n\n', delay: 200 },
  ];

  // Add each slide progressively
  const slideContents = SLIDES_ARRAY;
  let accumulatedHTML = getSlideStyles();
  
  slideContents.forEach((slide, index) => {
    accumulatedHTML += slide;
    events.push({
      type: 'text',
      content: `📄 Slide ${index + 1} generada...\n`,
      delay: 300
    });
    events.push({
      type: 'artifact',
      artifact_type: 'slides',
      title: 'Presentación: ' + prompt.substring(0, 30),
      content: accumulatedHTML,
      format: 'html',
      delay: 800
    });
  });

  events.push({ type: 'action', action_type: 'slides', title: 'Generando presentación', status: 'completed', delay: 300 });
  events.push({ type: 'text', content: '\n✅ **Presentación completada** - 5 slides generadas\n', delay: 200 });

  return events;
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
// Mock HTML Content - Slides as Array for Progressive Loading
// ============================================

function getSlideStyles() {
  return `<style>
.slide { 
  padding: 24px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}
h1 { font-size: 1.8rem; font-weight: 700; margin-bottom: 12px; }
h2 { font-size: 1.4rem; font-weight: 600; margin-bottom: 10px; }
.badge { 
  display: inline-block; 
  background: rgba(139, 92, 246, 0.3); 
  padding: 4px 12px; 
  border-radius: 12px; 
  font-size: 0.7rem;
  margin-bottom: 8px;
}
.highlight { color: #a78bfa; }
.subtitle { color: #a1a1aa; font-size: 0.9rem; margin-bottom: 12px; }
.stats { display: flex; gap: 20px; margin-top: 12px; }
.stat-value { font-size: 1.3rem; font-weight: 700; color: #a78bfa; }
.stat-label { font-size: 0.65rem; color: #a1a1aa; }
.grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 12px; }
.card { background: rgba(255,255,255,0.05); padding: 12px; border-radius: 8px; }
.card-num { color: #a78bfa; font-weight: 700; font-size: 0.9rem; }
.card-title { font-weight: 600; font-size: 0.85rem; margin-top: 4px; }
.card-desc { font-size: 0.75rem; color: #a1a1aa; margin-top: 2px; }
ul { padding-left: 16px; margin-top: 8px; }
li { font-size: 0.85rem; margin-bottom: 6px; color: #d4d4d8; }
.conclusion { background: rgba(139, 92, 246, 0.1); padding: 12px; border-radius: 8px; margin-top: 12px; }
</style>`;
}

const SLIDES_ARRAY = [
  // Slide 1: Cover
  `<div class="slide">
    <span class="badge">🧠 BRAIN AI</span>
    <h1>Inteligencia <span class="highlight">Artificial</span></h1>
    <p class="subtitle">Una introducción al futuro de la tecnología</p>
    <div class="stats">
      <div><div class="stat-value">5</div><div class="stat-label">SLIDES</div></div>
      <div><div class="stat-value">2024</div><div class="stat-label">ACTUALIZADO</div></div>
    </div>
  </div>`,
  
  // Slide 2: Agenda
  `<div class="slide">
    <span class="badge">AGENDA</span>
    <h2>Contenido</h2>
    <div class="grid">
      <div class="card"><div class="card-num">01</div><div class="card-title">¿Qué es la IA?</div><div class="card-desc">Definición y conceptos</div></div>
      <div class="card"><div class="card-num">02</div><div class="card-title">Aplicaciones</div><div class="card-desc">Casos de uso reales</div></div>
      <div class="card"><div class="card-num">03</div><div class="card-title">Impacto</div><div class="card-desc">Transformación digital</div></div>
      <div class="card"><div class="card-num">04</div><div class="card-title">Futuro</div><div class="card-desc">Tendencias y predicciones</div></div>
    </div>
  </div>`,
  
  // Slide 3: Content
  `<div class="slide">
    <span class="badge">SECCIÓN 01</span>
    <h2>¿Qué es la Inteligencia Artificial?</h2>
    <ul>
      <li>Sistemas que simulan <strong>inteligencia humana</strong></li>
      <li>Capacidad de <strong>aprender</strong> y <strong>adaptarse</strong></li>
      <li>Procesamiento de <strong>lenguaje natural</strong></li>
      <li>Reconocimiento de patrones y <strong>toma de decisiones</strong></li>
    </ul>
    <div class="stats">
      <div><div class="stat-value">$150B</div><div class="stat-label">MERCADO 2025</div></div>
      <div><div class="stat-value">40%</div><div class="stat-label">CRECIMIENTO ANUAL</div></div>
    </div>
  </div>`,
  
  // Slide 4: Applications
  `<div class="slide">
    <span class="badge">SECCIÓN 02</span>
    <h2>Aplicaciones de la IA</h2>
    <div class="grid">
      <div class="card"><div class="card-title">🏥 Salud</div><div class="card-desc">Diagnóstico y tratamiento</div></div>
      <div class="card"><div class="card-title">🚗 Transporte</div><div class="card-desc">Vehículos autónomos</div></div>
      <div class="card"><div class="card-title">💼 Negocios</div><div class="card-desc">Automatización y análisis</div></div>
      <div class="card"><div class="card-title">🎨 Creatividad</div><div class="card-desc">Generación de contenido</div></div>
    </div>
  </div>`,
  
  // Slide 5: Conclusion
  `<div class="slide">
    <span class="badge">CONCLUSIÓN</span>
    <h2>El Futuro es Ahora</h2>
    <div class="conclusion">
      <p style="font-size: 0.9rem; margin-bottom: 8px;">La IA está transformando todos los aspectos de nuestra vida.</p>
      <p style="font-size: 0.85rem; color: #a1a1aa;">La clave está en adoptarla de manera ética y responsable.</p>
    </div>
    <div class="stats" style="margin-top: 16px;">
      <div><div class="stat-value">🚀</div><div class="stat-label">INNOVACIÓN</div></div>
      <div><div class="stat-value">🌍</div><div class="stat-label">IMPACTO GLOBAL</div></div>
      <div><div class="stat-value">🤝</div><div class="stat-label">COLABORACIÓN</div></div>
    </div>
  </div>`
];

// Keep the old MOCK_SLIDES_HTML for reference
const MOCK_SLIDES_HTML = getSlideStyles() + SLIDES_ARRAY.join('\n');

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
