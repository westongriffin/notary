// Collection: TransactionLog — append-only journal of notarial acts.
// Rows are owned by the member who created them (_owner). Core fields are
// immutable after insert (enforced in backend/data.js); only notes and
// contact details may be edited. Deletion is admin-only.

export default {
  _id: 'TransactionLog',
  displayName: 'Transaction Log',
  fields: [
    { key: 'entryNumber',   displayName: 'Entry #',            type: 'NUMBER' },
    { key: 'actDate',       displayName: 'Date / Time',        type: 'DATETIME' },
    { key: 'actType',       displayName: 'Act Type',           type: 'TEXT' },
    { key: 'clientName',    displayName: 'Client Name',        type: 'TEXT' },
    { key: 'clientAddress', displayName: 'Address',            type: 'TEXT' },
    { key: 'clientEmail',   displayName: 'Client Email',       type: 'TEXT' },
    { key: 'clientPhone',   displayName: 'Client Phone',       type: 'TEXT' },
    { key: 'idMethod',      displayName: 'ID Method',          type: 'TEXT' },
    { key: 'fee',           displayName: 'Fee',                type: 'NUMBER' },
    { key: 'documentDescription', displayName: 'Document Description', type: 'TEXT' },
    { key: 'notes',         displayName: 'Notes',              type: 'TEXT' },
    { key: 'voided',        displayName: 'Voided',             type: 'BOOLEAN' },
    { key: 'voidReason',    displayName: 'Void Reason',        type: 'TEXT' },
  ],
  permissions: {
    insert: 'SITE_MEMBER',
    read:   'SITE_MEMBER_AUTHOR',
    update: 'SITE_MEMBER_AUTHOR',
    remove: 'ADMIN',
  },
};
