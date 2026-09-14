// Collection: UserProfile — one row per site member (the notary).
// Stores credential document METADATA only; the files themselves live in
// Wix Media (uploaded via an Upload Button) and are referenced by URL.
//
// This object is the exact payload for wix-data.v2 collections.createDataCollection,
// and doubles as documentation for creating the collection by hand in the CMS.

export default {
  _id: 'UserProfile',
  displayName: 'User Profile',
  fields: [
    { key: 'displayName',   displayName: 'Display Name',       type: 'TEXT' },
    { key: 'businessName',  displayName: 'Business Name',      type: 'TEXT' },
    { key: 'email',         displayName: 'Email',              type: 'TEXT' },
    { key: 'phone',         displayName: 'Phone',              type: 'TEXT' },
    { key: 'commissionState', displayName: 'Commission State', type: 'TEXT' },
    { key: 'commissionNumber', displayName: 'Commission Number', type: 'TEXT' },

    // Array of credential objects; see backend/lib/credentials.js for the shape.
    { key: 'credentials',   displayName: 'Credentials',        type: 'ARRAY' },

    // Derived by hooks/job — never written directly by page code.
    { key: 'nextCredentialExpiry', displayName: 'Next Credential Expiry', type: 'DATETIME' },
    { key: 'credentialStatus',     displayName: 'Credential Status',      type: 'TEXT' },
  ],
  permissions: {
    insert: 'SITE_MEMBER',
    read:   'SITE_MEMBER_AUTHOR',
    update: 'SITE_MEMBER_AUTHOR',
    remove: 'ADMIN',
  },
};
