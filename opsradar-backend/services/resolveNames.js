const { Country } = require('../models/country');
const { Application } = require('../models/application');
const { Server } = require('../models/server');
const { UserGroup } = require('../models/user_group');

async function getServerIdByName(server_name) {
  const server = await Server.findOne({ where: { server_name } });
  if (!server) throw new Error(`Server not found: ${server_name}`);
  return server.server_id;
}

async function getAppIdByName(app_name) {
  const app = await Application.findOne({ where: { app_name } });
  if (!app) throw new Error(`Application not found: ${app_name}`);
  return app.app_id;
}

async function getGroupIdByName(group_name) {
  const group = await UserGroup.findOne({ where: { group_name } });
  if (!group) throw new Error(`Group not found: ${group_name}`);
  return group.group_id;
}

async function getCountryIdByName(country_name) {
  const country = await Country.findOne({ where: { country_name } });
  if (!country) throw new Error(`Country not found: ${country_name}`);
  return country.country_id;
}

module.exports = {
  getServerIdByName,
  getAppIdByName,
  getGroupIdByName,
  getCountryIdByName
};
