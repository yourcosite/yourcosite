-- Mejl till oss när en ny kund registrerar sig: markerar att mejlet skickats
-- så att varje konto bara ger ett.
alter table profiles add column if not exists signup_notified_at timestamptz;
-- Befintliga kunder ska inte räknas som nya.
update profiles set signup_notified_at = now() where signup_notified_at is null;
