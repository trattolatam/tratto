# Política de moderación de reseñas — Documento interno

Este documento es para uso interno del equipo de moderación de Tratto. Define criterios concretos para aprobar, rechazar o reportar reseñas. La versión pública y resumida de estas normas está en `/normas-comunidad`.

---

## 1. Flujo de moderación

```
Reseña creada
   ↓
¿Tiene comprobante adjunto?
   ↓                           ↓
  SÍ                           NO
   ↓                           ↓
Revisión de comprobante    Revisión de contenido
   ↓                           ↓
¿Comprobante válido?       ¿Cumple normas?
   ↓           ↓               ↓        ↓
 APROBAR    RECHAZAR        APROBAR   RECHAZAR
(verificada) (con motivo)              (con motivo)
```

**SLA objetivo:** revisar el 100% de reseñas pendientes en menos de 24 horas.

---

## 2. Criterios para APROBAR una reseña

Una reseña se aprueba si cumple **todos** estos puntos:

- [ ] Describe una experiencia concreta con la empresa (no es genérica tipo "buen servicio")
- [ ] Tiene al menos 20 caracteres de contenido sustancial
- [ ] No contiene insultos, lenguaje de odio o discriminación
- [ ] No incluye datos personales de terceros (teléfonos, direcciones, nombres de empleados específicos)
- [ ] No es claramente promocional ni contiene links externos
- [ ] No es un duplicado de otra reseña del mismo usuario para la misma empresa

**Si tiene comprobante adjunto, además:**
- [ ] El comprobante es legible
- [ ] El nombre de la empresa en el comprobante coincide (o es razonablemente similar) al nombre de la empresa reseñada
- [ ] La fecha del comprobante es coherente con cuando se dice que ocurrió el servicio
- [ ] No hay señales visuales de edición/Photoshop (fuentes inconsistentes, alineación rara, colores de fondo distintos)

---

## 3. Criterios para RECHAZAR una reseña

Rechazar inmediatamente si se detecta **cualquiera** de estos puntos:

| Motivo | Cómo detectarlo |
|---|---|
| Comprobante falsificado | Edición visible, formato inconsistente con comprobantes reales del rubro/país |
| Lenguaje ofensivo | Insultos directos, lenguaje de odio, discriminación |
| Sin relación con el servicio | Habla de otra cosa, queja genérica sin contexto |
| Conflicto de interés declarado o evidente | El usuario menciona ser empleado, ex-empleado o competidor |
| Extorsión | Menciona condicionar la reseña a un reembolso o beneficio |
| Datos personales de terceros | Nombre completo + dato identificable de un empleado específico |
| Reseña duplicada | Mismo usuario, misma empresa, ya existe una reseña activa |
| Contenido promocional | Menciona otro negocio, incluye links, cupones o códigos de descuento |

**Al rechazar, siempre completar el campo de nota de moderación** explicando el motivo — esto se usa si el usuario apela la decisión.

---

## 4. Casos grises — usar criterio

Estos casos no son automáticos, requieren juicio:

**Reseña muy negativa pero sin insultos directos**
→ Aprobar. Una reseña negativa honesta y bien fundamentada es válida aunque sea dura, siempre que no cruce a insulto personal.

**Comprobante de un monto distinto al mencionado en el texto**
→ Revisar con atención. Pequeñas diferencias (impuestos, redondeo) son aceptables. Diferencias grandes son señal de alerta — contactar al usuario antes de rechazar.

**Usuario nuevo (cuenta de menos de 24hs) con reseña muy elogiosa**
→ Aprobar si tiene comprobante válido. Sin comprobante, aplicar más escrutinio — podría ser una reseña plantada por la propia empresa.

**Reseña en otro idioma (portugués, inglés)**
→ Aprobar si cumple el resto de los criterios. No traducir automáticamente, mostrar en el idioma original.

**Empresa reporta una reseña negativa real alegando que es falsa**
→ No eliminar solo por el reclamo de la empresa. Pedir evidencia concreta de por qué creen que es falsa. La carga de la prueba de que es falsa es de quien reclama, no de quien reseñó.

---

## 5. Detección de fraude organizado

Señales de que una empresa está fabricando reseñas falsas a su favor:

- Múltiples reseñas 5 estrellas en un período de horas, todas sin comprobante
- Usuarios creados el mismo día que dejan una sola reseña y nunca vuelven a usar la cuenta
- Texto de las reseñas con frases muy similares entre sí (mismo "estilo de escritura" repetido)
- Todas las reseñas mencionan beneficios genéricos sin detalle específico del servicio

**Acción:** marcar todas las reseñas sospechosas como pendientes de revisión adicional, no aprobar en bloque. Si se confirma el patrón, suspender la empresa y notificar.

Señales de que un competidor está dejando reseñas negativas falsas:

- Cuenta nueva, una sola reseña negativa, sin comprobante
- El texto no menciona detalles específicos verificables del servicio
- Patrón de varias reseñas negativas similares en empresas del mismo rubro y zona en poco tiempo

**Acción:** mismo tratamiento — revisión adicional antes de aprobar, no rechazo ni aprobación automática.

---

## 6. Apelaciones

Si un usuario o empresa apela una decisión de moderación:

1. Revisar la nota de moderación original
2. Si el usuario aporta evidencia nueva (ej: comprobante adicional), reevaluar
3. Responder la apelación en menos de 48hs
4. La decisión final de un admin senior es inapelable

---

## 7. Registro de decisiones

Todas las decisiones de moderación quedan registradas en la tabla `Review` con:
- `moderatedById` — quién tomó la decisión
- `moderatedAt` — cuándo
- `moderationNote` — por qué

Esto permite auditar patrones de moderación y detectar sesgos o errores sistemáticos.
