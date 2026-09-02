# Integration Testing Guide

This directory contains (or will contain) integration tests that run against live Google API endpoints.

## Prerequisites for Integration Testing

1. **Test Google Account:** Do NOT use a personal or production Google account for these tests. Create a dedicated test account.
2. **Environment Variables:** You must configure a `.env.test` file with:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REFRESH_TOKEN` (Generate this once manually using the `npm run auth` script).
3. **Test Document:** Create an empty Google Doc with your test account and note the `DOCUMENT_ID` for docs testing.

## Running Integration Tests
Currently, these tests are designed to be run manually or as part of a secure CI pipeline where secrets can be injected. 

To execute them when added, use:
```bash
npm run test:integration
```

> [!WARNING]
> Ensure you are not pointing your `GOOGLE_REFRESH_TOKEN` to a production account that contains sensitive data, as the tests will create drafts, send emails, and append content to documents.
