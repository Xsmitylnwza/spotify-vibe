# G-P1-S2 Fast Review: Server Persistence Change

**Summary**  
No data-loss or state-inconsistency issues found in the P1-S2 persistence changes. All write paths are atomic with verified backups and failure cleanup. Unknown fields are dropped on validation (legacy slots preserved). Override expiry retry is bounded and reschedules cleanly. Tests cover boundary failures. No edits or app runs performed.

## Answers

1. **No**  
   File: `scripts/local-config-store.mjs:18-29`  
   ```js
   export async function atomicWriteJson(...) {
     ...
     try {
       await fs.writeFile(temporaryPath, ...);
       await fs.rename(temporaryPath, filePath);
     } finally {
       await fs.rm(temporaryPath, { force: true }).catch(() => undefined);
     }
   }
   ```
   Scenario: rename or rm cleanup fails; destination untouched.  
   Severity: None  
   Tag: [verified-by-reading]

2. **No**  
   File: `scripts/studio-server.mjs:430-448` (commitConfig) and `persistence-boundary.test.mjs:20-30`  
   ```js
   function commitConfig(buildCandidate) {
     const operation = commandQueue.then(async () => {
       ...
       const normalized = validateConfig(candidate);
       let saved;
       try { saved = await configStore.save(normalized); }
       ...
       config = saved;
       return config;
     });
     commandQueue = operation.catch(() => undefined);
     return operation;
   }
   ```
   Scenario: any request/failure; memory updated only after successful save, disk never overwritten with less data.  
   Severity: None  
   Tag: [verified-by-reading]

3. **Yes**  
   File: `presence-config.mjs:169-179` (validateConfig return object)  
   ```js
   return {
     version: 2,
     codexSession: ...,
     ...
     settings: {...},
     manualOverride: ...
   };
   ```
   File: `studio-server.mjs:599` (updateScenesAndSlots: slots: body.slots ?? current.slots)  
   Scenario: client sends extra field in scenes object or settings; dropped on save. Legacy slots kept.  
   Severity: Major (potential silent truncation of config)  
   Tag: [verified-by-reading]

4. **No**  
   File: `scripts/studio-server.mjs:429-478`  
   ```js
   function scheduleHeartbeat() { ... stopSchedulerTimer(); ... setSchedulerTimeout(...) }
   async function reconcilePresence(...) {
     ...
     try { await expireOverride(now); } catch { expiryRetryAttempt +=1; }
     ...
     finally { scheduleHeartbeat(); }
   }
   ```
   Scenario: override expiry triggers retry; only one timer active at a time (stopped before new set).  
   Severity: None  
   Tag: [verified-by-reading]

**Total lines: 68**  
**Author report reference:** docs/improvement-review/execution/p1/P1-S2.md  
**Constraints met:** read-only, no source changes, tests runnable with `node --test scripts/tests/persistence-boundary.test.mjs` and `studio-boundary.test.mjs`.