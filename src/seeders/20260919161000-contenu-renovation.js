'use strict'

const crypto = require('crypto')

/**
 * Contenu initial de la page rénovation.
 *
 * Ne sont semés que les chiffres officiels de la brochure : les quatre
 * estimations de chantier, dont la somme fait l'objectif de 200 000 000
 * FCFA. Tout le reste part à zéro ou à vide.
 *
 * Aucun numéro de paiement n'est écrit ici : les « 123-456-7890 » qui
 * traînaient dans le code étaient des marque-pages de maquette, et un faux
 * numéro affiché sur une page de collecte est pire qu'un champ vide.
 * L'équipe les saisit depuis le dashboard.
 *
 * Aucune image non plus : elles se téléversent depuis le dashboard, ce qui
 * évite qu'un visuel vive à deux endroits (dépôt du front + base).
 */
const CHANTIERS = [
  {
    code: 'PROJET A',
    titre: 'Rénovations Structurelles',
    badge: 'Priorité 1 · Sauvegarde Urgente',
    resume:
      'Renforcement du squelette en béton haute résistance et d’acier marin, sécurisation des deux minarets de 45 mètres et de la coupole centrale.',
    travaux: [
      'Renforcement de la structure en béton marin',
      'Renforcement de la structure en fer et passivation des armatures',
      'Sécurisation des minarets de 45 m et de la coupole',
    ],
    estimation: 123000000,
    couleur: '#C11616',
    icone: 'HardHat',
    ordre: 1,
  },
  {
    code: 'PROJET B',
    titre: 'Toilettes & Sanitaires Modernes',
    badge: 'Confort & Salubrité des Fidèles',
    resume:
      'Édification de blocs sanitaires modernes et d’espaces d’ablutions carrelés répartis sur deux niveaux indépendants.',
    travaux: [
      'Rez-de-chaussée moderne aménagé pour les hommes',
      'Premier étage indépendant dédié pour les femmes',
      'Raccordement assainissement étanche et robinetterie hydro-économe',
    ],
    estimation: 52000000,
    couleur: '#0e4b50',
    icone: 'Building2',
    ordre: 2,
  },
  {
    code: 'PROJET C',
    titre: 'Électricité & Énergie Solaire',
    badge: 'Autonomie & Transition Énergétique',
    resume:
      'Remise aux normes intégrale des réseaux électriques et installation d’une centrale solaire photovoltaïque pour la mosquée et ses abords.',
    travaux: [
      'Installation de nouveaux circuits électriques sécurisés',
      'Éclairage architectural de la mosquée et des environs',
      'Installation de panneaux solaires photovoltaïques haute efficacité',
    ],
    estimation: 10000000,
    couleur: '#b78103',
    icone: 'Zap',
    ordre: 3,
  },
  {
    code: 'PROJET D',
    titre: 'Sonorisation & Sauvegarde',
    badge: 'Acoustique & Mémoire Numérique',
    resume:
      'Équipement acoustique haute fidélité tropicalisé résistant aux embruns marins, régie audio couplée au solaire et numérisation des prêches.',
    travaux: [
      'Système de sonorisation performante pour minarets et esplanade',
      'Intégration du système à l’énergie Solaire',
      'Sauvegarde numérique des données et des archives des prêches',
    ],
    estimation: 15000000,
    couleur: '#167078',
    icone: 'Volume2',
    ordre: 4,
  },
]

const RESPONSABLES = [
  {
    nom: 'Mouhamed Naby Gueye',
    roleTitre: 'Actuel Khalif du Mouvement Naby-Allah',
    responsabilite: 'Autorité Morale & Haut Patronage Spirituel',
    bio: 'Mouhamed Naby Gueye est le fils aîné et Khalif de Mouhamed Seyni Gueye, Bâtisseur de la Mosquée de la Divinité. Sous son Khalifa, d’importants travaux ont déjà été réalisés à la mosquée. Il assure le haut patronage et la supervision globale de ce grand chantier de rénovation.',
    ordre: 1,
  },
  {
    nom: 'Ababacar Sadikh Ndoye',
    roleTitre: 'Président du Mouvement Naby-Allah',
    responsabilite: 'Responsable Technique des Travaux & Ingénieur',
    bio: 'Ababacar Sadikh Ndoye est un ingénieur en télécommunications. Il a été le bras droit de Mouhamed Seyni Gueye lors de la construction de la mosquée en 1992. Il dirige la commission technique, valide les devis d’ingénierie et pilote l’exécution des 4 chantiers.',
    ordre: 2,
  },
  {
    nom: 'Cheikh Ahmet Tidiane Gueye',
    roleTitre: 'Responsable de la Communication',
    responsabilite: 'Consultant International & Relations Mécènes',
    bio: 'Cheikh Ahmet Tidiane Gueye est un consultant international en communication. Il est en charge de la communication du Mouvement Naby-Allah depuis plusieurs années. Il supervise la campagne de mobilisation des dons, les relations médias et les partenariats institutionnels.',
    ordre: 3,
  },
]

const MOYENS = [
  {
    nom: 'Compte PAMECAS',
    categorie: 'Virement / Versement bancaire',
    description: 'Compte officiel ouvert auprès de l’institution financière PAMECAS.',
    libelleBouton: 'Détails du compte',
    couleur: '#0e4b50',
    ordre: 1,
  },
  {
    nom: 'Wave Sénégal',
    categorie: 'Mobile Money direct',
    description: 'Transfert instantané sans frais via l’application Wave.',
    libelleBouton: 'Contribuer via Wave',
    couleur: '#1DC1F2',
    ordre: 2,
  },
  {
    nom: 'Orange Money',
    categorie: 'Paiement & USSD',
    description: 'Transfert marchand ou validation rapide par code USSD.',
    libelleBouton: 'Contribuer via Orange Money',
    couleur: '#FF7900',
    ordre: 3,
  },
  {
    nom: 'Don en Nature',
    categorie: 'Matériaux & équipements',
    description: 'Ciment marin, fer, sanitaires, câbles solaires, sonorisation.',
    libelleBouton: 'Donner des matériaux',
    typeAction: 'nature',
    couleur: '#C11616',
    ordre: 4,
  },
]

module.exports = {
  async up(queryInterface) {
    const maintenant = new Date()
    const commun = { createdAt: maintenant, updatedAt: maintenant }

    // L'objectif est la somme des estimations, jamais un nombre saisi à
    // part : les deux finiraient par diverger dès la première révision
    // d'un devis. Il reste modifiable depuis le dashboard.
    const objectif = CHANTIERS.reduce((total, c) => total + c.estimation, 0)

    await queryInterface.bulkInsert('campagnes', [
      {
        id: crypto.randomUUID(),
        titre: 'Ensemble, rénovons la Maison de Dieu',
        objectif,
        // Compteur à zéro : la collecte est mise à jour depuis le dashboard
        // au fur et à mesure des versements réellement encaissés.
        collecte: 0,
        devise: 'FCFA',
        imageHero: null,
        actif: true,
        ...commun,
      },
    ])

    await queryInterface.bulkInsert(
      'chantiers',
      CHANTIERS.map((c) => ({
        id: crypto.randomUUID(),
        code: c.code,
        titre: c.titre,
        badge: c.badge,
        resume: c.resume,
        travaux: JSON.stringify(c.travaux),
        estimation: c.estimation,
        collecte: 0,
        image: null,
        couleur: c.couleur,
        icone: c.icone,
        ordre: c.ordre,
        actif: true,
        ...commun,
      }))
    )

    await queryInterface.bulkInsert(
      'responsables',
      RESPONSABLES.map((r) => ({
        id: crypto.randomUUID(),
        nom: r.nom,
        roleTitre: r.roleTitre,
        responsabilite: r.responsabilite,
        bio: r.bio,
        image: null,
        ordre: r.ordre,
        actif: true,
        ...commun,
      }))
    )

    await queryInterface.bulkInsert(
      'moyens_paiement',
      MOYENS.map((m) => ({
        id: crypto.randomUUID(),
        nom: m.nom,
        categorie: m.categorie,
        description: m.description,
        // Numéro laissé vide : à saisir dans le dashboard.
        numero: null,
        logo: null,
        libelleBouton: m.libelleBouton,
        typeAction: m.typeAction || 'don',
        couleur: m.couleur,
        ordre: m.ordre,
        actif: true,
        ...commun,
      }))
    )
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('moyens_paiement', null, {})
    await queryInterface.bulkDelete('responsables', null, {})
    await queryInterface.bulkDelete('chantiers', null, {})
    await queryInterface.bulkDelete('campagnes', null, {})
  },
}
