import { createLegalPageMarkup } from './legal-core.js';

const LEGAL_STORAGE_KEY = 'ptfuengirola-lang';
const legalRoot = document.getElementById('legal-root');

function getMainSiteUrl() {
  const mainUrl = new URL('../index.html', window.location.href);
  return `${mainUrl.origin}/`;
}

const contentByLang = {
  es: {
    pageTitle: 'Información Legal · Personal Trainer Fuengirola – Sorvali',
    nav: {
      home: 'Inicio',
      services: 'Servicios',
      about: 'Sobre mí',
      contact: 'Contacto',
      massage: 'Masaje Deportivo',
    },
    footer: {
      home: 'Página principal',
      legal: 'Información legal',
      studio: 'Web Fuengirola Studio',
    },
    legal: {
      appName: 'Personal Trainer Fuengirola – Sorvali',
      legalTitle: 'Información Legal',
      ownerName: 'Sofia Sorvali',
      ownerNif: {
        type: 'image',
        src: './assets/owner-nie.webp',
        width: 172,
        height: 58,
        alt: 'Documento identificativo',
      },
      ownerAddress: 'Calle Narciso 5',
      contactEmail: 'sport.massage.fuengirola@gmail.com',
      siteUrl: '[RELLENAR]',
      lastUpdated: 'mayo de 2026',
      labels: {
        updated: 'Última actualización',
        siteOwnerTitle: 'Titular del sitio web',
        ownerName: 'Nombre o razón social',
        ownerNif: 'NIF/CIF',
        ownerAddress: 'Domicilio',
        contactEmail: 'Email de contacto',
        siteUrl: 'Sitio web',
        purposeTitle: 'Objeto',
        purposeBody: 'Este sitio web ofrece información sobre los servicios y la actividad profesional de {appName}.',
        termsTitle: 'Condiciones de uso',
        termsBody1: 'El acceso a este sitio atribuye la condición de usuario e implica la aceptación de las condiciones de uso vigentes en cada momento.',
        termsBody2: 'La persona titular podrá actualizar, modificar o retirar contenidos y servicios del sitio web cuando lo considere necesario.',
        intellectualPropertyTitle: 'Propiedad intelectual e industrial',
        intellectualPropertyBody1: 'Los contenidos, textos, imágenes, diseño y demás elementos del sitio están protegidos por la normativa aplicable en materia de propiedad intelectual e industrial.',
        intellectualPropertyBody2: 'No se autoriza su reproducción, distribución o transformación sin permiso previo, salvo en los casos legalmente permitidos.',
        liabilityTitle: 'Responsabilidad',
        liabilityBody: 'La persona titular no se responsabiliza de un uso indebido de los contenidos del sitio ni de daños derivados del acceso o uso de la web cuando no le sean legalmente imputables.',
      },
      extraSections: [
        {
          title: 'Desarrollo y mantenimiento',
          paragraphs: ['Sitio web desarrollado y mantenido por Web Fuengirola Studio.'],
          link: { href: 'https://webfuengirola.com', label: 'https://webfuengirola.com' },
        },
      ],
    },
  },
  en: {
    pageTitle: 'Legal Information · Personal Trainer Fuengirola – Sorvali',
    nav: {
      home: 'Home',
      services: 'Services',
      about: 'About',
      contact: 'Contact',
      massage: 'Sports Massage',
    },
    footer: {
      home: 'Main page',
      legal: 'Legal information',
      studio: 'Web Fuengirola Studio',
    },
    legal: {
      appName: 'Personal Trainer Fuengirola – Sorvali',
      legalTitle: 'Legal Information',
      ownerName: 'Sofia Sorvali',
      ownerNif: {
        type: 'image',
        src: './assets/owner-nie.webp',
        width: 172,
        height: 58,
        alt: 'Identification document',
      },
      ownerAddress: 'Calle Narciso 5',
      contactEmail: 'sport.massage.fuengirola@gmail.com',
      siteUrl: '[RELLENAR]',
      lastUpdated: 'May 2026',
      labels: {
        updated: 'Last updated',
        siteOwnerTitle: 'Website owner',
        ownerName: 'Name or business name',
        ownerNif: 'Tax ID',
        ownerAddress: 'Postal address',
        contactEmail: 'Contact email',
        siteUrl: 'Website',
        purposeTitle: 'Purpose',
        purposeBody: 'This website provides information about the services and professional activity of {appName}.',
        termsTitle: 'Terms of use',
        termsBody1: 'Accessing this website grants the status of user and implies acceptance of the terms of use in force at any given time.',
        termsBody2: 'The owner may update, modify or remove website content and services whenever deemed necessary.',
        intellectualPropertyTitle: 'Intellectual and industrial property',
        intellectualPropertyBody1: 'The content, texts, images, design and other elements of this website are protected by the applicable intellectual and industrial property regulations.',
        intellectualPropertyBody2: 'Reproduction, distribution or transformation is not authorised without prior permission, except where legally permitted.',
        liabilityTitle: 'Liability',
        liabilityBody: 'The owner is not liable for improper use of the site contents or for damages arising from access to or use of the website when such damages are not legally attributable to the owner.',
      },
      extraSections: [
        {
          title: 'Development and maintenance',
          paragraphs: ['Website developed and maintained by Web Fuengirola Studio.'],
          link: { href: 'https://webfuengirola.com', label: 'https://webfuengirola.com' },
        },
      ],
    },
  },
  fi: {
    pageTitle: 'Lakisääteiset tiedot · Personal Trainer Fuengirola – Sorvali',
    nav: {
      home: 'Etusivu',
      services: 'Palvelut',
      about: 'Tietoa minusta',
      contact: 'Yhteystiedot',
      massage: 'Urheiluhieronta',
    },
    footer: {
      home: 'Pääsivu',
      legal: 'Lakisääteiset tiedot',
      studio: 'Web Fuengirola Studio',
    },
    legal: {
      appName: 'Personal Trainer Fuengirola – Sorvali',
      legalTitle: 'Lakisääteiset tiedot',
      ownerName: 'Sofia Sorvali',
      ownerNif: {
        type: 'image',
        src: './assets/owner-nie.webp',
        width: 172,
        height: 58,
        alt: 'Tunnisteasiakirja',
      },
      ownerAddress: 'Calle Narciso 5',
      contactEmail: 'sport.massage.fuengirola@gmail.com',
      siteUrl: '[RELLENAR]',
      lastUpdated: 'toukokuu 2026',
      labels: {
        updated: 'Päivitetty viimeksi',
        siteOwnerTitle: 'Verkkosivuston omistaja',
        ownerName: 'Nimi tai toiminimi',
        ownerNif: 'Verotunnus',
        ownerAddress: 'Postiosoite',
        contactEmail: 'Yhteyssähköposti',
        siteUrl: 'Verkkosivusto',
        purposeTitle: 'Tarkoitus',
        purposeBody: 'Tämä verkkosivusto tarjoaa tietoa {appName}-palveluista ja ammatillisesta toiminnasta.',
        termsTitle: 'Käyttöehdot',
        termsBody1: 'Tälle sivustolle siirtyminen antaa käyttäjän aseman ja merkitsee kulloinkin voimassa olevien käyttöehtojen hyväksymistä.',
        termsBody2: 'Sivuston omistaja voi päivittää, muuttaa tai poistaa sivuston sisältöä ja palveluita tarpeen mukaan.',
        intellectualPropertyTitle: 'Immateriaalioikeudet',
        intellectualPropertyBody1: 'Sivuston sisältö, tekstit, kuvat, muotoilu ja muut elementit on suojattu sovellettavalla immateriaalioikeuslainsäädännöllä.',
        intellectualPropertyBody2: 'Niiden kopiointi, jakelu tai muokkaus ei ole sallittua ilman ennakkolupaa, paitsi lain erikseen sallimissa tapauksissa.',
        liabilityTitle: 'Vastuu',
        liabilityBody: 'Omistaja ei vastaa sivuston sisällön väärinkäytöstä eikä vahingoista, jotka johtuvat sivustolle pääsystä tai sen käytöstä silloin, kun niitä ei voida oikeudellisesti lukea omistajan vastuulle.',
      },
      extraSections: [
        {
          title: 'Kehitys ja ylläpito',
          paragraphs: ['Verkkosivuston on kehittänyt ja sitä ylläpitää Web Fuengirola Studio.'],
          link: { href: 'https://webfuengirola.com', label: 'https://webfuengirola.com' },
        },
      ],
    },
  },
};

function getPreferredLang() {
  const urlLang = new URLSearchParams(window.location.search).get('lang');
  if (urlLang && contentByLang[urlLang]) {
    return urlLang;
  }

  const storedLang = window.localStorage.getItem(LEGAL_STORAGE_KEY);
  if (storedLang && contentByLang[storedLang]) {
    return storedLang;
  }

  return 'es';
}

function buildHomeUrl(lang, hash = '') {
  const url = new URL('../index.html', window.location.href);
  url.searchParams.set('lang', lang);
  url.hash = hash;
  return url.pathname + url.search + url.hash;
}

function updateHomeLinks(lang) {
  document.querySelectorAll('[data-home-link]').forEach((link) => {
    link.setAttribute('href', buildHomeUrl(lang));
  });

  document.querySelectorAll('[data-home-anchor]').forEach((link) => {
    link.setAttribute('href', buildHomeUrl(lang, link.dataset.homeAnchor));
  });
}

function updateStaticCopy(lang) {
  const copy = contentByLang[lang];
  document.title = copy.pageTitle;
  document.documentElement.lang = lang;
  document.querySelector('[data-key="logo-main"]').textContent = 'Personal Trainer';
  document.querySelector('[data-key="nav-home"]').textContent = copy.nav.home;
  document.querySelector('[data-key="nav-services"]').textContent = copy.nav.services;
  document.querySelector('[data-key="nav-about"]').textContent = copy.nav.about;
  document.querySelector('[data-key="nav-contact"]').textContent = copy.nav.contact;
  document.querySelector('[data-key="nav-massage"]').textContent = copy.nav.massage;
  document.querySelector('[data-key="footer-home"]').textContent = copy.footer.home;
  document.querySelector('[data-key="footer-legal"]').textContent = copy.footer.legal;
  document.querySelector('[data-key="footer-studio"]').textContent = copy.footer.studio;
}

function renderLegalContent(lang) {
  const copy = {
    ...contentByLang[lang].legal,
    siteUrl: {
      type: 'link',
      href: getMainSiteUrl(),
      label: getMainSiteUrl(),
    },
  };
  legalRoot.innerHTML = createLegalPageMarkup(copy);
}

function setActiveLang(lang) {
  document.querySelectorAll('.lang button').forEach((button) => {
    button.classList.toggle('active', button.dataset.lang === lang);
  });
}

function setLang(lang) {
  const safeLang = contentByLang[lang] ? lang : 'es';
  window.localStorage.setItem(LEGAL_STORAGE_KEY, safeLang);
  updateStaticCopy(safeLang);
  updateHomeLinks(safeLang);
  setActiveLang(safeLang);
  renderLegalContent(safeLang);

  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set('lang', safeLang);
  window.history.replaceState({}, '', `${nextUrl.pathname}${nextUrl.search}`);
}

try {
  const initialLang = getPreferredLang();
  document.querySelectorAll('.lang button').forEach((button) => {
    button.addEventListener('click', () => setLang(button.dataset.lang));
  });
  setLang(initialLang);
} catch (error) {
  console.error('No se pudo renderizar la página legal.', error);
  legalRoot.innerHTML = `
    <div class="legal-shell-error">
      <p>No se pudo cargar el contenido legal.</p>
      <p>Revisa la integración de <code>createLegalPageMarkup</code> en <code>/legal/legal-page.js</code>.</p>
    </div>
  `;
}
