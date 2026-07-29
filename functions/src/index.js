const { validateLicense } = require('./validateLicense')
const { registerInstallation } = require('./registerInstallation')
const { activateUser } = require('./activateUser')
const { checkActivation } = require('./checkActivation')
const { listTeamUsers, inviteTeamUser, updateTeamUser, deleteTeamUser, resendActivationLink } = require('./team')

module.exports = {
  validateLicense,
  registerInstallation,
  activateUser,
  checkActivation,
  listTeamUsers,
  inviteTeamUser,
  updateTeamUser,
  deleteTeamUser,
  resendActivationLink,
}
