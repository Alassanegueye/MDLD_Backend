'use strict'

const { ValidationError } = require('../errors/AppError')

/**
 * Validation Joi d'une partie de la requête.
 *
 * abortEarly:false  -> on renvoie TOUTES les erreurs d'un formulaire d'un coup.
 * stripUnknown:true -> les champs non déclarés sont retirés (un client ne
 *                      doit pas pouvoir injecter `role: "admin"` dans un POST).
 * convert:true      -> « 3 » devient 3, indispensable pour les query params.
 *
 * ATTENTION : stripUnknown supprime aussi les query params non déclarés.
 * Tout filtre (`recherche`, `statut`, `page`…) doit figurer dans le schéma,
 * sinon il disparaît silencieusement et la liste ignore le filtre.
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    })

    if (error) {
      const details = error.details.map((d) => ({
        champ: d.path.join('.'),
        message: d.message,
      }))
      return next(new ValidationError('Données invalides', details))
    }

    // Express 5 : req.query est un getter, une simple affectation est ignorée.
    // On redéfinit donc la propriété, sinon la valeur validée est perdue.
    if (source === 'query') {
      Object.defineProperty(req, 'query', { value, writable: true, configurable: true })
    } else {
      req[source] = value
    }
    return next()
  }
}

module.exports = validate
