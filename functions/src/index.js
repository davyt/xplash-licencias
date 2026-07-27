const { validateLicense } = require('./validateLicense')
const { registerInstallation } = require('./registerInstallation')
const { activateUser } = require('./activateUser')
const { checkActivation } = require('./checkActivation')

module.exports = { validateLicense, registerInstallation, activateUser, checkActivation }
