import UserProfile from 'backend/schemas/UserProfile.js';
import TransactionLog from 'backend/schemas/TransactionLog.js';
import DocumentStatus from 'backend/schemas/DocumentStatus.js';

// Order matters: DocumentStatus references TransactionLog, so it comes last.
export const SCHEMAS = [UserProfile, TransactionLog, DocumentStatus];

export { UserProfile, TransactionLog, DocumentStatus };
