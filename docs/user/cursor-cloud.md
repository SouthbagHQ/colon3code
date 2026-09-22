# Cursor Cloud agents

Cursor Cloud agents run on Cursor's infrastructure rather than on one of your
environments. Give an environment a Cursor API key and :3 Code mirrors those
agents into threads, so they sit in the sidebar beside the agents running on
your own machines.

Mirrors are read-only. :3 Code keeps them up to date and links back to Cursor;
follow-ups, new agents, and anything else that changes an agent happen in
Cursor itself.

## Connect an account

Create an API key in the Cursor dashboard, then open **Settings > Providers**
on web or desktop, pick the environment that has your repositories checked out,
and paste the key into **Cursor Cloud**. On mobile, the **cursor cloud** section
of Settings does the same for each connected environment.

The key is stored on that environment and never travels back to a client. The
same section shows whether the last sync reached Cursor, the account the key
belongs to, and how many agents it mirrored. Choose **sync** to refresh
immediately; otherwise :3 Code checks every minute.

Each environment holds its own key. Connect the one whose projects match the
repositories your cloud agents work on — mirroring on a second environment with
the same repositories would give you the same agents twice.

## Where the agents appear

A cloud agent joins the project whose repository it works on, so an agent on
`your-org/your-repo` lands under the project you have checked out from
`your-org/your-repo`. It behaves like any other thread: it sorts into the active
list while the agent is working, settles when it finishes, and can be pinned,
snoozed, searched, and archived.

A thread carries the agent's replies, the branch it pushed, and the pull request
it opened. Cursor does not report the prompt text of a cloud run, so the thread
title — which Cursor derives from the opening prompt — is what names the work.

An agent whose repository is not checked out on that environment has nowhere to
live and is not mirrored. Settings counts those agents so you can tell an empty
sidebar from a connection problem; clone the repository as a project and the
next sync picks the agent up.

## Stop mirroring

Turn **mirror cloud agents** off to pause syncing, or choose **forget** to
remove the key from the environment. Threads that were already mirrored stay
where they are — they are history, the same as any other settled thread.

To dismiss a single agent, archive or delete its thread. :3 Code does not
recreate a mirror you put away, and the agent itself is untouched in Cursor.
