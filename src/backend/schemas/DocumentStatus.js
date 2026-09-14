// Collection: DocumentStatus — tracks each document through
// Draft -> Pending Signature -> Completed. Optionally links to the
// TransactionLog entry it was notarized under.

export default {
  _id: 'DocumentStatus',
  displayName: 'Document Status',
  fields: [
    { key: 'title',        displayName: 'Title',            type: 'TEXT' },
    { key: 'status',       displayName: 'Status',           type: 'TEXT' },
    {
      key: 'transaction',
      displayName: 'Transaction',
      type: 'REFERENCE',
      typeMetadata: { reference: { referencedCollectionId: 'TransactionLog' } },
    },
    { key: 'fileUrl',      displayName: 'File URL',         type: 'URL' },
    { key: 'fileName',     displayName: 'File Name',        type: 'TEXT' },
    { key: 'clientName',   displayName: 'Client Name',      type: 'TEXT' },
    { key: 'notes',        displayName: 'Notes',            type: 'TEXT' },

    // Maintained by hooks — never written directly by page code.
    { key: 'statusHistory',    displayName: 'Status History',     type: 'ARRAY' },
    { key: 'lastStatusChange', displayName: 'Last Status Change', type: 'DATETIME' },
    { key: 'completedAt',      displayName: 'Completed At',       type: 'DATETIME' },
  ],
  permissions: {
    insert: 'SITE_MEMBER',
    read:   'SITE_MEMBER_AUTHOR',
    update: 'SITE_MEMBER_AUTHOR',
    remove: 'SITE_MEMBER_AUTHOR',
  },
};
