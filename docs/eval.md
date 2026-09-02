# Evaluation Plan: mcp-google-server

This document defines the evaluation criteria and metrics for assessing the functionality, reliability, and security of the `mcp-google-server`. It is designed to ensure the MCP tools behave predictably when utilized by LLM-powered AI agents.

---

## 1. Functional Correctness Evaluation

These tests evaluate whether the AI agent can successfully interact with the tools and achieve the desired outcome.

### 1.1 Gmail Tool (`gmail_create_draft`, `gmail_send_email`)
* **Simple Email Generation:** 
  * **Test:** Agent sends an email to a single recipient with a plain text body.
  * **Success Criteria:** Email appears in the Sent/Drafts folder with correct `To`, `Subject`, and `Body`.
* **Complex Email Generation:**
  * **Test:** Agent sends an HTML email with CC/BCC fields and a small Base64-encoded text attachment.
  * **Success Criteria:** HTML is parsed correctly by email clients, CC/BCC are populated, and the attachment is downloadable and intact.
* **Error Handling - Invalid Inputs:**
  * **Test:** Agent provides a malformed email address or misses required parameters.
  * **Success Criteria:** The server returns a structured error payload to the agent (not a raw stack trace) that allows the agent to self-correct and retry.

### 1.2 Google Docs Tool (`google_docs_append_content`)
* **Sequential Block Insertion:**
  * **Test:** Agent appends 3 blocks of text (a `TITLE`, a `NORMAL_TEXT` paragraph, and an italicized `HEADING_2`).
  * **Success Criteria:** The Google Doc reflects the exact requested formatting and order without index shifting issues.
* **Error Handling - Invalid Document:**
  * **Test:** Agent provides a fake `documentId`.
  * **Success Criteria:** Agent receives a clear "Document not found or access denied" error.

---

## 2. Agent-System Interaction Evaluation (UX for LLMs)

Since the "user" of this API is an AI agent, we evaluate how well the agent understands the tool schema.

* **Schema Clarity:**
  * **Metric:** Zero-shot success rate. How often does an agent correctly format a `google_docs_append_content` payload on its very first try without syntax errors?
  * **Success Criteria:** > 95% zero-shot success rate.
* **Self-Correction Rate:**
  * **Metric:** When an agent receives an error (e.g., "Attachment payload too large"), can it understand the error message and successfully try an alternative (e.g., summarizing the attachment instead)?
  * **Success Criteria:** The error messages must be semantically rich enough to prompt automated recovery.

---

## 3. Performance & Load Evaluation

* **Latency (End-to-End):**
  * **Metric:** Time from the agent's MCP tool call invocation to the receipt of the success response.
  * **Target:** < 1.5 seconds for plain text emails/docs; < 3 seconds for payloads with attachments.
* **Concurrency Handling:**
  * **Test:** Trigger 10 simultaneous `gmail_create_draft` requests.
  * **Target:** All 10 drafts are created. The server handles token refreshes without race conditions, and Google APIs do not throw `429 Too Many Requests`.
* **Memory Profiling (SSE Leak Test):**
  * **Test:** Connect and abruptly disconnect 100 mock MCP clients without sending proper FIN packets.
  * **Target:** Server garbage collects the severed `SSEServerTransport` instances within 60 seconds; no linear memory growth observed.

---

## 4. Security & Safety Evaluation

* **PII Leakage Prevention:**
  * **Test:** Trigger a deliberate crash in the Gmail/Docs service (e.g., by mocking a Google API internal error).
  * **Target:** The `winston` logger and the MCP error response to the agent **must not** contain the original email body, recipient emails, or OAuth tokens in the stack trace.
* **Scope Minimization:**
  * **Test:** Attempt to read an email from the inbox using the current OAuth token.
  * **Target:** Must fail with `403 Forbidden`. The OAuth token should strictly only have `gmail.send`, `gmail.compose`, and `documents` scopes as defined in `OAuthService`.
