# TODO

- edit the current task
  * update the description, tags, and start time
- edit a completed task
  * update the description, tags, and start and end times
- combine completed tasks
  * combine two tasks that are next to each other in time
  * keeps everything from the first task and offers the user an edit dialog to
  update as required
- add task before or between
  * in the log view, add a task before the first task
  * in the log view, add a task between two tasks, if there is a time gap
  between them
- top of app overlaps the safe area on my iOS. Needs padding

## Notes 2026-06-03

### DRY Code

I'm reviewing some of the code. I haven't looked at any of it almost at all. So,
it's pretty interesting. One thing I noticed is that there isn't good code reuse
or DRY principles between client apps and between the client and server. The
interfaces for the API endpoints are duplicated, I think in every app.

E.g. <client-watch/src/api.ts> duplicates <src/repositories/interfaces.ts>

And it seems like very app has a fetchApi function. IDK if they are exactly the
same but they seem pretty similar.

### Testing

Looks like there are only 10 tests or fewer. Not very encouraging. Interestingly
I don't see a lot of regressions when making changes. But I would be afraid to
attempt a large refactoring with so little testing. I wonder if the agent
could handle it or not. How could it verify the existing behavior? I also wonder
if the specs are accurate and if they are being verified against the
implementation. A lot of this just doesn't matter to me for these apps since
they're essentially throw away fun apps, but I would consider these important
for long-term maintenance if I wanted to keep them working.

### Database

The sqlite database has been pretty reasonable to use although I have my
personal issues with it. I do like the interface that has been put between the
database and the API backend. That keeps the database internals from leaking
into the backend. The API surface also is pretty clean overall and doesn't
reveal too much about how the backend is written. I would like a solution that
could fully abstract the database and store identical objects in multiple
systems. That would really be a database layer behind the interfaces that are
used here. Overall it works pretty well.

The new board game app is using some JSON columns and I'm curious how those
actually perform in sqlite. With the play roster being stored as a JSON array
within the session/game I think that would make certain queries much too slow.
With hundreds of sessions and games it would be hard to get all the information
about a single player's history. Although, in actuality the database is so small
it could all fit into memory and be searched in milliseconds.
