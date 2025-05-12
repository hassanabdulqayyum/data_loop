Think of the **event-bus** as the project’s group-chat for computers.

• Every time any part of Data-Loop does something interesting—  
  “Alice saved version v12”,  
  “AI finished embedding node 123”,  
  “Reviewer marked comment thread 456 as resolved”—  
  it drops a little JSON message into the chat.

• Every other service that cares simply sits in the chat room and listens.  
  – The **metrics-collector** counts messages to build dashboards.  
  – The **realtime-gateway** forwards “user is typing” events to everyone’s browser.  
  – The **Python AI worker** might wake up when it sees “new_version_saved” and run a quality check.

Why this is handy (and called a *bus*)  
1. Nobody needs to know who else is out there—just “publish” and forget.  
2. New services can join later (e.g., a billing system that watches for “export_dataset” events) without touching old code.  
3. The history of messages can be replayed for audit or debugging.

So, in the context of *ideation_collab.md*, the event-bus is the central, fire-and-forget broadcast channel that keeps all those modular pieces (Node routes, AI workers, reviewers’ browsers, nightly jobs) in sync without tight coupling—much like a single WhatsApp group that every micro-service is a member of.
