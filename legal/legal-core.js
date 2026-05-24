// TODO: Sustituir este adaptador temporal por el módulo publicado del repo core.
// La interfaz se mantiene compatible con `createLegalPageMarkup(appConfig)`.

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderList(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return '';
  }

  return `<ul class="legal-list">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function renderFieldValue(value, options = {}) {
  if (value && typeof value === 'object' && value.type === 'image' && value.src) {
    const width = Number(value.width) > 0 ? ` width="${Number(value.width)}"` : '';
    const height = Number(value.height) > 0 ? ` height="${Number(value.height)}"` : '';
    const alt = escapeHtml(value.alt || options.fallbackAlt || 'Documento identificativo');

    return `<img class="legal-inline-image" src="${escapeHtml(value.src)}" alt="${alt}"${width}${height} loading="eager" decoding="async">`;
  }

  return escapeHtml(value);
}

function renderExtraSections(extraSections = []) {
  if (!Array.isArray(extraSections) || extraSections.length === 0) {
    return '';
  }

  return extraSections.map((section) => {
    const title = escapeHtml(section?.title || '');
    const paragraphs = Array.isArray(section?.paragraphs)
      ? section.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')
      : '';
    const list = renderList(section?.items);
    const link = section?.link?.href
      ? `<p><a href="${escapeHtml(section.link.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(section.link.label || section.link.href)}</a></p>`
      : '';

    return `
      <section class="legal-section">
        <h2>${title}</h2>
        ${paragraphs}
        ${list}
        ${link}
      </section>
    `;
  }).join('');
}

export function createLegalPageMarkup(appConfig) {
  const {
    appName,
    legalTitle,
    ownerName,
    ownerNif,
    ownerAddress,
    contactEmail,
    siteUrl,
    lastUpdated,
    extraSections = [],
    labels = {},
  } = appConfig;

  const copy = {
    updated: labels.updated || 'Última actualización',
    siteOwnerTitle: labels.siteOwnerTitle || 'Titular del sitio web',
    ownerName: labels.ownerName || 'Nombre o razón social',
    ownerNif: labels.ownerNif || 'NIF/CIF',
    ownerAddress: labels.ownerAddress || 'Domicilio',
    contactEmail: labels.contactEmail || 'Email de contacto',
    siteUrl: labels.siteUrl || 'Sitio web',
    purposeTitle: labels.purposeTitle || 'Objeto',
    purposeBody: (labels.purposeBody || 'Este sitio web ofrece información sobre los servicios y la actividad profesional de {appName}.').replace('{appName}', appName),
    termsTitle: labels.termsTitle || 'Condiciones de uso',
    termsBody1: labels.termsBody1 || 'El acceso a este sitio atribuye la condición de usuario e implica la aceptación de las condiciones de uso vigentes en cada momento.',
    termsBody2: labels.termsBody2 || 'La persona titular podrá actualizar, modificar o retirar contenidos y servicios del sitio web cuando lo considere necesario.',
    intellectualPropertyTitle: labels.intellectualPropertyTitle || 'Propiedad intelectual e industrial',
    intellectualPropertyBody1: labels.intellectualPropertyBody1 || 'Los contenidos, textos, imágenes, diseño y demás elementos del sitio están protegidos por la normativa aplicable en materia de propiedad intelectual e industrial.',
    intellectualPropertyBody2: labels.intellectualPropertyBody2 || 'No se autoriza su reproducción, distribución o transformación sin permiso previo, salvo en los casos legalmente permitidos.',
    liabilityTitle: labels.liabilityTitle || 'Responsabilidad',
    liabilityBody: labels.liabilityBody || 'La persona titular no se responsabiliza de un uso indebido de los contenidos del sitio ni de daños derivados del acceso o uso de la web cuando no le sean legalmente imputables.',
  };

  return `
    <main class="legal-wrap">
      <div class="legal-intro">
        <p class="legal-kicker">${escapeHtml(appName)}</p>
        <h1>${escapeHtml(legalTitle)}</h1>
        <p class="legal-updated">${escapeHtml(copy.updated)}: ${escapeHtml(lastUpdated)}</p>
      </div>

      <section class="legal-section">
        <h2>${escapeHtml(copy.siteOwnerTitle)}</h2>
        <dl class="legal-meta">
          <div><dt>${escapeHtml(copy.ownerName)}</dt><dd>${renderFieldValue(ownerName)}</dd></div>
          <div><dt>${escapeHtml(copy.ownerNif)}</dt><dd>${renderFieldValue(ownerNif, { fallbackAlt: copy.ownerNif })}</dd></div>
          <div><dt>${escapeHtml(copy.ownerAddress)}</dt><dd>${renderFieldValue(ownerAddress)}</dd></div>
          <div><dt>${escapeHtml(copy.contactEmail)}</dt><dd>${renderFieldValue(contactEmail)}</dd></div>
          <div><dt>${escapeHtml(copy.siteUrl)}</dt><dd>${renderFieldValue(siteUrl)}</dd></div>
        </dl>
      </section>

      <section class="legal-section">
        <h2>${escapeHtml(copy.purposeTitle)}</h2>
        <p>${escapeHtml(copy.purposeBody)}</p>
      </section>

      <section class="legal-section">
        <h2>${escapeHtml(copy.termsTitle)}</h2>
        <p>${escapeHtml(copy.termsBody1)}</p>
        <p>${escapeHtml(copy.termsBody2)}</p>
      </section>

      <section class="legal-section">
        <h2>${escapeHtml(copy.intellectualPropertyTitle)}</h2>
        <p>${escapeHtml(copy.intellectualPropertyBody1)}</p>
        <p>${escapeHtml(copy.intellectualPropertyBody2)}</p>
      </section>

      <section class="legal-section">
        <h2>${escapeHtml(copy.liabilityTitle)}</h2>
        <p>${escapeHtml(copy.liabilityBody)}</p>
      </section>
      ${renderExtraSections(extraSections)}
    </main>
  `;
}
