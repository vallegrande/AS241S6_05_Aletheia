# Aletheia — Contexto del proyecto para un agente de IA

> **Propósito de este documento:** proporcionar al agente de IA un contexto claro y consistente sobre Aletheia para que pueda ayudar a diseñar, planificar, documentar e implementar el producto sin cambiar su visión original.

## 1. Resumen ejecutivo

**Aletheia** es una plataforma de identidad digital descentralizada para la economía del talento. Busca ayudar a profesionales digitales a construir una reputación profesional **portable, verificable y controlada por ellos mismos**, reuniendo evidencias que hoy están dispersas en diferentes plataformas.

La propuesta combina tres componentes:

1. **Integración de evidencias:** reunir información de repositorios, portafolios, certificaciones, proyectos freelance y logros competitivos.
2. **Inteligencia artificial (IA):** analizar la evidencia y proponer un perfil estructurado de habilidades. El usuario debe poder revisar, corregir y aprobar los resultados.
3. **Blockchain:** permitir la verificación independiente de registros seleccionados, sin almacenar necesariamente los archivos completos en la cadena.

Aletheia no pretende reemplazar servicios como GitHub, LinkedIn o Workana. Busca actuar como una capa que conecte evidencias de distintas fuentes y permita al usuario compartir su reputación fuera de cada plataforma.

**Público inicial:** profesionales digitales de Perú, con posibilidad de expandirse a otros países de América Latina.

## 2. Problema que se quiere resolver

La reputación digital de un profesional suele estar fragmentada entre plataformas que no comparten necesariamente sus datos:

- Desarrollo de software: GitHub.
- Perfil profesional y contactos: LinkedIn.
- Diseño: Behance y Figma Community.
- Videojuegos y esports: Steam, Riot Games y otras plataformas.
- Trabajo freelance: Workana y Fiverr.
- Formación: Coursera, Platzi y Udemy.

Esta fragmentación genera varios problemas:

- El profesional debe reunir manualmente enlaces, capturas, certificados y otros elementos para demostrar sus capacidades.
- Los clientes y reclutadores deben invertir tiempo en revisar y verificar esa información.
- La reputación acumulada suele quedar vinculada a la plataforma donde se generó y puede ser difícil de trasladar.
- Los currículos y documentos presentados por una persona pueden ser difíciles de verificar de forma independiente.
- Los profesionales nuevos en el mercado internacional pueden tener dificultades para demostrar su experiencia, aunque cuenten con evidencias reales.
- Las plataformas privadas controlan las reglas de visibilidad, el acceso a los datos y las condiciones de uso.

El problema central **no es la falta de talento**, sino la dificultad de consolidar y verificar la evidencia de ese talento de una forma que sea portable y controlada por el propio profesional.

## 3. Usuarios objetivo

### 3.1 Profesionales individuales

- Desarrolladores de software.
- Diseñadores digitales.
- Editores de video y creadores audiovisuales.
- Profesionales independientes (*freelancers*).
- Gamers competitivos y jugadores de esports.
- Creadores de contenido.
- Personas que desean demostrar certificaciones, proyectos o logros profesionales.

### 3.2 Organizaciones

- Empresas que contratan talento remoto.
- Agencias de reclutamiento.
- Estudios de diseño y desarrollo.
- Organizaciones de esports.
- Universidades, academias y proveedores de certificaciones.
- Plataformas que quieran verificar credenciales mediante una API.

## 4. Propuesta de valor

Aletheia permite que una persona construya un perfil profesional a partir de evidencias de distintas fuentes, revise el análisis generado por IA y elija qué registros quiere certificar y compartir.

Sus tres pilares son:

| Pilar | Función |
|---|---|
| IA | Analiza evidencias y ayuda a estructurar las habilidades, proyectos y logros del usuario. |
| Blockchain | Registra huellas criptográficas de elementos seleccionados para facilitar su verificación independiente. |
| Control del usuario | Permite revisar el perfil, elegir qué certificar y decidir qué información compartir. |

La IA **no debe declarar automáticamente que una persona es competente** solo porque analizó un repositorio, una imagen o un documento. Debe presentar resultados basados en la evidencia disponible, indicar limitaciones y permitir que el usuario revise el perfil antes de publicarlo o certificarlo.

Blockchain puede demostrar que una huella registrada coincide con un contenido y que el registro no ha cambiado desde su certificación. **Por sí sola, no demuestra que la afirmación original sea verdadera**. La confiabilidad también depende de la procedencia de la evidencia y del método de validación.

## 5. Flujo principal del producto

1. **Registro:** el usuario crea una cuenta mediante correo electrónico o autenticación federada.
2. **Identidad criptográfica:** el sistema puede facilitar una billetera digital (*wallet*) para el usuario, con una experiencia sencilla para quienes no conocen blockchain.
3. **Conexión de fuentes:** el usuario conecta repositorios, portafolios, certificados, proyectos o evidencias de logros.
4. **Análisis con IA:** el sistema extrae información relevante y propone un perfil estructurado de habilidades y logros.
5. **Revisión humana:** el usuario revisa, corrige y complementa el análisis antes de aprobarlo.
6. **Selección:** el usuario decide qué elementos concretos desea certificar. No se certifica todo el perfil indiscriminadamente.
7. **Certificación:** el sistema genera una huella criptográfica (*hash*) de la evidencia seleccionada y registra la información necesaria en una red blockchain compatible.
8. **Compartición:** el usuario puede compartir un perfil público, credenciales específicas o determinados atributos, según las capacidades implementadas.
9. **Verificación:** un tercero comprueba la validez del registro sin depender exclusivamente de la palabra del usuario o de Aletheia.
10. **Actualización:** el usuario añade nuevos proyectos, certificaciones y logros para mantener su historial actualizado.

## 6. Requisitos funcionales derivados de la propuesta

Estos puntos describen las capacidades esperadas del producto; no implican que ya estén implementadas.

### 6.1 Perfil e identidad

- Registrar y autenticar usuarios.
- Gestionar un perfil profesional.
- Conectar o registrar fuentes de evidencia.
- Mostrar proyectos, habilidades, certificaciones y logros.
- Permitir que el usuario edite y revise el perfil sugerido por la IA.
- Permitir compartir el perfil o credenciales seleccionadas.
- Gestionar preferencias de privacidad y permisos de acceso.

### 6.2 Análisis de evidencias con IA

- Analizar repositorios de código, por ejemplo, para identificar lenguajes, actividad y características de los proyectos.
- Analizar portafolios visuales para resumir características del trabajo.
- Extraer datos relevantes de documentos de certificación.
- Organizar la evidencia en un formato consistente.
- Explicar de qué evidencia procede cada afirmación, cuando sea técnicamente posible.
- Permitir correcciones del usuario y evitar que el resultado de la IA se publique o certifique sin aprobación.

### 6.3 Certificación y verificación

- Permitir seleccionar evidencias específicas para certificar.
- Generar hashes de los contenidos seleccionados.
- Registrar las huellas y los metadatos estrictamente necesarios en blockchain.
- Facilitar la verificación independiente de los registros.
- Mantener una separación clara entre el contenido privado y la información pública de verificación.
- Evaluar mecanismos de credenciales verificables y divulgación selectiva para no revelar documentos completos cuando no sea necesario.

### 6.4 Integraciones

Integraciones contempladas o posibles:

- GitHub para repositorios de código.
- Plataformas de portafolios y diseño.
- Proveedores educativos o emisores de certificaciones.
- Plataformas de videojuegos y esports, cuando existan interfaces y permisos adecuados.
- Pasarelas de pago para futuras operaciones del marketplace.
- API para organizaciones que necesiten verificar credenciales.

La disponibilidad, los permisos y las condiciones técnicas de cada integración deben comprobarse antes de prometerla o implementarla.

### 6.5 Marketplace de talento

La visión contempla un marketplace donde organizaciones puedan descubrir profesionales y filtrar perfiles por habilidades o credenciales verificadas. Este componente puede desarrollarse después del núcleo de identidad y verificación. No debe asumirse como una función ya disponible.

## 7. Arquitectura conceptual

La arquitectura se plantea en capas independientes. La tecnología definitiva de cada capa aún debe validarse según los requisitos, costos y capacidades del equipo.

### 7.1 Frontend

Responsabilidades:

- Dashboard de identidad profesional.
- Asistente guiado para construir el perfil.
- Gestión de evidencias y resultados del análisis.
- Selección de registros para certificar.
- Visualización y compartición de credenciales.
- Configuración de privacidad.
- Marketplace de talento, si se incorpora a la versión correspondiente.

La complejidad de blockchain debe quedar abstraída mediante una experiencia sencilla y guiada.

### 7.2 Backend y API

Responsabilidades:

- Autenticación y gestión de usuarios.
- Orquestación del análisis de IA.
- Gestión de perfiles, evidencias y metadatos.
- Coordinación de las operaciones blockchain.
- Aplicación de permisos y reglas de privacidad.
- Servicios del marketplace, si corresponde.
- API de verificación para terceros.

El backend no debe compartir información privada fuera de los permisos que el usuario haya autorizado.

### 7.3 Capa blockchain

La propuesta contempla una red de capa 2 compatible con Ethereum, por ejemplo Polygon, para reducir costos de transacción.

Los contratos inteligentes podrían registrar hashes y datos mínimos necesarios para verificar registros. También se contempla explorar mecanismos de permisos y validaciones adicionales.

**Criterio de diseño:** no almacenar archivos personales completos en blockchain por defecto. La información personal y la evidencia detallada deben mantenerse fuera de la cadena cuando corresponda, y los registros públicos deben minimizar la exposición de datos sensibles.

La elección de red, contratos y estándares de credenciales debe confirmarse mediante investigación técnica antes de tomarla como decisión definitiva.

### 7.4 Base de datos tradicional

Se utilizaría para datos que necesitan consultas y actualizaciones frecuentes, como:

- Perfiles y preferencias.
- Metadatos de las evidencias.
- Referencias a archivos.
- Estado de los análisis.
- Datos operativos de la plataforma.
- Información del marketplace, si existe.

La base de datos y blockchain cumplen funciones distintas: la base de datos gestiona información operativa; blockchain aporta verificabilidad para registros seleccionados.

### 7.5 Capa de inteligencia artificial

Se encarga de procesar las evidencias y producir propuestas de información estructurada. Se comunica con el backend mediante servicios o interfaces de análisis.

El resultado debe ser revisable, trazable en la medida de lo posible y presentado como una interpretación basada en evidencia, no como una certificación infalible.

### 7.6 Wallet o billetera digital

La propuesta inicial contempla una experiencia de billetera simplificada para usuarios sin experiencia con criptomonedas. En fases posteriores podría ofrecerse una transición a autocustodia.

Antes de implementar una solución gestionada, deben definirse las responsabilidades de custodia, recuperación de cuentas, seguridad, costos y riesgos asociados.

### 7.7 Servicios externos

Las integraciones conectan Aletheia con herramientas que los usuarios ya utilizan. Deben diseñarse para que el usuario no tenga que abandonar esas plataformas y pueda aprovechar sus evidencias existentes.

## 8. Privacidad, seguridad y confianza

Estos principios son fundamentales para el producto:

- El usuario debe poder revisar y controlar su perfil.
- La publicación de evidencias no debe ser automática.
- Se debe almacenar en blockchain solo la información necesaria para la verificación.
- Los archivos completos y los datos personales deben protegerse fuera de la cadena cuando corresponda.
- La arquitectura debe contemplar permisos de acceso y divulgación selectiva.
- Se deben explicar las limitaciones de la IA y de los mecanismos de certificación.
- Una huella criptográfica demuestra integridad del contenido comparado con el registro, no necesariamente la veracidad del contenido original.
- Debe estudiarse cómo corregir, ocultar o invalidar credenciales incorrectas sin asumir que un registro inmutable puede borrarse de la cadena.
- Deben evaluarse los riesgos de privacidad de los metadatos públicos y la asociación entre una wallet y una identidad real.
- Las decisiones sobre custodia, recuperación de cuentas, consentimiento y retención de datos requieren diseño explícito.

## 9. Modelo de negocio propuesto

El modelo descrito en el documento original combina varias fuentes potenciales de ingresos:

1. **Plan gratuito:** perfil básico y un número limitado de certificaciones por periodo.
2. **Plan premium:** más certificaciones, análisis de IA avanzados y opciones adicionales de privacidad.
3. **API de verificación para organizaciones:** cobro según volumen de consultas o uso.
4. **Marketplace freelance:** comisión por transacciones completadas en la plataforma.
5. **Alianzas institucionales:** integración y emisión de credenciales verificables para universidades, academias y otros emisores.

Estas son hipótesis de negocio, no decisiones comerciales definitivas. Deben validarse mediante entrevistas, pruebas de demanda y análisis de costos.

## 10. Competidores y proyectos relacionados

El documento original identifica los siguientes actores y diferencia sus enfoques de la propuesta de Aletheia:

| Proyecto o plataforma | Enfoque descrito | Diferencia respecto a Aletheia |
|---|---|---|
| LinkedIn | Perfil profesional y red de contactos | La reputación está ligada a una plataforma centralizada. |
| GitHub | Repositorios y actividad de desarrollo | Muestra evidencia de código, pero no unifica por sí solo toda la reputación profesional. |
| Fiverr / Upwork / Workana | Intermediación entre clientes y profesionales | La reputación y las calificaciones suelen permanecer dentro de cada plataforma. |
| World ID | Verificación de humanidad o unicidad | No está centrado en demostrar habilidades profesionales. |
| Gitcoin Passport | Señales o credenciales de confianza en ecosistemas Web3 | Su enfoque descrito se orienta al contexto cripto. |
| Lens Protocol | Protocolo social descentralizado | Se enfoca en contenido y relaciones sociales, no en una identidad profesional integral. |
| ENS | Nombres legibles asociados a direcciones de blockchain | Identifica direcciones, pero no certifica competencias. |
| Polygon ID | Infraestructura para credenciales verificables y pruebas de conocimiento cero | Es una infraestructura que puede servir de referencia técnica, no necesariamente un producto de reputación profesional para el público objetivo. |

La diferenciación buscada por Aletheia es combinar **análisis de evidencias mediante IA, certificación verificable y control del usuario sobre su identidad profesional**, con atención inicial al mercado latinoamericano.

Esta tabla resume el posicionamiento planteado en el documento fuente; no constituye un análisis competitivo actualizado ni una afirmación de que no existan otros productos equivalentes.

## 11. Contexto de mercado citado en el documento original

El texto fuente menciona las siguientes cifras e hipótesis:

- Acceso a internet en Perú: 79,5 % de la población.
- Crecimiento cercano al 30 % anual del segmento freelance peruano hasta 2030.
- Crecimiento del 35 % del mercado freelance peruano desde 2022.
- Aumento del 25 % en la participación de profesionales peruanos en Upwork durante 2024.
- Crecimiento estimado del mercado global de identidad descentralizada, con cifras que varían según la consultora.
- Una tasa de crecimiento anual compuesta estimada en 70,8 % para el periodo 2026–2035, según la fuente citada en el documento original.
- Una previsión atribuida a Gartner sobre el uso de billeteras de identidad digital.

**Importante para el agente:** estas cifras proceden del documento de referencia y no deben presentarse como datos verificados o vigentes sin comprobar las fuentes originales, la fecha, la metodología y el alcance geográfico. Si se prepara una presentación comercial o académica, verificar cada cifra antes de reutilizarla.

Fuentes enlazadas en el texto original:

- Banco Mundial: https://www.bancomundial.org/es/country/peru/overview
- Avuelapluma: https://avuelapluma.es/freelance-en-peru-como-los-profesionales-encuentran-clientes-en-todo-el-mundo-2025/
- Dimension Market Research: https://dimensionmarketresearch.com/report/decentralized-identity-market/

## 12. Principios de producto que el agente debe respetar

Al proponer diseños, código, arquitectura, documentación o nuevas funcionalidades:

1. **No cambiar la visión central:** Aletheia organiza y verifica reputación profesional portable; no es solamente una wallet, una red social o un marketplace.
2. **Mantener al usuario en control:** el usuario revisa el análisis, selecciona lo que certifica y decide qué comparte.
3. **Separar análisis de certificación:** que la IA genere una afirmación no significa que esa afirmación ya esté verificada.
4. **No confundir integridad con verdad:** blockchain puede evidenciar que un registro no cambió, pero la calidad de la validación inicial sigue siendo importante.
5. **Evitar exposición innecesaria:** no proponer el almacenamiento público de archivos personales o datos sensibles en blockchain.
6. **No asumir integraciones disponibles:** verificar APIs, permisos y limitaciones antes de diseñar una integración como si estuviera garantizada.
7. **Distinguir visión y alcance actual:** las funciones descritas son una propuesta conceptual; no asumir que existe código o infraestructura implementada.
8. **Priorizar una primera versión viable:** el núcleo de identidad, evidencias, revisión por el usuario y verificación debe tener prioridad sobre funciones más amplias como el marketplace.
9. **Explicar las decisiones técnicas:** justificar las tecnologías por seguridad, costo, mantenimiento, experiencia de usuario y viabilidad.
10. **No inventar datos de mercado:** marcar las hipótesis y comprobar las fuentes antes de reutilizar estadísticas.
11. **Diseñar para una adopción sencilla:** ocultar la complejidad técnica innecesaria sin ocultar al usuario los riesgos relevantes.
12. **Proteger la privacidad desde el diseño:** pensar en permisos, minimización de datos y consecuencias de publicar metadatos.

## 13. Posible enfoque por fases

Este orden es una sugerencia de planificación derivada de la propuesta, no un cronograma ya aprobado.

### Fase 1 — Núcleo de identidad

- Registro e inicio de sesión.
- Perfil profesional.
- Registro manual de proyectos, habilidades y certificaciones.
- Carga o referencia de evidencias.
- Controles básicos de privacidad.

### Fase 2 — Asistente de IA

- Análisis inicial de evidencias seleccionadas.
- Generación de un perfil estructurado.
- Revisión, edición y aprobación por parte del usuario.
- Relación entre afirmaciones y evidencias disponibles.

### Fase 3 — Verificación

- Diseño del modelo de credenciales.
- Generación de hashes.
- Integración con una red y contratos seleccionados tras evaluación técnica.
- Página o mecanismo para verificar credenciales.
- Pruebas de seguridad, privacidad y costos.

### Fase 4 — Integraciones

- Integración inicial con GitHub.
- Evaluación de fuentes educativas y de portafolios.
- Gestión de permisos, tokens y revocación de acceso.
- Incorporación gradual de otras fuentes según disponibilidad.

### Fase 5 — Organizaciones y expansión

- API para verificación de credenciales.
- Herramientas para reclutadores.
- Validación del modelo de suscripción.
- Evaluación del marketplace freelance.
- Expansión a más categorías profesionales y países.

## 14. Cómo debe trabajar el agente de IA

Antes de ejecutar cambios importantes:

1. Identificar si la petición corresponde a producto, frontend, backend, IA, blockchain, seguridad, negocio o documentación.
2. Revisar el estado real del proyecto y los archivos disponibles, si existe un repositorio.
3. Separar los requisitos explícitos de las suposiciones.
4. Si falta una decisión importante, proponer opciones y explicar sus consecuencias en lugar de inventar una decisión previa.
5. Mantener coherencia con los principios de privacidad, portabilidad, verificabilidad y control del usuario.
6. Entregar cambios concretos, verificables y consistentes con la arquitectura real.
7. No afirmar que una función está implementada, probada o integrada si no se ha comprobado.
8. Cuando una afirmación dependa de información externa o cambiante, verificar fuentes actuales y citar las utilizadas.

## 15. Descripción breve reutilizable

**Aletheia es una plataforma de identidad profesional descentralizada que ayuda a freelancers, desarrolladores, diseñadores, gamers competitivos y creadores digitales a consolidar evidencias de sus habilidades desde distintas fuentes. La inteligencia artificial organiza esa evidencia en un perfil revisable por el usuario, y blockchain permite certificar y verificar registros seleccionados. El objetivo es que las personas puedan demostrar y compartir su reputación profesional de forma portable, con mayor control sobre sus datos y sin depender de una única plataforma.**
