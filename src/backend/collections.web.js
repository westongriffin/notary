// One-time provisioning of the three CMS collections from src/backend/schemas.
// Admin-only. Run it once from the Wix dashboard (Site Monitoring > Logs will
// show output) or from a temporary admin page:
//
//   import { provisionCollections } from 'backend/collections.web';
//   const report = await provisionCollections();
//
// Safe to re-run: existing collections are left untouched and reported as
// "exists". If your Wix plan or API version rejects a field type, create that
// collection by hand in the CMS using the same keys/types from the schema file.

import { Permissions, webMethod } from 'wix-web-module';
import { collections } from 'wix-data.v2';
import { elevate } from 'wix-auth';
import { SCHEMAS } from 'backend/schemas/index.js';

const getCollection = elevate(collections.getDataCollection);
const createCollection = elevate(collections.createDataCollection);

export const provisionCollections = webMethod(Permissions.Admin, async () => {
  const report = [];
  for (const schema of SCHEMAS) {
    try {
      await getCollection(schema._id);
      report.push({ id: schema._id, result: 'exists' });
      continue;
    } catch (e) {
      // Not found -> create below. Any other error should surface.
      if (!isNotFound(e)) throw e;
    }
    await createCollection(schema);
    report.push({ id: schema._id, result: 'created' });
  }
  console.log('[provisionCollections]', JSON.stringify(report));
  return report;
});

export const listCollections = webMethod(Permissions.Admin, async () => {
  const listAll = elevate(collections.listDataCollections);
  const res = await listAll();
  return (res.collections || []).map((c) => ({
    id: c._id,
    displayName: c.displayName,
    fields: (c.fields || []).map((f) => `${f.key}:${f.type}`),
  }));
});

function isNotFound(e) {
  const msg = String((e && (e.message || e.details || e)) || '').toLowerCase();
  return msg.includes('not_found') || msg.includes('not found') || msg.includes('404');
}
