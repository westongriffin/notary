# Wiring the dashboard page to the backend

Wix generates the page file (`src/pages/Dashboard.<id>.js`) when you add a
page named "Dashboard" in the Editor. Below is the code that goes in it.
Element IDs (`#txForm`, `#feeInput`, …) are whatever you name them in the
Editor's Properties panel.

## Log a transaction

```js
import { logTransaction, listTransactions } from 'backend/dashboard.web';
import { ACT_TYPES, ID_METHODS } from 'public/constants.js';

$w.onReady(() => {
  $w('#actTypeDropdown').options = ACT_TYPES.map((v) => ({ label: v, value: v }));
  $w('#idMethodDropdown').options = ID_METHODS.map((v) => ({ label: v, value: v }));

  $w('#logButton').onClick(async () => {
    try {
      await logTransaction({
        actDate: $w('#actDatePicker').value,
        actType: $w('#actTypeDropdown').value,
        clientName: $w('#clientNameInput').value,
        clientAddress: $w('#clientAddressInput').value,
        idMethod: $w('#idMethodDropdown').value,
        fee: Number($w('#feeInput').value),
        notes: $w('#notesInput').value,
      });
      await refreshTable();
    } catch (e) {
      // Hook ValidationErrors surface here with a readable message.
      $w('#errorText').text = e.message;
      $w('#errorText').show();
    }
  });

  refreshTable();
});

async function refreshTable() {
  const { items } = await listTransactions({ limit: 50 });
  $w('#txTable').rows = items.map((t) => ({
    entryNumber: t.entryNumber,
    actDate: t.actDate.toLocaleString(),
    actType: t.actType,
    clientName: t.clientName,
    fee: `$${t.fee.toFixed(2)}`,
  }));
}
```

## Upload a credential document

```js
import { addCredential } from 'backend/dashboard.web';

$w('#uploadCredentialButton').onClick(async () => {
  const [file] = await $w('#credentialUpload').uploadFiles(); // Upload Button element
  await addCredential({
    type: $w('#credentialTypeDropdown').value,   // one of CREDENTIAL_TYPES
    label: $w('#credentialLabelInput').value,
    fileUrl: file.fileUrl,                        // wix:document://... URL
    fileName: file.originalFileName,
    expiresAt: $w('#credentialExpiryPicker').value,
  });
});
```

## Move a document through its statuses

```js
import { setDocumentStatus } from 'backend/dashboard.web';
import { DOC_STATUS } from 'public/constants.js';

$w('#markPendingButton').onClick(() =>
  setDocumentStatus($w('#docRepeater').selectedItem._id, DOC_STATUS.PENDING_SIGNATURE)
);
```

## Show the summary tiles

```js
import { getDashboardSummary } from 'backend/dashboard.web';

$w.onReady(async () => {
  const s = await getDashboardSummary();
  $w('#txCount').text = String(s.transactions);
  $w('#pendingCount').text = String(s.documents.pending);
  $w('#credentialBadge').text = s.credentialStatus.toUpperCase();
});
```

## Notes

- Dates from Date Pickers are JavaScript `Date` objects; pass them through
  unchanged. Hooks reject future `actDate` values.
- All web methods throw on validation failure. Catch and display `e.message`.
- Never call `wixData` directly from page code for these collections; go
  through `backend/dashboard.web.js` so the allow-listed fields apply.
