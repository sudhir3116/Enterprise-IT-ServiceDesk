import api from './api';

export async function getCurrentOrganization() {
  const res = await api.get('/organization/current');
  return res.data;
}

export async function updateCurrentOrganization(data) {
  const res = await api.put('/organization/current', data);
  return res.data;
}

export async function createOrganization(data) {
  const res = await api.post('/organization', data);
  return res.data;
}

export async function getAllOrganizations() {
  const res = await api.get('/organization/all');
  return res.data;
}
