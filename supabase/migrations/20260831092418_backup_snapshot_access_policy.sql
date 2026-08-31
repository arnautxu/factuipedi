create policy "service_role manages backup snapshots"
on backup.snapshots
for all
to service_role
using (true)
with check (true);
